/**
 * Steam particles, animated entirely on the GPU.
 *
 * Each point has a random seed; its age is fract(time * speed + seed), so the
 * plume loops forever without any CPU work. Points rise, drift on two
 * out-of-phase sine wobbles, grow and fade in/out over their life. The fragment
 * shader draws a soft, slightly wispy puff. uIntensity fades the whole plume.
 */
import { BufferAttribute, BufferGeometry, ShaderMaterial } from 'three'

export function createSteamGeometry(count: number, radius: number) {
  const g = new BufferGeometry()
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * radius
    pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3)
    seed[i] = Math.random()
  }
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new BufferAttribute(seed, 1))
  return g
}

export function createSteamMaterial(opts: { height: number; spread: number; size: number; speed: number }) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uHeight: { value: opts.height },
      uSpread: { value: opts.spread },
      uSize: { value: opts.size },
      uSpeed: { value: opts.speed },
      uPixelRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uHeight, uSpread, uSize, uSpeed, uPixelRatio, uIntensity;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        float life = fract(uTime * uSpeed + aSeed);
        vec3 p = position;
        p.y += life * uHeight;
        float w = life * uSpread;
        p.x += sin(uTime * 1.3 + aSeed * 20.0 + life * 4.0) * w;
        p.z += cos(uTime * 1.1 + aSeed * 13.0 + life * 3.0) * w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // Perspective-correct size: grows as the puff rises and expands.
        gl_PointSize = uSize * (0.4 + life * 1.6) * uPixelRatio / max(-mv.z, 0.05);
        vAlpha = smoothstep(0.0, 0.18, life) * (1.0 - smoothstep(0.45, 1.0, life)) * uIntensity;
        vSeed = aSeed;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float wisp = 0.75 + 0.25 * sin(c.x * 9.0 + vSeed * 30.0) * sin(c.y * 7.0 - vSeed * 17.0);
        float a = smoothstep(0.5, 0.05, d) * wisp * vAlpha * 0.38;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vec3(1.0, 0.98, 0.95), a);
      }`,
  })
}
