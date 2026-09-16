'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { AdminCategory, AdminDish } from '@/lib/data/admin-menu'
import { upsertDish, uploadDishPhoto } from '@/lib/data/admin-menu'

function DishForm({
  restaurantId, categories, dish, defaultCategoryId, onSaved, onClose,
}: {
  restaurantId: string
  categories: AdminCategory[]
  dish: AdminDish | null
  defaultCategoryId: string
  onSaved: (dish: AdminDish) => void
  onClose: () => void
}) {
  const [name, setName] = useState(dish?.name ?? '')
  const [description, setDescription] = useState(dish?.description ?? '')
  const [price, setPrice] = useState(dish ? String(dish.price) : '')
  const [categoryId, setCategoryId] = useState(dish?.categoryId ?? defaultCategoryId)
  const [isAvailable, setIsAvailable] = useState(dish?.isAvailable ?? true)
  const [photoUrl, setPhotoUrl] = useState<string | null>(dish?.photoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      setPhotoUrl(await uploadDishPhoto(restaurantId, file))
    } catch {
      toast.error('No se pudo subir la foto. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    const parsedPrice = Number(price)
    if (!name.trim() || !categoryId || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Completa nombre, categoría y un precio válido.')
      return
    }
    setSaving(true)
    try {
      const saved = await upsertDish(restaurantId, {
        id: dish?.id,
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        photoUrl,
        isAvailable,
      })
      onSaved(saved)
      onClose()
      toast.success(dish ? 'Plato actualizado.' : 'Plato creado.')
    } catch {
      toast.error('No se pudo guardar el plato. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {photoUrl ? (
            <Image src={photoUrl} alt="" width={96} height={96} className="size-24 object-cover" unoptimized />
          ) : (
            <span className="text-label-sm text-muted-foreground">Sin foto</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-secondary-foreground">
            <span className="sr-only">Subir foto del plato</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
              className="text-body-md text-muted-foreground"
            />
          </label>
          {uploading && <span className="text-label-sm text-muted-foreground">Subiendo…</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dish-name" className="text-label-md text-secondary-foreground">Nombre</label>
        <Input id="dish-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dish-category" className="text-label-md text-secondary-foreground">Categoría</label>
        <select
          id="dish-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-11 rounded-xl border border-input bg-card px-3.5 text-body-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dish-description" className="text-label-md text-secondary-foreground">Descripción</label>
        <Textarea id="dish-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dish-price" className="text-label-md text-secondary-foreground">Precio</label>
        <Input id="dish-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="tabular-nums" />
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted p-3.5">
        <span className="text-label-lg text-foreground">{isAvailable ? 'Disponible' : 'Agotado'}</span>
        <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
      </div>

      <Button onClick={handleSave} disabled={saving || uploading} className="w-full">
        {saving ? 'Guardando…' : 'Guardar plato'}
      </Button>
    </div>
  )
}

export function DishSheet({
  open, onOpenChange, restaurantId, categories, dish, defaultCategoryId, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  categories: AdminCategory[]
  dish: AdminDish | null
  defaultCategoryId: string
  onSaved: (dish: AdminDish) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-lg">
        <SheetHeader>
          <SheetTitle>{dish ? 'Editar plato' : 'Nuevo plato'}</SheetTitle>
        </SheetHeader>
        {open && (
          <DishForm
            key={dish?.id ?? 'new'}
            restaurantId={restaurantId}
            categories={categories}
            dish={dish}
            defaultCategoryId={defaultCategoryId}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
