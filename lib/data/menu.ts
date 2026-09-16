import { createClient } from '@/lib/supabase/client'
import type { DishDetailSection } from '@/lib/dish-details'

export type MenuCategory = { id: string; name: string; sortOrder: number }
export type MenuDish = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  photoUrl: string | null
  isAvailable: boolean
  detailSections?: DishDetailSection[]
}

export async function getMenu(restaurantId: string): Promise<{ categories: MenuCategory[]; dishes: MenuDish[] }> {
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
