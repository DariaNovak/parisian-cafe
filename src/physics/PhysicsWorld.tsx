import { CapsuleCollider, CuboidCollider, CylinderCollider, Physics, RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { MATERIALS } from '../materials'
import { TABLES, TABLE_HEIGHT } from '../constants/layout'
import type { CoffeeType, CupId, LatteArt } from '../features/coffee/coffeeConfig'
import { DessertModel } from '../models/Desserts'
import { tickCoffeeMaterials } from '../shaders/coffee/cupMaterials'
import { StaticColliders } from './colliders/StaticColliders'
import { DraggableCup } from './DraggableCup'
import { COLLISION } from './groups'
import { usePhysicsStore, type SpawnedBody } from './usePhysicsStore'

/** Cups already on the tables when the café opens. */
const TABLE_CUPS: Array<{ coffee: CoffeeType; cup: CupId; art: LatteArt; offset: [number, number]; rot: number }> = [
  { coffee: 'cappuccino', cup: 'classic', art: 'heart', offset: [0.06, 0.1], rot: 0.4 },
  { coffee: 'espresso', cup: 'demitasse', art: 'none', offset: [-0.02, 0.12], rot: -0.3 },
  { coffee: 'latte', cup: 'bowl', art: 'rosetta', offset: [0.04, 0.1], rot: 0.9 },
  { coffee: 'cappuccino', cup: 'classic', art: 'tulip', offset: [-0.05, 0.11], rot: -0.6 },
  { coffee: 'latte', cup: 'bowl', art: 'heart', offset: [0.12, 0.04], rot: 1.2 },
  { coffee: 'espresso', cup: 'demitasse', art: 'none', offset: [-0.12, 0.08], rot: 0.2 },
  { coffee: 'cappuccino', cup: 'classic', art: 'rosetta', offset: [0.1, -0.02], rot: -1.1 },
]

const SUGAR_SIZE = 0.016

/** Collider shape per dessert (simplified primitives, never meshes). */
function DessertCollider({ id }: { id: string }) {
  switch (id) {
    case 'croissant': return <CuboidCollider args={[0.065, 0.022, 0.04]} position={[0, 0.022, 0]} />
    case 'macaron': return <CylinderCollider args={[0.012, 0.022]} position={[0, 0.012, 0]} />
    case 'strawberry': return <CylinderCollider args={[0.036, 0.042]} position={[0, 0.036, 0]} />
    default: return <CapsuleCollider args={[0.0425, 0.017]} position={[0, 0.017, 0]} rotation={[0, 0, Math.PI / 2]} />
  }
}

function SpawnedBodyView({ body }: { body: SpawnedBody }) {
  switch (body.kind) {
    case 'coffee':
      return <DraggableCup coffee={body.coffee} cup={body.cup} art={body.art} position={body.position} />
    case 'dessert':
      return (
        <RigidBody position={body.position} rotation={[0, (body.id * 1.3) % 6, 0.25]} colliders={false} collisionGroups={COLLISION.small} ccd linearDamping={0.3} angularDamping={0.6}>
          <DessertCollider id={body.dessert} />
          <DessertModel id={body.dessert} variant={body.variant} />
        </RigidBody>
      )
    case 'sugar':
      return (
        <RigidBody position={body.position} rotation={[body.id, body.id * 2, 0]} colliders={false} collisionGroups={COLLISION.small} ccd restitution={0.3}>
          <CuboidCollider args={[SUGAR_SIZE / 2, SUGAR_SIZE / 2, SUGAR_SIZE / 2]} friction={0.7} restitution={0.25} />
          <mesh material={MATERIALS.sugar} castShadow>
            <boxGeometry args={[SUGAR_SIZE, SUGAR_SIZE, SUGAR_SIZE]} />
          </mesh>
        </RigidBody>
      )
  }
}

function SpawnedBodies() {
  const bodies = usePhysicsStore((s) => s.bodies)
  return (
    <>
      {bodies.map((b) => (
        <SpawnedBodyView key={b.id} body={b} />
      ))}
    </>
  )
}

function CoffeeShaderClock() {
  useFrame((state) => tickCoffeeMaterials(state.clock.elapsedTime))
  return null
}

/**
 * Rapier world. Only objects that genuinely need simulation live here: cups,
 * desserts and sugar cubes (dynamic) plus the surfaces they can touch (fixed).
 * Everything else in the café is plain, non-simulated geometry.
 */
export function PhysicsWorld({ children }: { children?: ReactNode }) {
  return (
    <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} interpolate>
      <CoffeeShaderClock />
      <StaticColliders />
      {TABLES.map((t, i) => {
        const c = TABLE_CUPS[i]
        const [x, y, z] = t.position
        return <DraggableCup key={t.id} coffee={c.coffee} cup={c.cup} art={c.art} position={[x + c.offset[0], y + TABLE_HEIGHT + 0.002, z + c.offset[1]]} rotationY={c.rot} />
      })}
      <SpawnedBodies />
      {children}
    </Physics>
  )
}
