'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DishDetailsEditor } from '@/components/admin/dish-details-editor'
import { upsertDish, type AdminCategory, type AdminDish } from '@/lib/data/admin-menu'
import { detailValidationError, type DishDetailSection } from '@/lib/dish-details'

type Scope = 'all' | 'categories' | 'dishes'

export function DetailSectionBulkDialog({ open, onOpenChange, restaurantId, categories, dishes, onApplied }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  categories: AdminCategory[]
  dishes: AdminDish[]
  onApplied: (dishes: AdminDish[]) => void
}) {
  const [section, setSection] = useState<DishDetailSection | null>(null)
  const [scope, setScope] = useState<Scope>('all')
  const [targets, setTargets] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const availableTargets = scope === 'categories' ? categories : dishes
  function toggle(id: string) { setTargets(current => current.includes(id) ? current.filter(target => target !== id) : [...current, id]) }

  async function apply() {
    if (!section) { toast.error('Configura la sección que quieres aplicar.'); return }
    const validation = detailValidationError([section])
    if (validation) { toast.error(validation); return }
    if (scope !== 'all' && targets.length === 0) { toast.error('Selecciona al menos un destino.'); return }
    const selected = scope === 'all' ? dishes : scope === 'categories'
      ? dishes.filter(dish => targets.includes(dish.categoryId))
      : dishes.filter(dish => targets.includes(dish.id))
    if (!selected.length) { toast.error('No hay platos para aplicar esta sección.'); return }
    setSaving(true)
    try {
      const saved = await Promise.all(selected.map(dish => upsertDish(restaurantId, {
        id: dish.id, categoryId: dish.categoryId, name: dish.name, description: dish.description,
        price: dish.price, photoUrl: dish.photoUrl, isAvailable: dish.isAvailable,
        detailSections: [...(dish.detailSections ?? []).filter(current => current.id !== section.id), structuredClone(section)],
      })))
      onApplied(saved)
      toast.success(`Sección aplicada a ${saved.length} ${saved.length === 1 ? 'plato' : 'platos'}.`)
      onOpenChange(false)
    } catch { toast.error('No se pudo aplicar la sección a todos los platos.') } finally { setSaving(false) }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader className="mb-0 border-b border-border pb-5 pr-8"><DialogTitle>Aplicar sección a varios platos</DialogTitle><DialogDescription>Define el contenido base y elige dónde aparecerá. Después puedes personalizarlo en cada plato.</DialogDescription></DialogHeader>
      <div className="space-y-6 py-6">
        <DishDetailsEditor value={section ? [section] : []} onChange={sections => setSection(sections[0] ?? null)} maxSections={1} title="1. Configura la sección" description="Esta será la base que recibirán los platos seleccionados." emptyMessage="Elige el tipo de sección para empezar a configurar su contenido." showPriceNote={false} showTopBorder={false} />
      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <legend className="text-title-md text-foreground">2. Elige dónde aplicarla</legend><p className="text-body-md text-muted-foreground">Puedes usarla en todo el menú, por categoría o solo en platos específicos.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {([['all', 'Todo el menú'], ['categories', 'Categorías'], ['dishes', 'Platos concretos']] as const).map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 text-label-md text-foreground has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:text-secondary-foreground has-[:checked]:ring-1 has-[:checked]:ring-primary"><input type="radio" name="section-scope" value={value} checked={scope === value} onChange={() => { setScope(value); setTargets([]) }} />{label}</label>)}
        </div>
        {scope !== 'all' && <div className="grid max-h-52 gap-2 overflow-y-auto rounded-2xl bg-muted p-3 sm:grid-cols-2">
          {availableTargets.map(target => <label key={target.id} className="flex min-h-11 items-center gap-2 rounded-xl bg-card px-3 text-label-md text-foreground"><input type="checkbox" checked={targets.includes(target.id)} onChange={() => toggle(target.id)} /><span>{target.name}</span></label>)}
        </div>}
      </fieldset>
      </div>
      <div className="sticky bottom-0 border-t border-border bg-background pt-4"><Button onClick={apply} disabled={saving} className="w-full sm:w-auto"><Check className="size-4" />{saving ? 'Aplicando…' : 'Guardar y aplicar sección'}</Button></div>
    </DialogContent>
  </Dialog>
}
