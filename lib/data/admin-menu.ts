import { createClient } from '@/lib/supabase/client'
import type { DishDetailSection } from '@/lib/dish-details'

export type AdminCategory = { id: string; name: string; sortOrder: number }
export type AdminDish = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  photoUrl: string | null
  isAvailable: boolean
  detailSections?: DishDetailSection[]
}

export async function getAdminMenu(restaurantId: string): Promise<{ categories: AdminCategory[]; dishes: AdminDish[] }> {
  const supabase = createClient()

  const [{ data: categoryRows, error: catError }, { data: dishRows, error: dishError }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('restaurant_id', restaurantId)
      .order('sort_order'),
    supabase
      .from('dishes')
      .select('id, category_id, name, description, price, photo_url, is_available, detail_sections')
      .eq('restaurant_id', restaurantId),
  ])

  if (catError || dishError) throw new Error(catError?.message ?? dishError?.message)

  return {
    categories: (categoryRows ?? []).map((c) => ({ id: c.id, name: c.name, sortOrder: c.sort_order })),
    dishes: (dishRows ?? []).map((d) => ({
      id: d.id,
      categoryId: d.category_id,
      name: d.name,
      description: d.description,
      price: Number(d.price),
      photoUrl: d.photo_url,
      isAvailable: d.is_available,
      detailSections: d.detail_sections ?? [],
    })),
  }
}

export async function upsertCategory(
  restaurantId: string,
  category: { id?: string; name: string; sortOrder: number }
): Promise<AdminCategory> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_admin_upsert_category', {
      p_restaurant_id: restaurantId,
      p_id: category.id ?? null,
      p_name: category.name,
      p_sort_order: category.sortOrder,
    })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'upsert_category_failed')
  const row = data as { id: string; name: string; sort_order: number }
  return { id: row.id, name: row.name, sortOrder: row.sort_order }
}

export async function deleteCategory(restaurantId: string, id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_admin_delete_category', { p_restaurant_id: restaurantId, p_id: id })
  if (error) throw new Error(error.message)
}

export async function upsertDish(
  restaurantId: string,
  dish: {
    id?: string
    categoryId: string
    name: string
    description: string
    price: number
    photoUrl: string | null
    isAvailable: boolean
    detailSections?: DishDetailSection[]
  }
): Promise<AdminDish> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_admin_upsert_dish', {
      p_restaurant_id: restaurantId,
      p_id: dish.id ?? null,
      p_category_id: dish.categoryId,
      p_name: dish.name,
      p_description: dish.description,
      p_price: dish.price,
      p_photo_url: dish.photoUrl,
      p_is_available: dish.isAvailable,
      p_detail_sections: dish.detailSections ?? null,
    })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'upsert_dish_failed')
  const row = data as {
    id: string; category_id: string; name: string; description: string
    price: number; photo_url: string | null; is_available: boolean
    detail_sections: DishDetailSection[]
  }
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    photoUrl: row.photo_url,
    isAvailable: row.is_available,
    detailSections: row.detail_sections ?? [],
  }
}

export async function deleteDish(restaurantId: string, id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_admin_delete_dish', { p_restaurant_id: restaurantId, p_id: id })
  if (error) throw new Error(error.message)
}

export async function setDishAvailability(restaurantId: string, dishId: string, isAvailable: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_admin_set_dish_availability', {
    p_restaurant_id: restaurantId,
    p_dish_id: dishId,
    p_is_available: isAvailable,
  })
  if (error) throw new Error(error.message)
}

export async function uploadDishPhoto(restaurantId: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${restaurantId}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('dish-photos').upload(path, file, { upsert: false })
  if (error) throw new Error(error.message)
  return supabase.storage.from('dish-photos').getPublicUrl(path).data.publicUrl
}
