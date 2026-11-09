import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { BufferAttribute, Group, Matrix4, Mesh, type BufferGeometry, type Material, type Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Mark a subtree as excluded from static batching (it animates, is clicked, or
 * is rebuilt at runtime). Interactive wrappers set this automatically.
 */
export const NO_MERGE = { noMerge: true }

function excluded(o: Object3D, root: Object3D) {
  for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.noMerge) return true
  return false
}

function mergeable(o: Object3D): o is Mesh {
  const m = o as Mesh
  if (!m.isMesh || (m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return false
  if (Array.isArray(m.material)) return false
  const mat = m.material as Material & { isShaderMaterial?: boolean }
  // Transparent / custom-shader surfaces keep their own draw calls (sorting & uniforms).
  if (mat.transparent || mat.isShaderMaterial) return false
  const geo = m.geometry as BufferGeometry & { isInstancedBufferGeometry?: boolean }
  if (geo.isInstancedBufferGeometry || !geo.attributes.position || !geo.attributes.normal) return false
  return true
}

/** Clone a geometry into world space with exactly position/normal/uv (uv synthesised if missing). */
function normalized(geo: BufferGeometry, matrix: Matrix4) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()) as BufferGeometry
  g.applyMatrix4(matrix)
  for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key)
  if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  g.morphAttributes = {}
  return g
}

/**
 * Static batching: after the subtree mounts, every eligible mesh is baked into
 * one merged mesh per (material, shadow flags). The originals are hidden, not
 * removed, so React stays in control of them. This turns hundreds of small
 * architecture boxes into a few dozen draw calls (and the same for the shadow pass).
 */
export function MergeStatic({ children }: { children: ReactNode }) {
  const source = useRef<Group>(null)
  const batch = useRef<Group>(null)

  useLayoutEffect(() => {
    const root = source.current!
    const out = batch.current!
    root.updateWorldMatrix(true, true)
    const inverseRoot = new Matrix4().copy(root.matrixWorld).invert()
    const buckets = new Map<string, { material: Material; cast: boolean; receive: boolean; geos: BufferGeometry[]; meshes: Mesh[] }>()

    root.traverse((o) => {
      if (!o.visible || !mergeable(o) || excluded(o, root)) return
      const material = o.material as Material
      const key = `${material.uuid}|${o.castShadow}|${o.receiveShadow}`
      let b = buckets.get(key)
      if (!b) buckets.set(key, (b = { material, cast: o.castShadow, receive: o.receiveShadow, geos: [], meshes: [] }))
      b.geos.push(normalized(o.geometry, new Matrix4().multiplyMatrices(inverseRoot, o.matrixWorld)))
      b.meshes.push(o)
    })

    const created: Mesh[] = []
    for (const b of buckets.values()) {
      if (b.meshes.length < 2) continue
      const geometry = mergeGeometries(b.geos, false)
      b.geos.forEach((g) => g.dispose())
      if (!geometry) continue
      geometry.computeBoundingSphere()
      const mesh = new Mesh(geometry, b.material)
      mesh.castShadow = b.cast
      mesh.receiveShadow = b.receive
      mesh.matrixAutoUpdate = false
      out.add(mesh)
      created.push(mesh)
      for (const m of b.meshes) m.visible = false
    }

    return () => {
      for (const mesh of created) {
        out.remove(mesh)
        mesh.geometry.dispose()
      }
      for (const b of buckets.values()) for (const m of b.meshes) m.visible = true
    }
  }, [])

  return (
    <>
      <group ref={source}>{children}</group>
      <group ref={batch} />
    </>
  )
}
