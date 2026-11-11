import { CylinderGeometry, LatheGeometry, MeshStandardMaterial, PlaneGeometry, TorusGeometry, Vector2 } from 'three'
import { useCafeStore } from '../app/store/useCafeStore'
import { Interactive } from '../components/three/interactions/Interactive'
import { CHAIRS, TABLES, TABLE_HEIGHT, type TableId } from '../constants/layout'
import { MATERIALS } from '../materials'
import { paperTexture } from '../materials/textures'
import { InstancedModel } from './ModelSource'
import { Flower } from './Plants'

export const TABLE_TOP_RADIUS = 0.34

/* Shared geometries for all bistro tables. */
const TABLE_GEO = {
  base: new LatheGeometry([[0, 0], [0.24, 0], [0.24, 0.015], [0.14, 0.04], [0.06, 0.08], [0.035, 0.14], [0, 0.14]].map(([r, y]) => new Vector2(r, y)), 32),
  column: new CylinderGeometry(0.028, 0.034, TABLE_HEIGHT - 0.18, 12),
  collar: new CylinderGeometry(0.11, 0.05, 0.05, 20),
  top: new CylinderGeometry(TABLE_TOP_RADIUS, TABLE_TOP_RADIUS, 0.03, 48),
  rim: new TorusGeometry(TABLE_TOP_RADIUS, 0.012, 8, 64).rotateX(Math.PI / 2),
}

function BistroTable() {
  return (
    <group>
      <mesh geometry={TABLE_GEO.base} material={MATERIALS.iron} castShadow receiveShadow />
      <mesh geometry={TABLE_GEO.column} material={MATERIALS.iron} position={[0, 0.14 + (TABLE_HEIGHT - 0.18) / 2, 0]} castShadow />
      <mesh geometry={TABLE_GEO.collar} material={MATERIALS.iron} position={[0, TABLE_HEIGHT - 0.055, 0]} castShadow />
      <mesh geometry={TABLE_GEO.top} material={MATERIALS.marble} position={[0, TABLE_HEIGHT - 0.015, 0]} castShadow receiveShadow />
      <mesh geometry={TABLE_GEO.rim} material={MATERIALS.brass} position={[0, TABLE_HEIGHT - 0.015, 0]} />
    </group>
  )
}

/* Small props placed on table tops. */
const PROP_GEO = {
  sugarPot: new LatheGeometry([[0, 0], [0.028, 0], [0.032, 0.03], [0.028, 0.05], [0.012, 0.052], [0.016, 0.06], [0, 0.064]].map(([r, y]) => new Vector2(r, y)), 20),
  vase: new LatheGeometry([[0, 0], [0.025, 0], [0.032, 0.03], [0.018, 0.08], [0.012, 0.1], [0.016, 0.11], [0, 0.11]].map(([r, y]) => new Vector2(r, y)), 20),
  card: new PlaneGeometry(0.09, 0.13),
  napkin: new PlaneGeometry(0.12, 0.12),
}
const MENU_MAT = new MeshStandardMaterial({ map: paperTexture('menu'), roughness: 0.85, side: 2 })
const MAGAZINE_MAT = new MeshStandardMaterial({ map: paperTexture('magazine'), roughness: 0.6 })
const BOOK_MAT = new MeshStandardMaterial({ map: paperTexture('book'), roughness: 0.7 })

export function TableProps({ variant }: { variant: number }) {
  const y = TABLE_HEIGHT + 0.001
  return (
    <group position={[0, y, 0]}>
      {/* Bud vase with a single flower */}
      <mesh geometry={PROP_GEO.vase} material={variant % 2 ? MATERIALS.ceramicPink : MATERIALS.ceramicSage} position={[0.02, 0, -0.16]} castShadow />
      <Flower position={[0.02, 0.1, -0.16]} color={variant % 2 ? '#E7848F' : '#F2E3C6'} />
      {/* Sugar pot */}
      <mesh geometry={PROP_GEO.sugarPot} material={MATERIALS.ceramic} position={[-0.12, 0, -0.12]} castShadow />
      {/* Folded tent menu */}
      <group position={[0.16, 0, -0.08]} rotation={[0, -0.5, 0]}>
        <mesh geometry={PROP_GEO.card} material={MENU_MAT} position={[0, 0.06, 0.02]} rotation={[-0.3, 0, 0]} />
        <mesh geometry={PROP_GEO.card} material={MENU_MAT} position={[0, 0.06, -0.02]} rotation={[0.3, Math.PI, 0]} />
      </group>
      {variant % 3 === 0 && (
        <mesh material={MAGAZINE_MAT} position={[-0.13, 0.004, 0.12]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.15, 0.006, 0.21]} />
        </mesh>
      )}
      {variant % 3 === 1 && (
        <group position={[-0.14, 0.012, 0.1]} rotation={[0, -0.3, 0]}>
          <mesh material={BOOK_MAT} castShadow>
            <boxGeometry args={[0.13, 0.024, 0.19]} />
          </mesh>
          <mesh material={MATERIALS.paper} position={[0.004, 0, 0]}>
            <boxGeometry args={[0.124, 0.02, 0.184]} />
          </mesh>
        </group>
      )}
      <mesh geometry={PROP_GEO.napkin} material={MATERIALS.linen} position={[0.15, 0.002, 0.13]} rotation={[-Math.PI / 2, 0, 0.6]} />
    </group>
  )
}

/** Camera framing used when a table is clicked. */
export function tableFocus(id: TableId) {
  const t = TABLES.find((tb) => tb.id === id)!
  const [x, y, z] = t.position
  const top: [number, number, number] = [x, y + TABLE_HEIGHT, z]
  return {
    key: `table-${id}`,
    position: (t.outdoor ? [x + 0.9, y + 1.55, z + 1.6] : [x + 1.1, y + 1.5, z + 1.2]) as [number, number, number],
    target: top,
    inside: !t.outdoor,
  }
}

export function Furniture() {
  const focusOn = useCafeStore((s) => s.focusOn)
  return (
    <group>
      {TABLES.map((t, i) => (
        <group key={t.id} position={t.position}>
          <Interactive label="Sit at this table" onSelect={() => focusOn(tableFocus(t.id), { title: t.outdoor ? 'Terrace table' : 'Table by the window', subtitle: 'Drag a cup to move it · drop sugar cubes from the panel' })}>
            <BistroTable />
          </Interactive>
          <TableProps variant={i} />
        </group>
      ))}
      <InstancedModel model="chair" transforms={CHAIRS} />
    </group>
  )
}
