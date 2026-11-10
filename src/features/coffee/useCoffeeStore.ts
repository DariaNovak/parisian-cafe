import { create } from 'zustand'
import { PHASE_DURATION, nextPhase, type BrewPhase, type CoffeeType, type CupId, type LatteArt } from './coffeeConfig'

/** Seconds on a monotonic clock shared with the render loop. */
export const now = () => performance.now() / 1000

interface CoffeeState {
  coffee: CoffeeType | null
  cup: CupId | null
  art: LatteArt
  phase: BrewPhase
  /** Timestamp (seconds) when the current phase began; animations derive progress from it. */
  phaseStart: number

  selectCoffee: (coffee: CoffeeType) => void
  selectCup: (cup: CupId) => void
  start: () => void
  chooseArt: (art: LatteArt) => void
  serve: () => void
  /** Advances a timed phase once its duration has elapsed (called by CoffeeDirector). */
  advance: () => BrewPhase
  reset: () => void
}

const enter = (phase: BrewPhase) => ({ phase, phaseStart: now() })

export const useCoffeeStore = create<CoffeeState>()((set, get) => ({
  coffee: null,
  cup: null,
  art: 'none',
  phase: 'select',
  phaseStart: now(),

  selectCoffee: (coffee) => get().phase === 'select' && set({ coffee }),
  selectCup: (cup) => get().phase === 'select' && set({ cup }),
  start: () => {
    const { coffee, cup, phase } = get()
    if (phase === 'select' && coffee && cup) set({ ...enter('grinding'), art: 'none' })
  },
  chooseArt: (art) => get().phase === 'art' && set({ art, ...enter(art === 'none' ? 'done' : 'drawing-art') }),
  serve: () => get().phase === 'done' && set(enter('serving')),
  advance: () => {
    const { phase, coffee } = get()
    if (!coffee || PHASE_DURATION[phase] === undefined) return phase
    const next = nextPhase(phase, coffee)
    // After serving, keep the drink choice but clear the cup so a new one is placed.
    set(next === 'select' ? { ...enter('select'), cup: null } : enter(next))
    return next
  },
  reset: () => set({ ...enter('select'), coffee: null, cup: null, art: 'none' }),
}))

/** Normalised progress (0..1) of the active timed phase. */
export function phaseProgress(state: { phase: BrewPhase; phaseStart: number }) {
  const d = PHASE_DURATION[state.phase]
  return d ? Math.min(1, (now() - state.phaseStart) / d) : 1
}
