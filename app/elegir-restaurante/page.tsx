import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { resolveStaffHome } from '@/lib/auth/resolve-staff-home'
import { SignOutButton } from '@/components/auth/sign-out-button'

export default async function ChooseRestaurantPage() {
  const access = await getStaffAccess()
  if (!access) redirect('/login')

  const result = resolveStaffHome(access)
  if (result.kind !== 'redirect' || result.path !== '/elegir-restaurante') {
    // Solo tiene un destino: no necesita elegir.
    redirect(result.kind === 'redirect' ? result.path : '/login')
  }

  const active = access.restaurants.filter((r) => r.status === 'active')

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-title-lg text-foreground">¿A dónde querés entrar?</h1>
        <p className="mt-1 text-body-md text-muted-foreground">Tu cuenta tiene acceso a más de un lugar.</p>

        <ul className="mt-6 flex flex-col gap-2">
          {access.isPlatformAdmin && (
            <li>
              <Link
                href="/plataforma"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted"
              >
                <ShieldCheck className="size-5 text-muted-foreground" />
                <span className="flex-1 text-label-lg text-foreground">Administración de la plataforma</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          )}
          {active.map((restaurant) => (
            <li key={restaurant.id}>
              <Link
                href={restaurant.role === 'admin' ? `/admin/${restaurant.slug}` : `/kitchen/${restaurant.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted"
              >
                <span className="flex-1 text-label-lg text-foreground">{restaurant.name}</span>
                <span className="text-label-sm uppercase text-muted-foreground">
                  {restaurant.role === 'admin' ? 'Administración' : 'Cocina'}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
