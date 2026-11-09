import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { MATERIALS } from '../materials'
import { Box } from './primitives'

/* ------------------------------------------------------------------ */
/* Wrought-iron railing (balusters + scroll rings instanced).          */
/* ------------------------------------------------------------------ */
export interface RailSpec { x0: number; x1: number; y: number; z: number; height: number }

export function Railings({ rails }: { rails: RailSpec[] }) {
  const balRef = useRef<InstancedMesh>(null)
  const ringRef = useRef<InstancedMesh>(null)
  const { balusters, rings } = useMemo(() => {
    const b: Array<[number, number, number, number]> = []
    const r: Array<[number, number, number]> = []
    for (const rail of rails) {
      const n = Math.max(2, Math.round((rail.x1 - rail.x0) / 0.11))
      for (let i = 0; i <= n; i++) b.push([rail.x0 + ((rail.x1 - rail.x0) * i) / n, rail.y + rail.height / 2, rail.z, rail.height])
      for (let i = 0; i < n; i += 2) r.push([rail.x0 + ((rail.x1 - rail.x0) * (i + 1)) / n, rail.y + rail.height * 0.55, rail.z])
    }
    return { balusters: b, rings: r }
  }, [rails])
  useLayoutEffect(() => {
    const o = new Object3D()
    balusters.forEach(([x, y, z, h], i) => {
      o.position.set(x, y, z)
      o.scale.set(1, h, 1)
      o.updateMatrix()
      balRef.current!.setMatrixAt(i, o.matrix)
    })
    o.scale.set(1, 1, 1)
    rings.forEach(([x, y, z], i) => {
      o.position.set(x, y, z)
      o.updateMatrix()
      ringRef.current!.setMatrixAt(i, o.matrix)
    })
    balRef.current!.instanceMatrix.needsUpdate = true
    ringRef.current!.instanceMatrix.needsUpdate = true
    balRef.current!.computeBoundingSphere()
    ringRef.current!.computeBoundingSphere()
  }, [balusters, rings])
  return (
    <group>
      <instancedMesh ref={balRef} args={[undefined, MATERIALS.balconyIron, balusters.length]} castShadow>
        <cylinderGeometry args={[0.009, 0.009, 1, 5]} />
      </instancedMesh>
      <instancedMesh ref={ringRef} args={[undefined, MATERIALS.balconyIron, rings.length]} castShadow>
        <torusGeometry args={[0.07, 0.008, 5, 18]} />
      </instancedMesh>
      {rails.map((r) => (
        <group key={`${r.x0}-${r.y}`}>
          <Box position={[(r.x0 + r.x1) / 2, r.y + r.height, r.z]} size={[r.x1 - r.x0 + 0.04, 0.035, 0.05]} material={MATERIALS.balconyIron} />
          <Box position={[(r.x0 + r.x1) / 2, r.y + 0.06, r.z]} size={[r.x1 - r.x0, 0.02, 0.03]} material={MATERIALS.balconyIron} />
        </group>
      ))}
    </group>
  )
}

