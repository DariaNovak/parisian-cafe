import { Select } from '@react-three/postprocessing'
import type { ThreeEvent } from '@react-three/fiber'
import { useState, type ReactNode } from 'react'
import { useCafeStore } from '../../../app/store/useCafeStore'
import { playSfx } from '../../../audio/audioEngine'
import { NO_MERGE } from '../MergeStatic'

interface InteractiveProps {
  /** Hint shown in the UI while hovered. */
  label: string
  onSelect: (e: ThreeEvent<MouseEvent>) => void
  children: ReactNode
  position?: [number, number, number]
  rotation?: [number, number, number]
  disabled?: boolean
}

/** Max pointer travel (px) between down/up for a press to count as a click rather than an orbit drag. */
const CLICK_TOLERANCE = 6

/**
 * Wraps clickable scene objects: pointer cursor, a soft outline (via the
 * post-processing Outline effect + <Select>), a UI hint and click handling.
 */
export function Interactive({ label, onSelect, children, position, rotation, disabled = false }: InteractiveProps) {
  const [hovered, setHovered] = useState(false)
  const setHint = useCafeStore((s) => s.setHint)

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (disabled) return
    e.stopPropagation()
    if (!hovered) {
      setHovered(true)
      setHint(label)
      document.body.style.cursor = 'pointer'
    }
  }
  const out = () => {
    if (!hovered) return
    setHovered(false)
    setHint(null)
    document.body.style.cursor = ''
  }

  return (
    <group
      position={position}
      rotation={rotation}
      userData={NO_MERGE}
      onPointerOver={over}
      onPointerOut={out}
      onClick={(e) => {
        if (disabled || e.delta > CLICK_TOLERANCE) return
        e.stopPropagation()
        playSfx('tap')
        onSelect(e)
      }}
    >
      <Select enabled={hovered}>{children}</Select>
    </group>
  )
}
