import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useCafeStore } from '../../app/store/useCafeStore'
import { applyPose, createRig, Person } from '../../models/Person'
import { damp } from '../../utils/math'
import type { CupId } from '../coffee/coffeeConfig'
import { randomLook, type PersonLook } from './look'
import { FLOOR_Y, REGULAR_SEATS, SEATS, type P2 } from './navigation'

/* ------------------------------------------------------------------ */
/* Passers-by                                                          */
/* ------------------------------------------------------------------ */

/** Pavement routes walked end to end (then looped from the other side of the street). */
const ROUTES: P2[][] = [
  // Café side, swinging out around the terrace.
  [[-24, 2.6], [-5.4, 2.6], [-4.4, 3.95], [4.4, 3.95], [5.4, 2.6], [24, 2.6]],
  [[24, 2.6], [5.4, 2.6], [4.4, 3.95], [-4.4, 3.95], [-5.4, 2.6], [-24, 2.6]],
  // Far pavement, one lane each way.
  [[-26, 12.85], [26, 12.85]],
  [[26, 13.35], [-26, 13.35]],
]

interface RouteGeo {
  points: P2[]
  /** Cumulative length at each point. */
  acc: number[]
  length: number
}

const ROUTE_GEO: RouteGeo[] = ROUTES.map((points) => {
  const acc = [0]
  for (let i = 1; i < points.length; i++) acc.push(acc[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  return { points, acc, length: acc[acc.length - 1] }
})

/** Position and heading at distance `d` along a route. */
function sampleRoute(r: RouteGeo, d: number, out: { x: number; z: number; heading: number }) {
  let i = 1
  while (i < r.acc.length - 1 && r.acc[i] < d) i++
  const [x0, z0] = r.points[i - 1]
  const [x1, z1] = r.points[i]
  const k = (d - r.acc[i - 1]) / (r.acc[i] - r.acc[i - 1])
  out.x = x0 + (x1 - x0) * k
  out.z = z0 + (z1 - z0) * k
  out.heading = Math.atan2(x1 - x0, z1 - z0)
}

interface WalkerSpec {
  look: PersonLook
  route: number
  speed: number
  offset: number
}

function Walker({ spec }: { spec: WalkerSpec }) {
  const group = useRef<Group>(null)
  const rig = useMemo(createRig, [])
  const route = ROUTE_GEO[spec.route]
  const state = useRef({ d: spec.offset * route.length, heading: 0, x: 0, z: 0 })
  useFrame((three, dt) => {
    const s = state.current
    s.d = (s.d + spec.speed * Math.min(dt, 0.1)) % route.length
    const prev = s.heading
    sampleRoute(route, s.d, s)
    // Soften the turn at route corners.
    let diff = s.heading - prev
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    s.heading = prev + diff * (1 - Math.exp(-6 * dt))
    const g = group.current
    if (!g) return
    g.position.set(s.x, FLOOR_Y, s.z)
    g.rotation.y = s.heading
    applyPose(rig, { phase: s.d * 4.2, walk: 1, sit: 0, hold: 0, sip: 0, wave: 0, t: three.clock.elapsedTime, seed: spec.look.seed }, spec.look.height)
  })
  return (
    <group ref={group}>
      <Person look={spec.look} rig={rig} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Regulars seated at the tables                                       */
/* ------------------------------------------------------------------ */

interface RegularSpec {
  look: PersonLook
  seat: number
  cup: CupId | null
}

function Regular({ spec }: { spec: RegularSpec }) {
  const rig = useMemo(createRig, [])
  const seat = SEATS[spec.seat]
  const sip = useRef(0)
  useFrame((three, dt) => {
    const t = three.clock.elapsedTime
    // Every ~9 s a regular with a cup takes a slow sip.
    const cycle = (t + spec.look.seed * 3.7) % 9
    sip.current = damp(sip.current, spec.cup && cycle < 2.2 ? 1 : 0, 3, dt)
    applyPose(rig, { phase: 0, walk: 0, sit: 1, hold: spec.cup ? 1 : 0, sip: sip.current, wave: 0, t, seed: spec.look.seed }, spec.look.height)
  })
  return (
    <group position={[seat.spot[0], FLOOR_Y, seat.spot[1]]} rotation={[0, seat.rotationY, 0]}>
      <Person look={spec.look} rig={rig} cup={spec.cup} />
    </group>
  )
}

/** Ambient life: people strolling along both pavements and regulars at the tables. */
export function StreetLife() {
  const quality = useCafeStore((s) => s.quality)
  const walkers = useMemo<WalkerSpec[]>(() => {
    const count = quality === 'low' ? 4 : 8
    return Array.from({ length: count }, (_, i) => ({
      look: randomLook(100 + i),
      route: i % ROUTES.length,
      speed: 1.05 + ((i * 37) % 10) * 0.04,
      offset: (i * 0.37 + Math.floor(i / ROUTES.length) * 0.5) % 1,
    }))
  }, [quality])
  const regulars = useMemo<RegularSpec[]>(() => {
    const cups: Array<CupId | null> = ['classic', null, 'demitasse', 'bowl', null]
    return REGULAR_SEATS.map((seat, i) => ({ look: randomLook(500 + i * 11), seat, cup: cups[i % cups.length] }))
  }, [])
  return (
    <group>
      {walkers.map((w, i) => (
        <Walker key={`${quality}-${i}`} spec={w} />
      ))}
      {regulars.map((r) => (
        <Regular key={r.seat} spec={r} />
      ))}
    </group>
  )
}
