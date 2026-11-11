import { AnimatePresence, motion } from 'framer-motion'
import { CakeSlice, Check, Coffee, Minus, Plus, Receipt, Trash } from 'lucide-react'
import { useCafeStore } from '../../app/store/useCafeStore'
import { playSfx } from '../../audio/audioEngine'
import { COFFEES, CUPS, LATTE_ARTS } from '../../features/coffee/coffeeConfig'
import { DESSERTS } from '../../features/desserts/dessertsConfig'
import { formatPrice, itemCount, orderTotal, unitPrice, useOrderStore, type OrderItem } from '../../features/ordering/useOrderStore'
import { usePhysicsStore } from '../../physics/usePhysicsStore'
import { Panel, PrimaryButton } from './Panel'

function describe(item: OrderItem) {
  if (item.kind === 'dessert') return { title: DESSERTS[item.dessert].label, detail: DESSERTS[item.dessert].french }
  const art = item.art === 'none' ? 'no art' : LATTE_ARTS.find((a) => a.id === item.art)?.label.toLowerCase()
  return { title: COFFEES[item.coffee].label, detail: `${CUPS[item.cup].label} · ${art}` }
}

function Row({ item }: { item: OrderItem }) {
  const increment = useOrderStore((s) => s.increment)
  const decrement = useOrderStore((s) => s.decrement)
  const remove = useOrderStore((s) => s.remove)
  const { title, detail } = describe(item)
  return (
    <motion.li layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0 }} className="flex gap-3 rounded-2xl bg-white/55 px-3 py-2.5">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-espresso/8">{item.kind === 'coffee' ? <Coffee size={16} /> : <CakeSlice size={16} />}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-serif text-lg leading-tight font-semibold">{title}</p>
          <p className="text-sm font-semibold tabular-nums">{formatPrice(unitPrice(item) * item.qty)}</p>
        </div>
        <p className="text-[0.72rem] text-espresso/55">{detail}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-full bg-cream/80 px-1">
            <button aria-label={`One less ${title}`} onClick={() => decrement(item.key)} className="rounded-full p-1.5 hover:bg-espresso/8">
              <Minus size={13} />
            </button>
            <span className="w-5 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
            <button aria-label={`One more ${title}`} onClick={() => increment(item.key)} className="rounded-full p-1.5 hover:bg-espresso/8">
              <Plus size={13} />
            </button>
          </div>
          <button aria-label={`Remove ${title}`} onClick={() => remove(item.key)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-espresso/50 hover:bg-terracotta/15 hover:text-terracotta">
            <Trash size={13} /> Remove
          </button>
        </div>
      </div>
    </motion.li>
  )
}

/** Order summary: items, quantities, total and confirmation. */
export function OrderPanel() {
  const closePanel = useCafeStore((s) => s.closePanel)
  const openPanel = useCafeStore((s) => s.openPanel)
  const goToView = useCafeStore((s) => s.goToView)
  const items = useOrderStore((s) => s.items)
  const confirm = useOrderStore((s) => s.confirm)
  const total = orderTotal(items)

  return (
    <Panel
      eyebrow="L’addition"
      title="Your order"
      onClose={closePanel}
      footer={
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-espresso/65">
              Total · {itemCount(items)} item{itemCount(items) === 1 ? '' : 's'}
            </span>
            <motion.span key={total} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-serif text-3xl font-semibold tabular-nums">
              {formatPrice(total)}
            </motion.span>
          </div>
          <PrimaryButton
            disabled={!items.length}
            onClick={() => {
              confirm()
              playSfx('success')
            }}
          >
            <Check size={16} /> Confirm order
          </PrimaryButton>
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Receipt size={32} className="text-espresso/30" />
          <p className="font-serif text-xl">Your table is still empty</p>
          <p className="max-w-[16rem] text-sm text-espresso/60">Brew a coffee at the espresso machine or pick a pastry from the cabinet.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => { openPanel('coffee'); goToView('coffee') }} className="chip bg-espresso text-cream">Make a coffee</button>
            <button onClick={() => { openPanel('desserts'); goToView('pastry') }} className="chip bg-white/70 text-espresso">Desserts</button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <Row key={it.key} item={it} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  )
}

/** Animated confirmation shown after the order is confirmed. */
export function OrderConfirmation() {
  const status = useOrderStore((s) => s.status)
  const orderNumber = useOrderStore((s) => s.orderNumber)
  const items = useOrderStore((s) => s.items)
  const startNewOrder = useOrderStore((s) => s.startNewOrder)
  const closePanel = useCafeStore((s) => s.closePanel)
  const total = orderTotal(items)

  const done = () => {
    startNewOrder()
    closePanel()
    // Clear the tray for the next order (cups on tables stay where the user left them).
    const phys = usePhysicsStore.getState()
    phys.clearKind('dessert')
    phys.clearKind('coffee')
  }

  return (
    <AnimatePresence>
      {status === 'confirmed' && (
        <motion.div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-espresso/35 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            role="alertdialog"
            aria-label="Order confirmed"
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-cream p-8 text-center shadow-soft"
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            {/* Confetti of pastel petals */}
            {Array.from({ length: 14 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute top-0 h-2.5 w-1.5 rounded-full"
                style={{ left: `${8 + i * 6.3}%`, background: ['#E9BFC4', '#A8B5A0', '#FFD9A0', '#C77D62'][i % 4] }}
                initial={{ y: -20, rotate: 0, opacity: 0 }}
                animate={{ y: 260 + (i % 3) * 40, rotate: 220 + i * 30, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.2, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
              />
            ))}
            <motion.div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sage" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 15 }}>
              <svg viewBox="0 0 52 52" className="h-11 w-11" fill="none" stroke="#382820" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M14 27 l8 8 l16 -18" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.5 }} />
              </svg>
            </motion.div>
            <p className="mt-5 text-[0.7rem] font-semibold tracking-[0.25em] text-terracotta uppercase">Thank you</p>
            <h2 className="font-serif text-4xl font-semibold">Order confirmed</h2>
            <p className="mt-2 text-sm text-espresso/65">
              Order <span className="font-semibold text-espresso">#{orderNumber}</span> is being prepared. Your table is waiting on the terrace.
            </p>
            <ul className="mt-5 space-y-1 rounded-2xl bg-white/60 p-4 text-left text-sm">
              {items.map((it) => (
                <li key={it.key} className="flex justify-between">
                  <span>
                    {it.qty} × {describe(it).title}
                  </span>
                  <span className="tabular-nums">{formatPrice(unitPrice(it) * it.qty)}</span>
                </li>
              ))}
              <li className="mt-2 flex justify-between border-t border-espresso/10 pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </li>
            </ul>
            <PrimaryButton className="mt-6" onClick={done}>
              Start a new order
            </PrimaryButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
