import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface PanelProps {
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared shell for the coffee, dessert and order panels.
 * Desktop/tablet: a floating card on the right. Phones: a bottom sheet.
 */
export function Panel({ eyebrow, title, onClose, children, footer }: PanelProps) {
  return (
    <motion.aside
      role="dialog"
      aria-label={title}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="glass-panel pointer-events-auto fixed inset-x-3 bottom-3 z-30 flex max-h-[55vh] flex-col overflow-hidden rounded-3xl md:inset-x-auto md:top-40 md:right-5 md:bottom-auto md:max-h-[calc(100vh-12rem)] md:w-[380px] lg:top-24 lg:max-h-[calc(100vh-8rem)]"
    >
      <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-terracotta uppercase">{eyebrow}</p>
          <h2 className="font-serif text-[1.9rem] leading-tight font-semibold text-espresso">{title}</h2>
        </div>
        <button onClick={onClose} aria-label="Close panel" className="mt-1 rounded-full p-2 text-espresso/70 transition hover:bg-espresso/8 hover:text-espresso">
          <X size={18} />
        </button>
      </header>
      <div className="scroll-soft flex-1 overflow-y-auto px-6 pb-4">{children}</div>
      {footer && <footer className="border-t border-espresso/10 bg-cream/60 px-6 py-4">{footer}</footer>}
    </motion.aside>
  )
}

/** Primary pill button used across panels. */
export function PrimaryButton({ children, onClick, disabled, className = '' }: { children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 py-3 text-sm font-semibold text-cream shadow-soft transition-colors hover:bg-[#4a3529] disabled:cursor-not-allowed disabled:bg-espresso/30 disabled:shadow-none ${className}`}
    >
      {children}
    </motion.button>
  )
}

/** A selectable option card (drink, cup, dessert, latte art). */
export function OptionCard({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <motion.button
      layout
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`relative w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
        selected ? 'border-terracotta bg-white/80 shadow-soft' : 'border-espresso/10 bg-white/40 hover:border-espresso/25 hover:bg-white/70'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </motion.button>
  )
}
