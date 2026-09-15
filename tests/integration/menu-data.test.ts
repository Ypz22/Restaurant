import { describe, it, expect } from 'vitest'
import { getMenu } from '@/lib/data/menu'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('getMenu', () => {
  it('returns categories and dishes for the seeded restaurant', async () => {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', 'sabor-brasa')
      .single()

    const menu = await getMenu(restaurant!.id)

    expect(menu.categories.length).toBeGreaterThanOrEqual(2)
    expect(menu.dishes.length).toBeGreaterThanOrEqual(4)
    expect(menu.dishes[0]).toHaveProperty('isAvailable')
  })
})
