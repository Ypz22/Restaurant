import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import type { DishDetailSection } from '@/lib/dish-details'

const env = loadEnv('test', process.cwd(), '')
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
// Los rpc_admin_* ahora exigen una sesión de staff autenticada (ver
// 2026-09-17-auth-multitenant-design.md); este cliente aparte se loguea
// como el admin del restaurante de prueba para poder llamarlos.
const staffClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
let restaurantId: string
let slug: string
let base: string
let dishId: string
let adminEmail: string
const adminPassword = 'password123!'

test.beforeAll(async () => {
  slug = `detalle-e2e-${crypto.randomUUID()}`
  const { data: restaurant, error } = await admin.from('restaurants').insert({ name: 'Sabor & Brasa', slug, theme: 'brasa' }).select().single()
  if (error) throw error
  restaurantId = restaurant.id
  const { data: category } = await admin.from('menu_categories').insert({ restaurant_id: restaurantId, name: 'Cortes' }).select().single()
  const { data: table } = await admin.from('tables').insert({ restaurant_id: restaurantId, label: 'Mesa 04' }).select().single()
  const { data: template } = await admin.from('dishes').select('detail_sections, photo_url').eq('restaurant_id', '11111111-1111-1111-1111-111111111111').eq('name', 'Ojo de Bife a la Leña').single()
  const { data: dish } = await admin.from('dishes').insert({ restaurant_id: restaurantId, category_id: category!.id, name: 'Ojo de Bife a la Leña', description: 'Corte de 420 g madurado durante 28 días, cocinado lentamente a la leña y acompañado de chimichurri casero emulsionado con aceite de oliva virgen extra.', price: 21, photo_url: template!.photo_url, detail_sections: template!.detail_sections }).select().single()
  dishId = dish!.id
  base = `/r/${slug}/mesa/${table!.qr_token}`

  adminEmail = `admin-detalle-e2e-${crypto.randomUUID()}@test.local`
  const { data: adminUser, error: adminError } = await admin.auth.admin.createUser({
    email: adminEmail, password: adminPassword, email_confirm: true,
  })
  if (adminError || !adminUser.user) throw adminError ?? new Error('no se pudo crear el admin de prueba')
  await admin.from('restaurant_staff').insert({ restaurant_id: restaurantId, user_id: adminUser.user.id, role: 'admin' })
  const { error: signInError } = await staffClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
  if (signInError) throw signInError
})

test.afterAll(async () => {
  if (!restaurantId) return
  const { data: tables } = await admin.from('tables').select('id').eq('restaurant_id', restaurantId)
  const { data: sessions } = await admin.from('table_sessions').select('id').in('table_id', (tables ?? []).map(t => t.id))
  const sessionIds = (sessions ?? []).map(s => s.id)
  if (sessionIds.length) {
    await admin.from('cart_items').delete().in('table_session_id', sessionIds)
    await admin.from('order_rounds').delete().in('table_session_id', sessionIds)
  }
  await admin.from('restaurants').delete().eq('id', restaurantId)
})

test('edita secciones desde admin y envía cocción y extras con el precio correcto', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base)
  await page.getByLabel('Apodo').fill('Detalle QA')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(/\/menu$/)
  await page.goto(`${base}/menu/${dishId}`)
  await expect(page.getByRole('heading', { name: 'Ojo de Bife a la Leña' })).toBeVisible()
  await expect(page.getByText('420 g', { exact: true })).toBeVisible()
  await expect(page.getByText('A la leña', { exact: true })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Término medio/ })).toBeChecked()
  await page.screenshot({ path: testInfo.outputPath('detalle-mobile.png'), fullPage: true })
  await page.getByRole('checkbox', { name: /Papas rústicas/ }).check()
  await expect(page.getByRole('button', { name: /Agregar/ })).toContainText('$23.50')
  await page.getByRole('button', { name: 'Aumentar cantidad' }).click()
  await expect(page.getByRole('button', { name: /Agregar/ })).toContainText('$47.00')
  await page.getByRole('radio', { name: /Tres cuartos/ }).check()
  await page.getByRole('textbox', { name: 'Notas para la cocina', exact: true }).fill('Sin sal')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1440, height: 900 })
  const photoBounds = await page.getByRole('img', { name: 'Ojo de Bife a la Leña' }).boundingBox()
  const cookingBounds = await page.getByRole('group', { name: 'Término de cocción' }).boundingBox()
  expect(photoBounds).not.toBeNull()
  expect(cookingBounds).not.toBeNull()
  expect(cookingBounds!.x).toBeGreaterThan(photoBounds!.x + photoBounds!.width)
  expect(cookingBounds!.y).toBeLessThan(photoBounds!.y + photoBounds!.height)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('detalle-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 1024, height: 900 })
  const laptopPhoto = await page.getByRole('img', { name: 'Ojo de Bife a la Leña' }).boundingBox()
  const laptopCooking = await page.getByRole('group', { name: 'Término de cocción' }).boundingBox()
  expect(laptopCooking!.x).toBeGreaterThan(laptopPhoto!.x + laptopPhoto!.width)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('detalle-laptop.png'), fullPage: true })
  await page.getByRole('button', { name: /^Agregar/ }).click()
  await page.waitForURL(/\/orden$/)
  await expect(page.getByText(/Término de cocción: Tres cuartos/)).toBeVisible()
  await expect(page.getByText(/Acompañamientos y extras: Papas rústicas/)).toBeVisible()
  await page.getByRole('button', { name: /Enviar pedido/ }).click()
  await page.waitForURL(/\/orden\/confirmado$/)
  const { data: ticket, error: ticketError } = await staffClient.rpc('rpc_admin_get_active_tickets', { p_restaurant_id: restaurantId })
  if (ticketError) throw ticketError
  expect(ticket[0].item_notes).toContain('Tres cuartos')
  expect(ticket[0].item_notes).toContain('Papas rústicas')
  expect(ticket[0].item_notes).toContain('Sin sal')

  await page.goto('/login')
  await page.getByLabel('Correo').fill(adminEmail)
  await page.getByLabel('Contraseña').fill(adminPassword)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL(new RegExp(`/admin/${slug}`))
  await page.goto(`/admin/${slug}/menu`)
  await page.getByRole('button', { name: 'Secciones del detalle' }).click()
  const bulkDialog = page.getByRole('dialog')
  await bulkDialog.getByLabel('Tipo de nueva sección').selectOption('text')
  await bulkDialog.getByRole('button', { name: 'Añadir sección', exact: true }).click()
  await bulkDialog.getByLabel('Título de la sección').fill('Origen del proveedor')
  await bulkDialog.getByLabel('Contenido').fill('Carne seleccionada por productores locales.')
  await bulkDialog.getByRole('radio', { name: 'Platos concretos' }).check()
  await bulkDialog.getByRole('checkbox', { name: 'Ojo de Bife a la Leña' }).check()
  await bulkDialog.getByRole('button', { name: 'Guardar y aplicar sección' }).click()
  await expect(bulkDialog).toBeHidden()
  await page.getByRole('button', { name: 'Editar Ojo de Bife a la Leña' }).click()
  const dialog = page.getByRole('dialog')
  const facts = dialog.locator('details').filter({ hasText: 'Características del plato' })
  await facts.getByLabel('Valor', { exact: true }).first().fill('500 g')
  await dialog.getByRole('button', { name: 'Quitar sección Ingredientes principales', exact: true }).click()
  await dialog.getByLabel('Tipo de nueva sección').selectOption('text')
  await dialog.getByRole('button', { name: 'Añadir sección', exact: true }).click()
  const sectionsInDialog = dialog.locator('details')
  await expect(sectionsInDialog).toHaveCount(6)
  const info = sectionsInDialog.nth(5)
  await info.getByLabel('Título de la sección').fill('Origen del corte')
  await info.getByLabel('Contenido').fill('Preparado en nuestra parrilla a leña.')
  await dialog.getByRole('button', { name: 'Subir Origen del corte', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('detalle-admin.png') })
  await dialog.getByRole('button', { name: 'Guardar plato', exact: true }).click()
  await expect(dialog).toBeHidden()
  const { data: saved } = await admin.from('dishes').select('detail_sections').eq('id', dishId).single()
  expect(saved!.detail_sections.some((s: DishDetailSection) => s.kind === 'ingredients')).toBe(false)
  expect(saved!.detail_sections.some((s: DishDetailSection) => s.title === 'Origen del corte')).toBe(true)

  await page.goto(`${base}/menu/${dishId}`)
  await expect(page.getByText('500 g', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ingredientes principales' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Origen del corte' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Origen del proveedor' })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const extraBounds = await page.getByRole('region', { name: 'Acompañamientos y extras', exact: true }).boundingBox()
  const infoBounds = await page.getByRole('region', { name: 'Origen del corte', exact: true }).boundingBox()
  expect(infoBounds!.y).toBeGreaterThan(extraBounds!.y + extraBounds!.height)
  const initialGeometry = await page.getByRole('heading', { name: 'Ojo de Bife a la Leña' }).evaluate(el => {
    const style = getComputedStyle(el)
    return { width: el.getBoundingClientRect().width, font: style.fontFamily, size: style.fontSize }
  })
  const primaryColors = new Set<string>()
  for (const theme of ['brasa', 'mar', 'cafe', 'huerta']) {
    await admin.from('restaurants').update({ theme }).eq('id', restaurantId)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Ojo de Bife a la Leña' })).toBeVisible()
    await expect(page.locator('[data-theme]')).toHaveAttribute('data-theme', theme)
    const geometry = await page.getByRole('heading', { name: 'Ojo de Bife a la Leña' }).evaluate(el => {
      const style = getComputedStyle(el)
      return { width: el.getBoundingClientRect().width, font: style.fontFamily, size: style.fontSize }
    })
    expect(geometry).toEqual(initialGeometry)
    primaryColors.add(await page.getByRole('button', { name: /^Agregar/ }).evaluate(el => getComputedStyle(el).backgroundColor))
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`detalle-${theme}-320.png`) })
  }
  expect(primaryColors.size).toBe(4)
})
