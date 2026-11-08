/**
 * Custom window / display-case glass (ShaderMaterial).
 *
 * Real glass via transmission would require an extra full-scene render per
 * frame; for large shop windows a stylised shader looks better and costs one
 * cheap transparent pass:
 *
 *  - Fresnel: opacity and reflection rise sharply at grazing angles
 *    (Schlick-style (1 - N·V)^p), so you see *into* the café head-on but get
 *    a reflective sheet when looking along the facade.
 *  - Fake reflections: the reflected view vector samples an analytic sky
 *    (zenith → warm horizon → ground) with a band of darker "buildings across
 *    the street" just below the horizon.
 *  - Edge highlights: a thin bright rim along the pane borders (UV distance to
 *    the nearest edge), like light caught in the glass thickness.
 *  - A slow diagonal sheen streak sweeps across the pane.
 *  - Tint & opacity are uniforms, so windows and the cabinet share the code.
 */
import { Color, DoubleSide, ShaderMaterial } from 'three'

export interface GlassOptions {
  tint?: string
  opacity?: number
  fresnelPower?: number
  reflectivity?: number
  edgeWidth?: number
  edgeStrength?: number
}

/** All glass materials share one clock uniform (ticked by <GlassClock/>). */
export const glassTime = { value: 0 }

export function createGlassMaterial(opts: GlassOptions = {}) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uTime: glassTime,
      uTint: { value: new Color(opts.tint ?? '#DCEBE4') },
      uOpacity: { value: opts.opacity ?? 0.07 },
      uFresnelPower: { value: opts.fresnelPower ?? 3.0 },
      uReflectivity: { value: opts.reflectivity ?? 0.85 },
      uEdgeWidth: { value: opts.edgeWidth ?? 0.012 },
      uEdgeStrength: { value: opts.edgeStrength ?? 0.35 },
      uSky: { value: new Color('#A9CBE0') },
      uHorizon: { value: new Color('#FBE3C2') },
      uGround: { value: new Color('#8C8072') },
      uBuildings: { value: new Color('#C9B49C') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vWorldPos = wp.xyz;
        mat3 nm = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          nm = nm * mat3(instanceMatrix);
        #endif
        vWorldNormal = normalize(nm * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity, uFresnelPower, uReflectivity, uEdgeWidth, uEdgeStrength;
      uniform vec3 uTint, uSky, uHorizon, uGround, uBuildings;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      vec3 fakeEnvironment(vec3 r) {
        vec3 c = mix(uHorizon, uSky, smoothstep(0.02, 0.6, r.y));
        c = mix(uGround, c, smoothstep(-0.25, 0.02, r.y));
        // Facades across the street: a band just below/around the horizon with window rhythm.
        float band = smoothstep(0.45, 0.05, r.y) * smoothstep(-0.3, 0.0, r.y);
        float rhythm = 0.75 + 0.25 * step(0.55, fract(atan(r.x, r.z) * 6.0));
        return mix(c, uBuildings * rhythm, band * 0.65);
      }

      void main() {
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 N = normalize(vWorldNormal);
        if (dot(N, V) < 0.0) N = -N; // double-sided: always face the viewer
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = 0.04 + 0.96 * pow(1.0 - ndv, uFresnelPower);

        vec3 R = reflect(-V, N);
        vec3 env = fakeEnvironment(R);

        // Edge highlight from the UV distance to the closest border.
        float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float edge = (1.0 - smoothstep(0.0, uEdgeWidth, e)) * uEdgeStrength;

        // Slow diagonal sheen sweeping across the pane.
        float diag = fract((vUv.x * 0.8 + vUv.y * 0.6) * 0.5 - uTime * 0.015);
        float streak = smoothstep(0.06, 0.0, abs(diag - 0.5)) * 0.18 + smoothstep(0.02, 0.0, abs(diag - 0.56)) * 0.12;

        vec3 col = mix(uTint, env, clamp(fresnel * uReflectivity + 0.15, 0.0, 1.0));
        col += vec3(1.0, 0.96, 0.9) * (edge + streak * (0.4 + fresnel));
        float alpha = clamp(uOpacity + fresnel * uReflectivity * 0.75 + edge * 0.6 + streak * 0.25, 0.0, 0.92);

        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

/** Large shop windows: very clear head-on, reflective at grazing angles. */
export const windowGlassMaterial = createGlassMaterial({ tint: '#DCEBE4', opacity: 0.06, fresnelPower: 3.2, reflectivity: 0.8, edgeWidth: 0.01, edgeStrength: 0.25 })

/** Pâtisserie cabinet glass: cleaner, warmer tint and brighter edges. */
export const displayGlassMaterial = createGlassMaterial({ tint: '#FFF6EA', opacity: 0.035, fresnelPower: 2.6, reflectivity: 0.55, edgeWidth: 0.02, edgeStrength: 0.5 })
