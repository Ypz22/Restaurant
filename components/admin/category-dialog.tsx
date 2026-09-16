'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { AdminCategory } from '@/lib/data/admin-menu'
import { upsertCategory } from '@/lib/data/admin-menu'

function CategoryForm({
  restaurantId, category, nextSortOrder, onSaved, onClose,
}: {
  restaurantId: string
  category: AdminCategory | null
  nextSortOrder: number
  onSaved: (category: AdminCategory) => void
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Escribe un nombre para la categoría.')
      return
    }
    setSaving(true)
    try {
      const saved = await upsertCategory(restaurantId, {
        id: category?.id,
        name: name.trim(),
        sortOrder: category?.sortOrder ?? nextSortOrder,
      })
      onSaved(saved)
      onClose()
      toast.success(category ? 'Categoría actualizada.' : 'Categoría creada.')
    } catch {
      toast.error('No se pudo guardar la categoría.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-name" className="text-label-md text-secondary-foreground">Nombre</label>
        <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Guardando…' : 'Guardar categoría'}
      </Button>
    </div>
  )
}

export function CategoryDialog({
  open, onOpenChange, restaurantId, category, nextSortOrder, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  category: AdminCategory | null
  nextSortOrder: number
  onSaved: (category: AdminCategory) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        </DialogHeader>
        {open && (
          <CategoryForm
            key={category?.id ?? 'new'}
            restaurantId={restaurantId}
            category={category}
            nextSortOrder={nextSortOrder}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
