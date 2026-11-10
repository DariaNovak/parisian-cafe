/** Development-only handle used by automated visual checks (stripped from production builds). */
import type { RootState } from '@react-three/fiber'
import { useCafeStore } from './store/useCafeStore'
import { useCoffeeStore } from '../features/coffee/useCoffeeStore'
import { useOrderStore } from '../features/ordering/useOrderStore'
import { usePhysicsStore } from '../physics/usePhysicsStore'
import { useDessertStore } from '../features/desserts/useDessertStore'
import { orderDessert } from '../features/desserts/orderDessert'
import { dropSugarCubes } from '../physics/actions'

const handle: Record<string, unknown> = {}

export function installDevtools() {
  if (!import.meta.env.DEV) return
  Object.assign(handle, { cafe: useCafeStore, coffee: useCoffeeStore, order: useOrderStore, physics: usePhysicsStore, desserts: useDessertStore, orderDessert, dropSugarCubes })
  ;(window as unknown as { __cafe: unknown }).__cafe = handle
}

export function registerDevtools(key: string, value: unknown) {
  if (import.meta.env.DEV) handle[key] = value
}

export const registerThree = (state: RootState) => registerDevtools('three', state)
