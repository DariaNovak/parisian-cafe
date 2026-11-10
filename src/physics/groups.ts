import { interactionGroups } from '@react-three/rapier'

/**
 * Collision groups (bit indices):
 *  0 STATIC   — floors, counters, table tops, tray
 *  1 CUPS     — coffee cups (heavier, draggable)
 *  2 SMALL    — desserts and sugar cubes
 *  3 SENSORS  — table-top trigger volumes
 *
 * Cups and small items collide with everything solid. Sensors only listen for
 * cups, so sugar cubes and desserts never trigger "cup placed" events.
 */
export const GROUP = { STATIC: 0, CUPS: 1, SMALL: 2, SENSORS: 3 } as const

export const COLLISION = {
  static: interactionGroups(GROUP.STATIC, [GROUP.CUPS, GROUP.SMALL]),
  cups: interactionGroups(GROUP.CUPS, [GROUP.STATIC, GROUP.CUPS, GROUP.SMALL, GROUP.SENSORS]),
  small: interactionGroups(GROUP.SMALL, [GROUP.STATIC, GROUP.CUPS, GROUP.SMALL]),
  sensors: interactionGroups(GROUP.SENSORS, [GROUP.CUPS]),
}
