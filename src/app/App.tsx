import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { CanvasScene } from '../components/three/CanvasScene'
import { CoffeeSelector } from '../components/ui/CoffeeSelector'
import { DessertSelector } from '../components/ui/DessertSelector'
import { InspectCard, InteractionHint, Toast } from '../components/ui/InteractionHint'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import { Navigation } from '../components/ui/Navigation'
import { OrderConfirmation, OrderPanel } from '../components/ui/OrderPanel'
import { ShiftFade, ShiftSummary, ShiftTicket, useShiftDirector } from '../components/ui/ShiftHud'
import { useCafeStore } from './store/useCafeStore'

function Panels() {
  const panel = useCafeStore((s) => s.panel)
  return (
    <AnimatePresence mode="wait">
      {panel === 'coffee' && <CoffeeSelector key="coffee" />}
      {panel === 'desserts' && <DessertSelector key="desserts" />}
      {panel === 'order' && <OrderPanel key="order" />}
    </AnimatePresence>
  )
}

/** Escape closes panels first, then leaves a close-up view. */
function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const s = useCafeStore.getState()
      if (s.panel !== 'none') s.closePanel()
      else if (s.focus) s.resetCamera()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  useKeyboardShortcuts()
  useShiftDirector()
  return (
    <main className="relative h-full w-full select-none">
      <CanvasScene />
      <Navigation />
      <InteractionHint />
      <InspectCard />
      <ShiftTicket />
      <Toast />
      <Panels />
      <OrderConfirmation />
      <ShiftSummary />
      <ShiftFade />
      <LoadingScreen />
    </main>
  )
}
