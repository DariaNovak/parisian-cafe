/**
 * Wet cobblestone street — a GLSL patch on MeshStandardMaterial.
 *
 * Paris streets are washed every morning; water lingers in shallow puddles and
 * runs along the gutters. The patch keeps three.js PBR lighting and shadows and
 * adds, per fragment in world space:
 *
 *  1. Procedural surface variation: fine FBM grain and per-stone tone noise.
 *  2. Wetness mask: FBM puddles + a strip of water along both gutters.
 *  3. Wet look: wet stone darkens (water fills micro-pores) and roughness drops
 *     to near-mirror, so the environment map and sun produce sharp reflections.
 *  4. Animated reflection distortion: expanding ripple rings (raindrops from the
 *     awnings) perturb the view-space normal only inside wet areas.
 *  5. Fresnel highlights: extra sky-coloured reflection at grazing angles.
 *
 * Works with InstancedMesh (thousands of stones share one material).
 */
import { Color, MeshStandardMaterial } from 'three'
import { LAYOUT } from '../../constants/layout'
import { NOISE_GLSL } from '../shared/noise'

export const streetTime = { value: 0 }

export const cobblestoneMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0 })

cobblestoneMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = streetTime
  shader.uniforms.uGutters = { value: [LAYOUT.road.minZ + 0.32, LAYOUT.road.maxZ - 0.32] }
  shader.uniforms.uSkyTint = { value: new Color('#CFE0EA') }

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWetWorld;')
    .replace(
      '#include <project_vertex>',
      /* glsl */ `#include <project_vertex>
      vec4 wetWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wetWorld = instanceMatrix * wetWorld;
      #endif
      vWetWorld = (modelMatrix * wetWorld).xyz;`,
    )

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      /* glsl */ `#include <common>
      varying vec3 vWetWorld;
      uniform float uTime;
      uniform float uGutters[2];
      uniform vec3 uSkyTint;
      ${NOISE_GLSL}
      // 0 = dry, 1 = standing water.
      float wetness(vec2 p) {
        float puddles = smoothstep(0.56, 0.68, fbm(p * 0.32 + 7.3));
        float gutter = max(smoothstep(0.55, 0.0, abs(p.y - uGutters[0])), smoothstep(0.55, 0.0, abs(p.y - uGutters[1])));
        // Damp sheen everywhere else, slightly darker toward the gutters.
        return clamp(max(puddles, gutter * 0.9) + 0.12, 0.0, 1.0);
      }
      // Sum of expanding ripple rings on a jittered grid (one drop per cell, staggered in time).
      vec2 rippleGradient(vec2 p) {
        vec2 g = vec2(0.0);
        vec2 cell = floor(p * 1.4);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 c = cell + vec2(float(i), float(j));
          float h = hash21(c);
          vec2 center = (c + 0.5 + (vec2(hash21(c + 3.1), hash21(c + 7.7)) - 0.5) * 0.8) / 1.4;
          float t = fract(uTime * 0.35 + h);
          vec2 d = p - center;
          float r = length(d);
          float ring = sin((r - t * 0.6) * 60.0) * exp(-r * 9.0) * (1.0 - t) * smoothstep(0.0, 0.05, t);
          g += normalize(d + 1e-4) * ring;
        }
        return g;
      }`,
    )
    .replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      float wet = wetness(vWetWorld.xz);
      float grain = fbm(vWetWorld.xz * 9.0);
      diffuseColor.rgb *= 0.86 + 0.28 * grain;          // procedural surface variation
      diffuseColor.rgb *= mix(1.0, 0.52, wet);           // water darkens porous stone`,
    )
    .replace(
      '#include <roughnessmap_fragment>',
      /* glsl */ `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.06, smoothstep(0.35, 0.8, wet));`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      /* glsl */ `#include <normal_fragment_maps>
      // Ripples bend the (view-space) normal only where water stands.
      vec2 rg = rippleGradient(vWetWorld.xz) * smoothstep(0.5, 0.9, wet);
      normal = normalize(normal + (viewMatrix * vec4(rg.x, 0.0, rg.y, 0.0)).xyz * 0.25);`,
    )
    .replace(
      '#include <opaque_fragment>',
      /* glsl */ `// Fresnel highlight: wet stone mirrors the bright sky at grazing angles.
      float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 5.0);
      outgoingLight += uSkyTint * fres * smoothstep(0.4, 0.9, wet) * 0.35;
      #include <opaque_fragment>`,
    )
}
cobblestoneMaterial.customProgramCacheKey = () => 'wet-cobblestone-v1'
