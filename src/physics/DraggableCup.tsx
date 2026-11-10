import { Select } from '@react-three/postprocessing'
import { CylinderCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Plane, Vector3 } from 'three'
import { useCafeStore } from '../app/store/useCafeStore'
import { playSfx } from '../audio/audioEngine'
import { Steam } from '../components/three/effects/Steam'
import { COFFEES, CUPS, LATTE_ARTS, type CoffeeType, type CupId, type LatteArt } from '../features/coffee/coffeeConfig'
import { CoffeeCup, surfaceHeight } from '../models/CoffeeCup'
import { finishedCoffeeMaterial } from '../shaders/coffee/cupMaterials'
import { COLLISION } from './groups'

interface DraggableCupProps {
  coffee: CoffeeType
  cup: CupId
  art: LatteArt
  position: [number, number, number]
  rotationY?: number
}

/** Pixels the pointer must travel before a press becomes a drag (otherwise it's a click). */
const DRAG_THRESHOLD = 6
/** How high above its pick-up point a dragged cup floats. */
const LIFT = 0.14
/** Keeps a dragged cup within reach of where it was picked up. */
const MAX_REACH = 3.5

const plane = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

/**
 * A cup of coffee as a Rapier rigid body.
 *
 *  - Dynamic by default: it rests on tables under gravity and collides with
 *    other cups, desserts and sugar cubes (simplified cylinder colliders).
 *  - Press + drag switches it to a kinematic body that follows the pointer on a
 *    horizontal plane slightly above the table; releasing switches it back to
 *    dynamic, so it drops and settles wherever it was placed.
 *  - A short press without movement inspects the cup instead.
 */
export function DraggableCup({ coffee, cup, art, position, rotationY = 0 }: DraggableCupProps) {
  const body = useRef<RapierRigidBody>(null)
  const { rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const raycaster = useThree((s) => s.raycaster)
  const pointer = useThree((s) => s.pointer)
  const [hovered, setHovered] = useState(false)
  const drag = useRef<{ active: boolean; sx: number; sy: number; planeY: number; origin: Vector3; last: Vector3; vel: Vector3 } | null>(null)
  const lastClink = useRef(0)
  // Stable userData object shared with the table sensors (see StaticColliders).
  const userData = useMemo(() => ({ kind: 'cup', justDropped: false }), [])

  const spec = CUPS[cup]
  const material = finishedCoffeeMaterial(coffee, art)
  const fill = COFFEES[coffee].finalFill
  const radius = spec.radiusTop * 1.85 // saucer radius = footprint
  const halfH = (spec.height + 0.012) / 2
  const steamY = 0.007 + surfaceHeight(spec, fill)
  const steamIntensity = useMemo(() => ({ value: 0.55 }), [])

  const end = () => {
    const d = drag.current
    drag.current = null
    useCafeStore.getState().setDragging(false)
    window.removeEventListener('pointermove', onMove)
    const b = body.current
    if (!d || !b) return
    if (d.active) {
      // Back to a dynamic body; keep a little of the hand's velocity for a natural set-down.
      b.setBodyType(rapier.RigidBodyType.Dynamic, true)
      userData.justDropped = true
      b.setLinvel({ x: d.vel.x * 0.3, y: 0, z: d.vel.z * 0.3 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    } else {
      const t = b.translation()
      const artLabel = art === 'none' ? 'no latte art' : `${LATTE_ARTS.find((a) => a.id === art)?.label} latte art`
      useCafeStore.getState().focusOn(
        { key: `cup-${t.x.toFixed(2)}-${t.z.toFixed(2)}`, position: [t.x + 0.32, t.y + 0.38, t.z + 0.42], target: [t.x, t.y + 0.04, t.z], inside: t.z < -0.3 },
        { title: `${COFFEES[coffee].label} · ${spec.label}`, subtitle: `${artLabel} — drag the cup to move it` },
      )
    }
  }

  function onMove(ev: PointerEvent) {
    const d = drag.current
    if (!d || d.active) return
    if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > DRAG_THRESHOLD) {
      d.active = true
      body.current?.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true)
      playSfx('tap')
    }
  }

  // Safety net: never leave a window listener behind if the cup unmounts mid-drag.
  useEffect(() => () => window.removeEventListener('pointermove', onMove), [])

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const b = body.current
    if (!b || e.button !== 0) return
    const t = b.translation()
    drag.current = { active: false, sx: e.clientX, sy: e.clientY, planeY: t.y + LIFT, origin: new Vector3(t.x, t.y, t.z), last: new Vector3(t.x, t.y + LIFT, t.z), vel: new Vector3() }
    // Freeze the orbit camera immediately so the press can't rotate the view.
    useCafeStore.getState().setDragging(true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end, { once: true })
  }

  useFrame((_, dt) => {
    const d = drag.current
    const b = body.current
    if (!d?.active || !b) return
    plane.constant = -d.planeY
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(plane, hit)) return
    // Clamp to a reach radius around the pick-up point.
    const dx = hit.x - d.origin.x, dz = hit.z - d.origin.z
    const dist = Math.hypot(dx, dz)
    if (dist > MAX_REACH) hit.set(d.origin.x + (dx / dist) * MAX_REACH, d.planeY, d.origin.z + (dz / dist) * MAX_REACH)
    hit.y = d.planeY
    d.vel.copy(hit).sub(d.last).divideScalar(Math.max(dt, 1e-3))
    d.last.copy(hit)
    b.setNextKinematicTranslation(hit)
    b.setNextKinematicRotation({ x: 0, y: Math.sin(rotationY / 2), z: 0, w: Math.cos(rotationY / 2) })
  })

  return (
    <RigidBody
      ref={body}
      position={position}
      rotation={[0, rotationY, 0]}
      colliders={false}
      collisionGroups={COLLISION.cups}
      linearDamping={0.4}
      angularDamping={0.8}
      ccd
      userData={userData}
      onCollisionEnter={() => {
        // Porcelain clink on impact (throttled, and only when actually moving).
        const v = body.current?.linvel()
        const now = performance.now()
        if (v && Math.hypot(v.x, v.y, v.z) > 0.25 && now - lastClink.current > 250) {
          lastClink.current = now
          playSfx('clink')
        }
      }}
    >
      {/* Simplified colliders: a wide thin disc for the saucer, a cylinder for the cup. */}
      <CylinderCollider args={[0.008, radius]} position={[0, 0.008, 0]} friction={0.9} restitution={0.05} density={1.6} />
      <CylinderCollider args={[halfH, spec.radiusTop]} position={[0, 0.007 + halfH, 0]} friction={0.8} restitution={0.05} density={0.6} />
      <group
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          useCafeStore.getState().setHint('Drag the cup · click to inspect')
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          setHovered(false)
          useCafeStore.getState().setHint(null)
          document.body.style.cursor = ''
        }}
      >
        <Select enabled={hovered}>
          <CoffeeCup cupId={cup} fill={fill} surfaceMaterial={material} />
        </Select>
      </group>
      <Steam position={[0, steamY, 0]} intensity={steamIntensity} count={14} height={0.18} size={0.045} speed={0.28} />
    </RigidBody>
  )
}
