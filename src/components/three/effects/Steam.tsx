import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { useCafeStore } from '../../../app/store/useCafeStore'
import { QUALITY_PRESETS } from '../../../constants/quality'
import { createSteamGeometry, createSteamMaterial } from '../../../shaders/particles/steam'

interface SteamProps {
  position?: [number, number, number]
  /** Shared, mutable intensity (0..1) so callers can fade steam without re-rendering. */
  intensity?: { value: number }
  count?: number
  radius?: number
  height?: number
  spread?: number
  size?: number
  speed?: number
}

const ALWAYS_ON = { value: 1 }

/** A looping GPU steam plume (see shaders/particles/steam.ts). */
export function Steam({ position, intensity = ALWAYS_ON, count = 24, radius = 0.02, height = 0.22, spread = 0.035, size = 0.06, speed = 0.35 }: SteamProps) {
  const quality = useCafeStore((s) => s.quality)
  const n = Math.max(6, Math.round(count * QUALITY_PRESETS[quality].particles))
  const geometry = useMemo(() => createSteamGeometry(n, radius), [n, radius])
  const material = useMemo(() => createSteamMaterial({ height, spread, size, speed }), [height, spread, size, speed])
  const dpr = useThree((s) => s.viewport.dpr)
  const offset = useMemo(() => Math.random() * 100, [])

  // Release GPU buffers/programs when the plume unmounts or its config changes.
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime + offset
    u.uIntensity.value = intensity.value
    u.uPixelRatio.value = dpr * state.size.height * 0.5
  })

  return <points geometry={geometry} material={material} position={position} frustumCulled={false} renderOrder={5} />
}
