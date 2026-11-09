/**
 * Minimal event bus between interactive flowers and the petal particle system.
 * Avoids React state: emitters push bursts, the particle system drains them in useFrame.
 */
export interface PetalBurst {
  origin: [number, number, number]
  colors: string[]
}

const queue: PetalBurst[] = []

export function emitPetals(origin: [number, number, number], colors: string[]) {
  queue.push({ origin, colors })
}

export function drainPetalBursts(): PetalBurst[] {
  return queue.splice(0, queue.length)
}
