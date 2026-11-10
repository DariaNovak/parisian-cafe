import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useCafeStore } from '../../app/store/useCafeStore'
import { DESSERT_LIST, DESSERTS } from '../../features/desserts/dessertsConfig'
import { orderDessert } from '../../features/desserts/orderDessert'
import { useDessertStore } from '../../features/desserts/useDessertStore'
import { formatPrice, useOrderStore } from '../../features/ordering/useOrderStore'
import { OptionCard, Panel, PrimaryButton } from './Panel'

/** Browse the pâtisserie cabinet and add desserts to the order. */
export function DessertSelector() {
  const closePanel = useCafeStore((s) => s.closePanel)
  const selected = useDessertStore((s) => s.selected)
  const select = useDessertStore((s) => s.select)
  const items = useOrderStore((s) => s.items)
  const qtyOf = (id: string) => items.find((it) => it.kind === 'dessert' && it.dessert === id)?.qty ?? 0
  const spec = selected ? DESSERTS[selected] : null

  return (
    <Panel
      eyebrow="La pâtisserie"
      title="Desserts du jour"
      onClose={() => {
        closePanel()
        select(null)
      }}
      footer={
        <PrimaryButton onClick={() => spec && orderDessert(spec.id)} disabled={!spec}>
          <Plus size={16} /> {spec ? `Add ${spec.label.toLowerCase()} · ${formatPrice(spec.price)}` : 'Select a dessert'}
        </PrimaryButton>
      }
    >
      <p className="mb-4 text-sm text-espresso/65">Tap a pastry here or in the glass cabinet. Added desserts are placed on the serving tray.</p>
      <div className="space-y-2">
        {DESSERT_LIST.map((d) => (
          <OptionCard key={d.id} selected={selected === d.id} onClick={() => select(d.id)}>
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 shrink-0 rounded-full border-4 border-white shadow-soft" style={{ background: d.accent }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-serif text-xl font-semibold">{d.label}</p>
                  <p className="text-sm font-semibold text-espresso/80">{formatPrice(d.price)}</p>
                </div>
                <p className="text-[0.72rem] text-terracotta italic">{d.french}</p>
                <AnimatePresence initial={false}>
                  {selected === d.id && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1 text-[0.8rem] leading-snug text-espresso/65">
                      {d.description}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              {qtyOf(d.id) > 0 && <span className="rounded-full bg-sage px-2 py-0.5 text-[0.7rem] font-bold">×{qtyOf(d.id)}</span>}
            </div>
          </OptionCard>
        ))}
      </div>
    </Panel>
  )
}
