/**
 * Walkable routes for people (pure data + small motion helpers). Points are
 * [x, z] on the floor; routes are hand-placed to thread between the terrace
 * tables, lamp posts, planters and the furniture inside.
 */
import { CHAIRS, LAYOUT } from '../../constants/layout'

export type P2 = [number, number]

export const FLOOR_Y = LAYOUT.floorY

/** Inside the door, a little to the right of the entrance. */
export const INSIDE_HUB: P2 = [0.4, -1.6]
export const DOOR_IN: P2 = [0, -0.75]
export const DOOR_OUT: P2 = [0, 0.9]

/** Places in line at the counter: index 0 stands at the till, by the serving tray. */
export const QUEUE_SPOTS: P2[] = [
  [-0.6, -4.95],
  [0.35, -4.5],
  [0.65, -3.8],
  [0.72, -3.1],
  [0.78, -2.4],
]
export const MAX_QUEUE = 4

/** Path from the street (side ±1) through the door to the hub inside. */
export function arrivalPath(side: 1 | -1): P2[] {
  return [[18 * side, 2.6], [5.4 * side, 2.6], [4.4 * side, 3.95], [0.5 * side, 3.95], [0, 3.2], DOOR_OUT, DOOR_IN, INSIDE_HUB]
}

/** From just outside the door back out to the street (side ±1). */
export function streetExit(side: 1 | -1): P2[] {
  return [[0, 3.2], [0.5 * side, 3.95], [4.4 * side, 3.95], [5.4 * side, 2.6], [18 * side, 2.6]]
}

/** A chair a person can sit on, with the point they walk to before sitting down. */
export interface Seat {
  index: number
  /** Where the hips go (slightly behind the chair centre). */
  spot: P2
  rotationY: number
  outdoor: boolean
  /** Waypoint next to the chair, reached from the hub (inside) or the terrace lane. */
  approach: P2
}

export const SEATS: Seat[] = CHAIRS.map((c, index) => {
  const [x, , z] = c.position
  const back = 0.06
  return {
    index,
    spot: [x - Math.sin(c.rotationY) * back, z - Math.cos(c.rotationY) * back],
    rotationY: c.rotationY,
    outdoor: c.outdoor,
    // Terrace chairs are reached along a lane in front of the facade; inside
    // chairs from the aisle on the door side of each table.
    approach: c.outdoor ? [x, 0.9] : [x, c.tableIndex === 5 ? -2.7 : -1.55],
  }
})

/** Seats occupied by the regulars who are always in the café. */
export const REGULAR_SEATS = [0, 4, 5, 9, 12]
/** Seats offered to served guests, inside first. */
export const GUEST_SEATS = [8, 10, 11, 13, 1, 2, 3, 6, 7]

/** From the counter to a seat. */
export function pathToSeat(seat: Seat): P2[] {
  return seat.outdoor ? [INSIDE_HUB, DOOR_IN, DOOR_OUT, seat.approach, seat.spot] : [INSIDE_HUB, seat.approach, seat.spot]
}

/** From a seat out to the street. */
export function pathFromSeat(seat: Seat, side: 1 | -1): P2[] {
  return seat.outdoor ? [seat.approach, DOOR_OUT, ...streetExit(side)] : [seat.approach, INSIDE_HUB, DOOR_IN, DOOR_OUT, ...streetExit(side)]
}

/** From anywhere inside (queue, counter) out to the street. */
export function pathFromInside(side: 1 | -1): P2[] {
  return [INSIDE_HUB, DOOR_IN, DOOR_OUT, ...streetExit(side)]
}

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

export interface Mover {
  x: number
  z: number
  heading: number
  /** Walk-cycle phase. */
  phase: number
  /** 0..1 blend between standing and walking. */
  walk: number
}

/** Radians of walk-cycle phase per metre travelled (one stride ≈ 1.5 m). */
const STRIDE = 4.2

export function turnToward(m: Mover, target: number, dt: number, rate = 7) {
  let d = target - m.heading
  d = Math.atan2(Math.sin(d), Math.cos(d))
  m.heading += d * (1 - Math.exp(-rate * dt))
}

/** Steps `m` toward (x, z). Returns true once it has arrived. */
export function stepToward(m: Mover, x: number, z: number, speed: number, dt: number, tolerance = 0.05): boolean {
  const dx = x - m.x
  const dz = z - m.z
  const d = Math.hypot(dx, dz)
  if (d <= tolerance) return true
  const step = Math.min(d, speed * dt)
  m.x += (dx / d) * step
  m.z += (dz / d) * step
  m.phase += step * STRIDE
  turnToward(m, Math.atan2(dx, dz), dt)
  return d - step <= tolerance
}

/** Follows `path` from `state.index`; returns true at the end. */
export function followPath(m: Mover, state: { path: P2[]; index: number }, speed: number, dt: number): boolean {
  while (state.index < state.path.length) {
    const [x, z] = state.path[state.index]
    // Intermediate waypoints are rounded off generously so turns look natural.
    const last = state.index === state.path.length - 1
    if (!stepToward(m, x, z, speed, dt, last ? 0.04 : 0.3)) return false
    state.index++
    if (!last) return false
  }
  return true
}
