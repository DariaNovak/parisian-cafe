export type DessertId = 'croissant' | 'macaron' | 'strawberry' | 'chocolate'

export interface DessertSpec {
  id: DessertId
  label: string
  french: string
  description: string
  price: number
  accent: string
}

export const DESSERTS: Record<DessertId, DessertSpec> = {
  croissant: { id: 'croissant', label: 'Croissant', french: 'Croissant au beurre', description: 'Flaky, golden and laminated with Normandy butter.', price: 2.4, accent: '#C98B4A' },
  macaron: { id: 'macaron', label: 'Macaron', french: 'Macaron à la rose', description: 'Delicate almond shells with a rose-raspberry ganache.', price: 2.1, accent: '#E9BFC4' },
  strawberry: { id: 'strawberry', label: 'Strawberry cake', french: 'Fraisier', description: 'Genoise, mousseline cream and fresh Gariguette strawberries.', price: 5.5, accent: '#D9606E' },
  chocolate: { id: 'chocolate', label: 'Chocolate éclair', french: 'Éclair au chocolat', description: 'Choux pastry filled with dark chocolate crémeux.', price: 3.9, accent: '#5A3A22' },
}

export const DESSERT_LIST = Object.values(DESSERTS)
