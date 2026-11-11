import { memo, useMemo } from 'react'
import { BoxGeometry, CapsuleGeometry, CylinderGeometry, DoubleSide, LatheGeometry, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector2, type Group } from 'three'
import { CUPS, type CupId } from '../features/coffee/coffeeConfig'
import type { PersonLook } from '../features/people/look'
import { lerp } from '../utils/math'
import { cupGeometry, cupMaterial } from './CoffeeCup'

/*
 * A stylised, fully procedural figure built from a handful of shared
 * geometries. The figure faces +Z; its feet rest on y = 0 and every joint is a
 * group so walking, sitting and sipping are plain rotations driven per frame.
 */

const lathe = (pts: number[][], segments = 18) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), segments)

/** Hip height of the unscaled figure. */
export const HIP_Y = 0.9

const GEO = {
  thigh: new CapsuleGeometry(0.068, 0.3, 4, 10).translate(0, -0.21, 0),
  shin: new CapsuleGeometry(0.054, 0.32, 4, 10).translate(0, -0.2, 0),
  foot: new BoxGeometry(0.1, 0.06, 0.23),
  upperArm: new CapsuleGeometry(0.046, 0.2, 4, 10).translate(0, -0.14, 0),
  forearm: new CapsuleGeometry(0.04, 0.18, 4, 10).translate(0, -0.13, 0),
  hand: new SphereGeometry(0.045, 10, 8),
  torso: lathe([[0, 0], [0.15, 0], [0.165, 0.1], [0.15, 0.26], [0.17, 0.44], [0.175, 0.5], [0.14, 0.56], [0.06, 0.6], [0, 0.6]], 20),
  coatTail: lathe([[0.165, 0.02], [0.18, -0.15], [0.205, -0.36]], 20),
  skirt: lathe([[0.158, 0.02], [0.2, -0.18], [0.255, -0.42]], 20),
  neck: new CylinderGeometry(0.045, 0.05, 0.1, 10),
  head: new SphereGeometry(0.105, 20, 16),
  hairCap: new SphereGeometry(0.114, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
  hairLong: new CapsuleGeometry(0.095, 0.16, 4, 12),
  bun: new SphereGeometry(0.052, 12, 10),
  curls: new SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
  beret: new CylinderGeometry(0.128, 0.118, 0.035, 22),
  nub: new SphereGeometry(0.014, 6, 4),
  capCrown: new SphereGeometry(0.117, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
  capBrim: new BoxGeometry(0.15, 0.012, 0.11),
  scarf: new TorusGeometry(0.068, 0.034, 8, 18).rotateX(Math.PI / 2),
  bag: new BoxGeometry(0.07, 0.2, 0.25),
  eye: new SphereGeometry(0.012, 6, 4),
  coffee: new CylinderGeometry(1, 1, 0.004, 16),
}

const materials = new Map<string, MeshStandardMaterial>()
/** Materials are shared between figures by colour, so a crowd costs only a few programs. */
function mat(color: string, roughness = 0.85, doubleSide = false) {
  const key = `${color}|${roughness}|${doubleSide}`
  let m = materials.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness, side: doubleSide ? DoubleSide : undefined })
    materials.set(key, m)
  }
  return m
}
const EYE = mat('#1A1410', 0.4)
const COFFEE = mat('#5A3A24', 0.3)

/** Joint handles filled in by <Person/> and animated by `applyPose`. */
export interface PersonRig {
  body: Group | null
  thighL: Group | null
  thighR: Group | null
  kneeL: Group | null
  kneeR: Group | null
  shoulderL: Group | null
  shoulderR: Group | null
  elbowL: Group | null
  elbowR: Group | null
  head: Group | null
  cup: Group | null
}

export const createRig = (): PersonRig => ({ body: null, thighL: null, thighR: null, kneeL: null, kneeR: null, shoulderL: null, shoulderR: null, elbowL: null, elbowR: null, head: null, cup: null })

/** Blend weights describing what the figure is doing this frame. */
export interface Pose {
  /** Walk-cycle phase in radians (advanced by distance travelled). */
  phase: number
  /** 0 = standing still, 1 = walking. */
  walk: number
  /** 0 = standing, 1 = seated on a bistro chair. */
  sit: number
  /** Holding a cup in the right hand. */
  hold: number
  /** Bringing the cup to the mouth. */
  sip: number
  /** Waving with the right hand. */
  wave: number
  /** Elapsed time, for idle motion. */
  t: number
  seed: number
}

/** Height of the chair seat surface above the floor (see buildBistroChair). */
const SEAT_Y = 0.535

export function applyPose(rig: PersonRig, p: Pose, height: number) {
  const { walk: w, sit: s } = p
  const swing = Math.sin(p.phase)
  const idle = 1 - w

  // Legs: walking swing → seated (thighs forward, shins down).
  const legL = -swing * 0.5 * w
  const legR = swing * 0.5 * w
  if (rig.thighL) rig.thighL.rotation.x = lerp(legL, -1.52, s)
  if (rig.thighR) rig.thighR.rotation.x = lerp(legR, -1.52, s)
  if (rig.kneeL) rig.kneeL.rotation.x = lerp(w * (0.12 + 0.6 * Math.max(0, Math.sin(p.phase + 1.9))), 1.52, s)
  if (rig.kneeR) rig.kneeR.rotation.x = lerp(w * (0.12 + 0.6 * Math.max(0, Math.sin(p.phase + Math.PI + 1.9))), 1.52, s)

  // Body: a little bob while walking, breathing at rest, lowered onto the seat when sitting.
  if (rig.body) {
    const bob = w * 0.022 * Math.abs(Math.cos(p.phase)) + idle * Math.sin(p.t * 1.6 + p.seed) * 0.004
    rig.body.position.y = bob + s * (SEAT_Y / height - HIP_Y)
    rig.body.rotation.x = s * -0.06
  }

  // Arms swing opposite to the legs; seated arms rest forward on the table.
  const armRest = -0.08 + Math.sin(p.t * 1.1 + p.seed) * 0.02 * idle
  if (rig.shoulderL) {
    rig.shoulderL.rotation.x = lerp(swing * 0.38 * w + armRest * idle, -0.55, s)
    rig.shoulderL.rotation.z = 0.06
  }
  if (rig.elbowL) rig.elbowL.rotation.x = lerp(-0.18 - 0.12 * w, -1.0, s)

  const holdX = lerp(-0.35, -0.65, p.sip)
  const holdElbow = lerp(-1.35, -2.15, p.sip)
  if (rig.shoulderR) {
    const free = lerp(-swing * 0.38 * w + armRest * idle, -0.55, s)
    rig.shoulderR.rotation.x = lerp(free, holdX, p.hold)
    rig.shoulderR.rotation.z = lerp(-0.06, -2.7, p.wave) + p.sip * 0.28
  }
  if (rig.elbowR) {
    rig.elbowR.rotation.x = lerp(lerp(-0.18 - 0.12 * w, -1.0, s), holdElbow, p.hold) * (1 - p.wave)
    rig.elbowR.rotation.z = p.wave * (-0.35 + Math.sin(p.t * 10) * 0.35)
  }
  if (rig.cup) {
    rig.cup.visible = p.hold > 0.5
    // Keep the cup upright against the forearm angle (tilts toward the lips while sipping).
    rig.cup.rotation.x = 1.7 + p.sip * 0.5
  }

  if (rig.head) {
    rig.head.rotation.y = idle * Math.sin(p.t * 0.35 + p.seed * 3) * 0.35
    rig.head.rotation.x = -p.sip * 0.25 + Math.sin(p.t * 0.5 + p.seed) * 0.04
  }
}

interface PersonProps {
  look: PersonLook
  rig: PersonRig
  /** Cup carried in the right hand (shown while `hold` is high). */
  cup?: CupId | null
}

/** One figure. Purely declarative: animation happens in `applyPose`. */
export const Person = memo(function Person({ look, rig, cup }: PersonProps) {
  const m = useMemo(
    () => ({
      skin: mat(look.skin, 0.7),
      hair: mat(look.hair, 0.75),
      top: mat(look.top, 0.85),
      coat: mat(look.top, 0.85, true),
      bottom: mat(look.bottom, 0.9),
      skirt: mat(look.bottom, 0.9, true),
      shoes: mat(look.shoes, 0.5),
      hat: mat(look.hatColor, 0.9),
      scarf: look.scarf ? mat(look.scarf, 0.95) : null,
      bag: look.bag ? mat(look.bag, 0.55) : null,
    }),
    [look],
  )
  const legMat = look.skirt ? m.skin : m.bottom
  const b = look.build

  const leg = (side: 1 | -1) => (
    <group ref={(g) => void (side === 1 ? (rig.thighL = g) : (rig.thighR = g))} position={[side * 0.085, HIP_Y, 0]}>
      <mesh geometry={GEO.thigh} material={legMat} castShadow />
      <group ref={(g) => void (side === 1 ? (rig.kneeL = g) : (rig.kneeR = g))} position={[0, -0.43, 0]}>
        <mesh geometry={GEO.shin} material={legMat} castShadow />
        <mesh geometry={GEO.foot} material={m.shoes} position={[0, -0.44, 0.05]} castShadow />
      </group>
    </group>
  )

  const arm = (side: 1 | -1) => (
    <group ref={(g) => void (side === 1 ? (rig.shoulderL = g) : (rig.shoulderR = g))} position={[side * 0.205 * b, 1.4, 0]}>
      <mesh geometry={GEO.upperArm} material={m.top} castShadow />
      <group ref={(g) => void (side === 1 ? (rig.elbowL = g) : (rig.elbowR = g))} position={[0, -0.28, 0]}>
        <mesh geometry={GEO.forearm} material={look.coat ? m.top : m.skin} castShadow />
        <mesh geometry={GEO.hand} material={m.skin} position={[0, -0.29, 0]} />
        {side === -1 && cup && (
          <group ref={(g) => void (rig.cup = g)} position={[0, -0.3, 0.05]} visible={false}>
            <mesh geometry={cupGeometry(cup)} material={cupMaterial(CUPS[cup])} castShadow />
            <mesh geometry={GEO.coffee} material={COFFEE} position={[0, CUPS[cup].height * 0.8, 0]} scale={[CUPS[cup].radiusTop * 0.85, 1, CUPS[cup].radiusTop * 0.85]} />
          </group>
        )}
      </group>
    </group>
  )

  return (
    <group scale={look.height}>
      <group ref={(g) => void (rig.body = g)}>
        {leg(1)}
        {leg(-1)}
        <mesh geometry={GEO.torso} material={m.top} position={[0, 0.86, 0]} scale={[b, 1, 0.68 * b]} castShadow />
        {look.coat && <mesh geometry={GEO.coatTail} material={m.coat} position={[0, 0.9, 0]} scale={[b, 1, 0.72 * b]} castShadow />}
        {look.skirt && <mesh geometry={GEO.skirt} material={m.skirt} position={[0, 0.9, 0]} scale={[b, 1, 0.75 * b]} castShadow />}
        {m.bag && <mesh geometry={GEO.bag} material={m.bag} position={[0.25 * b, 0.95, 0]} rotation={[0, 0, 0.05]} castShadow />}
        {arm(1)}
        {arm(-1)}
        <group ref={(g) => void (rig.head = g)} position={[0, 1.46, 0]}>
          <mesh geometry={GEO.neck} material={m.skin} position={[0, 0.03, 0]} />
          {m.scarf && <mesh geometry={GEO.scarf} material={m.scarf} position={[0, 0.03, 0]} castShadow />}
          <mesh geometry={GEO.head} material={m.skin} position={[0, 0.16, 0]} scale={[0.92, 1.06, 1]} castShadow />
          <mesh geometry={GEO.eye} material={EYE} position={[0.036, 0.175, 0.094]} />
          <mesh geometry={GEO.eye} material={EYE} position={[-0.036, 0.175, 0.094]} />
          <Hair look={look} material={m.hair} />
          {look.hat === 'beret' && (
            <group position={[0.015, 0.255, -0.01]} rotation={[-0.12, 0, 0.18]}>
              <mesh geometry={GEO.beret} material={m.hat} castShadow />
              <mesh geometry={GEO.nub} material={m.hat} position={[0, 0.02, 0]} />
            </group>
          )}
          {look.hat === 'cap' && (
            <group position={[0, 0.175, 0]}>
              <mesh geometry={GEO.capCrown} material={m.hat} castShadow />
              <mesh geometry={GEO.capBrim} material={m.hat} position={[0, 0.005, 0.1]} />
            </group>
          )}
        </group>
      </group>
    </group>
  )
})

function Hair({ look, material }: { look: PersonLook; material: MeshStandardMaterial }) {
  switch (look.hairStyle) {
    case 'bald':
      return null
    case 'curly':
      return <mesh geometry={GEO.curls} material={material} position={[0, 0.17, -0.012]} rotation={[-0.25, 0, 0]} castShadow />
    case 'long':
      return (
        <>
          <mesh geometry={GEO.hairCap} material={material} position={[0, 0.165, -0.008]} rotation={[-0.3, 0, 0]} castShadow />
          <mesh geometry={GEO.hairLong} material={material} position={[0, 0.07, -0.06]} scale={[1.05, 1, 0.55]} castShadow />
        </>
      )
    case 'bun':
      return (
        <>
          <mesh geometry={GEO.hairCap} material={material} position={[0, 0.165, -0.008]} rotation={[-0.3, 0, 0]} castShadow />
          <mesh geometry={GEO.bun} material={material} position={[0, 0.26, -0.07]} castShadow />
        </>
      )
    default:
      return <mesh geometry={GEO.hairCap} material={material} position={[0, 0.17, -0.01]} rotation={[-0.35, 0, 0]} castShadow />
  }
}
