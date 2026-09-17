// Cuentas de staff de prueba para desarrollo local (no las cubre
// supabase/seed.sql porque crear un usuario de Auth con contraseña necesita
// la API de administración, no solo SQL). Idempotente: no falla si ya existen.
//
// Uso, con Supabase local corriendo (`npx supabase start`):
//   node --env-file=.env.local scripts/seed-staff.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (¿corriste con --env-file=.env.local?)')
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey)
const BRASA_ID = '11111111-1111-1111-1111-111111111111' // del seed.sql

async function upsertUser(email, password) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (!error) return data.user.id
  if (error.code !== 'email_exists') throw error

  const { data: page } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return page.users.find((u) => u.email === email).id
}

async function ensureStaffRow(restaurantId, userId, role) {
  await admin.from('restaurant_staff')
    .upsert({ restaurant_id: restaurantId, user_id: userId, role }, { onConflict: 'restaurant_id,user_id' })
}

const platformAdminId = await upsertUser('root@plataforma.local', 'Password123!')
await admin.from('platform_admins').upsert({ user_id: platformAdminId })

const brasaAdminId = await upsertUser('admin@sabor-brasa.local', 'Password123!')
await ensureStaffRow(BRASA_ID, brasaAdminId, 'admin')

const brasaKitchenId = await upsertUser('cocina@sabor-brasa.local', 'Password123!')
await ensureStaffRow(BRASA_ID, brasaKitchenId, 'kitchen')

// Restaurante y admin aparte, para las pruebas de aislamiento entre tenants.
const { data: otherRestaurant } = await admin
  .from('restaurants')
  .upsert({ name: 'Mar & Marea', slug: 'mar-marea', theme: 'mar' }, { onConflict: 'slug' })
  .select()
  .single()
const otherAdminId = await upsertUser('admin@mar-marea.local', 'Password123!')
await ensureStaffRow(otherRestaurant.id, otherAdminId, 'admin')

console.log('Cuentas de staff de prueba (contraseña "Password123!" para todas):')
console.log('  root@plataforma.local        -> plataforma')
console.log('  admin@sabor-brasa.local      -> /admin/sabor-brasa')
console.log('  cocina@sabor-brasa.local     -> /kitchen/sabor-brasa')
console.log('  admin@mar-marea.local        -> /admin/mar-marea')
