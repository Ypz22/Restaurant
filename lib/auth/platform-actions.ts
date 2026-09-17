'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTemporaryPassword } from '@/lib/auth/temporary-password'
import { staffErrorMessage } from '@/lib/auth/error-messages'

export type CreateRestaurantState = { error: string | null; temporaryPassword?: string }

// Busca una cuenta existente por correo probando a crearla: es más simple
// que paginar auth.admin.listUsers(), y el mensaje de error de Auth ya
// distingue "ya existe" de cualquier otro problema.
async function findOrCreateStaffUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<{ userId: string; temporaryPassword?: string } | { error: string }> {
  const temporaryPassword = generateTemporaryPassword()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password: temporaryPassword, email_confirm: true,
    app_metadata: { must_change_password: true },
  })
  if (!createError && created.user) {
    return { userId: created.user.id, temporaryPassword }
  }

  if (createError?.code !== 'email_exists') {
    return { error: staffErrorMessage('email_already_registered') }
  }

  const { data: page } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = page?.users.find((u) => u.email === email)
  if (!existing) {
    return { error: staffErrorMessage('email_already_registered') }
  }
  return { userId: existing.id }
}

export async function createRestaurant(
  _prevState: CreateRestaurantState,
  formData: FormData
): Promise<CreateRestaurantState> {
  const name = String(formData.get('name') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim()
  const theme = String(formData.get('theme') ?? '')
  const adminEmail = String(formData.get('adminEmail') ?? '').trim()

  if (!name || !slug || !theme || !adminEmail) {
    return { error: 'Completá todos los campos' }
  }

  const admin = createAdminClient()
  const staffUser = await findOrCreateStaffUser(admin, adminEmail)
  if ('error' in staffUser) return staffUser

  const supabase = await createServerSupabaseClient()
  const { error: rpcError } = await supabase.rpc('rpc_platform_create_restaurant', {
    p_name: name, p_slug: slug, p_theme: theme, p_admin_user_id: staffUser.userId,
  })
  if (rpcError) {
    if (staffUser.temporaryPassword) await admin.auth.admin.deleteUser(staffUser.userId)
    return { error: staffErrorMessage(rpcError.message) }
  }

  revalidatePath('/plataforma')
  return { error: null, temporaryPassword: staffUser.temporaryPassword }
}

export async function setRestaurantStatus(restaurantId: string, status: 'active' | 'suspended'): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.rpc('rpc_platform_set_restaurant_status', { p_restaurant_id: restaurantId, p_status: status })
  revalidatePath('/plataforma')
}

export type AddRestaurantAdminState = { error: string | null; temporaryPassword?: string }

export async function addRestaurantAdmin(
  restaurantId: string,
  _prevState: AddRestaurantAdminState,
  formData: FormData
): Promise<AddRestaurantAdminState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Ingresá un correo' }

  const admin = createAdminClient()
  const staffUser = await findOrCreateStaffUser(admin, email)
  if ('error' in staffUser) return staffUser

  const supabase = await createServerSupabaseClient()
  const { error: rpcError } = await supabase.rpc('rpc_platform_add_restaurant_admin', {
    p_restaurant_id: restaurantId, p_user_id: staffUser.userId,
  })
  if (rpcError) {
    if (staffUser.temporaryPassword) await admin.auth.admin.deleteUser(staffUser.userId)
    return { error: staffErrorMessage(rpcError.message) }
  }

  revalidatePath('/plataforma')
  return { error: null, temporaryPassword: staffUser.temporaryPassword }
}
