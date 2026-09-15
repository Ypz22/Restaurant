import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('seed data', () => {
  it('has the demo restaurant with an available and an unavailable dish', async () => {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', 'sabor-brasa')
      .single()
    expect(restaurant).toBeTruthy()

    const { data: dishes } = await supabase
      .from('dishes')
      .select('name, is_available')
      .eq('restaurant_id', restaurant!.id)

    expect(dishes?.some((d) => d.is_available)).toBe(true)
    expect(dishes?.some((d) => !d.is_available)).toBe(true)
  })
})
