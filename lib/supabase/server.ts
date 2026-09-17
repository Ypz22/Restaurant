import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Para Server Components y Server Actions: lee/escribe la sesión del staff
// en las cookies. Se crea una instancia nueva por request (recomendación de
// @supabase/ssr), nunca se comparte entre requests.
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Un Server Component no puede escribir cookies; proxy.ts refresca
          // la sesión en cada request, así que esto es seguro de ignorar.
        }
      },
    },
  })
}
