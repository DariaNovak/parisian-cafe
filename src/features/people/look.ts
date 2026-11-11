/** Procedural appearance for café guests and passers-by (pure data, no rendering). */

export type HairStyle = 'short' | 'long' | 'bun' | 'curly' | 'bald'
export type Hat = 'none' | 'beret' | 'cap'

export interface PersonLook {
  seed: number
  /** Uniform scale applied to the whole figure (1 ≈ 1.73 m). */
  height: number
  /** Horizontal scale of the torso. */
  build: number
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  bottom: string
  shoes: string
  /** Long coat flaring below the waist. */
  coat: boolean
  skirt: boolean
  hat: Hat
  hatColor: string
  scarf: string | null
  bag: string | null
}

const SKIN = ['#F3D3BD', '#EAC2A2', '#D8A882', '#C08A64', '#9C6B4A', '#73492F', '#F6DCCB']
const HAIR = ['#2A1B12', '#3B2618', '#5A3A22', '#8A5A33', '#C69559', '#E3C48B', '#1C1C1C', '#9A9A9A', '#B4512E']
const TOPS = ['#2F3D57', '#7A2E35', '#C9A27A', '#3E5245', '#F2E8D8', '#1F1F22', '#C77D62', '#6E7F96', '#D9B44A', '#A8B5A0', '#E9BFC4', '#8C6A9E']
const BOTTOMS = ['#2B2F38', '#3C4A63', '#4A3A2C', '#1E1E20', '#6B6257', '#B9AE9F', '#2E4057']
const SHOES = ['#1E1A17', '#3A2A20', '#5B3B26', '#E8E2D6']
const ACCENTS = ['#C77D62', '#E9BFC4', '#A8B5A0', '#D9606E', '#F2E3C6', '#2F3D57', '#B4512E']

export const FIRST_NAMES = ['Camille', 'Louis', 'Chloé', 'Hugo', 'Léa', 'Jules', 'Manon', 'Arthur', 'Inès', 'Gabriel', 'Zoé', 'Adam', 'Élise', 'Théo', 'Margaux', 'Raphaël', 'Sophie', 'Lucas', 'Anaïs', 'Victor']

/** Small deterministic PRNG so a seed always produces the same person. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomLook(seed: number): PersonLook {
  const r = mulberry32(seed * 7919 + 13)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(r() * list.length)]
  const feminine = r() < 0.5
  const hairStyle: HairStyle = feminine ? pick(['long', 'long', 'bun', 'curly', 'short'] as const) : pick(['short', 'short', 'curly', 'bald', 'short'] as const)
  const hatRoll = r()
  return {
    seed,
    height: (feminine ? 0.94 : 1.0) + (r() - 0.5) * 0.08,
    build: (feminine ? 0.92 : 1.04) + (r() - 0.5) * 0.1,
    skin: pick(SKIN),
    hair: pick(HAIR),
    hairStyle,
    top: pick(TOPS),
    bottom: pick(BOTTOMS),
    shoes: pick(SHOES),
    coat: r() < 0.35,
    skirt: feminine && r() < 0.45,
    hat: hatRoll < 0.18 ? 'beret' : hatRoll < 0.26 ? 'cap' : 'none',
    hatColor: pick(['#1F1F22', '#7A2E35', '#2F3D57', '#C77D62']),
    scarf: r() < 0.3 ? pick(ACCENTS) : null,
    bag: r() < 0.3 ? pick(['#7B3F2A', '#1E1A17', '#C9A27A', '#E9BFC4']) : null,
  }
}
