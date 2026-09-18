import { redirect } from 'next/navigation'
import { AddKitchenStaffForm } from '@/components/auth/add-kitchen-staff-form'
import { ConfirmSubmitButton } from '@/components/auth/confirm-submit-button'
import { ResetKitchenPasswordButton } from '@/components/auth/reset-kitchen-password-button'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { removeKitchenStaff } from '@/lib/auth/staff-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type StaffRow = { user_id: string; email: string; role: 'admin' | 'kitchen'; created_at: string }

export default async function TeamPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const access = await getStaffAccess()
  if (!access) redirect('/login')

  // El layout de /admin ya validó rol y estado; esta página solo necesita el id.
  const restaurant = access.restaurants.find((r) => r.slug === restaurantSlug)
  if (!restaurant) redirect(`/admin/${restaurantSlug}`)

  const supabase = await createServerSupabaseClient()
  const { data: staff } = await supabase.rpc('rpc_admin_list_staff', { p_restaurant_id: restaurant.id })
  const rows = (staff ?? []) as StaffRow[]

  return (
    <div className="max-w-2xl">
      <h1 className="text-headline-lg text-foreground">Equipo</h1>
      <p className="mt-1 text-body-md text-muted-foreground">
        Cuentas del staff de {restaurant.name}. Vos podés agregar y dar de baja cuentas de cocina; para agregar otro
        administrador, pedile a la plataforma.
      </p>

      <section className="mt-5 rounded-lg border border-border bg-card p-4">
        <h2 className="text-title-md text-foreground">Nueva cuenta de cocina</h2>
        <div className="mt-3">
          <AddKitchenStaffForm restaurantId={restaurant.id} restaurantSlug={restaurantSlug} />
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-2">
        {rows.map((member) => (
          <div key={member.user_id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="text-label-lg text-foreground">{member.email}</p>
              <p className="text-label-sm uppercase text-muted-foreground">
                {member.role === 'admin' ? 'Administración' : 'Cocina'}
              </p>
            </div>
            {member.role === 'kitchen' && (
              <>
                <ResetKitchenPasswordButton
                  userId={member.user_id}
                  restaurantId={restaurant.id}
                  restaurantSlug={restaurantSlug}
                />
                <form
                  action={async () => {
                    'use server'
                    await removeKitchenStaff(restaurant.id, member.user_id, restaurantSlug)
                  }}
                >
                  <ConfirmSubmitButton
                    variant="ghost"
                    size="sm"
                    confirmMessage={`¿Quitar a ${member.email} del equipo?`}
                  >
                    Quitar
                  </ConfirmSubmitButton>
                </form>
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
