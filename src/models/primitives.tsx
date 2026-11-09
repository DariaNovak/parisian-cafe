import { BoxGeometry, CylinderGeometry, SphereGeometry, type Material } from 'three'
import type { ReactNode } from 'react'

/** Shared unit geometries: meshes scale these instead of allocating new geometry. */
export const UNIT_BOX = new BoxGeometry(1, 1, 1)
export const UNIT_CYLINDER = new CylinderGeometry(1, 1, 1, 32)
export const UNIT_SPHERE = new SphereGeometry(1, 24, 16)

type Vec3 = [number, number, number]

interface BoxProps {
  /** Min / max corners are often easier to reason about for architecture. */
  min?: Vec3
  max?: Vec3
  position?: Vec3
  size?: Vec3
  rotation?: Vec3
  material: Material
  cast?: boolean
  receive?: boolean
  children?: ReactNode
}

/** An axis-aligned box defined either by centre+size or by min/max corners. */
export function Box({ min, max, position, size, rotation, material, cast = true, receive = true, children }: BoxProps) {
  const s: Vec3 = size ?? [max![0] - min![0], max![1] - min![1], max![2] - min![2]]
  const p: Vec3 = position ?? [(min![0] + max![0]) / 2, (min![1] + max![1]) / 2, (min![2] + max![2]) / 2]
  return (
    <mesh geometry={UNIT_BOX} material={material} position={p} scale={s} rotation={rotation} castShadow={cast} receiveShadow={receive}>
      {children}
    </mesh>
  )
}

export function Cylinder({ position, radius, height, material, rotation, cast = true, receive = true }: { position: Vec3; radius: number; height: number; material: Material; rotation?: Vec3; cast?: boolean; receive?: boolean }) {
  return <mesh geometry={UNIT_CYLINDER} material={material} position={position} rotation={rotation} scale={[radius, height, radius]} castShadow={cast} receiveShadow={receive} />
}
