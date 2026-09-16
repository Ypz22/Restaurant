'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import { getAdminMenu, deleteDish, setDishAvailability, type AdminCategory, type AdminDish } from '@/lib/data/admin-menu'
import { deleteCategory } from '@/lib/data/admin-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { DishSheet } from '@/components/admin/dish-sheet'
import { CategoryDialog } from '@/components/admin/category-dialog'

export default function AdminMenuPage() {
  const restaurant = useAdminRestaurant()
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [dishes, setDishes] = useState<AdminDish[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [dishSheetOpen, setDishSheetOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<AdminDish | null>(null)
  const [deletingDish, setDeletingDish] = useState<AdminDish | null>(null)

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null)

  useEffect(() => { void load() }, [restaurant.id])

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const menu = await getAdminMenu(restaurant.id)
      setCategories(menu.categories)
      setDishes(menu.dishes)
      setActiveCategoryId((current) => current || menu.categories[0]?.id || '')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const visibleDishes = dishes.filter((d) => d.categoryId === activeCategoryId)

  async function handleToggleAvailability(dish: AdminDish, isAvailable: boolean) {
    setDishes((current) => current.map((d) => (d.id === dish.id ? { ...d, isAvailable } : d)))
    try {
      await setDishAvailability(restaurant.id, dish.id, isAvailable)
    } catch {
      setDishes((current) => current.map((d) => (d.id === dish.id ? { ...d, isAvailable: !isAvailable } : d)))
      toast.error('No se pudo actualizar la disponibilidad.')
    }
  }

  async function handleDeleteDish() {
    if (!deletingDish) return
    try {
      await deleteDish(restaurant.id, deletingDish.id)
      setDishes((current) => current.filter((d) => d.id !== deletingDish.id))
      toast.success('Plato eliminado.')
    } catch {
      toast.error('No se pudo eliminar el plato.')
    } finally {
      setDeletingDish(null)
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return
    try {
      await deleteCategory(restaurant.id, deletingCategory.id)
      setCategories((current) => current.filter((c) => c.id !== deletingCategory.id))
      if (activeCategoryId === deletingCategory.id) setActiveCategoryId('')
      toast.success('Categoría eliminada.')
    } catch {
      toast.error('No se puede eliminar: la categoría todavía tiene platos.')
    } finally {
      setDeletingCategory(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-danger-soft p-6 text-danger-soft-foreground">
        No se pudo cargar el menú. <Button variant="ghost" size="sm" onClick={load}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-headline-lg text-foreground">Menú</h1>
        <Button
          onClick={() => { setEditingDish(null); setDishSheetOpen(true) }}
          disabled={categories.length === 0}
        >
          <Plus className="size-4" /> Nuevo plato
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
          <BookOpen className="size-6 text-muted-foreground" />
          <p className="text-body-md text-muted-foreground">Todavía no hay categorías en el menú.</p>
          <Button onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true) }}>
            <Plus className="size-4" /> Nueva categoría
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Tabs value={activeCategoryId} onValueChange={setActiveCategoryId} className="flex-1">
              <TabsList>
                {categories.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true) }}>
              <Plus className="size-4" /> Categoría
            </Button>
            {categories.find((c) => c.id === activeCategoryId) && (
              <>
                <Button
                  variant="ghost" size="icon"
                  aria-label="Editar categoría"
                  onClick={() => { setEditingCategory(categories.find((c) => c.id === activeCategoryId) ?? null); setCategoryDialogOpen(true) }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  aria-label="Eliminar categoría"
                  onClick={() => setDeletingCategory(categories.find((c) => c.id === activeCategoryId) ?? null)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>

          {visibleDishes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-body-md text-muted-foreground">Esta categoría no tiene platos todavía.</p>
              <Button onClick={() => { setEditingDish(null); setDishSheetOpen(true) }}>
                <Plus className="size-4" /> Nuevo plato
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plato</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Disponibilidad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDishes.map((dish) => (
                  <TableRow key={dish.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                          {dish.photoUrl && (
                            <Image src={dish.photoUrl} alt="" width={48} height={48} className="size-12 object-cover" unoptimized />
                          )}
                        </div>
                        <div>
                          <p className="text-title-md text-foreground">{dish.name}</p>
                          <p className="line-clamp-1 text-body-md text-muted-foreground">{dish.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">${dish.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={dish.isAvailable} onCheckedChange={(checked) => handleToggleAvailability(dish, checked)} />
                        <span className="text-label-md text-muted-foreground">{dish.isAvailable ? 'Disponible' : 'Agotado'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" aria-label={`Editar ${dish.name}`} onClick={() => { setEditingDish(dish); setDishSheetOpen(true) }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Eliminar ${dish.name}`} onClick={() => setDeletingDish(dish)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <DishSheet
        open={dishSheetOpen}
        onOpenChange={setDishSheetOpen}
        restaurantId={restaurant.id}
        categories={categories}
        dish={editingDish}
        defaultCategoryId={activeCategoryId}
        onSaved={(saved) => setDishes((current) => {
          const exists = current.some((d) => d.id === saved.id)
          return exists ? current.map((d) => (d.id === saved.id ? saved : d)) : [...current, saved]
        })}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        restaurantId={restaurant.id}
        category={editingCategory}
        nextSortOrder={categories.length}
        onSaved={(saved) => setCategories((current) => {
          const exists = current.some((c) => c.id === saved.id)
          const next = exists ? current.map((c) => (c.id === saved.id ? saved : c)) : [...current, saved]
          setActiveCategoryId(saved.id)
          return next
        })}
      />

      <AlertDialog open={!!deletingDish} onOpenChange={(open) => !open && setDeletingDish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deletingDish?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDish}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la categoría {deletingCategory?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Solo se puede eliminar si no tiene platos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
