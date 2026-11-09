import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { DirectionalLight, Object3D, SpotLight, Vector3 } from 'three'
import { useCafeStore } from '../../app/store/useCafeStore'
import { PALETTE } from '../../constants/colors'
import { LAYOUT, PENDANTS } from '../../constants/layout'
import { QUALITY_PRESETS } from '../../constants/quality'
import { SUN_DIRECTION } from '../../shaders/sky/skyDome'
import { LAMP_POSITIONS } from '../../models/Street'

/** Centre of the area that receives sun shadows (street + terrace + café floor). */
const SHADOW_CENTER: [number, number, number] = [0, 0, 1]
const SUN_DISTANCE = 26
const SUN_POSITION = SUN_DIRECTION.clone().multiplyScalar(SUN_DISTANCE).add(new Vector3(...SHADOW_CENTER))

/**
 * Lighting rig:
 *  - Hemisphere light: warm sky / beige ground fill.
 *  - Directional "afternoon sun" with a tuned orthographic shadow camera that
 *    tightly covers the terrace and enters the café through the shop windows.
 *  - Warm point lights in the pendant lamps (no shadows: cheap, soft fill).
 *  - Spot lights: one grazes the sign board, one highlights the coffee bar.
 */
export function Lighting() {
  const sun = useRef<DirectionalLight>(null)
  const signSpot = useRef<SpotLight>(null)
  const barSpot = useRef<SpotLight>(null)
  const quality = useCafeStore((s) => s.quality)
  const mapSize = QUALITY_PRESETS[quality].shadowMapSize

  // Configure the shadow camera. Re-runs when the light is remounted for a new map size.
  useLayoutEffect(() => {
    const l = sun.current!
    l.target.position.set(...SHADOW_CENTER)
    l.target.updateMatrixWorld()
    const cam = l.shadow.camera
    cam.left = -15
    cam.right = 15
    cam.top = 12
    cam.bottom = -12
    cam.near = 4
    cam.far = 60
    cam.updateProjectionMatrix()
    l.shadow.bias = -0.00025
    l.shadow.normalBias = 0.025
    l.shadow.radius = 3 // PCF kernel radius → soft penumbrae
  }, [mapSize])

  useLayoutEffect(() => {
    for (const [spot, target] of [
      [signSpot.current!, [0, 3.75, 0]],
      [barSpot.current!, [-1.6, LAYOUT.floorY + 1.1, -6.0]],
    ] as Array<[SpotLight, [number, number, number]]>) {
      const t = new Object3D()
      t.position.set(...target)
      spot.target = t
      t.updateMatrixWorld()
    }
  }, [])

  // The sun very slowly "breathes" to suggest high clouds drifting past.
  useFrame((state) => {
    if (sun.current) sun.current.intensity = 3.6 + Math.sin(state.clock.elapsedTime * 0.07) * 0.15
  })


  return (
    <>
      <hemisphereLight args={['#FFF1DC', '#A88E78', 0.5]} />
      {/* Keyed by map size: a quality change remounts the light with a fresh shadow map. */}
      <directionalLight key={mapSize} ref={sun} position={SUN_POSITION} color="#FFE3B8" intensity={3.6} castShadow shadow-mapSize={[mapSize, mapSize]} />
      {PENDANTS.filter((p) => p.light).map(({ position: [x, y, z] }) => (
        <pointLight key={`${x}${z}`} position={[x, y - 0.12, z]} color={PALETTE.gold} intensity={2.6} distance={5.5} decay={1.6} />
      ))}
      <spotLight ref={signSpot} position={[0, 2.55, 2.0]} color="#FFE0B0" intensity={6} angle={0.8} penumbra={0.9} distance={5} decay={1.5} />
      <spotLight ref={barSpot} position={[-1.6, 3.9, -4.6]} color="#FFD9A0" intensity={3} angle={0.7} penumbra={0.8} distance={6} decay={1.6} />
      {/* Warm interior bounce that keeps the back of the room from going muddy. */}
      <pointLight position={[0, 2.6, -4.2]} color="#FFCF9A" intensity={1.1} distance={9} decay={1.2} />
      {LAMP_POSITIONS.slice(0, 2).map(([x, y, z]) => (
        <pointLight key={x} position={[x, y + 3.45, z]} color="#FFC873" intensity={0.8} distance={4} decay={2} />
      ))}
    </>
  )
}
