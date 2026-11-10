import { playSfx } from '../../audio/audioEngine'
import { TRAY_POS } from '../../constants/layout'
import { usePhysicsStore } from '../../physics/usePhysicsStore'
import { useOrderStore } from '../ordering/useOrderStore'
import { useCafeStore } from '../../app/store/useCafeStore'
import { DESSERTS, type DessertId } from './dessertsConfig'

/**
 * Adds a dessert to the order and drops a physical copy onto the serving tray,
 * where Rapier settles it among whatever is already there.
 */
export function orderDessert(id: DessertId) {
  useOrderStore.getState().addDessert(id)
  const n = usePhysicsStore.getState().bodies.filter((b) => b.kind === 'dessert').length
  usePhysicsStore.getState().spawn({
    kind: 'dessert',
    dessert: id,
    variant: n,
    // Desserts drop onto the right half of the tray (coffees use the left half);
    // later ones land on top of earlier ones and Rapier sorts out the pile.
    position: [TRAY_POS[0] + 0.03 + (n % 3) * 0.09, TRAY_POS[1] + 0.22, TRAY_POS[2] - 0.08 + (Math.floor(n / 3) % 2) * 0.15],
  })
  playSfx('pop')
  useCafeStore.getState().notify(`${DESSERTS[id].label} added · placed on the tray`)
}
