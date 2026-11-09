import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, Vector3 } from 'three'
import { useCafeStore } from '../../../app/store/useCafeStore'
import { LAYOUT } from '../../../constants/layout'
import { QUALITY_PRESETS } from '../../../constants/quality'
import { SUN_DIRECTION } from '../../../shaders/sky/skyDome'

/**
 * Dust motes floating in the café. In the vertex shader each mote traces a ray
 * back toward the sun; if that ray passes through one of the shop windows, the
 * mote sits inside a sunbeam and glows. Motes elsewhere are nearly invisible,
 * which is exactly how dust reads in real afternoon light.
 */
export function DustMotes() {
  const quality = useCafeStore((s) => s.quality)
  const count = Math.round(700 * QUALITY_PRESETS[quality].particles)
  const dpr = useThree((s) => s.viewport.dpr)

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos.set([-5.6 + Math.random() * 11.2, 0.3 + Math.random() * 3.4, -5.5 + Math.random() * 5.1], i * 3)
      seed[i] = Math.random()
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    return g
  }, [count])

  const material = useMemo(() => {
    const [w0, w1] = LAYOUT.windows
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1 },
        uSunDir: { value: new Vector3().copy(SUN_DIRECTION) },
        // (minX, maxX) of both shop windows, and their (sill, top) heights.
        uWindowsX: { value: [w0.minX, w0.maxX, w1.minX, w1.maxX] },
        uWindowY: { value: [LAYOUT.windowSill, LAYOUT.windowTop] },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uScale;
        uniform vec3 uSunDir;
        uniform float uWindowsX[4];
        uniform float uWindowY[2];
        varying float vGlow;
        void main() {
          vec3 p = position;
          // Slow Brownian-looking drift with a gentle upward convection.
          p.x += sin(uTime * 0.11 + aSeed * 40.0) * 0.25;
          p.y += sin(uTime * 0.07 + aSeed * 23.0) * 0.18 + uTime * 0.004;
          p.z += cos(uTime * 0.09 + aSeed * 31.0) * 0.2;
          p.y = 0.3 + mod(p.y - 0.3, 3.4);
          // March toward the sun until the facade plane (z = 0): is that point a window?
          float t = (0.0 - p.z) / max(uSunDir.z, 0.001);
          vec3 hit = p + uSunDir * t;
          float inX = step(uWindowsX[0], hit.x) * step(hit.x, uWindowsX[1]) + step(uWindowsX[2], hit.x) * step(hit.x, uWindowsX[3]);
          float inY = smoothstep(uWindowY[0], uWindowY[0] + 0.2, hit.y) * smoothstep(uWindowY[1], uWindowY[1] - 0.2, hit.y);
          float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aSeed * 60.0);
          vGlow = (0.06 + inX * inY * 0.94) * twinkle;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.012 + aSeed * 0.012) * uScale / max(-mv.z, 0.05);
        }`,
      fragmentShader: /* glsl */ `
        varying float vGlow;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vGlow * 0.55;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a, a);
        }`,
    })
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uScale.value = dpr * state.size.height * 0.5
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />
}
