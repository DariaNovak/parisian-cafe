import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { glassTime } from '../../shaders/glass/glassMaterial'
import { createSkyMaterial } from '../../shaders/sky/skyDome'
import { streetTime } from '../../shaders/street/wetCobblestone'

/**
 * Sky dome + a locally generated environment map (no HDR download needed).
 * Lightformers paint a warm sky, a sun patch and bounce light into a cube map
 * that drives PBR reflections on chrome, brass, glass and marble.
 */
export function SceneEnvironment() {
  const sky = useMemo(createSkyMaterial, [])
  // One place ticks the shared clocks of every custom shader.
  useFrame((state) => {
    const t = state.clock.elapsedTime
    sky.uniforms.uTime.value = t
    glassTime.value = t
    streetTime.value = t
  })
  return (
    <>
      <mesh material={sky} scale={120} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <fog attach="fog" args={['#EFDCC4', 28, 110]} />
      <Environment resolution={256} frames={1} environmentIntensity={0.45}>
        <color attach="background" args={['#CDBBA6']} />
        <Lightformer form="rect" intensity={1.6} color="#BFD6E6" scale={[40, 40, 1]} position={[0, 18, 0]} rotation-x={Math.PI / 2} />
        <Lightformer form="circle" intensity={8} color="#FFE2B0" scale={6} position={[18, 14, 20]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#F5EBDD" scale={[30, 6, 1]} position={[0, 3, 22]} target={[0, 2, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#E9BFC4" scale={[20, 6, 1]} position={[-22, 4, 0]} target={[0, 2, 0]} />
        <Lightformer form="rect" intensity={1.4} color="#FFD9A0" scale={[10, 2, 1]} position={[0, 6, -14]} target={[0, 2, 0]} />
        {/* Dark ground plane: gives chrome and brass a horizon line to reflect. */}
        <Lightformer form="rect" intensity={0.35} color="#4A3A2E" scale={[60, 60, 1]} position={[0, -6, 0]} rotation-x={-Math.PI / 2} />
      </Environment>
    </>
  )
}
