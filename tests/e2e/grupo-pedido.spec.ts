import { test, expect, chromium } from '@playwright/test'

const QR_TOKEN = '33333333-3333-3333-3333-333333333333'
const RESTAURANT_SLUG = 'sabor-brasa'

test('dos comensales de la misma mesa comparten carrito y envían un pedido', async () => {
  const identificadorPrueba = Date.now()
  const apodoAna = `Ana ${identificadorPrueba}`
  const apodoBeto = `Beto ${identificadorPrueba}`
  const browser = await chromium.launch()
  const contextAna = await browser.newContext()
  const contextBeto = await browser.newContext()
  const pageAna = await contextAna.newPage()
  const pageBeto = await contextBeto.newPage()

  await pageAna.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await pageAna.getByLabel(/apodo/i).fill(apodoAna)
  await pageAna.getByRole('button', { name: /entrar/i }).click()
  await pageAna.waitForURL(/\/menu$/)

  await pageBeto.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await pageBeto.getByLabel(/apodo/i).fill(apodoBeto)
  await pageBeto.getByRole('button', { name: /entrar/i }).click()
  await pageBeto.waitForURL(/\/menu$/)

  await pageAna.getByText('Ojo de Bife a la Leña').click()
  await pageAna.getByRole('button', { name: /^agregar/i }).click()
  await pageAna.waitForURL(/\/orden$/)

  await pageBeto.getByText('Calamares Fritos').click()
  await pageBeto.getByRole('button', { name: /^agregar/i }).click()
  await pageBeto.waitForURL(/\/orden$/)
  await expect(pageBeto.getByRole('heading', { name: 'Última ronda' })).toHaveCount(0)

  const pedidoDeAna = pageBeto.getByRole('region', { name: apodoAna })
  await expect(pedidoDeAna.getByText('Ojo de Bife a la Leña')).toBeVisible({ timeout: 10000 })

  const miPedido = pageBeto.getByRole('region', { name: apodoBeto })
  await expect(miPedido.getByText('Calamares Fritos')).toBeVisible()
  await expect(miPedido.getByText('Tú')).toBeVisible()

  await pageBeto.getByRole('button', { name: /enviar pedido/i }).click()
  await pageBeto.waitForURL(/\/orden\/confirmado$/)
  await expect(pageBeto.getByRole('heading', { name: /pedido enviado/i })).toBeVisible()

  await pageBeto.getByRole('button', { name: /ver mi orden/i }).click()
  await pageBeto.waitForURL(/\/orden$/)
  await expect(pageBeto.getByRole('heading', { name: 'Última ronda' })).toBeVisible()
  await expect(pageBeto.getByRole('heading', { name: 'Estado del pedido' })).toBeVisible()

  await expect(pageAna.getByRole('heading', { name: 'Última ronda' })).toBeVisible({ timeout: 10000 })

  await browser.close()
})

test('una nueva visita al QR pide el apodo aunque el dispositivo tenga una sesión abierta', async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await page.getByLabel(/apodo/i).fill('Primera visita')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL(/\/menu$/)

  await page.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await expect(page.getByLabel(/apodo/i)).toBeVisible()

  await browser.close()
})
