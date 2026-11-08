/**
 * Coffee surface shader — the liquid disc inside every cup.
 *
 * Everything is procedural, computed per fragment in the disc's polar space:
 *  1. Liquid motion: the UVs are domain-warped by two time-shifted FBM fields,
 *     so the crema slowly churns instead of looking like a flat brown circle.
 *  2. Crema: a golden-tan layer with "tiger striping" (stretched FBM) that
 *     develops from dark espresso as `uCrema` goes 0 → 1 during extraction.
 *  3. Meniscus: the rim darkens and a thin bright ring catches the light.
 *  4. Milk: while pouring, milk spirals in (`uSwirl`), then settles into a
 *     lighter body (`uMilk`) with fine micro-foam bubbles (`uFoam`).
 *  5. Latte art: signed-distance / analytic masks for a heart, rosetta and
 *     tulip, revealed by `uArtProgress` the way a barista draws them.
 *  6. Shading: a fake normal from the noise gradient drives a soft specular
 *     sheen, plus a view-independent glossy highlight.
 */
import { Color, ShaderMaterial } from 'three'
import { NOISE_GLSL } from '../shared/noise'

export interface CoffeeSurfaceUniforms {
  uTime: { value: number }
  uCrema: { value: number }
  uMilk: { value: number }
  uSwirl: { value: number }
  uFoam: { value: number }
  uArt: { value: number }
  uArtProgress: { value: number }
  uEspresso: { value: Color }
  uCremaColor: { value: Color }
  uMilkColor: { value: Color }
}

export type CoffeeSurfaceMaterial = ShaderMaterial & { uniforms: CoffeeSurfaceUniforms }

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uCrema;
  uniform float uMilk;
  uniform float uSwirl;
  uniform float uFoam;
  uniform float uArt;
  uniform float uArtProgress;
  uniform vec3 uEspresso;
  uniform vec3 uCremaColor;
  uniform vec3 uMilkColor;
  varying vec2 vUv;
  varying vec3 vViewPos;

  ${NOISE_GLSL}

  float dot2(vec2 v) { return dot(v, v); }

  // Inigo Quilez's exact heart SDF (tip at origin, lobes toward +y).
  float sdHeart(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
  }

  // Heart: grows outward from the pour point as progress increases.
  float heartMask(vec2 p, float prog) {
    float s = mix(0.25, 1.0, smoothstep(0.0, 0.85, prog));
    vec2 hp = vec2(p.x, 0.5 - p.y) / (1.05 * s);
    hp.y += 0.05 * sin(p.x * 6.0); // slight drag from the pull-through
    float d = sdHeart(hp);
    return smoothstep(0.035, -0.02, d) * smoothstep(0.0, 0.15, prog);
  }

  // Rosetta: stacked chevron leaves with a centre "pull-through" line.
  float rosettaMask(vec2 p, float prog) {
    float y = p.y + 0.05;
    float halfW = 0.6 * clamp(1.0 - pow((y + 0.05) / 0.72, 2.0), 0.0, 1.0);
    float leaves = smoothstep(0.35, 0.6, 0.5 + 0.5 * sin(y * 26.0 + abs(p.x) * 11.0));
    float body = step(abs(p.x), halfW) * leaves;
    float stem = smoothstep(0.03, 0.012, abs(p.x)) * step(-0.75, p.y) * step(p.y, 0.62);
    float cap = smoothstep(0.17, 0.14, length(p - vec2(0.0, -0.66)));
    float reveal = smoothstep(-0.05, 0.05, mix(-0.9, 0.9, prog) - p.y);
    return clamp(body + stem + cap, 0.0, 1.0) * reveal;
  }

  // Tulip: three stacked blobs, each with a crescent bite, joined by a stem.
  float tulipMask(vec2 p, float prog) {
    float m = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 c = vec2(0.0, 0.42 - fi * 0.36);
      float r = 0.27 - fi * 0.035;
      float blob = smoothstep(r + 0.015, r - 0.015, length(p - c));
      float bite = smoothstep(r * 0.78 + 0.015, r * 0.78 - 0.015, length(p - c - vec2(0.0, r * 0.55)));
      float appear = smoothstep(fi / 3.0, fi / 3.0 + 0.3, prog);
      m = max(m, (blob - bite * step(fi, 1.5)) * appear);
    }
    float stem = smoothstep(0.025, 0.01, abs(p.x)) * step(-0.7, p.y) * step(p.y, 0.6) * smoothstep(0.85, 1.0, prog);
    return clamp(max(m, stem), 0.0, 1.0);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0; // disc space, radius 1
    float r = length(p);

    // --- 1. liquid motion: domain warp -----------------------------------
    float t = uTime;
    vec2 warp = vec2(fbm(p * 2.6 + vec2(t * 0.22, -t * 0.17)), fbm(p * 2.6 + vec2(-t * 0.19, t * 0.24))) - 0.5;
    vec2 q = p + warp * (0.07 + 0.25 * uSwirl);

    // --- 2. espresso + crema with tiger striping --------------------------
    float tiger = fbm(vec2(q.x * 3.0, q.y * 9.0) + t * 0.05);
    float speck = fbm(q * 14.0 - t * 0.1);
    vec3 crema = uCremaColor * (0.75 + 0.45 * tiger) * (0.92 + 0.16 * speck);
    vec3 col = mix(uEspresso * (0.85 + 0.3 * speck), crema, uCrema);

    // --- 3. meniscus -------------------------------------------------------
    col *= mix(1.0, 0.72, smoothstep(0.8, 1.0, r));
    col += vec3(0.25, 0.18, 0.12) * smoothstep(0.9, 0.97, r) * smoothstep(1.0, 0.97, r) * 0.6;

    // --- 4. milk: spiral while pouring, then a smooth foamy body -----------
    float ang = atan(q.y, q.x);
    float spiral = 0.5 + 0.5 * sin(ang * 2.0 + r * 9.0 - t * 5.0);
    float milkAmt = uMilk * mix(1.0, 0.45 + 0.55 * spiral, uSwirl);
    vec3 milky = mix(crema, uMilkColor, 0.55 + 0.25 * tiger);
    col = mix(col, milky, clamp(milkAmt, 0.0, 1.0));
    float bubbles = smoothstep(0.62, 0.9, vnoise(q * 60.0 + t * 0.3));
    col += bubbles * 0.05 * uFoam;

    // --- 5. latte art ------------------------------------------------------
    float art = 0.0;
    if (uArt > 0.5 && uArt < 1.5) art = heartMask(q, uArtProgress);
    else if (uArt > 1.5 && uArt < 2.5) art = rosettaMask(q, uArtProgress);
    else if (uArt > 2.5) art = tulipMask(q, uArtProgress);
    art *= smoothstep(0.98, 0.9, r);
    col = mix(col, uMilkColor * 1.05, art * 0.95);

    // --- 6. shading: sheen from the noise gradient + a glossy highlight ---
    float h0 = fbm(q * 5.0 + t * 0.2);
    vec3 n = normalize(vec3(dFdx(h0) * 18.0, 1.0, dFdy(h0) * 18.0));
    float sheen = pow(max(n.y, 0.0), 30.0) * 0.06;
    float gloss = smoothstep(0.42, 0.0, length(p - vec2(-0.35, -0.38) + warp * 0.2)) * 0.1;
    col += (sheen + gloss) * (1.0 - 0.6 * uMilk);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createCoffeeSurfaceMaterial(init: Partial<Record<'crema' | 'milk' | 'foam' | 'art' | 'artProgress', number>> = {}): CoffeeSurfaceMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCrema: { value: init.crema ?? 1 },
      uMilk: { value: init.milk ?? 0 },
      uSwirl: { value: 0 },
      uFoam: { value: init.foam ?? 0 },
      uArt: { value: init.art ?? 0 },
      uArtProgress: { value: init.artProgress ?? 1 },
      // Linear-space colours (ShaderMaterial uniforms are not colour-managed for us).
      uEspresso: { value: new Color('#2B160C') },
      uCremaColor: { value: new Color('#B87A43') },
      uMilkColor: { value: new Color('#F7EEDF') },
    },
  }) as CoffeeSurfaceMaterial
}
