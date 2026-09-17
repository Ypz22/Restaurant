import { redirect } from 'next/navigation'

// /admin/[slug] no tiene contenido propio: el layout ya validó acceso,
// esta página solo elige la primera pestaña.
export default async function AdminIndexPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  redirect(`/admin/${restaurantSlug}/dashboard`)
}
