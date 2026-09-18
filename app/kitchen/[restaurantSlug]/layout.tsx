import { redirect } from 'next/navigation'
import { ChefHat } from 'lucide-react'
import { RestaurantProvider } from '@/components/admin/restaurant-context'
import { AccessMessage } from '@/components/auth/access-message'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { Toaster } from '@/components/ui/sonner'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { restaurantSlugExists } from '@/lib/data/staff-restaurant-lookup'

export default async function KitchenLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const access = await getStaffAccess()
  if (!access) redirect(`/login?next=/kitchen/${restaurantSlug}`)
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

  if (restaurant.status === 'suspended') {
    return <AccessMessage>Este restaurante está suspendido.</AccessMessage>
  }

  return (
    <RestaurantProvider restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug }}>
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-40 h-12 border-b border-inverse bg-inverse text-inverse-foreground">
          <div className="mx-auto flex h-full items-center gap-2 px-4">
            <ChefHat className="size-5 shrink-0" aria-hidden="true" />
            <span className="text-label-lg">{restaurant.name}</span>
            <span className="text-label-sm uppercase text-inverse-foreground/65">Cocina</span>
            <div className="ml-auto">
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="p-4">{children}</main>
      </div>
      <Toaster />
    </RestaurantProvider>
  )
}
