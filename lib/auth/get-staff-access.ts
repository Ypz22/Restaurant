import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { StaffAccess, StaffRestaurant } from '@/lib/auth/resolve-staff-home'

export type { StaffAccess, StaffRestaurant }

type RestaurantStaffRow = {
  role: 'admin' | 'kitchen'
  restaurants: { id: string; slug: string; name: string; status: 'active' | 'suspended' } | null
}

// Lee la sesión de staff actual desde la cookie y resuelve sus roles.
// Devuelve null si no hay sesión iniciada.
export async function getStaffAccess(): Promise<StaffAccess & { userId: string } | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: platformRow }, { data: staffRows }] = await Promise.all([
    supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('restaurant_staff')
      .select('role, restaurants(id, slug, name, status)')
      .eq('user_id', user.id),
  ])

  const restaurants: StaffRestaurant[] = ((staffRows ?? []) as unknown as RestaurantStaffRow[])
    .filter((row) => row.restaurants !== null)
    .map((row) => ({
      id: row.restaurants!.id,
      slug: row.restaurants!.slug,
      name: row.restaurants!.name,
      status: row.restaurants!.status,
      role: row.role,
    }))

  return {
    userId: user.id,
    mustChangePassword: Boolean((user.app_metadata as Record<string, unknown>)?.must_change_password),
    isPlatformAdmin: Boolean(platformRow),
    restaurants,
  }
}
