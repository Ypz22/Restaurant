import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('RLS policies', () => {
  it('allows anon to read restaurants', async () => {
    const { error } = await supabase.from('restaurants').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('blocks anon from inserting a restaurant directly', async () => {
    const { error } = await supabase
      .from('restaurants')
      .insert({ name: 'Hack', slug: 'hack-' + Date.now() })
    expect(error).not.toBeNull()
  })
})
