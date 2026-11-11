import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { Interactive } from '../../components/three/interactions/Interactive'
import { applyPose, createRig, Person } from '../../models/Person'
import { damp } from '../../utils/math'
import { COFFEES } from '../coffee/coffeeConfig'
import { DESSERTS } from '../desserts/dessertsConfig'
import { formatPrice } from '../ordering/useOrderStore'
import { arrivalPath, FLOOR_Y, followPath, pathFromInside, pathFromSeat, pathToSeat, QUEUE_SPOTS, SEATS, stepToward, streetExit, turnToward, type Mover, type P2 } from '../people/navigation'
import { artLabel, WALK_SPEED } from './shiftConfig'
import { clock, lineOf, useShiftStore, type Customer, type CustomerPhase } from './useShiftStore'

interface Agent extends Mover {
  /** Phase whose route is currently loaded. */
  routeFor: CustomerPhase | null
  route: { path: P2[]; index: number }
  sit: number
  hold: number
  sip: number
  wave: number
  /** Seated guests must stand up before walking away. */
  standing: boolean
}

/** Facing direction for each place in line: the till faces the counter, the rest face the person ahead. */
const QUEUE_HEADING = QUEUE_SPOTS.map((p, i) => (i === 0 ? Math.PI : Math.atan2(QUEUE_SPOTS[i - 1][0] - p[0], QUEUE_SPOTS[i - 1][1] - p[1])))

const CustomerAgent = memo(function CustomerAgent({ customer }: { customer: Customer }) {
  const group = useRef<Group>(null)
  const rig = useMemo(createRig, [])
  const latest = useRef(customer)
  latest.current = customer
  const agent = useRef<Agent>(null!)
  if (!agent.current) {
    const start = arrivalPath(customer.side)
    agent.current = { x: start[0][0], z: start[0][1], heading: -customer.side * Math.PI / 2, phase: 0, walk: 0, routeFor: 'arriving', route: { path: start, index: 1 }, sit: 0, hold: 0, sip: 0, wave: 0, standing: true }
  }

  useFrame((three, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const c = latest.current
    const a = agent.current
    const store = useShiftStore.getState()
    const t = three.clock.elapsedTime
    let moving = false

    const load = (path: P2[]) => {
      a.routeFor = c.phase
      a.route = { path, index: 0 }
    }

    switch (c.phase) {
      case 'arriving':
        moving = true
        if (followPath(a, a.route, WALK_SPEED, dt)) store.arrive(c.id)
        break
      case 'queueing':
      case 'ordering':
      case 'waiting': {
        const slot = Math.min(lineOf(store.customers).findIndex((x) => x.id === c.id), QUEUE_SPOTS.length - 1)
        const [x, z] = QUEUE_SPOTS[Math.max(0, slot)]
        if (!stepToward(a, x, z, WALK_SPEED * 0.8, dt, 0.04)) moving = true
        else {
          turnToward(a, QUEUE_HEADING[Math.max(0, slot)], dt, 5)
          if (slot === 0 && c.phase === 'queueing') store.reachCounter(c.id)
        }
        break
      }
      case 'served': {
        if (a.routeFor !== 'served') load(c.seat !== null ? pathToSeat(SEATS[c.seat]) : pathFromInside(c.side))
        moving = true
        if (followPath(a, a.route, WALK_SPEED * 0.85, dt)) {
          if (c.seat !== null) store.sitDown(c.id)
          else store.depart(c.id)
        }
        break
      }
      case 'seated': {
        const seat = SEATS[c.seat!]
        a.x = damp(a.x, seat.spot[0], 6, dt)
        a.z = damp(a.z, seat.spot[1], 6, dt)
        turnToward(a, seat.rotationY, dt, 6)
        a.standing = false
        break
      }
      case 'leaving': {
        // Stand up first if seated.
        if (!a.standing) {
          if (a.sit > 0.05) break
          a.standing = true
        }
        if (a.routeFor !== 'leaving') {
          const inside = a.z < -0.3
          const byDoor = Math.abs(a.x) < 1.2 && a.z < 3.5
          load(c.seat !== null && a.routeFor === 'seated' ? pathFromSeat(SEATS[c.seat], c.side) : inside ? pathFromInside(c.side) : byDoor ? streetExit(c.side) : [[18 * c.side, 2.6]])
        }
        moving = true
        if (followPath(a, a.route, WALK_SPEED, dt)) store.depart(c.id)
        break
      }
    }
    if (c.phase === 'seated') a.routeFor = 'seated'

    // Blend the pose weights toward what the guest is doing.
    a.walk = damp(a.walk, moving ? 1 : 0, 8, dt)
    a.sit = damp(a.sit, c.phase === 'seated' ? 1 : 0, 4, dt)
    a.hold = damp(a.hold, c.cup && c.payment ? 1 : 0, 6, dt)
    const sipping = c.phase === 'seated' && (t + c.id * 2.3) % 8 < 2
    a.sip = damp(a.sip, sipping ? 1 : 0, 3, dt)
    const waving = c.phase === 'ordering' && (t + c.id) % 5 < 1.6
    a.wave = damp(a.wave, waving ? 1 : 0, 6, dt)

    const g = group.current
    if (!g) return
    g.position.set(a.x, FLOOR_Y, a.z)
    g.rotation.y = a.heading
    applyPose(rig, { phase: a.phase, walk: a.walk, sit: a.sit, hold: a.hold, sip: a.sip, wave: a.wave, t, seed: c.look.seed }, c.look.height)
  })

  const front = customer.phase === 'ordering' || customer.phase === 'waiting'
  const label = customer.phase === 'ordering' ? `${customer.name} — take the order` : `${customer.name} — serve the order`
  return (
    <group ref={group} name={`customer-${customer.id}`}>
      <Interactive label={label} disabled={!front} onSelect={() => (customer.phase === 'ordering' ? useShiftStore.getState().takeOrder(customer.id) : useShiftStore.getState().serve())}>
        <Person look={customer.look} rig={rig} cup={customer.cup} />
      </Interactive>
      <Bubble customer={customer} />
    </group>
  )
})

/** Speech bubble floating above a guest: greeting, order, complaint or payment. */
function Bubble({ customer: c }: { customer: Customer }) {
  // Event bubbles (payment, complaint) fade after a few seconds.
  const [eventVisible, setEventVisible] = useState(false)
  useEffect(() => {
    if (!c.eventAt) return
    setEventVisible(true)
    const id = window.setTimeout(() => setEventVisible(false), Math.max(0, 3600 - (clock() - c.eventAt) * 1000))
    return () => window.clearTimeout(id)
  }, [c.eventAt])

  const ordering = c.phase === 'ordering'
  const waiting = c.phase === 'waiting'
  const show = ordering || waiting || eventVisible
  const coffee = COFFEES[c.order.coffee]

  return (
    <Html position={[0, 1.92 * c.look.height, 0]} center distanceFactor={2.8} zIndexRange={[12, 0]} className="pointer-events-none">
      <AnimatePresence>
        {show && (
          <motion.div
            key={`${c.phase}-${eventVisible}`}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative w-max max-w-[15rem] rounded-2xl bg-cream/95 px-3.5 py-2 text-espresso shadow-soft"
          >
            {c.payment && eventVisible ? (
              <div className="text-center">
                <p className="font-serif text-xl leading-none font-semibold text-[#3E6B48]">+{formatPrice(c.payment.total + c.payment.tip)}</p>
                <p className="mt-0.5 text-[0.7rem] tracking-wider text-terracotta">{'★'.repeat(c.payment.rating)}<span className="text-espresso/20">{'★'.repeat(5 - c.payment.rating)}</span></p>
                {c.remark && <p className="mt-0.5 text-[0.7rem] text-espresso/70 italic">{c.remark}</p>}
              </div>
            ) : ordering ? (
              <div className="text-center">
                <p className="text-[0.8rem] font-semibold">{c.remark ?? 'Hello!'}</p>
                <p className="text-[0.68rem] text-espresso/60">Click me to take my order</p>
              </div>
            ) : waiting ? (
              <div>
                <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-terracotta uppercase">#{c.ticket} · {c.name}</p>
                <p className="text-[0.82rem] leading-snug font-semibold">
                  {coffee.label}
                  {c.order.art && <span className="font-normal text-espresso/70"> · {artLabel(c.order.art).toLowerCase()}</span>}
                  {c.order.dessert && <span className="font-normal"> + {DESSERTS[c.order.dessert].label}</span>}
                </p>
                {c.remark && eventVisible && <p className="text-[0.7rem] text-[#A4402F] italic">{c.remark}</p>}
              </div>
            ) : (
              <p className={`text-[0.78rem] italic ${c.mood === 'angry' ? 'text-[#A4402F]' : 'text-espresso/75'}`}>{c.remark}</p>
            )}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-cream/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </Html>
  )
}

/** Every guest of the current (or just-ended) shift. */
export function Customers() {
  const customers = useShiftStore((s) => s.customers)
  return (
    <>
      {customers.map((c) => (
        <CustomerAgent key={c.id} customer={c} />
      ))}
    </>
  )
}
