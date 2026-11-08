/**
 * Shared PBR materials. Every mesh in the scene references one of these
 * instances, so materials (and their shader programs) are created once and reused.
 */
import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Texture } from 'three'
import { PALETTE } from '../constants/colors'
import { awningTexture, metroTileTexture, parquetTexture, sidewalkTexture, stoneCoursesTexture, woodGrainTexture } from './textures'

function std(color: string, roughness: number, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) {
  const m = new MeshStandardMaterial({ color, roughness, metalness })
  Object.assign(m, extra)
  return m
}

function repeated(tex: Texture, x: number, y: number) {
  const t = tex.clone()
  t.repeat.set(x, y)
  t.needsUpdate = true
  return t
}

const stone = stoneCoursesTexture()
const wood = woodGrainTexture()

export const MATERIALS = {
  /* Architecture */
  facadeStone: std('#FFFFFF', 0.92, 0, { map: repeated(stone, 2, 2) }),
  facadeUpper: std('#F1E6D6', 0.9, 0, { map: repeated(stone, 3, 3) }),
  plaster: std(PALETTE.cream, 0.95),
  ceiling: std('#F8F0E4', 0.95),
  wainscot: std('#3E5245', 0.55),
  frameGreen: std(PALETTE.frameGreen, 0.42, 0.1),
  trimCream: std('#EFE2CF', 0.6),
  roofZinc: std('#6F7B83', 0.45, 0.6),
  chimney: std('#B9806A', 0.85),
  balconyIron: std('#1E2422', 0.4, 0.7),
  // Floor box top is 11.7 × 7.55 m → 1.5 m parquet tiles.
  parquet: std('#FFFFFF', 0.55, 0, { map: repeated(parquetTexture(), 7.8, 5) }),
  awning: std('#FFFFFF', 0.85, 0, { map: awningTexture(), side: DoubleSide }),
  awningEdge: std(PALETTE.pink, 0.8, 0, { side: DoubleSide }),
  curb: std('#A39A8E', 0.85),
  // Sidewalk box top is 52 × 4.6 m → 1.2 m tiles.
  sidewalk: std('#E8E0D4', 0.86, 0, { map: repeated(sidewalkTexture(), 43, 3.8) }),
  farSidewalk: std('#E8E0D4', 0.86, 0, { map: repeated(sidewalkTexture(), 43, 2) }),
  metroTiles: std('#FFFFFF', 0.25, 0, { map: repeated(metroTileTexture(), 10.9, 3.4) }),

  /* Woods & metals */
  oak: std(PALETTE.oak, 0.5, 0, { map: repeated(wood, 1, 1) }),
  walnut: std(PALETTE.walnut, 0.45, 0, { map: repeated(wood, 1, 1) }),
  darkWood: std('#4A2F20', 0.4, 0, { map: repeated(wood, 2, 1) }),
  iron: std(PALETTE.iron, 0.42, 0.75),
  brass: std(PALETTE.brass, 0.28, 0.9),
  chrome: std('#F2F2F0', 0.22, 1),
  steel: std('#E3E0DA', 0.38, 0.85),
  copper: std('#C27A4E', 0.3, 0.9),

  /* Surfaces */
  marble: new MeshPhysicalMaterial({ color: PALETTE.marble, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  ceramic: new MeshPhysicalMaterial({ color: '#FBF7F0', roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
  ceramicPink: new MeshPhysicalMaterial({ color: PALETTE.pink, roughness: 0.25, clearcoat: 0.6 }),
  ceramicSage: new MeshPhysicalMaterial({ color: PALETTE.sage, roughness: 0.25, clearcoat: 0.6 }),
  terracotta: std(PALETTE.terracotta, 0.8),
  linen: std('#EAE1D3', 0.95),
  fabricPink: std(PALETTE.pink, 0.9),
  fabricSage: std(PALETTE.sage, 0.9),
  leather: std('#7B3F2A', 0.55),
  paper: std('#F7F0E4', 0.9),
  blackboard: std('#2B2F2C', 0.9),
  mirror: std('#DDE3E6', 0.05, 1),
  darkGlass: std('#26323A', 0.12, 0.3),

  /* Plants */
  leaf: std('#5E7F55', 0.7, 0, { side: DoubleSide }),
  leafLight: std(PALETTE.sage, 0.7, 0, { side: DoubleSide }),
  soil: std('#3A2A1E', 1),

  /* Light emitters (picked up by Bloom) */
  bulb: std('#FFF1D6', 0.4, 0, { emissive: new Color(PALETTE.gold), emissiveIntensity: 3.2 }),
  lampShade: std('#F3E7D3', 0.6, 0, { side: DoubleSide, emissive: new Color('#FFB867'), emissiveIntensity: 0.25 }),
  neon: std('#FFFFFF', 0.4, 0, { emissive: new Color('#FFD9A0'), emissiveIntensity: 2.4 }),

  /* Food */
  coffeeBean: std('#3B2416', 0.45),
  sugar: std('#FFFFFF', 0.7),
  pastryGold: std('#C98B4A', 0.5),
  milk: std(PALETTE.milk, 0.35),
} as const

export type MaterialKey = keyof typeof MATERIALS
