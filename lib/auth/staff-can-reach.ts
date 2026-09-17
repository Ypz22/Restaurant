import type { StaffAccess } from '@/lib/auth/resolve-staff-home'

// Si el login llegó con ?next=, se usa esa ruta en vez del destino calculado
// SOLO si la cuenta puede llegar ahí (spec, flujo 1). Si no, se ignora y se
// usa resolveStaffHome como siempre.
export function staffCanReach(path: string, access: StaffAccess): boolean {
  if (path === '/plataforma') return access.isPlatformAdmin

  const adminMatch = path.match(/^\/admin\/([^/]+)/)
  if (adminMatch) {
    const slug = adminMatch[1]
    return access.restaurants.some((r) => r.slug === slug && r.status === 'active' && r.role === 'admin')
  }

  const kitchenMatch = path.match(/^\/kitchen\/([^/]+)/)
  if (kitchenMatch) {
    const slug = kitchenMatch[1]
    return access.restaurants.some((r) => r.slug === slug && r.status === 'active')
  }

  return false
}
