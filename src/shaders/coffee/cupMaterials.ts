import { ART_INDEX, COFFEES, type CoffeeType, type LatteArt } from '../../features/coffee/coffeeConfig'
import { createCoffeeSurfaceMaterial, type CoffeeSurfaceMaterial } from './coffeeSurface'

/**
 * Finished-drink surface materials, shared per (drink, art) combination so a
 * dozen cups cost at most a handful of shader instances. `tickCoffeeMaterials`
 * advances their clock once per frame.
 */
const cache = new Map<string, CoffeeSurfaceMaterial>()

export function finishedCoffeeMaterial(coffee: CoffeeType, art: LatteArt) {
  const key = `${coffee}:${art}`
  let m = cache.get(key)
  if (!m) {
    const spec = COFFEES[coffee]
    m = createCoffeeSurfaceMaterial({ crema: 1, milk: spec.milkTint, foam: spec.milk ? 1 : 0, art: ART_INDEX[art], artProgress: 1 })
    cache.set(key, m)
  }
  return m
}

export function tickCoffeeMaterials(time: number) {
  for (const m of cache.values()) m.uniforms.uTime.value = time
}
