import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TenantTheme } from '@/components/tenant-theme'

export default async function RestaurantLayout({ children, params }: {
  children: ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const { data } = await createClient().from('restaurants').select('theme').eq('slug', restaurantSlug).maybeSingle()
  const theme = data?.theme ?? 'brasa'
  return <div data-theme={theme}><TenantTheme theme={theme} />{children}</div>
}
