import { playSfx } from '../../audio/audioEngine'
import { TRAY_POS } from '../../constants/layout'
import { usePhysicsStore } from '../../physics/usePhysicsStore'
import { useOrderStore } from '../ordering/useOrderStore'
import { useCafeStore } from '../../app/store/useCafeStore'
import { useShiftStore } from '../shift/useShiftStore'
import { DESSERTS, type DessertId } from './dessertsConfig'

/** Spots on the right half of the tray (the doily sits at x ≈ +0.1); coffees use the left half. */
const DESSERT_SPOTS: Array<[number, number]> = [[0.1, 0], [0.19, -0.09], [0.19, 0.09], [0.03, -0.11], [0.03, 0.11]]

/**
 * Adds a dessert to the order and drops a physical copy onto the serving tray,
 * where Rapier settles it among whatever is already there.
 */
export function orderDessert(id: DessertId) {
  const shift = useShiftStore.getState().active
  if (!shift) useOrderStore.getState().addDessert(id)
  const n = usePhysicsStore.getState().bodies.filter((b) => b.kind === 'dessert').length
  const bodyId = usePhysicsStore.getState().spawn({
    kind: 'dessert',
    dessert: id,
    variant: n,
    // Desserts drop onto the right half of the tray (coffees use the left half);
    // later ones land on top of earlier ones and Rapier sorts out the pile.
    position: [TRAY_POS[0] + DESSERT_SPOTS[n % DESSERT_SPOTS.length][0], TRAY_POS[1] + 0.12 + Math.floor(n / DESSERT_SPOTS.length) * 0.06, TRAY_POS[2] + DESSERT_SPOTS[n % DESSERT_SPOTS.length][1]],
  })
  playSfx('pop')
  if (shift) useShiftStore.getState().addToTray({ kind: 'dessert', bodyId, dessert: id })
  else useCafeStore.getState().notify(`${DESSERTS[id].label} added · placed on the tray`)
}
