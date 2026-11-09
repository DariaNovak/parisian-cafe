import { COUNTER_TOP, ESPRESSO_POS } from '../../constants/layout'

export type CameraViewId = 'exterior' | 'terrace' | 'interior' | 'coffee' | 'pastry'

export interface CameraView {
  id: CameraViewId
  label: string
  position: [number, number, number]
  target: [number, number, number]
  /** Orbit constraints applied while this view is active (keeps the camera out of walls). */
  limits: {
    minDistance: number
    maxDistance: number
    minPolar: number
    maxPolar: number
  }
  /** Whether this view is inside the café (opens the door, enables interior bounds). */
  inside: boolean
  /** Whether this view appears in the view selector. */
  listed: boolean
}

const DEG = Math.PI / 180

export const CAMERA_VIEWS: Record<CameraViewId, CameraView> = {
  exterior: {
    id: 'exterior',
    label: 'Street',
    position: [7.5, 3.4, 12.2],
    target: [0, 3.2, 0],
    limits: { minDistance: 5, maxDistance: 17, minPolar: 35 * DEG, maxPolar: 88 * DEG },
    inside: false,
    listed: true,
  },
  terrace: {
    id: 'terrace',
    label: 'Terrace',
    position: [-1.2, 2.05, 6.4],
    target: [-2.8, 1.05, 1.9],
    limits: { minDistance: 2, maxDistance: 7.5, minPolar: 40 * DEG, maxPolar: 86 * DEG },
    inside: false,
    listed: true,
  },
  interior: {
    id: 'interior',
    label: 'Interior',
    position: [2.6, 2.15, -0.9],
    target: [-1.0, 1.35, -5.0],
    limits: { minDistance: 1.2, maxDistance: 4.6, minPolar: 50 * DEG, maxPolar: 98 * DEG },
    inside: true,
    listed: true,
  },
  coffee: {
    id: 'coffee',
    label: 'Coffee Bar',
    position: [ESPRESSO_POS[0] + 0.3, COUNTER_TOP + 0.62, ESPRESSO_POS[2] + 1.12],
    target: [ESPRESSO_POS[0] - 0.02, COUNTER_TOP + 0.1, ESPRESSO_POS[2] + 0.33],
    limits: { minDistance: 0.5, maxDistance: 2.6, minPolar: 30 * DEG, maxPolar: 95 * DEG },
    inside: true,
    listed: true,
  },
  pastry: {
    id: 'pastry',
    label: 'Pâtisserie',
    position: [3.35, COUNTER_TOP + 0.55, -3.95],
    target: [3.35, COUNTER_TOP + 0.12, -5.9],
    limits: { minDistance: 0.9, maxDistance: 2.8, minPolar: 45 * DEG, maxPolar: 95 * DEG },
    inside: true,
    listed: false,
  },
}

export const LISTED_VIEWS = Object.values(CAMERA_VIEWS).filter((v) => v.listed)
