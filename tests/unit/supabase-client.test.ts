import { describe, it, expect } from 'vitest'
import { createClient } from '@/lib/supabase/client'

describe('supabase client', () => {
  it('creates a client with the configured URL', () => {
    const client = createClient()
    expect(client).toBeTruthy()
    expect((client as any).supabaseUrl).toContain('127.0.0.1:54321')
  })
})
