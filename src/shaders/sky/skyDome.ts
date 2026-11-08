/**
 * Warm afternoon sky dome. A vertical gradient from a hazy golden horizon to a
 * soft blue zenith, plus a glow around the sun direction and a faint band of
 * procedural clouds (value-noise FBM). Rendered on a large BackSide sphere.
 */
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three'
import { NOISE_GLSL } from '../shared/noise'

export const SUN_DIRECTION = new Vector3(13, 15, 7.5).normalize()

export function createSkyMaterial() {
  return new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uZenith: { value: new Color('#9FC3DA') },
      uHorizon: { value: new Color('#F8DDB8') },
      uGround: { value: new Color('#E8D5C0') },
      uSunColor: { value: new Color('#FFE2B0') },
      uSunDir: { value: SUN_DIRECTION },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; // push to the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uZenith, uHorizon, uGround, uSunColor, uSunDir;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        // Gradient: ground haze -> golden horizon -> blue zenith.
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
        col = mix(uGround, col, smoothstep(-0.15, 0.02, h));
        // Sun glow: a tight disc plus a wide halo.
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(s, 600.0) * 2.5 + pow(s, 12.0) * 0.35);
        // Slow-drifting cirrus clouds in the upper sky.
        vec2 uv = d.xz / max(h, 0.08) * 0.6 + vec2(uTime * 0.004, 0.0);
        float c = smoothstep(0.55, 0.85, fbm(uv * 1.8));
        col = mix(col, vec3(1.0, 0.97, 0.93), c * 0.45 * smoothstep(0.05, 0.3, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}
