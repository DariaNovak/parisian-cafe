import { create } from 'zustand'
import { COFFEES, CUPS, type CoffeeType, type CupId, type LatteArt } from '../coffee/coffeeConfig'
import { DESSERTS, type DessertId } from '../desserts/dessertsConfig'

export type OrderItem =
  | { key: string; kind: 'coffee'; coffee: CoffeeType; cup: CupId; art: LatteArt; qty: number }
  | { key: string; kind: 'dessert'; dessert: DessertId; qty: number }

export type OrderStatus = 'open' | 'confirmed'

interface OrderState {
  items: OrderItem[]
  status: OrderStatus
  orderNumber: number | null
  /** Short-lived flag the UI uses to pulse the order button when something is added. */
  lastAddedAt: number

  addCoffee: (coffee: CoffeeType, cup: CupId, art: LatteArt) => void
  addDessert: (dessert: DessertId) => void
  increment: (key: string) => void
  decrement: (key: string) => void
  remove: (key: string) => void
  confirm: () => void
  startNewOrder: () => void
}

export function unitPrice(item: OrderItem) {
  return item.kind === 'coffee' ? COFFEES[item.coffee].price + CUPS[item.cup].surcharge : DESSERTS[item.dessert].price
}

export function orderTotal(items: OrderItem[]) {
  return items.reduce((sum, it) => sum + unitPrice(it) * it.qty, 0)
}

export const itemCount = (items: OrderItem[]) => items.reduce((n, it) => n + it.qty, 0)

export const formatPrice = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

function upsert(items: OrderItem[], key: string, create: () => OrderItem): OrderItem[] {
  const existing = items.find((it) => it.key === key)
  if (existing) return items.map((it) => (it.key === key ? { ...it, qty: it.qty + 1 } : it))
  return [...items, create()]
}

export const useOrderStore = create<OrderState>()((set) => ({
  items: [],
  status: 'open',
  orderNumber: null,
  lastAddedAt: 0,

  addCoffee: (coffee, cup, art) =>
    set((s) => ({
      items: upsert(s.items, `coffee-${coffee}-${cup}-${art}`, () => ({ key: `coffee-${coffee}-${cup}-${art}`, kind: 'coffee', coffee, cup, art, qty: 1 })),
      lastAddedAt: performance.now(),
    })),
  addDessert: (dessert) =>
    set((s) => ({
      items: upsert(s.items, `dessert-${dessert}`, () => ({ key: `dessert-${dessert}`, kind: 'dessert', dessert, qty: 1 })),
      lastAddedAt: performance.now(),
    })),
  increment: (key) => set((s) => ({ items: s.items.map((it) => (it.key === key ? { ...it, qty: it.qty + 1 } : it)) })),
  decrement: (key) => set((s) => ({ items: s.items.flatMap((it) => (it.key !== key ? [it] : it.qty > 1 ? [{ ...it, qty: it.qty - 1 }] : [])) })),
  remove: (key) => set((s) => ({ items: s.items.filter((it) => it.key !== key) })),
  confirm: () => set((s) => (s.items.length ? { status: 'confirmed', orderNumber: 100 + Math.floor(Math.random() * 900) } : s)),
  startNewOrder: () => set({ items: [], status: 'open', orderNumber: null }),
}))
