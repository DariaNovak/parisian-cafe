import { create } from 'zustand'
import type { DessertId } from './dessertsConfig'

interface DessertState {
  /** Dessert highlighted in the display cabinet / dessert panel. */
  selected: DessertId | null
  select: (id: DessertId | null) => void
}

export const useDessertStore = create<DessertState>()((set) => ({
  selected: null,
  select: (selected) => set({ selected }),
}))
