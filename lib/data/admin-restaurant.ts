import { createClient } from '@/lib/supabase/client'

export type AdminRestaurant = { id: string; name: string; slug: string }

export async function getRestaurantBySlug(slug: string): Promise<AdminRestaurant | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data
}
