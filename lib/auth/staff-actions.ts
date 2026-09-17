'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTemporaryPassword } from '@/lib/auth/temporary-password'
import { staffErrorMessage } from '@/lib/auth/error-messages'

export type AddKitchenStaffState = { error: string | null; temporaryPassword?: string }

export async function addKitchenStaff(
  restaurantId: string,
  restaurantSlug: string,
  _prevState: AddKitchenStaffState,
  formData: FormData
): Promise<AddKitchenStaffState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Ingresá un correo' }

  const admin = createAdminClient()
  const temporaryPassword = generateTemporaryPassword()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password: temporaryPassword, email_confirm: true,
    app_metadata: { must_change_password: true },
  })
  if (createError || !created.user) {
    return { error: staffErrorMessage('email_already_registered') }
  }

  const supabase = await createServerSupabaseClient()
  const { error: rpcError } = await supabase.rpc('rpc_admin_add_kitchen_staff', {
    p_restaurant_id: restaurantId, p_user_id: created.user.id,
  })
  if (rpcError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: staffErrorMessage(rpcError.message) }
  }

  revalidatePath(`/admin/${restaurantSlug}/equipo`)
  return { error: null, temporaryPassword }
}

export type ResetPasswordState = { error: string | null; temporaryPassword?: string }

export async function resetKitchenStaffPassword(
  restaurantId: string,
  restaurantSlug: string,
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return { error: staffErrorMessage('staff_not_found') }

  // Nunca se confía en lo que manda el formulario: la RPC vuelve a verificar
  // contra la sesión (auth.uid()) que quien llama es admin de este
  // restaurante y que userId es una cuenta de cocina de ESE restaurante.
  const supabase = await createServerSupabaseClient()
  const { error: authorizeError } = await supabase.rpc('rpc_admin_confirm_kitchen_staff', {
    p_restaurant_id: restaurantId, p_user_id: userId,
  })
  if (authorizeError) return { error: staffErrorMessage(authorizeError.message) }

  const admin = createAdminClient()
  const temporaryPassword = generateTemporaryPassword()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    app_metadata: { must_change_password: true },
  })
  if (error) return { error: staffErrorMessage(null) }

  revalidatePath(`/admin/${restaurantSlug}/equipo`)
  return { error: null, temporaryPassword }
}

export async function removeKitchenStaff(restaurantId: string, userId: string, restaurantSlug: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.rpc('rpc_admin_remove_kitchen_staff', { p_restaurant_id: restaurantId, p_user_id: userId })
  revalidatePath(`/admin/${restaurantSlug}/equipo`)
}
