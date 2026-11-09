import { CapsuleGeometry, ConeGeometry, CylinderGeometry, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry } from 'three'
import type { DessertId } from '../features/desserts/dessertsConfig'
import { ModelInstance } from './ModelSource'

/* Shared dessert geometries and materials (created once). */
export const DESSERT_GEO = {
  macaronShell: new SphereGeometry(0.022, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1),
  macaronFill: new CylinderGeometry(0.019, 0.019, 0.008, 20),
  cakeLayer: new CylinderGeometry(0.042, 0.042, 1, 32),
  strawberry: new ConeGeometry(0.012, 0.024, 10).rotateX(Math.PI),
  strawberryHalf: new SphereGeometry(0.011, 10, 8, 0, Math.PI),
  eclair: new CapsuleGeometry(0.016, 0.085, 6, 14).rotateZ(Math.PI / 2),
  eclairGlaze: new CapsuleGeometry(0.0165, 0.085, 6, 14).rotateZ(Math.PI / 2).scale(1, 0.5, 0.92),
}

export const MACARON_COLORS = ['#E9BFC4', '#A8B5A0', '#C9B6D9', '#FFD9A0', '#7A4E35', '#F2B5BD']

export const DESSERT_MAT = {
  sponge: new MeshStandardMaterial({ color: '#E8C37E', roughness: 0.85 }),
  cream: new MeshStandardMaterial({ color: '#FFF7EA', roughness: 0.6 }),
  glazePink: new MeshPhysicalMaterial({ color: '#E7848F', roughness: 0.25, clearcoat: 0.8 }),
  strawberry: new MeshPhysicalMaterial({ color: '#C8303E', roughness: 0.35, clearcoat: 0.6 }),
  choux: new MeshStandardMaterial({ color: '#C78A4E', roughness: 0.7 }),
  chocolate: new MeshPhysicalMaterial({ color: '#3A2116', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }),
  macaron: new Map<string, MeshStandardMaterial>(),
}

export function macaronMaterial(color: string) {
  let m = DESSERT_MAT.macaron.get(color)
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: 0.65 })
    DESSERT_MAT.macaron.set(color, m)
  }
  return m
}

export function Macaron({ color = MACARON_COLORS[0] }: { color?: string }) {
  const shell = macaronMaterial(color)
  return (
    <group>
      <mesh geometry={DESSERT_GEO.macaronShell} material={shell} position={[0, 0.013, 0]} castShadow />
      <mesh geometry={DESSERT_GEO.macaronShell} material={shell} position={[0, 0.011, 0]} rotation={[Math.PI, 0, 0]} castShadow />
      <mesh geometry={DESSERT_GEO.macaronFill} material={DESSERT_MAT.cream} position={[0, 0.012, 0]} />
    </group>
  )
}

/** Individual fraisier: genoise / cream / genoise, pink glaze and strawberries. */
export function StrawberryCake() {
  return (
    <group>
      <mesh geometry={DESSERT_GEO.cakeLayer} material={DESSERT_MAT.sponge} position={[0, 0.008, 0]} scale={[1, 0.016, 1]} castShadow />
      <mesh geometry={DESSERT_GEO.cakeLayer} material={DESSERT_MAT.cream} position={[0, 0.03, 0]} scale={[0.99, 0.028, 0.99]} castShadow />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} geometry={DESSERT_GEO.strawberryHalf} material={DESSERT_MAT.strawberry} position={[Math.cos((i / 8) * Math.PI * 2) * 0.041, 0.03, Math.sin((i / 8) * Math.PI * 2) * 0.041]} rotation={[0, -(i / 8) * Math.PI * 2 + Math.PI / 2, 0]} />
      ))}
      <mesh geometry={DESSERT_GEO.cakeLayer} material={DESSERT_MAT.sponge} position={[0, 0.051, 0]} scale={[1, 0.014, 1]} />
      <mesh geometry={DESSERT_GEO.cakeLayer} material={DESSERT_MAT.glazePink} position={[0, 0.06, 0]} scale={[1.005, 0.005, 1.005]} />
      <mesh geometry={DESSERT_GEO.strawberry} material={DESSERT_MAT.strawberry} position={[0.008, 0.075, 0]} rotation={[0, 0, 0.3]} castShadow />
      <mesh geometry={DESSERT_GEO.macaronFill} material={DESSERT_MAT.cream} position={[-0.015, 0.066, 0.01]} scale={[0.3, 1, 0.3]} />
    </group>
  )
}

export function Eclair() {
  return (
    <group>
      <mesh geometry={DESSERT_GEO.eclair} material={DESSERT_MAT.choux} position={[0, 0.016, 0]} scale={[1, 0.85, 1]} castShadow />
      <mesh geometry={DESSERT_GEO.eclairGlaze} material={DESSERT_MAT.chocolate} position={[0, 0.024, 0]} />
    </group>
  )
}

export function Croissant() {
  return <ModelInstance model="croissant" />
}

/** Any dessert by id (used by the display, physics drops and UI previews). */
export function DessertModel({ id, variant = 0 }: { id: DessertId; variant?: number }) {
  switch (id) {
    case 'croissant': return <Croissant />
    case 'macaron': return <Macaron color={MACARON_COLORS[variant % MACARON_COLORS.length]} />
    case 'strawberry': return <StrawberryCake />
    case 'chocolate': return <Eclair />
  }
}
