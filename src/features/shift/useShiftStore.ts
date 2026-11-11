import { create } from 'zustand'
import { useCafeStore } from '../../app/store/useCafeStore'
import { playSfx, playThanks } from '../../audio/audioEngine'
import { usePhysicsStore } from '../../physics/usePhysicsStore'
import { COFFEES, type CoffeeType, type CupId, type LatteArt } from '../coffee/coffeeConfig'
import { DESSERTS, type DessertId } from '../desserts/dessertsConfig'
import { formatPrice } from '../ordering/useOrderStore'
import { FIRST_NAMES, randomLook, type PersonLook } from '../people/look'
import { GUEST_SEATS, MAX_QUEUE } from '../people/navigation'
import {
  DESSERT_PATIENCE,
  MAX_GUESTS,
  PREP_PATIENCE,
  QUEUE_PATIENCE,
  randomOrder,
  randRange,
  SEATED_TIME,
  settle,
  SPAWN_GAP,
  SPAWN_GAP_IDLE,
  WRONG_ORDER_PENALTY,
  type CustomerOrder,
} from './shiftConfig'

/** Seconds on the same monotonic clock as the render loop. */
export const clock = () => performance.now() / 1000

/**
 * A guest's journey:
 * arriving (street → door) → queueing → ordering (at the till, waiting for the
 * barista) → waiting (order taken) → served (walks to a seat) → seated → leaving.
 * A guest whose patience runs out goes straight to `leaving`.
 */
export type CustomerPhase = 'arriving' | 'queueing' | 'ordering' | 'waiting' | 'served' | 'seated' | 'leaving'

export interface Customer {
  id: number
  name: string
  look: PersonLook
  /** Which end of the street they come from and return to. */
  side: 1 | -1
  order: CustomerOrder
  phase: CustomerPhase
  /** When they joined the line (orders the queue). */
  queuedAt: number
  patienceStart: number
  patienceEnd: number
  ticket: number | null
  seat: number | null
  seatedUntil: number
  mood: 'neutral' | 'happy' | 'angry'
  /** Timestamp of the last notable moment (paid, complained, stormed off) for speech bubbles. */
  eventAt: number
  payment: { total: number; tip: number; rating: number } | null
  /** Cup they carry away once served. */
  cup: CupId | null
  /** Short remark shown in their speech bubble. */
  remark: string | null
}

export type TrayItem =
  | { id: number; bodyId: number; kind: 'coffee'; coffee: CoffeeType; cup: CupId; art: LatteArt }
  | { id: number; bodyId: number; kind: 'dessert'; dessert: DessertId }

type NewTrayItem = TrayItem extends infer T ? (T extends TrayItem ? Omit<T, 'id'> : never) : never

export interface ShiftStats {
  earnings: number
  tips: number
  served: number
  lost: number
  ratings: number[]
}

const IN_LINE: CustomerPhase[] = ['queueing', 'ordering', 'waiting']
const EMPTY_STATS: ShiftStats = { earnings: 0, tips: 0, served: 0, lost: 0, ratings: [] }

/** Guests standing in line, front first. */
export function lineOf(customers: Customer[]) {
  return customers.filter((c) => IN_LINE.includes(c.phase)).sort((a, b) => a.queuedAt - b.queuedAt)
}

export const averageRating = (s: ShiftStats) => (s.ratings.length ? s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length : 0)

/** Which ordered items are already on the tray (coffee matched by drink, art preferred). */
export function matchTray(order: CustomerOrder, tray: TrayItem[]) {
  const coffees = tray.filter((t): t is Extract<TrayItem, { kind: 'coffee' }> => t.kind === 'coffee' && t.coffee === order.coffee)
  const coffee = coffees.find((t) => !order.art || t.art === order.art) ?? coffees[0] ?? null
  const dessert = order.dessert ? (tray.find((t) => t.kind === 'dessert' && t.dessert === order.dessert) ?? null) : null
  return { coffee, dessert, complete: !!coffee && (!order.dessert || !!dessert) }
}

interface ShiftState {
  active: boolean
  /** End-of-shift summary card visibility. */
  summary: boolean
  customers: Customer[]
  tray: TrayItem[]
  stats: ShiftStats
  nextSpawnAt: number
  ticketCounter: number

  startShift: () => void
  endShift: () => void
  closeSummary: () => void
  /** Periodic update: patience, seated timers, new arrivals. */
  tick: () => void
  /** Called by the 3D agents as guests reach milestones on foot. */
  arrive: (id: number) => void
  reachCounter: (id: number) => void
  sitDown: (id: number) => void
  depart: (id: number) => void
  takeOrder: (id: number) => void
  serve: () => void
  addToTray: (item: NewTrayItem) => void
  clearTray: () => void
}

let nextCustomerId = 1
let nextTrayId = 1

const patch = (list: Customer[], id: number, change: Partial<Customer>) => list.map((c) => (c.id === id ? { ...c, ...change } : c))

function freeSeat(customers: Customer[]): number | null {
  const taken = new Set(customers.filter((c) => (c.phase === 'served' || c.phase === 'seated') && c.seat !== null).map((c) => c.seat))
  const free = GUEST_SEATS.filter((s) => !taken.has(s))
  // Mostly inside seats first, but now and then a guest prefers the terrace.
  if (!free.length) return null
  return Math.random() < 0.7 ? free[0] : free[Math.floor(Math.random() * free.length)]
}

function newCustomer(): Customer {
  const id = nextCustomerId++
  const seed = Math.floor(Math.random() * 1e6)
  return {
    id,
    name: FIRST_NAMES[seed % FIRST_NAMES.length],
    look: randomLook(seed),
    side: Math.random() < 0.5 ? 1 : -1,
    order: randomOrder(),
    phase: 'arriving',
    queuedAt: 0,
    patienceStart: 0,
    patienceEnd: Infinity,
    ticket: null,
    seat: null,
    seatedUntil: 0,
    mood: 'neutral',
    eventAt: 0,
    payment: null,
    cup: null,
    remark: null,
  }
}

const cafe = () => useCafeStore.getState()

/** Speaking pitch (Hz): shorter figures get higher voices. */
const voiceOf = (c: Customer) => 150 + Math.max(0, 1.04 - c.look.height) * 900

export const useShiftStore = create<ShiftState>()((set, get) => ({
  active: false,
  summary: false,
  customers: [],
  tray: [],
  stats: EMPTY_STATS,
  nextSpawnAt: 0,
  ticketCounter: 0,

  startShift: () => {
    set({ active: true, summary: false, stats: { ...EMPTY_STATS, ratings: [] }, nextSpawnAt: clock() + 1.5 })
    cafe().closePanel()
    cafe().goToView('barista')
    cafe().setDoorOpen(true)
    cafe().notify('Your shift has started · guests are on their way')
    playSfx('door')
  },

  endShift: () => {
    const t = clock()
    set((s) => ({
      active: false,
      summary: true,
      customers: s.customers.map((c) => (c.phase === 'arriving' || IN_LINE.includes(c.phase) ? { ...c, phase: 'leaving', eventAt: t, remark: 'See you soon!' } : c)),
    }))
    cafe().closePanel()
    // Step out from behind the counter.
    cafe().goToView('interior')
  },

  closeSummary: () => set({ summary: false }),

  tick: () => {
    const t = clock()
    const s = get()
    let lost = 0
    let changed = false
    const customers = s.customers.map((c) => {
      if (IN_LINE.includes(c.phase) && t >= c.patienceEnd) {
        lost++
        changed = true
        return { ...c, phase: 'leaving' as const, mood: 'angry' as const, eventAt: t, remark: 'Too slow… I’m leaving.' }
      }
      if (c.phase === 'seated' && t >= c.seatedUntil) {
        changed = true
        return { ...c, phase: 'leaving' as const }
      }
      return c
    })
    let { nextSpawnAt } = s
    if (s.active && t >= nextSpawnAt) {
      const waiting = customers.filter((c) => c.phase === 'arriving' || IN_LINE.includes(c.phase)).length
      if (waiting < MAX_QUEUE && customers.length < MAX_GUESTS) {
        customers.push(newCustomer())
        changed = true
      }
      nextSpawnAt = t + randRange(waiting === 0 ? SPAWN_GAP_IDLE : SPAWN_GAP)
    }
    if (lost) {
      playSfx('fail')
      cafe().notify(lost > 1 ? `${lost} guests gave up waiting` : 'A guest gave up waiting')
    }
    if (changed || lost || nextSpawnAt !== s.nextSpawnAt)
      set({
        customers,
        nextSpawnAt,
        stats: lost ? { ...s.stats, lost: s.stats.lost + lost, ratings: [...s.stats.ratings, ...Array(lost).fill(1)] } : s.stats,
      })
  },

  arrive: (id) => {
    const t = clock()
    set((s) => ({ customers: patch(s.customers, id, { phase: 'queueing', queuedAt: t, patienceStart: t, patienceEnd: t + QUEUE_PATIENCE }) }))
  },

  reachCounter: (id) => {
    const c = get().customers.find((x) => x.id === id)
    if (c?.phase !== 'queueing') return
    set((s) => ({ customers: patch(s.customers, id, { phase: 'ordering', remark: 'Hello!' }) }))
    // The guest rings the counter bell.
    playSfx('deskBell')
  },

  takeOrder: (id) => {
    const c = get().customers.find((x) => x.id === id)
    if (c?.phase !== 'ordering') return
    const t = clock()
    const ticket = get().ticketCounter + 1
    set((s) => ({
      ticketCounter: ticket,
      customers: patch(s.customers, id, { phase: 'waiting', ticket, patienceStart: t, patienceEnd: t + PREP_PATIENCE + (c.order.dessert ? DESSERT_PATIENCE : 0), remark: null }),
    }))
    // The barista jots the order down.
    playSfx('ticket')
  },

  serve: () => {
    const s = get()
    const c = lineOf(s.customers)[0]
    if (!c || c.phase !== 'waiting') return
    const t = clock()
    const match = matchTray(c.order, s.tray)
    if (!match.complete) {
      playSfx('fail')
      const missing = !match.coffee ? COFFEES[c.order.coffee].label : DESSERTS[c.order.dessert!].label
      set({ customers: patch(s.customers, c.id, { patienceEnd: c.patienceEnd - WRONG_ORDER_PENALTY, eventAt: t, remark: `Where is my ${missing.toLowerCase()}?` }) })
      cafe().notify(`${c.name} is still missing: ${missing}`)
      return
    }
    const used = [match.coffee!, match.dessert].filter((x): x is TrayItem => !!x)
    usePhysicsStore.getState().remove(used.map((u) => u.bodyId))
    const patienceLeft = Math.max(0, Math.min(1, (c.patienceEnd - t) / (c.patienceEnd - c.patienceStart)))
    const artMatched = !c.order.art || match.coffee!.art === c.order.art
    const payment = settle(c.order, patienceLeft, artMatched)
    const seat = freeSeat(s.customers)
    set({
      tray: s.tray.filter((x) => !used.includes(x)),
      customers: patch(s.customers, c.id, {
        phase: 'served',
        seat,
        mood: payment.rating >= 3 ? 'happy' : 'neutral',
        eventAt: t,
        payment,
        cup: match.coffee!.cup,
        remark: payment.rating >= 4 ? 'Thanks, perfect!' : payment.rating >= 3 ? 'Thank you!' : 'Finally…',
      }),
      stats: {
        earnings: s.stats.earnings + payment.total + payment.tip,
        tips: s.stats.tips + payment.tip,
        served: s.stats.served + 1,
        lost: s.stats.lost,
        ratings: [...s.stats.ratings, payment.rating],
      },
    })
    playSfx('cash')
    playThanks(voiceOf(c), 0.7)
    cafe().notify(`${c.name} paid ${formatPrice(payment.total)}${payment.tip ? ` + ${formatPrice(payment.tip)} tip` : ''} · ${'★'.repeat(payment.rating)}`)
  },

  sitDown: (id) => set((s) => ({ customers: patch(s.customers, id, { phase: 'seated', seatedUntil: clock() + randRange(SEATED_TIME) }) })),

  depart: (id) => set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),

  addToTray: (item) => {
    set((s) => ({ tray: [...s.tray, { ...item, id: nextTrayId++ } as TrayItem] }))
    const front = lineOf(get().customers)[0]
    const ready = front?.phase === 'waiting' && matchTray(front.order, get().tray).complete
    cafe().notify(ready ? `Order complete · serve ${front.name}` : `${item.kind === 'coffee' ? COFFEES[item.coffee].label : DESSERTS[item.dessert].label} is on the tray`)
    // Hand control back to the till once something lands on the tray.
    cafe().closePanel()
    cafe().goToView('barista')
  },

  clearTray: () => {
    usePhysicsStore.getState().remove(get().tray.map((x) => x.bodyId))
    set({ tray: [] })
  },
}))
