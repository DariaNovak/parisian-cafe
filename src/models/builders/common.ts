/**
 * Shared helpers for the procedural model builders.
 *
 * Builders only depend on `three` (no DOM), so they can run both in the browser
 * (as a fallback when a GLB fails to load) and in Node (scripts/build-models.ts,
 * which exports them as optimized GLB files with GLTFExporter).
 */
import {
  BufferGeometry,
  CatmullRomCurve3,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function stdMat(name: string, color: string, roughness = 0.6, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) {
  const m = new MeshStandardMaterial({ color, roughness, metalness })
  Object.assign(m, extra)
  m.name = name
  return m
}

/** Lathe from a list of [radius, height] pairs. */
export function lathe(points: Array<[number, number]>, segments = 32) {
  return new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), segments)
}

/** Tube along a smooth curve through the given points. */
export function tube(points: Array<[number, number, number]>, radius: number, tubular = 32, radial = 8, closed = false) {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), closed, 'centripetal')
  return new TubeGeometry(curve, tubular, radius, radial, closed)
}

/** Returns a geometry baked with the given transform (geometry is cloned). */
export function placed(geo: BufferGeometry, position: [number, number, number] = [0, 0, 0], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
  const o = new Object3D()
  o.position.set(...position)
  o.rotation.set(...rotation)
  o.scale.set(...scale)
  o.updateMatrix()
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  g.applyMatrix4(o.matrix)
  // Models are untextured: keep position + normal only so parts merge and weld cleanly.
  for (const key of Object.keys(g.attributes)) if (!['position', 'normal'].includes(key)) g.deleteAttribute(key)
  return g
}

/**
 * Accumulates geometry parts per material and emits one merged mesh per material.
 * This keeps every model at a handful of draw calls, which matters because chairs
 * and lamps are rendered many times (and instanced at runtime).
 */
export class PartBuilder {
  private parts = new Map<MeshStandardMaterial, BufferGeometry[]>()

  add(material: MeshStandardMaterial, geo: BufferGeometry, position?: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number]) {
    const list = this.parts.get(material) ?? []
    list.push(placed(geo, position, rotation, scale))
    this.parts.set(material, list)
    return this
  }

  build(name: string, castShadow = true) {
    const group = new Group()
    group.name = name
    for (const [material, geos] of this.parts) {
      const raw = mergeGeometries(geos, false)
      // Re-index: welds duplicated vertices so GLBs stay small and GPU caches work.
      const merged = raw ? mergeVertices(raw, 1e-4) : null
      if (!merged) continue
      merged.computeBoundingSphere()
      const mesh = new Mesh(merged, material)
      mesh.name = `${name}_${material.name}`
      mesh.castShadow = castShadow
      mesh.receiveShadow = true
      group.add(mesh)
    }
    return group
  }
}

export const identity = new Matrix4()
