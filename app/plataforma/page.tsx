import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmSubmitButton } from '@/components/auth/confirm-submit-button'
import { CreateRestaurantForm } from '@/components/auth/create-restaurant-form'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { resolveStaffHome } from '@/lib/auth/resolve-staff-home'
import { setRestaurantStatus } from '@/lib/auth/platform-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type PlatformRestaurant = {
  id: string
  name: string
  slug: string
  theme: string
  status: 'active' | 'suspended'
  created_at: string
}

export default async function PlatformPage() {
  const access = await getStaffAccess()
  if (!access) redirect('/login?next=/plataforma')
  if (access.mustChangePassword) redirect('/cambiar-contrasena')
  if (!access.isPlatformAdmin) {
    const result = resolveStaffHome(access)
    redirect(result.kind === 'redirect' ? result.path : '/login')
  }

  const supabase = await createServerSupabaseClient()
  const { data: restaurants } = await supabase.rpc('rpc_platform_list_restaurants')

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-lg text-foreground">Restaurantes</h1>
          <p className="mt-1 text-body-md text-muted-foreground">Administración de la plataforma.</p>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-title-md text-foreground">Nuevo restaurante</h2>
        <CreateRestaurantForm />
      </section>

      <section className="mt-6 flex flex-col gap-2">
        {((restaurants ?? []) as PlatformRestaurant[]).map((restaurant) => (
          <div
            key={restaurant.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-label-lg text-foreground">{restaurant.name}</p>
              <p className="text-label-sm text-muted-foreground">/{restaurant.slug} · {restaurant.theme}</p>
            </div>
            <Badge variant={restaurant.status === 'active' ? 'success' : 'danger'}>
              {restaurant.status === 'active' ? 'Activo' : 'Suspendido'}
            </Badge>
            <form action={async () => {
              'use server'
              await setRestaurantStatus(restaurant.id, restaurant.status === 'active' ? 'suspended' : 'active')
            }}>
              {restaurant.status === 'active' ? (
                <ConfirmSubmitButton
                  variant="ghost"
                  size="sm"
                  confirmMessage="El staff y los comensales dejarán de tener acceso. ¿Suspender este restaurante?"
                >
                  Suspender
                </ConfirmSubmitButton>
              ) : (
                <Button type="submit" variant="ghost" size="sm">Reactivar</Button>
              )}
            </form>
          </div>
        ))}
        {(restaurants ?? []).length === 0 && (
          <p className="text-body-md text-muted-foreground">Todavía no hay restaurantes.</p>
        )}
      </section>
    </div>
  )
}
