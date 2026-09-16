import { test, expect } from '@playwright/test'

const qr = '33333333-3333-3333-3333-333333333333'
const base = `/r/sabor-brasa/mesa/${qr}`

test('menú móvil y escritorio permiten buscar, filtrar y solicitar ayuda', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(new RegExp(`${base}$`))
  await page.getByLabel('Apodo').fill('Vista responsive')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/menu$/)
  await expect(page.locator('.sb-mobile-nav')).toBeVisible()
  await expect(page.getByText('STITCH REMIX')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Costillar al Quebracho' }).first()).toBeVisible()
  for (const dish of ['Calamares Fritos', 'Ceviche de Corvina']) {
    const photo = page.getByRole('img', { name: dish })
    await photo.scrollIntoViewIfNeeded()
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('brasa-mobile.png'), fullPage: true })

  await page.getByRole('button', { name: /Guardar Ojo de Bife a la Leña de favoritos/ }).click()
  await page.locator('.sb-mobile-nav').getByRole('button', { name: 'Favoritos' }).click()
  await expect(page.getByRole('heading', { name: 'Ojo de Bife a la Leña' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tacos de Asado al Carbón' })).toHaveCount(0)
  await page.locator('.sb-mobile-nav').getByRole('button', { name: 'Menú' }).click()

  await page.getByRole('button', { name: 'Pescados' }).click()
  await expect(page.getByRole('heading', { name: 'Salmón a la Miel & Romero' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ojo de Bife a la Leña' })).toHaveCount(0)
  await page.getByLabel('Buscar platos').fill('risotto')
  await page.getByRole('button', { name: 'Todos' }).click()
  await expect(page.getByRole('heading', { name: 'Risotto de Hongos Silvestres' })).toBeVisible()

  await page.locator('.sb-mobile-nav').getByRole('button', { name: 'Camarero' }).click()
  await expect(page.getByRole('heading', { name: '¿En qué podemos ayudarte?' })).toBeVisible()
  await page.getByRole('button', { name: 'Agua', exact: true }).click()
  await page.getByRole('button', { name: 'Solicitar a sala' }).click()
  await expect(page.getByRole('status')).toContainText('Aviso enviado')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: 'Volver al menú' }).click()
  await page.getByLabel('Buscar platos').fill('')
  await expect(page.locator('.sb-desktop-nav')).toBeVisible()
  await expect(page.locator('.sb-mobile-nav')).toBeHidden()
  await page.screenshot({ path: testInfo.outputPath('brasa-desktop.png'), fullPage: true })
  await context.close()
})
