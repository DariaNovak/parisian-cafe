/** Central art-direction palette. Every material and UI token derives from these values. */
export const PALETTE = {
  cream: '#F5EBDD',
  beige: '#E8D5C0',
  pink: '#E9BFC4',
  sage: '#A8B5A0',
  terracotta: '#C77D62',
  espresso: '#382820',
  gold: '#FFD9A0',
  /** Supporting tones derived from the palette. */
  frameGreen: '#2F3D33',
  iron: '#24262A',
  oak: '#9A6A45',
  walnut: '#6B4530',
  marble: '#F2EEE8',
  brass: '#C9A063',
  stone: '#B9AE9F',
  coffee: '#4A2C1A',
  crema: '#C08A55',
  milk: '#FBF4EA',
} as const

export type PaletteKey = keyof typeof PALETTE
