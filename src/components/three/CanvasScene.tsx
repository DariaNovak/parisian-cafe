import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useState } from 'react'
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace } from 'three'
import { useCafeStore } from '../../app/store/useCafeStore'
import { QUALITY_PRESETS } from '../../constants/quality'
import { CAMERA_VIEWS } from '../../features/navigation/cameraViews'
import { registerThree } from '../../app/devtools'

// The scene (models, shaders, physics WASM) is code-split and streamed in behind the loading screen.
const Scene = lazy(() => import('./Scene').then((m) => ({ default: m.Scene })))

/** Root WebGL canvas: renderer configuration lives here, scene composition in <Scene/>. */
export function CanvasScene() {
  const quality = useCafeStore((s) => s.quality)
  const preset = QUALITY_PRESETS[quality]
  const start = CAMERA_VIEWS.exterior
  // PerformanceMonitor lowers the pixel ratio when the frame rate drops.
  const [dprFactor, setDprFactor] = useState(1)

  return (
    <Canvas
      className="absolute! inset-0"
      dpr={[preset.dpr[0], Math.max(preset.dpr[0], preset.dpr[1] * dprFactor)]}
      shadows={{ type: PCFShadowMap }}
      camera={{ position: start.position, fov: 42, near: 0.05, far: 160 }}
      gl={{
        antialias: false, // MSAA / SMAA are handled by the post-processing composer
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: SRGBColorSpace,
        stencil: false,
      }}
      onCreated={registerThree}
    >
      <PerformanceMonitor onDecline={() => setDprFactor(0.75)} onIncline={() => setDprFactor(1)} />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
