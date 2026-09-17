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
  const mobileNav = page.locator('nav[aria-label="Navegación principal"]').last()
  const desktopNav = page.locator('nav[aria-label="Navegación principal"]').first()
  await expect(mobileNav).toBeVisible()
  await expect(page.getByText('STITCH REMIX')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Costillar al Quebracho' }).first()).toBeVisible()
  const menuDescription = page.locator('article.sb-card').filter({ hasText: 'Tacos de Asado al Carbón' }).locator('p')
  await expect(menuDescription).toBeVisible()
  const menuTextColor = await menuDescription.evaluate((element) => ({
    color: getComputedStyle(element).color,
    mutedSurface: (() => {
      const sample = document.createElement('span')
      sample.style.color = 'var(--muted)'
      element.parentElement?.append(sample)
      const color = getComputedStyle(sample).color
      sample.remove()
      return color
    })(),
  }))
  expect(menuTextColor.color).not.toBe(menuTextColor.mutedSurface)
  for (const dish of ['Calamares Fritos', 'Ceviche de Corvina']) {
    const photo = page.getByRole('img', { name: dish })
    await photo.scrollIntoViewIfNeeded()
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('brasa-mobile.png'), fullPage: true })

  await expect(page.getByRole('link', { name: /favoritos/i })).toHaveCount(0)

  await page.getByRole('button', { name: 'Pescados' }).click()
  await expect(page.getByRole('heading', { name: 'Salmón a la Miel & Romero' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ojo de Bife a la Leña' })).toHaveCount(0)
  await page.getByLabel('Buscar platos').fill('risotto')
  await page.getByRole('button', { name: 'Todos' }).click()
  await expect(page.getByRole('heading', { name: 'Risotto de Hongos Silvestres' })).toBeVisible()

  await mobileNav.getByRole('link', { name: 'Camarero' }).click()
  await expect(page.getByRole('heading', { name: '¿En qué podemos ayudarte?' })).toBeVisible()
  await page.getByRole('button', { name: 'Agua', exact: true }).click()
  await page.getByRole('button', { name: 'Solicitar a sala' }).click()
  await expect(page.getByRole('status')).toContainText('Aviso enviado')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: 'Volver al menú' }).click()
  await page.getByLabel('Buscar platos').fill('')
  await expect(desktopNav).toBeVisible()
  await expect(mobileNav).toBeHidden()
  await page.screenshot({ path: testInfo.outputPath('brasa-desktop.png'), fullPage: true })
  await context.close()
})
