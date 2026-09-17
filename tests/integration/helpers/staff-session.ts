// Los rpc_admin_* ahora exigen una sesión de staff autenticada con el rol
// correcto para el restaurante (ver 2026-09-17-auth-multitenant-design.md).
// Este helper crea un único usuario de staff por archivo de test, lo deja
// logueado en el cliente singleton (@/lib/supabase/client, el mismo que usan
// lib/data/admin-*), y permite darle el rol "admin" en cualquier restaurante
// que el test cree dinámicamente.
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let cachedUserId: string | null = null

async function ensureSignedInStaffUser(): Promise<string> {
  if (cachedUserId) return cachedUserId

  const email = `staff-${crypto.randomUUID()}@test.local`
  const password = 'password123!'
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error

  const browser = createClient()
  const { error: signInError } = await browser.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  cachedUserId = data.user.id
  return cachedUserId
}

export async function grantAdmin(restaurantId: string): Promise<void> {
  const userId = await ensureSignedInStaffUser()
  const { error } = await service
    .from('restaurant_staff')
    .insert({ restaurant_id: restaurantId, user_id: userId, role: 'admin' })
  if (error) throw error
}
