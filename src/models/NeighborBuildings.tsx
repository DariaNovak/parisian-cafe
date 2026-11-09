import { Text } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { ExtrudeGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, Shape, type Material } from 'three'
import { FONTS } from '../constants/fonts'
import { MATERIALS } from '../materials'
import { Box, UNIT_BOX } from './primitives'
import { Railings } from './Railings'
import { windowGlassMaterial } from '../shaders/glass/glassMaterial'

interface BuildingSpec {
  x0: number
  x1: number
  height: number
  color: string
  floors: number
  shop: { name: string; color: string; awning?: string }
}

/** Buildings flanking the café (facades on z = 0). */
const FLANKING: BuildingSpec[] = [
  { x0: -14.4, x1: -6.0, height: 13.2, color: '#EBD9CB', floors: 3, shop: { name: 'Boulangerie', color: '#7A3B2E', awning: '#C77D62' } },
  { x0: -26, x1: -14.4, height: 11.6, color: '#EFE6D6', floors: 3, shop: { name: 'Librairie', color: '#2F3D33' } },
  { x0: 6.0, x1: 13.6, height: 12.2, color: '#E9D2CA', floors: 3, shop: { name: 'Fleuriste', color: '#5C6E58', awning: '#A8B5A0' } },
  { x0: 13.6, x1: 26, height: 13.8, color: '#E1E2D4', floors: 3, shop: { name: 'Fromagerie', color: '#3A4A5A' } },
]

/** Buildings across the street, described in their own (mirrored) frame. */
const ACROSS: BuildingSpec[] = [
  { x0: -26, x1: -9, height: 12.8, color: '#EFE2CF', floors: 3, shop: { name: 'Pharmacie', color: '#3E5245' } },
  { x0: -9, x1: 4, height: 13.6, color: '#E7D6CE', floors: 3, shop: { name: 'Bistrot', color: '#6B2E2A', awning: '#C77D62' } },
  { x0: 4, x1: 26, height: 12.0, color: '#E4DED0', floors: 3, shop: { name: 'Galerie', color: '#382820' } },
]

/** Buildings closing both ends of the street (local x maps onto world z). */
const END_LEFT: BuildingSpec = { x0: -13.6, x1: 0, height: 14.2, color: '#EDE0CC', floors: 3, shop: { name: 'Tabac', color: '#7A3B2E' } }
const END_RIGHT: BuildingSpec = { x0: 0, x1: 13.6, height: 13.4, color: '#E8D8CF', floors: 3, shop: { name: 'Chocolatier', color: '#5A3A22', awning: '#E9BFC4' } }
const END_LEFT_MATRIX = new Matrix4().makeRotationY(Math.PI / 2).setPosition(-26, 0, 0)
const END_RIGHT_MATRIX = new Matrix4().makeRotationY(-Math.PI / 2).setPosition(26, 0, 0)

const DEPTH = 8
const GROUND = 4.2

interface WindowPlacement { matrix: Matrix4; w: number; h: number }

/** Window parts relative to the window centre, sizes in multiples of (w, h). */
const WINDOW_PARTS: Array<{ key: string; material: Material; offset: (w: number, h: number) => [number, number, number]; size: (w: number, h: number) => [number, number, number] }> = [
  { key: 'dark', material: new MeshStandardMaterial({ color: '#3B2E26', roughness: 1 }), offset: () => [0, 0, 0.005], size: (w, h) => [w, h, 0.01] },
  { key: 'curtL', material: MATERIALS.linen, offset: (w) => [-w * 0.36, 0, 0.012], size: (w, h) => [w * 0.26, h * 0.96, 0.01] },
  { key: 'curtR', material: MATERIALS.linen, offset: (w) => [w * 0.36, 0, 0.012], size: (w, h) => [w * 0.26, h * 0.96, 0.01] },
  { key: 'glass', material: windowGlassMaterial, offset: () => [0, 0, 0.03], size: (w, h) => [w, h, 0.002] },
  { key: 'mullion', material: MATERIALS.frameGreen, offset: () => [0, 0, 0.035], size: (_w, h) => [0.04, h, 0.03] },
  { key: 'rail', material: MATERIALS.frameGreen, offset: (_w, h) => [0, h * 0.15, 0.035], size: (w) => [w, 0.03, 0.03] },
  { key: 'lintel', material: MATERIALS.trimCream, offset: (_w, h) => [0, h / 2 + 0.08, 0.03], size: (w) => [w + 0.32, 0.16, 0.08] },
  { key: 'jambL', material: MATERIALS.trimCream, offset: (w) => [-w / 2 - 0.08, 0, 0.025], size: (_w, h) => [0.16, h, 0.06] },
  { key: 'jambR', material: MATERIALS.trimCream, offset: (w) => [w / 2 + 0.08, 0, 0.025], size: (_w, h) => [0.16, h, 0.06] },
  { key: 'sill', material: MATERIALS.trimCream, offset: (_w, h) => [0, -h / 2 - 0.04, 0.06], size: (w) => [w + 0.3, 0.08, 0.14] },
]

/** All neighbour windows rendered as one InstancedMesh per window part. */
function WindowField({ windows }: { windows: WindowPlacement[] }) {
  return (
    <group>
      {WINDOW_PARTS.map((part) => (
        <WindowPart key={part.key} part={part} windows={windows} />
      ))}
    </group>
  )
}

function WindowPart({ part, windows }: { part: (typeof WINDOW_PARTS)[number]; windows: WindowPlacement[] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const im = ref.current!
    const o = new Object3D()
    const m = new Matrix4()
    windows.forEach((win, i) => {
      o.position.set(...part.offset(win.w, win.h))
      o.scale.set(...part.size(win.w, win.h))
      o.updateMatrix()
      m.multiplyMatrices(win.matrix, o.matrix)
      im.setMatrixAt(i, m)
    })
    im.instanceMatrix.needsUpdate = true
    im.computeBoundingSphere()
  }, [windows, part])
  const isGlass = part.key === 'glass'
  return <instancedMesh ref={ref} args={[UNIT_BOX, part.material, windows.length]} castShadow={false} receiveShadow={!isGlass} renderOrder={isGlass ? 2 : 0} />
}

function Mansard({ x0, x1, baseY }: { x0: number; x1: number; baseY: number }) {
  const geo = useMemo(() => {
    const s = new Shape()
    s.moveTo(-0.3, baseY + 0.2)
    s.lineTo(1.0, baseY + 2.1)
    s.lineTo(DEPTH, baseY + 2.1)
    s.lineTo(DEPTH, baseY + 0.2)
    s.closePath()
    return new ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false })
  }, [x0, x1, baseY])
  return <mesh geometry={geo} material={MATERIALS.roofZinc} position={[x0, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
}

const facadeMaterials = new Map<string, MeshStandardMaterial>()
function facadeMaterial(color: string) {
  let m = facadeMaterials.get(color)
  if (!m) {
    m = MATERIALS.facadeUpper.clone()
    m.color.set(color)
    facadeMaterials.set(color, m)
  }
  return m
}
const shopMaterials = new Map<string, MeshStandardMaterial>()
function paint(color: string) {
  let m = shopMaterials.get(color)
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: 0.5 })
    shopMaterials.set(color, m)
  }
  return m
}

function Building({ spec }: { spec: BuildingSpec }) {
  const { x0, x1, height, color, shop } = spec
  const w = x1 - x0
  const cx = (x0 + x1) / 2
  const mat = facadeMaterial(color)
  const shopMat = paint(shop.color)
  return (
    <group>
      <Box min={[x0, 0, -DEPTH]} max={[x1, height, -0.01]} material={mat} />
      <Box min={[x0, GROUND - 0.05, -0.2]} max={[x1, GROUND + 0.12, 0.25]} material={MATERIALS.trimCream} />
      <Box min={[x0, height, -0.25]} max={[x1, height + 0.2, 0.35]} material={MATERIALS.trimCream} />
      <Mansard x0={x0} x1={x1} baseY={height} />
      {/* Painted wooden shopfront */}
      <Box min={[x0 + 0.4, 0, -0.05]} max={[x1 - 0.4, 3.7, 0.08]} material={shopMat} />
      <Box min={[x0 + 0.9, 0.7, 0.08]} max={[cx - 0.8, 2.9, 0.1]} material={MATERIALS.darkGlass} cast={false} />
      <Box min={[cx + 0.8, 0.7, 0.08]} max={[x1 - 0.9, 2.9, 0.1]} material={MATERIALS.darkGlass} cast={false} />
      <Box min={[cx - 0.55, 0.12, 0.08]} max={[cx + 0.55, 2.7, 0.1]} material={MATERIALS.darkWood} cast={false} />
      <Text font={FONTS.serif} fontSize={0.36} letterSpacing={0.08} color="#F5EBDD" position={[cx, 3.28, 0.1]} anchorX="center" anchorY="middle">
        {shop.name.toUpperCase()}
      </Text>
      {shop.awning && (
        <mesh position={[cx, 2.95, 0.65]} rotation={[-Math.PI / 2 + 0.45, 0, 0]} material={paint(shop.awning)} castShadow>
          <planeGeometry args={[w - 1.2, 1.3]} />
        </mesh>
      )}
    </group>
  )
}

function windowsFor(spec: BuildingSpec, parent: Matrix4) {
  const list: WindowPlacement[] = []
  const w = spec.x1 - spec.x0
  const cols = Math.max(2, Math.round(w / 2.6))
  const floorH = (spec.height - GROUND - 0.4) / spec.floors
  for (let f = 0; f < spec.floors; f++) {
    for (let c = 0; c < cols; c++) {
      const x = spec.x0 + ((c + 0.5) * w) / cols
      const y = GROUND + 0.5 + f * floorH + 1.0
      const m = new Matrix4().makeTranslation(x, y, 0)
      list.push({ matrix: new Matrix4().multiplyMatrices(parent, m), w: 1.0, h: 1.9 })
    }
  }
  return list
}

function railsFor(spec: BuildingSpec) {
  const floorH = (spec.height - GROUND - 0.4) / spec.floors
  return { x0: spec.x0 + 0.3, x1: spec.x1 - 0.3, y: GROUND + 0.5 + floorH, z: 0.35, height: 0.9 }
}

const ACROSS_MATRIX = new Matrix4().makeRotationY(Math.PI).setPosition(0, 0, 13.6)

export function NeighborBuildings() {
  const windows = useMemo(
    () => [
      ...FLANKING.flatMap((b) => windowsFor(b, new Matrix4())),
      ...ACROSS.flatMap((b) => windowsFor(b, ACROSS_MATRIX)),
      ...windowsFor(END_LEFT, END_LEFT_MATRIX),
      ...windowsFor(END_RIGHT, END_RIGHT_MATRIX),
    ],
    [],
  )
  const flankRails = useMemo(() => FLANKING.map(railsFor), [])
  const acrossRails = useMemo(() => ACROSS.map(railsFor), [])
  return (
    <group>
      {FLANKING.map((b) => (
        <Building key={b.shop.name} spec={b} />
      ))}
      <group rotation={[0, Math.PI, 0]} position={[0, 0, 13.6]}>
        {ACROSS.map((b) => (
          <Building key={b.shop.name} spec={b} />
        ))}
        <Railings rails={acrossRails} />
      </group>
      <group rotation={[0, Math.PI / 2, 0]} position={[-26, 0, 0]}>
        <Building spec={END_LEFT} />
      </group>
      <group rotation={[0, -Math.PI / 2, 0]} position={[26, 0, 0]}>
        <Building spec={END_RIGHT} />
      </group>
      <Railings rails={flankRails} />
      <WindowField windows={windows} />
    </group>
  )
}
