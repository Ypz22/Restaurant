'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { resolveStaffHome } from '@/lib/auth/resolve-staff-home'
import { staffCanReach } from '@/lib/auth/staff-can-reach'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { staffErrorMessage } from '@/lib/auth/error-messages'

export type ActionState = { error: string | null }

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNextPath(String(formData.get('next') ?? ''))

  if (!email || !password) {
    return { error: 'Ingresa tu correo y contraseña' }
  }

  const supabase = await createServerSupabaseClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return { error: staffErrorMessage('invalid_credentials') }
  }

  const access = await getStaffAccess()
  if (!access) {
    return { error: staffErrorMessage('not_authenticated') }
  }

  const result = resolveStaffHome(access)
  if (result.kind === 'no_access') {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta no tiene acceso a ningún restaurante' }
  }
  if (result.kind === 'all_suspended') {
    await supabase.auth.signOut()
    return { error: 'Tu restaurante está suspendido' }
  }

  const target = next && staffCanReach(next, access) ? next : result.path
  redirect(target)
}

export async function completePasswordChange(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (password.length < 8) {
    return { error: staffErrorMessage('weak_password') }
  }
  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError || !user) {
    return { error: staffErrorMessage(updateError?.code) }
  }

  // updateUser corre con el cliente de sesión (anon key): no puede tocar
  // app_metadata. Se usa el cliente admin solo para quitar la marca.
  const admin = createAdminClient()
  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, must_change_password: false },
  })
  if (metadataError) {
    return { error: staffErrorMessage(null) }
  }

  // Refresca la sesión para que el JWT en cookies refleje la nueva contraseña.
  await supabase.auth.refreshSession()

  const access = await getStaffAccess()
  const result = access ? resolveStaffHome(access) : { kind: 'no_access' as const }
  redirect(result.kind === 'redirect' ? result.path : '/login')
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
