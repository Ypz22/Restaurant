import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { RestaurantProvider } from '@/components/admin/restaurant-context'
import { AccessMessage } from '@/components/auth/access-message'
import { Toaster } from '@/components/ui/sonner'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { restaurantSlugExists } from '@/lib/data/staff-restaurant-lookup'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const access = await getStaffAccess()
  if (!access) redirect(`/login?next=/admin/${restaurantSlug}`)
  if (access.mustChangePassword) redirect('/cambiar-contrasena')

  const restaurant = access.restaurants.find((r) => r.slug === restaurantSlug)

  if (!restaurant) {
    const exists = await restaurantSlugExists(restaurantSlug)
    return (
      <AccessMessage>
        {exists
          ? 'No tenés acceso a este restaurante.'
          : `No encontramos el restaurante "${restaurantSlug}".`}
      </AccessMessage>
    )
  }

  // El admin ve todo (menú, mesas, dashboard, equipo y el KDS); cocina solo
  // ve el KDS.
  if (restaurant.role === 'kitchen') redirect(`/kitchen/${restaurantSlug}`)

  if (restaurant.status === 'suspended') {
    return <AccessMessage>Este restaurante está suspendido.</AccessMessage>
  }

  return (
    <RestaurantProvider restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug }}>
      <AdminShell restaurantSlug={restaurant.slug} restaurantName={restaurant.name}>
        {children}
      </AdminShell>
      <Toaster />
    </RestaurantProvider>
  )
}
