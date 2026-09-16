import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('core schema', () => {
  it('has all expected tables present for the service role', async () => {
    const tables = [
      'restaurants', 'tables', 'table_sessions', 'diners',
      'menu_categories', 'dishes', 'order_rounds', 'cart_items', 'table_requests',
    ]
    for (const table of tables) {
      const { error } = await admin.from(table).select('id').limit(1)
      expect(error, `table ${table} should exist`).toBeNull()
    }
  })
})
