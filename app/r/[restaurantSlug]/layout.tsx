import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export default async function RestaurantLayout({ children, params }: {
  children: ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const { data } = await createClient().from('restaurants').select('theme').eq('slug', restaurantSlug).maybeSingle()
  return <div data-theme={data?.theme ?? 'brasa'}>{children}</div>
}
