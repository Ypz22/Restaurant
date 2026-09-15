import { test, expect, chromium } from '@playwright/test'

const QR_TOKEN = '33333333-3333-3333-3333-333333333333'
const RESTAURANT_SLUG = 'sabor-brasa'

test('dos comensales de la misma mesa comparten carrito y envían un pedido', async () => {
  const browser = await chromium.launch()
  const contextAna = await browser.newContext()
  const contextBeto = await browser.newContext()
  const pageAna = await contextAna.newPage()
  const pageBeto = await contextBeto.newPage()

  await pageAna.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await pageAna.getByLabel(/apodo/i).fill('Ana')
  await pageAna.getByRole('button', { name: /entrar/i }).click()
  await pageAna.waitForURL(/\/menu$/)

  await pageBeto.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await pageBeto.getByLabel(/apodo/i).fill('Beto')
  await pageBeto.getByRole('button', { name: /entrar/i }).click()
  await pageBeto.waitForURL(/\/menu$/)

  await pageAna.getByText('Ojo de Bife a la Leña').click()
  await pageAna.getByRole('button', { name: /agregar al pedido/i }).click()
  await pageAna.waitForURL(/\/orden$/)

  await pageBeto.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}/orden`)
  await expect(pageBeto.getByText('Ojo de Bife a la Leña')).toBeVisible({ timeout: 10000 })
  await expect(pageBeto.getByText(/Agregado por Ana/i)).toBeVisible()

  await pageBeto.getByRole('button', { name: /enviar pedido/i }).click()
  await pageBeto.waitForURL(/\/orden\/confirmado$/)
  await expect(pageBeto.getByText(/pedido enviado/i)).toBeVisible()

  await expect(pageAna.getByText(/tu pedido está vacío/i)).toBeVisible({ timeout: 10000 })

  await browser.close()
})
