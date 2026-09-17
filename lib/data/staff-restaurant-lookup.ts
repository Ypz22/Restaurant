// Solo para los layouts de /admin y /kitchen (Server Components): confirma
// si el slug de la URL corresponde a un restaurante real, sin importar si
// la cuenta tiene acceso. Sirve para distinguir "no existe" de "no tenés
// acceso", que muestran mensajes distintos. Usa el cliente de servidor
// (cookies), no el de navegador — no se importa desde un componente cliente.
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function restaurantSlugExists(slug: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('restaurants').select('id').eq('slug', slug).maybeSingle()
  return data !== null
}
