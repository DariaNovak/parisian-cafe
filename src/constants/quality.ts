export type QualityLevel = 'low' | 'medium' | 'high'

export interface QualityPreset {
  label: string
  dpr: [number, number]
  shadowMapSize: number
  ambientOcclusion: boolean
  bloom: boolean
  depthOfField: boolean
  multisampling: number
  /** Multiplier applied to particle counts (dust, steam, petals). */
  particles: number
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: { label: 'Low', dpr: [0.75, 1], shadowMapSize: 1024, ambientOcclusion: false, bloom: false, depthOfField: false, multisampling: 0, particles: 0.4 },
  medium: { label: 'Medium', dpr: [1, 1.5], shadowMapSize: 2048, ambientOcclusion: true, bloom: true, depthOfField: false, multisampling: 0, particles: 0.75 },
  high: { label: 'High', dpr: [1, 2], shadowMapSize: 4096, ambientOcclusion: true, bloom: true, depthOfField: true, multisampling: 4, particles: 1 },
}

/** Picks a sensible starting preset from coarse device hints. */
export function detectQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'medium'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency ?? 4
  if (coarse || cores <= 4) return 'low'
  if (cores >= 8 && window.devicePixelRatio <= 2) return 'high'
  return 'medium'
}
