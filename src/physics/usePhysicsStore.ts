import { create } from 'zustand'
import type { CoffeeType, CupId, LatteArt } from '../features/coffee/coffeeConfig'
import type { DessertId } from '../features/desserts/dessertsConfig'

/** Objects spawned at runtime into the physics world. */
export type SpawnedBody =
  | { id: number; kind: 'coffee'; coffee: CoffeeType; cup: CupId; art: LatteArt; position: [number, number, number] }
  | { id: number; kind: 'dessert'; dessert: DessertId; variant: number; position: [number, number, number] }
  | { id: number; kind: 'sugar'; position: [number, number, number] }

type Spawn = SpawnedBody extends infer T ? (T extends SpawnedBody ? Omit<T, 'id'> : never) : never

/** Hard cap keeps the simulation cheap no matter how much the user plays. */
const MAX_BODIES = 60

let nextId = 1

interface PhysicsState {
  bodies: SpawnedBody[]
  /** Adds a body and returns its id. */
  spawn: (body: Spawn) => number
  spawnMany: (bodies: Spawn[]) => void
  clearKind: (kind: SpawnedBody['kind']) => void
  remove: (ids: number[]) => void
}

export const usePhysicsStore = create<PhysicsState>()((set) => ({
  bodies: [],
  spawn: (body) => {
    const id = nextId++
    set((s) => ({ bodies: [...s.bodies, { ...body, id } as SpawnedBody].slice(-MAX_BODIES) }))
    return id
  },
  spawnMany: (list) => set((s) => ({ bodies: [...s.bodies, ...list.map((b) => ({ ...b, id: nextId++ }) as SpawnedBody)].slice(-MAX_BODIES) })),
  clearKind: (kind) => set((s) => ({ bodies: s.bodies.filter((b) => b.kind !== kind) })),
  remove: (ids) => set((s) => ({ bodies: s.bodies.filter((b) => !ids.includes(b.id)) })),
}))
