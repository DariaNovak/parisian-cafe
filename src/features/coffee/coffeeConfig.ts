/** Pure data describing drinks, cups and the brewing sequence (no rendering here). */

export type CoffeeType = 'espresso' | 'cappuccino' | 'latte'
export type CupId = 'demitasse' | 'classic' | 'bowl'
export type LatteArt = 'none' | 'heart' | 'rosetta' | 'tulip'

export interface CoffeeSpec {
  id: CoffeeType
  label: string
  description: string
  price: number
  /** Fraction of the cup filled with espresso before milk. */
  espressoFill: number
  /** Fraction of the cup filled after milk (equals espressoFill when no milk). */
  finalFill: number
  milk: boolean
  /** How strongly milk lightens the surface colour (0..1). */
  milkTint: number
  recommendedCup: CupId
}

export const COFFEES: Record<CoffeeType, CoffeeSpec> = {
  espresso: { id: 'espresso', label: 'Espresso', description: 'A short, intense shot with a hazelnut crema.', price: 2.8, espressoFill: 0.62, finalFill: 0.62, milk: false, milkTint: 0, recommendedCup: 'demitasse' },
  cappuccino: { id: 'cappuccino', label: 'Cappuccino', description: 'Espresso crowned with velvety micro-foam.', price: 4.2, espressoFill: 0.32, finalFill: 0.9, milk: true, milkTint: 0.55, recommendedCup: 'classic' },
  latte: { id: 'latte', label: 'Café Latte', description: 'Silky steamed milk with a gentle espresso heart.', price: 4.6, espressoFill: 0.22, finalFill: 0.9, milk: true, milkTint: 0.75, recommendedCup: 'bowl' },
}

export interface CupSpec {
  id: CupId
  label: string
  /** Lathe profile dimensions in metres. */
  radiusTop: number
  radiusBottom: number
  height: number
  color: 'white' | 'pink' | 'sage'
  /** Price surcharge for the cup choice. */
  surcharge: number
}

export const CUPS: Record<CupId, CupSpec> = {
  demitasse: { id: 'demitasse', label: 'Demitasse', radiusTop: 0.032, radiusBottom: 0.022, height: 0.055, color: 'white', surcharge: 0 },
  classic: { id: 'classic', label: 'Rose porcelain', radiusTop: 0.048, radiusBottom: 0.03, height: 0.07, color: 'pink', surcharge: 0.3 },
  bowl: { id: 'bowl', label: 'Sage café bowl', radiusTop: 0.06, radiusBottom: 0.034, height: 0.075, color: 'sage', surcharge: 0.5 },
}

export const LATTE_ARTS: Array<{ id: LatteArt; label: string }> = [
  { id: 'heart', label: 'Heart' },
  { id: 'rosetta', label: 'Rosetta' },
  { id: 'tulip', label: 'Tulip' },
]

/**
 * Brewing state machine. `select` → `ready` are driven by the UI; the timed
 * phases advance automatically (see CoffeeDirector) and drive the 3D animation.
 */
export type BrewPhase =
  | 'select' // choosing drink & cup
  | 'ready' // cup placed under the group head, waiting for "Start"
  | 'grinding'
  | 'brewing' // espresso pours into the cup
  | 'steaming' // steam wand froths milk (milk drinks only)
  | 'pouring-milk'
  | 'art' // waiting for the user to choose latte art
  | 'drawing-art'
  | 'done' // finished, can be served
  | 'serving' // cup travels to the serving tray

/** Duration (seconds) of the automatically advancing phases. */
export const PHASE_DURATION: Partial<Record<BrewPhase, number>> = {
  grinding: 1.8,
  brewing: 4.2,
  steaming: 3.0,
  'pouring-milk': 3.2,
  'drawing-art': 2.6,
  serving: 1.8,
}

export const PHASE_LABEL: Record<BrewPhase, string> = {
  select: 'Choose your drink',
  ready: 'Ready to brew',
  grinding: 'Grinding fresh beans…',
  brewing: 'Extracting espresso…',
  steaming: 'Steaming milk…',
  'pouring-milk': 'Pouring silky milk…',
  art: 'Add latte art',
  'drawing-art': 'Drawing latte art…',
  done: 'Your coffee is ready',
  serving: 'Serving…',
}

/** Returns the phase that follows `phase` for the given drink. */
export function nextPhase(phase: BrewPhase, coffee: CoffeeType): BrewPhase {
  const milk = COFFEES[coffee].milk
  switch (phase) {
    case 'grinding': return 'brewing'
    case 'brewing': return milk ? 'steaming' : 'done'
    case 'steaming': return 'pouring-milk'
    case 'pouring-milk': return 'art'
    case 'drawing-art': return 'done'
    case 'serving': return 'select'
    default: return phase
  }
}

export const ART_INDEX: Record<LatteArt, number> = { none: 0, heart: 1, rosetta: 2, tulip: 3 }
