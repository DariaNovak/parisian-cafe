/**
 * World layout in metres. +Y is up, the café facade sits on the z = 0 plane
 * and the street runs along the X axis toward +Z.
 */
export const LAYOUT = {
  /** Top of the sidewalk and of the café floor. */
  floorY: 0.12,
  cafe: { minX: -6, maxX: 6, minZ: -8, maxZ: 0, groundHeight: 4.2, wallThickness: 0.3 },
  sidewalk: { minZ: 0, maxZ: 4.6 },
  road: { minZ: 4.6, maxZ: 11.2 },
  farSidewalk: { minZ: 11.2, maxZ: 13.6 },
  streetHalfLength: 26,
  /** Door opening in the facade, centred on x = 0. */
  door: { halfWidth: 0.75, height: 2.75 },
  /** Shop windows in the facade. */
  windows: [
    { minX: -5.3, maxX: -1.35 },
    { minX: 1.35, maxX: 5.3 },
  ],
  windowSill: 0.75,
  windowTop: 3.15,
  counter: { minX: -4.8, maxX: 1.4, frontZ: -5.6, depth: 0.75, height: 1.05 },
  display: { minX: 2.0, maxX: 4.7, frontZ: -5.5, depth: 0.8, baseHeight: 0.95, glassHeight: 0.7 },
} as const

/** Counter top surface height in world space. */
export const COUNTER_TOP = LAYOUT.floorY + LAYOUT.counter.height

/** Where the espresso machine stands on the counter. */
export const ESPRESSO_POS: [number, number, number] = [-2.5, COUNTER_TOP, -6.05]
export const GRINDER_POS: [number, number, number] = [-3.85, COUNTER_TOP, -6.05]
/** Serving tray for finished coffees and desserts. */
export const TRAY_POS: [number, number, number] = [-0.7, COUNTER_TOP, -5.95]

export const TABLE_HEIGHT = 0.74

/** Round bistro tables: outdoor terrace first, then interior. */
export const TABLES = [
  { id: 'terrace-1', position: [-4.5, LAYOUT.floorY, 1.75], outdoor: true },
  { id: 'terrace-2', position: [-2.45, LAYOUT.floorY, 3.15], outdoor: true },
  { id: 'terrace-3', position: [2.45, LAYOUT.floorY, 3.15], outdoor: true },
  { id: 'terrace-4', position: [4.5, LAYOUT.floorY, 1.75], outdoor: true },
  { id: 'inside-1', position: [-3.9, LAYOUT.floorY, -2.3], outdoor: false },
  { id: 'inside-2', position: [-1.3, LAYOUT.floorY, -3.4], outdoor: false },
  { id: 'inside-3', position: [3.6, LAYOUT.floorY, -2.5], outdoor: false },
] as const satisfies ReadonlyArray<{ id: string; position: [number, number, number]; outdoor: boolean }>

export type TableId = (typeof TABLES)[number]['id']

/** Pendant lamps: [x, z] positions, hanging bulb height. */
export const PENDANTS = [
  { position: [-3.85, 2.55, -5.95], light: true },
  { position: [-1.3, 2.55, -5.95], light: false },
  { position: [1.0, 2.55, -5.95], light: true },
  { position: [-3.9, 2.75, -2.3], light: true },
  { position: [-1.3, 2.75, -3.4], light: false },
  { position: [3.6, 2.75, -2.5], light: true },
] as const satisfies ReadonlyArray<{ position: [number, number, number]; light: boolean }>

export const INTERIOR = { minX: -5.85, maxX: 5.85, minZ: -7.85, maxZ: -0.3, ceiling: 4.08 } as const
