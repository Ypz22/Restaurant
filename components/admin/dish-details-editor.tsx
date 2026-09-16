'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  createDetailItem, createDetailSection, detailKinds,
  type DishDetailKind, type DishDetailSection, type DishDetailItem,
} from '@/lib/dish-details'

const selectClass = 'h-11 w-full rounded-xl border border-input bg-card px-3 text-body-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const iconNames = { portion: 'Porción', fire: 'Fuego', calendar: 'Maduración / fecha', time: 'Tiempo', leaf: 'Origen / vegetal', info: 'Información' } as const

export function DishDetailsEditor({
  value, onChange, maxSections = 20, title = 'Detalle del plato',
  description = 'Añade las secciones que necesita este plato. Aparecerán en el menú en este orden.',
  emptyMessage = 'Este plato aún no tiene secciones. Añade características, ingredientes u opciones para personalizarlo.',
  showPriceNote = true, showTopBorder = true,
}: {
  value: DishDetailSection[]
  onChange: (sections: DishDetailSection[]) => void
  maxSections?: number
  title?: string
  description?: string
  emptyMessage?: string
  showPriceNote?: boolean
  showTopBorder?: boolean
}) {
  const [newKind, setNewKind] = useState<DishDetailKind>('characteristics')

  function update(id: string, patch: Partial<DishDetailSection>) {
    onChange(value.map(section => section.id === id ? { ...section, ...patch } : section))
  }
  function updateItem(section: DishDetailSection, id: string, patch: Partial<DishDetailItem>) {
    update(section.id, { items: section.items.map(item => item.id === id ? { ...item, ...patch } : item) })
  }
  function move(index: number, direction: number) {
    const next = [...value]
    const target = index + direction
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return <section className={`space-y-4 ${showTopBorder ? 'border-t border-border pt-6' : ''}`} aria-labelledby="detail-editor-title">
    <div>
      <h2 id="detail-editor-title" className="text-title-md text-foreground">{title}</h2>
      <p className="mt-1 text-body-md text-muted-foreground">{description}</p>
    </div>
    {!value.length && <p className="rounded-xl bg-muted p-4 text-body-md text-muted-foreground">{emptyMessage}</p>}
    {value.map((section, index) => {
      const selectable = section.kind === 'single' || section.kind === 'multiple'
      const canRequire = selectable || section.kind === 'notes'
      return <details key={section.id} open className="rounded-2xl border border-border bg-card">
        <summary className="cursor-pointer rounded-2xl p-4 text-label-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {section.title || detailKinds[section.kind]}
          <span className="ml-2 text-label-md text-muted-foreground">{index + 1} / {value.length}</span>
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-label-md text-muted-foreground">{detailKinds[section.kind]}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label={`Subir ${section.title}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Bajar ${section.title}`} disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar sección ${section.title}`} onClick={() => onChange(value.filter(s => s.id !== section.id))}><Trash2 className="size-4" /></Button>
            </div>
          </div>
          <label className="grid gap-1.5 text-label-md text-secondary-foreground">
            Título de la sección
            <Input value={section.title} maxLength={100} onChange={e => update(section.id, { title: e.target.value })} />
          </label>
          {selectable && <label className="grid gap-1.5 text-label-md text-secondary-foreground">
            Selección del comensal
            <select className={selectClass} value={section.kind} onChange={e => update(section.id, { kind: e.target.value as 'single' | 'multiple' })}>
              <option value="single">Una sola opción</option><option value="multiple">Varias opciones</option>
            </select>
          </label>}
          {canRequire && <label className="flex items-center justify-between gap-3 text-label-md text-foreground">
            {section.kind === 'notes' ? 'Notas obligatorias' : 'Selección obligatoria'}
            <Switch checked={section.required} onCheckedChange={required => update(section.id, { required })} aria-label={`${section.title}: obligatorio`} />
          </label>}
          {(section.kind === 'text' || section.kind === 'notes') && <label className="grid gap-1.5 text-label-md text-secondary-foreground">
            {section.kind === 'notes' ? 'Ejemplo dentro del campo de notas' : 'Contenido'}
            <Textarea rows={3} maxLength={1000} value={section.body} onChange={e => update(section.id, { body: e.target.value })} />
          </label>}
          {section.items.map((item, itemIndex) => <div key={item.id} className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-label-md text-muted-foreground">{section.kind === 'characteristics' ? 'Característica' : section.kind === 'ingredients' ? 'Ingrediente' : 'Opción'} {itemIndex + 1}</span>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${item.label || `elemento ${itemIndex + 1}`}`} onClick={() => update(section.id, { items: section.items.filter(i => i.id !== item.id) })}><Trash2 className="size-4" /></Button>
            </div>
            <label className="grid gap-1.5 text-label-md text-secondary-foreground">
              {section.kind === 'characteristics' ? 'Nombre de la característica' : 'Nombre'}
              <Input value={item.label} maxLength={100} placeholder={section.kind === 'characteristics' ? 'Ej. Porción, fuego, maduración…' : undefined} onChange={e => updateItem(section, item.id, { label: e.target.value })} />
            </label>
            {section.kind === 'characteristics' && <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-label-md text-secondary-foreground">Valor<Input value={item.value} maxLength={100} placeholder="Ej. 420 g" onChange={e => updateItem(section, item.id, { value: e.target.value })} /></label>
              <label className="grid gap-1.5 text-label-md text-secondary-foreground">Icono<select className={selectClass} value={item.icon} onChange={e => updateItem(section, item.id, { icon: e.target.value as DishDetailItem['icon'] })}>{Object.entries(iconNames).map(([icon, name]) => <option key={icon} value={icon}>{name}</option>)}</select></label>
            </div>}
            {selectable && <>
              <label className="grid gap-1.5 text-label-md text-secondary-foreground">Descripción<Input maxLength={300} value={item.description} onChange={e => updateItem(section, item.id, { description: e.target.value })} /></label>
              <div className="grid grid-cols-2 items-end gap-3">
                <label className="grid gap-1.5 text-label-md text-secondary-foreground">Precio adicional ($)<Input type="number" min="0" max="999999" step="0.01" value={Number.isNaN(item.price) ? '' : item.price} className="tabular-nums" onChange={e => updateItem(section, item.id, { price: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
                <label className="flex h-11 items-center justify-between gap-2 text-label-md text-foreground">Recomendado<Switch checked={item.recommended} aria-label={`${item.label || 'Opción'}: recomendado`} onCheckedChange={recommended => updateItem(section, item.id, { recommended })} /></label>
              </div>
            </>}
          </div>)}
          {section.kind !== 'text' && section.kind !== 'notes' && <Button type="button" variant="secondary" disabled={section.items.length >= 30} onClick={() => update(section.id, { items: [...section.items, createDetailItem()] })}><Plus className="size-4" /> Añadir {section.kind === 'characteristics' ? 'característica' : section.kind === 'ingredients' ? 'ingrediente' : 'opción'}</Button>}
        </div>
      </details>
    })}
    <div className="flex flex-col gap-2 sm:flex-row">
      <label className="min-w-0 flex-1"><span className="sr-only">Tipo de nueva sección</span><select className={selectClass} value={newKind} onChange={e => setNewKind(e.target.value as DishDetailKind)}>{Object.entries(detailKinds).map(([kind, name]) => <option key={kind} value={kind} disabled={kind === 'notes' && value.some(s => s.kind === 'notes')}>{name}</option>)}</select></label>
      <Button type="button" variant="secondary" disabled={value.length >= maxSections || (newKind === 'notes' && value.some(s => s.kind === 'notes'))} onClick={() => onChange([...value, createDetailSection(newKind)])}><Plus className="size-4" /> Añadir sección</Button>
    </div>
    {showPriceNote && <p className="text-label-md text-muted-foreground">Los precios adicionales se cobran por cada unidad del plato. Quitar una sección no cambia pedidos ya guardados.</p>}
  </section>
}
