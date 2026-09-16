'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Calendar, Clock, Flame, Info, Leaf, Minus, Plus, ShoppingBag, Weight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { MenuDish } from '@/lib/data/menu'
import { missingRequiredSections, selectedUnitPrice, type DishSelections, type DishDetailSection } from '@/lib/dish-details'

const icons = { portion: Weight, fire: Flame, calendar: Calendar, time: Clock, leaf: Leaf, info: Info }

export function DishDetail({ dish, onAdd, adding = false, offline = false, error }: {
  dish: MenuDish
  onAdd: (quantity: number, notes: string, selections: DishSelections) => Promise<void>
  adding?: boolean
  offline?: boolean
  error?: string | null
}) {
  const sections = dish.detailSections ?? []
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [selections, setSelections] = useState<DishSelections>(() => Object.fromEntries(
    sections.filter(s => s.kind === 'single').map(s => [s.id, s.items.filter(i => i.recommended).slice(0, 1).map(i => i.id)])
  ))
  const [attempted, setAttempted] = useState(false)
  const missing = missingRequiredSections(sections, selections, notes)
  const total = selectedUnitPrice(dish.price, sections, selections) * quantity
  const disabled = adding || offline

  async function submit() {
    setAttempted(true)
    if (missing.length) {
      const target = document.getElementById(`section-${missing[0].id}`)
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      target?.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true })
      return
    }
    await onAdd(quantity, notes.trim(), selections)
  }

  function renderSection(section: DishDetailSection, index: number) {
    const selectable = section.kind === 'single' || section.kind === 'multiple'
    const invalid = attempted && missing.some(s => s.id === section.id)
    return <section key={section.id} id={`section-${section.id}`} aria-labelledby={`title-${section.id}`} className="scroll-mt-24 space-y-3" style={{ order: index + 2 }}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`title-${section.id}`} className={section.kind === 'characteristics' ? 'sr-only' : 'text-title-md'}>{section.title}</h2>
        {(selectable || section.kind === 'notes') && <span className={`shrink-0 text-label-sm uppercase ${section.required ? 'text-primary' : 'text-muted-foreground'}`}>{section.required ? (section.kind === 'single' ? '1 requerido' : 'Requerido') : 'Opcionales'}</span>}
      </div>
      {section.kind === 'characteristics' && <dl className="grid grid-cols-2 gap-3">
        {section.items.map(item => {
          const Icon = icons[item.icon] ?? Info
          return <div key={item.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-highlight text-highlight-foreground"><Icon className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0"><dt className="text-label-sm text-muted-foreground uppercase break-words">{item.label}</dt><dd className="mt-0.5 text-label-lg tabular-nums break-words">{item.value}</dd></div>
          </div>
        })}
      </dl>}
      {section.kind === 'ingredients' && <ul className="flex flex-wrap gap-2" aria-label={section.title}>{section.items.map(item => <li key={item.id} className="rounded-full bg-muted px-3 py-1.5 text-label-md">{item.label}</li>)}</ul>}
      {section.kind === 'text' && <p className="whitespace-pre-wrap text-body-md leading-relaxed text-muted-foreground">{section.body}</p>}
      {selectable && <fieldset className="space-y-2" aria-invalid={invalid} aria-describedby={invalid ? `error-${section.id}` : undefined} disabled={disabled || !dish.isAvailable}>
        <legend className="sr-only">{section.title}</legend>
        {section.items.map(item => {
          const checked = selections[section.id]?.includes(item.id) ?? false
          return <label key={item.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl p-3.5 transition-colors focus-within:ring-2 focus-within:ring-ring ${checked ? 'bg-secondary ring-2 ring-primary' : 'bg-muted hover:bg-border'} ${disabled || !dish.isAvailable ? 'cursor-default opacity-60' : ''}`}>
            <input type={section.kind === 'single' ? 'radio' : 'checkbox'} name={section.id} checked={checked} value={item.id} className="size-4 shrink-0 accent-primary" onChange={() => setSelections(current => {
              const previous = current[section.id] ?? []
              return { ...current, [section.id]: section.kind === 'single' ? [item.id] : checked ? previous.filter(id => id !== item.id) : [...previous, item.id] }
            })} />
            <span className="min-w-0 flex-1"><span className="block text-label-lg break-words">{item.label}</span>{item.description && <span className="mt-1 block text-body-md text-muted-foreground">{item.description}</span>}</span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              {item.recommended && <span className="rounded-full bg-highlight px-2 py-1 text-label-sm text-highlight-foreground">Recomendado</span>}
              {item.price > 0 && <span className="text-label-md text-primary tabular-nums">+ ${item.price.toFixed(2)}</span>}
            </span>
          </label>
        })}
        {section.kind === 'single' && !section.required && selections[section.id]?.length > 0 && <Button type="button" variant="ghost" onClick={() => setSelections(current => ({ ...current, [section.id]: [] }))}>Quitar selección</Button>}
      </fieldset>}
      {section.kind === 'notes' && <>
        <label htmlFor="dish-notes" className="sr-only">{section.title}</label>
        <Textarea id="dish-notes" rows={3} maxLength={140} value={notes} placeholder={section.body || 'Cuéntanos cómo prefieres tu plato…'} className="rounded-2xl bg-muted text-body-md" aria-invalid={invalid} aria-describedby={invalid ? `error-${section.id}` : 'dish-notes-count'} disabled={disabled || !dish.isAvailable} onChange={e => setNotes(e.target.value)} />
        <span id="dish-notes-count" className="block text-right text-label-md text-muted-foreground tabular-nums">{notes.length}/140</span>
      </>}
      {invalid && <p id={`error-${section.id}`} className="text-body-md text-destructive" role="alert">{section.kind === 'notes' ? 'Completa las notas para la cocina.' : `Elige ${section.kind === 'single' ? 'una opción' : 'al menos una opción'} para continuar.`}</p>}
    </section>
  }

  return <article className="flex flex-col gap-6 pb-32 text-foreground lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-10 lg:pb-12">
    <div className="contents lg:block lg:min-w-0 lg:space-y-6">
    <div className="overflow-hidden rounded-2xl bg-muted" style={{ order: 0 }}>
      {dish.photoUrl ? <Image src={dish.photoUrl} alt={dish.name} width={800} height={600} sizes="(min-width: 1024px) 560px, (max-width: 640px) 100vw, 640px" className="aspect-[4/3] w-full object-cover" unoptimized priority /> : <div className="flex aspect-[4/3] items-center justify-center gap-2 text-body-md text-muted-foreground"><ShoppingBag className="size-5" /> Sin fotografía</div>}
    </div>
    <div className="space-y-3" style={{ order: 1 }}>
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 text-title-lg text-balance">{dish.name}</h1>
        <span className="shrink-0 text-title-lg text-primary tabular-nums">${dish.price.toFixed(2)}</span>
      </div>
      {dish.description && <p className="text-body-md leading-relaxed text-muted-foreground">{dish.description}</p>}
      {!dish.isAvailable && <p className="rounded-xl bg-muted p-3 text-body-md text-muted-foreground" role="status">Este plato está agotado por el momento.</p>}
    </div>
    {sections.map((section, index) => section.kind === 'characteristics' || section.kind === 'ingredients' || section.kind === 'text' ? renderSection(section, index) : null)}
    </div>
    <div className="contents lg:block lg:min-w-0 lg:space-y-6 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-6">
      <h2 className="hidden text-title-lg lg:block">Personaliza tu plato</h2>
      {sections.map((section, index) => section.kind === 'single' || section.kind === 'multiple' || section.kind === 'notes' ? renderSection(section, index) : null)}


    <p className="flex items-start gap-2 text-label-md text-muted-foreground" style={{ order: sections.length + 2 }}><Info className="size-4 shrink-0 text-highlight-foreground" aria-hidden="true" />Si padeces de alguna alergia alimentaria severa, avisa también a tu camarero asignado.</p>
    {error && <p className="rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground" role="alert" style={{ order: sections.length + 3 }}>{error}</p>}
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:sticky lg:bottom-0 lg:inset-x-auto lg:border-0 lg:bg-card lg:px-0 lg:pb-0 lg:pt-4 lg:backdrop-blur-none" style={{ order: sections.length + 4 }}>
      <div className="mx-auto flex max-w-screen-sm items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div className="flex shrink-0 items-center rounded-full bg-muted" aria-label="Cantidad">
          <button type="button" aria-label="Reducir cantidad" disabled={quantity <= 1 || disabled} className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="size-4" /></button>
          <output className="w-4 text-center text-label-lg tabular-nums" aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Aumentar cantidad" disabled={disabled} className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40" onClick={() => setQuantity(q => q + 1)}><Plus className="size-4" /></button>
        </div>
        <Button onClick={submit} disabled={disabled || !dish.isAvailable} className="min-w-0 flex-1 gap-1.5 px-2"><ShoppingBag className="size-4 shrink-0" /><span>{adding ? 'Agregando…' : 'Agregar'}</span><span className="ml-auto tabular-nums" aria-live="polite">${total.toFixed(2)}</span></Button>
      </div>
    </div>
    </div>
  </article>
}
