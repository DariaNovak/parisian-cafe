import { TABLES, TABLE_HEIGHT } from '../constants/layout'
import { usePhysicsStore } from './usePhysicsStore'

/**
 * UI-facing physics actions. Kept free of Rapier imports so the UI bundle does
 * not pull in the (lazy-loaded) physics engine.
 */
export function dropSugarCubes(tableIndex: number) {
  const t = TABLES[tableIndex % TABLES.length]
  const [x, y, z] = t.position
  usePhysicsStore.getState().spawnMany(
    Array.from({ length: 6 }, (_, i) => ({
      kind: 'sugar' as const,
      position: [x - 0.1 + (i % 3) * 0.08 + Math.random() * 0.02, y + TABLE_HEIGHT + 0.35 + i * 0.05, z - 0.12 + Math.random() * 0.05] as [number, number, number],
    })),
  )
}
