import { forwardRef, type ReactNode } from 'react'
import { BufferGeometry, CircleGeometry, Group, LatheGeometry, TorusGeometry, Vector2, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CUPS, type CupId, type CupSpec } from '../features/coffee/coffeeConfig'
import { MATERIALS } from '../materials'

const cupGeometryCache = new Map<CupId, BufferGeometry>()
const saucerCache = new Map<CupId, BufferGeometry>()
export const SURFACE_DISC = new CircleGeometry(1, 48).rotateX(-Math.PI / 2)

/** Interior radius of the cup at a given fill level (0 = bottom, 1 = rim). */
export function surfaceRadius(cup: CupSpec, fill: number) {
  const inner = 0.0045
  return cup.radiusBottom - inner + (cup.radiusTop - cup.radiusBottom) * Math.pow(fill, 0.85) - 0.001
}

/** Height of the liquid surface above the cup's origin. */
export const surfaceHeight = (cup: CupSpec, fill: number) => 0.008 + (cup.height - 0.012) * fill

/** Cup body (double-walled lathe) merged with its handle into one geometry. */
export function cupGeometry(id: CupId) {
  const hit = cupGeometryCache.get(id)
  if (hit) return hit
  const c = CUPS[id]
  const t = 0.0045
  const pts: Array<[number, number]> = [
    [0, 0.0], [c.radiusBottom * 0.8, 0.0], [c.radiusBottom * 0.85, 0.004], [c.radiusBottom, 0.006],
    [c.radiusBottom + (c.radiusTop - c.radiusBottom) * 0.35, c.height * 0.3],
    [c.radiusBottom + (c.radiusTop - c.radiusBottom) * 0.8, c.height * 0.75],
    [c.radiusTop, c.height], [c.radiusTop - t * 0.5, c.height + 0.0015], [c.radiusTop - t, c.height],
    [c.radiusBottom - t + (c.radiusTop - c.radiusBottom) * 0.8, c.height * 0.75],
    [c.radiusBottom - t, 0.012], [0, 0.008],
  ]
  const body = new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), 40)
  const handleR = c.height * 0.3
  const handle = new TorusGeometry(handleR, 0.0045, 8, 20, Math.PI * 1.25)
  handle.rotateZ(-Math.PI * 0.62)
  handle.translate(c.radiusTop * 0.92 + handleR * 0.55, c.height * 0.55, 0)
  const merged = mergeGeometries([body.toNonIndexed(), handle.toNonIndexed()], false)!
  merged.computeVertexNormals()
  cupGeometryCache.set(id, merged)
  return merged
}

export function saucerGeometry(id: CupId) {
  const hit = saucerCache.get(id)
  if (hit) return hit
  const r = CUPS[id].radiusTop * 1.85
  const g = new LatheGeometry(
    ([[0, 0.002], [r * 0.45, 0.002], [r * 0.5, 0.0], [r * 0.55, 0.004], [r * 0.95, 0.011], [r, 0.014], [r * 0.97, 0.016], [r * 0.6, 0.008], [r * 0.3, 0.007], [0, 0.007]] as Array<[number, number]>).map(([x, y]) => new Vector2(x, y)),
    40,
  )
  saucerCache.set(id, g)
  return g
}

export function cupMaterial(cup: CupSpec): Material {
  return cup.color === 'pink' ? MATERIALS.ceramicPink : cup.color === 'sage' ? MATERIALS.ceramicSage : MATERIALS.ceramic
}

interface CoffeeCupProps {
  cupId: CupId
  /** 0..1 liquid level; 0 hides the surface. */
  fill?: number
  surfaceMaterial?: Material
  withSaucer?: boolean
  position?: [number, number, number]
  rotation?: [number, number, number]
  children?: ReactNode
}

/** A ceramic cup (+ optional saucer) with a liquid surface disc at the given fill level. */
export const CoffeeCup = forwardRef<Group, CoffeeCupProps>(function CoffeeCup({ cupId, fill = 0, surfaceMaterial, withSaucer = true, position, rotation, children }, ref) {
  const cup = CUPS[cupId]
  const lift = withSaucer ? 0.007 : 0
  const r = surfaceRadius(cup, fill)
  return (
    <group ref={ref} position={position} rotation={rotation}>
      {withSaucer && <mesh geometry={saucerGeometry(cupId)} material={cupMaterial(cup)} castShadow receiveShadow />}
      <group position={[0, lift, 0]}>
        <mesh geometry={cupGeometry(cupId)} material={cupMaterial(cup)} castShadow receiveShadow />
        {fill > 0.01 && (
          <mesh name="coffee-surface" geometry={SURFACE_DISC} material={surfaceMaterial ?? MATERIALS.coffeeBean} position={[0, surfaceHeight(cup, fill), 0]} scale={[r, 1, r]} />
        )}
        {children}
      </group>
    </group>
  )
})
