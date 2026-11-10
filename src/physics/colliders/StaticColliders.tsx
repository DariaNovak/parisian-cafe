import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { useCafeStore } from '../../app/store/useCafeStore'
import { COUNTER_TOP, INTERIOR, LAYOUT, TABLES, TABLE_HEIGHT, TRAY_POS } from '../../constants/layout'
import { TABLE_TOP_RADIUS } from '../../models/Furniture'
import { COLLISION } from '../groups'

const { floorY, sidewalk, road, farSidewalk, counter: C, display: D } = LAYOUT
/** Static slabs are given generous thickness so small, fast bodies can never tunnel through. */
const SLAB = 0.15

/** Cuboid collider from min/max corners. */
function Slab({ min, max }: { min: [number, number, number]; max: [number, number, number] }) {
  return (
    <CuboidCollider
      args={[(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2]}
      position={[(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]}
      collisionGroups={COLLISION.static}
      friction={0.9}
    />
  )
}

/**
 * Fixed colliders for the environment. Only surfaces that movable objects can
 * actually reach get colliders, each as a simple primitive (no trimeshes).
 */
export function StaticColliders() {
  const notify = useCafeStore((s) => s.notify)
  const L = LAYOUT.streetHalfLength
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Ground: café floor, sidewalks and road */}
      <Slab min={[INTERIOR.minX, floorY - SLAB, INTERIOR.minZ]} max={[INTERIOR.maxX, floorY, INTERIOR.maxZ]} />
      <Slab min={[-L, floorY - SLAB, sidewalk.minZ]} max={[L, floorY, sidewalk.maxZ]} />
      <Slab min={[-L, -SLAB, road.minZ]} max={[L, 0, road.maxZ]} />
      <Slab min={[-L, floorY - SLAB, farSidewalk.minZ]} max={[L, floorY, farSidewalk.maxZ]} />
      {/* Facade (with a gap for the door) keeps thrown objects from passing through walls */}
      <Slab min={[-6, 0, -0.3]} max={[-LAYOUT.door.halfWidth, 4.2, 0]} />
      <Slab min={[LAYOUT.door.halfWidth, 0, -0.3]} max={[6, 4.2, 0]} />
      {/* Counter, back counter, display cabinet top */}
      <Slab min={[C.minX - 0.04, COUNTER_TOP - SLAB, C.frontZ - C.depth - 0.02]} max={[C.maxX + 0.04, COUNTER_TOP, C.frontZ + 0.07]} />
      <Slab min={[-4.58, floorY + 0.94 - SLAB, INTERIOR.minZ]} max={[2.03, floorY + 0.94, INTERIOR.minZ + 0.58]} />
      <Slab min={[D.minX, floorY + D.baseHeight - SLAB, D.frontZ - D.depth]} max={[D.maxX, floorY + D.baseHeight + 0.012, D.frontZ]} />
      {/* Serving tray: base + four lips, so desserts and cups land inside it */}
      <Slab min={[TRAY_POS[0] - 0.28, COUNTER_TOP, TRAY_POS[2] - 0.19]} max={[TRAY_POS[0] + 0.28, COUNTER_TOP + 0.012, TRAY_POS[2] + 0.19]} />
      <Slab min={[TRAY_POS[0] - 0.29, COUNTER_TOP, TRAY_POS[2] - 0.2]} max={[TRAY_POS[0] - 0.27, COUNTER_TOP + 0.045, TRAY_POS[2] + 0.2]} />
      <Slab min={[TRAY_POS[0] + 0.27, COUNTER_TOP, TRAY_POS[2] - 0.2]} max={[TRAY_POS[0] + 0.29, COUNTER_TOP + 0.045, TRAY_POS[2] + 0.2]} />
      <Slab min={[TRAY_POS[0] - 0.29, COUNTER_TOP, TRAY_POS[2] - 0.2]} max={[TRAY_POS[0] + 0.29, COUNTER_TOP + 0.045, TRAY_POS[2] - 0.18]} />
      <Slab min={[TRAY_POS[0] - 0.29, COUNTER_TOP, TRAY_POS[2] + 0.18]} max={[TRAY_POS[0] + 0.29, COUNTER_TOP + 0.045, TRAY_POS[2] + 0.2]} />
      {/* Bistro tables: thick top disc + column, plus a sensor that detects cups set down on them */}
      {TABLES.map((t) => {
        const [x, y, z] = t.position
        const top = y + TABLE_HEIGHT
        return (
          <group key={t.id}>
            <CylinderCollider args={[0.06, TABLE_TOP_RADIUS]} position={[x, top - 0.06, z]} collisionGroups={COLLISION.static} friction={0.9} />
            <CylinderCollider args={[(TABLE_HEIGHT - 0.12) / 2, 0.05]} position={[x, y + (TABLE_HEIGHT - 0.12) / 2, z]} collisionGroups={COLLISION.static} />
            <CylinderCollider
              sensor
              args={[0.05, TABLE_TOP_RADIUS - 0.02]}
              position={[x, top + 0.05, z]}
              collisionGroups={COLLISION.sensors}
              onIntersectionEnter={({ other }) => {
                // Only announce cups the user has just put down (not cups resting there at load).
                const data = other.rigidBodyObject?.userData as { kind?: string; justDropped?: boolean } | undefined
                if (data?.kind === 'cup' && data.justDropped) {
                  data.justDropped = false
                  notify(t.outdoor ? 'Cup placed on a terrace table' : 'Cup placed on a table inside')
                }
              }}
            />
          </group>
        )
      })}
    </RigidBody>
  )
}
