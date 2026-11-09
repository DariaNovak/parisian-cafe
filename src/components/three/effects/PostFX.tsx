import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, HueSaturation, N8AO, Outline, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useCafeStore } from '../../../app/store/useCafeStore'
import { QUALITY_PRESETS } from '../../../constants/quality'
import { CAMERA_VIEWS } from '../../../features/navigation/cameraViews'

/**
 * Post-processing chain (kept deliberately subtle):
 *  N8AO ambient occlusion → hover outline → bloom on emissive lamps →
 *  optional depth of field for close-up views → colour grading →
 *  ACES filmic tone mapping → soft vignette → SMAA.
 *
 * The composer works in linear HDR (half-float) and disables the renderer's own
 * tone mapping, so ACES is applied once, here, after bloom.
 */
export function PostFX() {
  const quality = useCafeStore((s) => s.quality)
  const view = useCafeStore((s) => s.view)
  const focus = useCafeStore((s) => s.focus)
  const preset = QUALITY_PRESETS[quality]
  const closeUp = !!focus || view === 'coffee' || view === 'pastry'
  const dofTarget = focus?.target ?? CAMERA_VIEWS[view].target

  return (
    <EffectComposer multisampling={preset.multisampling} enableNormalPass={false} autoClear={false}>
      {preset.ambientOcclusion && <N8AO quality="performance" aoRadius={0.9} distanceFalloff={0.6} intensity={2.2} color="#382820" />}
      <Outline blur edgeStrength={3.5} visibleEdgeColor={0xfff1d6} hiddenEdgeColor={0xc77d62} xRay={false} />
      {preset.bloom && <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.0} luminanceSmoothing={0.25} radius={0.7} />}
      {preset.depthOfField && closeUp && <DepthOfField target={dofTarget} focalLength={0.02} bokehScale={2.2} worldFocusRange={1.2} />}
      <HueSaturation saturation={0.06} />
      <BrightnessContrast brightness={0.01} contrast={0.06} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.42} eskil={false} />
      {preset.multisampling === 0 && <SMAA />}
    </EffectComposer>
  )
}
