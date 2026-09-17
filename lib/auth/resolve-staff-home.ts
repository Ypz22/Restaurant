// Orden de resolución del login unificado
// (docs/superpowers/specs/2026-09-17-auth-multitenant-design.md, flujo 1).
// Función pura: sin I/O, fácil de testear con casos armados a mano.
export type StaffRestaurant = {
  id: string
  slug: string
  name: string
  status: 'active' | 'suspended'
  role: 'admin' | 'kitchen'
}

export type StaffAccess = {
  mustChangePassword: boolean
  isPlatformAdmin: boolean
  restaurants: StaffRestaurant[]
}

export type StaffHomeResult =
  | { kind: 'redirect'; path: string }
  | { kind: 'no_access' }
  | { kind: 'all_suspended' }

export function resolveStaffHome(access: StaffAccess): StaffHomeResult {
  if (access.mustChangePassword) {
    return { kind: 'redirect', path: '/cambiar-contrasena' }
  }

  const active = access.restaurants.filter((r) => r.status === 'active')

  if (!access.isPlatformAdmin && access.restaurants.length === 0) {
    return { kind: 'no_access' }
  }
  if (!access.isPlatformAdmin && active.length === 0) {
    return { kind: 'all_suspended' }
  }

  const destinationCount = active.length + (access.isPlatformAdmin ? 1 : 0)
  if (destinationCount > 1) {
    return { kind: 'redirect', path: '/elegir-restaurante' }
  }
  if (access.isPlatformAdmin) {
    return { kind: 'redirect', path: '/plataforma' }
  }

  const [restaurant] = active
  return {
    kind: 'redirect',
    path: restaurant.role === 'admin' ? `/admin/${restaurant.slug}` : `/kitchen/${restaurant.slug}`,
  }
}
