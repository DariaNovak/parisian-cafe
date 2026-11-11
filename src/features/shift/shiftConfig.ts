/** Rules of the barista shift: what guests order, how long they wait, how they pay. */
import { COFFEES, LATTE_ARTS, type CoffeeType, type LatteArt } from '../coffee/coffeeConfig'
import { DESSERTS, type DessertId } from '../desserts/dessertsConfig'

export interface CustomerOrder {
  coffee: CoffeeType
  /** Requested latte art, or null when the guest does not mind. */
  art: LatteArt | null
  dessert: DessertId | null
}

/** Seconds a guest will wait in line before giving up. */
export const QUEUE_PATIENCE = 85
/** Seconds a guest will wait for their order once it has been taken. */
export const PREP_PATIENCE = 120
/** Extra preparation time granted when the order includes a dessert. */
export const DESSERT_PATIENCE = 20
/** Patience lost when the barista serves the wrong thing. */
export const WRONG_ORDER_PENALTY = 12
/** How long a served guest lingers at a table. */
export const SEATED_TIME: [number, number] = [22, 40]
/** Delay between new guests (shorter when nobody is waiting). */
export const SPAWN_GAP: [number, number] = [16, 26]
export const SPAWN_GAP_IDLE: [number, number] = [5, 9]
/** Never more people than this in the café for the shift (keeps it calm and cheap). */
export const MAX_GUESTS = 8

export const WALK_SPEED = 1.25

const COFFEE_WEIGHTS: Array<[CoffeeType, number]> = [
  ['cappuccino', 0.38],
  ['latte', 0.34],
  ['espresso', 0.28],
]
const DESSERT_IDS = Object.keys(DESSERTS) as DessertId[]

export const randRange = ([a, b]: [number, number]) => a + Math.random() * (b - a)

export function randomOrder(): CustomerOrder {
  let r = Math.random()
  let coffee: CoffeeType = 'cappuccino'
  for (const [id, w] of COFFEE_WEIGHTS) {
    if ((r -= w) <= 0) {
      coffee = id
      break
    }
  }
  const art = COFFEES[coffee].milk && Math.random() < 0.55 ? LATTE_ARTS[Math.floor(Math.random() * LATTE_ARTS.length)].id : null
  const dessert = Math.random() < 0.6 ? DESSERT_IDS[Math.floor(Math.random() * DESSERT_IDS.length)] : null
  return { coffee, art, dessert }
}

export const orderPrice = (o: CustomerOrder) => COFFEES[o.coffee].price + (o.dessert ? DESSERTS[o.dessert].price : 0)

export const artLabel = (art: LatteArt) => LATTE_ARTS.find((a) => a.id === art)?.label ?? 'No art'

/** Tip and star rating from how long the guest waited and whether their art wish came true. */
export function settle(order: CustomerOrder, patienceLeft: number, artMatched: boolean) {
  const total = orderPrice(order)
  const wishBonus = order.art ? (artMatched ? 0.6 : -1) : 0
  const rating = Math.max(1, Math.min(5, Math.round(2 + 3 * patienceLeft + wishBonus)))
  const tip = Math.max(0, Math.round((total * (0.04 + 0.2 * patienceLeft) + (order.art && artMatched ? 0.5 : 0)) * 10) / 10)
  return { total, tip, rating }
}
