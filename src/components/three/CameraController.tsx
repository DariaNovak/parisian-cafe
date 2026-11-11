import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3, type Object3D } from 'three'
import { useCafeStore } from '../../app/store/useCafeStore'
import { INTERIOR } from '../../constants/layout'
import { CAMERA_VIEWS } from '../../features/navigation/cameraViews'
import { useShiftStore } from '../../features/shift/useShiftStore'

const DEG = Math.PI / 180

/**
 * Views are composed for landscape screens. On tall/narrow screens the
 * horizontal field of view shrinks, so we pull the camera back along its view
 * direction to keep the subject framed.
 */
function aspectAdjusted(position: readonly number[], target: readonly number[], aspect: number): [number, number, number] {
  const k = Math.min(2.2, Math.max(1, Math.pow(1.45 / aspect, 0.75)))
  return [0, 1, 2].map((i) => target[i] + (position[i] - target[i]) * k) as [number, number, number]
}
const FOCUS_LIMITS = { minDistance: 0.45, maxDistance: 3.2, minPolar: 30 * DEG, maxPolar: 92 * DEG }

/**
 * Invisible boxes the camera collides with (camera-controls raycasts from the
 * target to the camera and pulls the camera in front of any hit). Interior views
 * use the room shell; exterior views use the street facades and the ground.
 */
function useColliders() {
  return useMemo(() => {
    const mat = new MeshBasicMaterial({ visible: false })
    const box = (min: [number, number, number], max: [number, number, number]) => {
      const m = new Mesh(new BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]), mat)
      m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
      m.updateMatrixWorld(true)
      return m
    }
    const pad = 0.25
    const interior: Object3D[] = [
      box([-8, -1, -9], [8, 0.12 + pad, 1]), // floor
      box([-8, INTERIOR.ceiling - pad, -9], [8, 6, 1]), // ceiling
      box([-9, -1, -9], [INTERIOR.minX + pad, 6, 1]), // left wall
      box([INTERIOR.maxX - pad, -1, -9], [9, 6, 1]), // right wall
      box([-8, -1, -10], [8, 6, INTERIOR.minZ + pad]), // back wall
      box([-8, -1, INTERIOR.maxZ - pad], [8, 6, 2]), // facade (windows included)
    ]
    const exterior: Object3D[] = [
      box([-40, -2, -12], [40, 0.35, 30]), // ground
      box([-40, -1, -12], [40, 20, -0.1]), // café + neighbour facades
      box([-40, -1, 13.9], [40, 20, 30]), // buildings across the street
    ]
    return { interior, exterior }
  }, [])
}

export function CameraController() {
  const ref = useRef<CameraControlsImpl>(null)
  const view = useCafeStore((s) => s.view)
  const focus = useCafeStore((s) => s.focus)
  const resetNonce = useCafeStore((s) => s.resetNonce)
  const dragging = useCafeStore((s) => s.dragging)
  const colliders = useColliders()
  const aspect = useThree((s) => s.size.width / s.size.height)
  const shift = useShiftStore((s) => s.active)
  const camera = useThree((s) => s.camera)
  const wasShift = useRef(false)

  // Fly to the active view / focus whenever it changes (or a reset is requested).
  useEffect(() => {
    const c = ref.current
    if (!c) return
    // During a shift <BaristaCamera/> owns the camera (first person behind the counter).
    c.enabled = !shift
    if (shift) {
      wasShift.current = true
      return
    }
    if (wasShift.current) {
      // Take over from wherever the barista was looking, then fly to the view.
      wasShift.current = false
      const fwd = camera.getWorldDirection(new Vector3()).multiplyScalar(2).add(camera.position)
      void c.setLookAt(camera.position.x, camera.position.y, camera.position.z, fwd.x, fwd.y, fwd.z, false)
    }
    const v = CAMERA_VIEWS[view]
    const target = focus ?? v
    const inside = focus ? focus.inside : v.inside
    const limits = focus ? FOCUS_LIMITS : v.limits
    c.minDistance = limits.minDistance
    c.maxDistance = limits.maxDistance * Math.max(1, 1.45 / aspect)
    c.minPolarAngle = limits.minPolar
    c.maxPolarAngle = limits.maxPolar
    c.colliderMeshes = inside ? colliders.interior : colliders.exterior
    void c.setLookAt(...aspectAdjusted(target.position, target.target, aspect), ...target.target, true)
    // Walking in opens the door; returning to the street overview closes it.
    if (inside) useCafeStore.getState().setDoorOpen(true)
    else if (view === 'exterior' && !focus && !useShiftStore.getState().active) useCafeStore.getState().setDoorOpen(false)
  }, [view, focus, resetNonce, colliders, aspect, shift, camera])

  useEffect(() => {
    if (ref.current) ref.current.enabled = !dragging && !shift
  }, [dragging, shift])

  // With a side panel open on wide screens, slide the framing left so the
  // subject isn't hidden behind the panel (focal offset keeps orbiting intact).
  const panel = useCafeStore((s) => s.panel)
  useEffect(() => {
    const c = ref.current
    if (!c || shift) return
    const wide = window.innerWidth >= 768
    // Use the destination framing's distance (not the in-flight one) so the shift is stable.
    const dest = focus ?? CAMERA_VIEWS[view]
    const distance = Math.hypot(dest.position[0] - dest.target[0], dest.position[1] - dest.target[1], dest.position[2] - dest.target[2])
    const open = panel !== 'none'
    // Wide screens: panel on the right → shift framing left. Phones: bottom sheet → lift the subject.
    void c.setFocalOffset(open && wide ? distance * 0.2 : 0, open && !wide ? -distance * 0.3 : 0, 0, true)
  }, [panel, view, focus, shift])

  return <CameraControls ref={ref} makeDefault smoothTime={0.55} draggingSmoothTime={0.12} dollySpeed={0.6} truckSpeed={0.8} />
}
