import { beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { upsertDish, getAdminMenu } from '@/lib/data/admin-menu'
import { addCartItem } from '@/lib/data/cart'
import { getMenu } from '@/lib/data/menu'
import { startSession } from '@/lib/data/session'
import type { DishDetailSection, DishSelections } from '@/lib/dish-details'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sections: DishDetailSection[] = [
  { id: 'facts', kind: 'characteristics', title: 'Características', required: false, body: '', items: [
    { id: 'portion', label: 'Porción', value: '420 g', description: '', icon: 'portion', price: 0, recommended: false },
  ] },
  { id: 'cooking', kind: 'single', title: 'Término de cocción', required: true, body: '', items: [
    { id: 'medium', label: 'Término medio', value: '', description: 'Centro rojo tibio', icon: 'info', price: 0, recommended: true },
    { id: 'done', label: 'Bien cocido', value: '', description: '', icon: 'info', price: 0, recommended: false },
  ] },
  { id: 'extras', kind: 'multiple', title: 'Acompañamientos y extras', required: false, body: '', items: [
    { id: 'potatoes', label: 'Papas rústicas', value: '', description: 'Con romero', icon: 'info', price: 2.5, recommended: false },
  ] },
]
let restaurantId: string
let categoryId: string
let dishId: string
let deviceToken: string

beforeAll(async () => {
  const { data: restaurant, error } = await admin.from('restaurants').insert({ name: 'Detalles', slug: `details-${crypto.randomUUID()}` }).select().single()
  if (error) throw error
  restaurantId = restaurant.id
  const { data: category } = await admin.from('menu_categories').insert({ restaurant_id: restaurantId, name: 'Cortes' }).select().single()
  categoryId = category!.id
  const { data: table } = await admin.from('tables').insert({ restaurant_id: restaurantId, label: 'D1' }).select().single()
  deviceToken = (await startSession(table!.qr_token, 'Ana')).deviceToken
})

describe('Detalle configurable del plato', () => {
  it('guarda las secciones y las devuelve en el menú y en administración', async () => {
    const dish = await upsertDish(restaurantId, {
      categoryId, name: 'Corte', description: '', price: 21, photoUrl: null, isAvailable: true,
      detailSections: sections,
    })
    dishId = dish.id
    expect(dish.detailSections).toEqual(sections)
    expect((await getMenu(restaurantId)).dishes.find(d => d.id === dishId)?.detailSections).toEqual(sections)
    expect((await getAdminMenu(restaurantId)).dishes.find(d => d.id === dishId)?.detailSections).toEqual(sections)
  })

  it('rechaza omitir la cocción obligatoria incluso desde una llamada directa', async () => {
    await expect(addCartItem(deviceToken, dishId, 1)).rejects.toThrow('required_selection')
  })

  it('calcula los extras en el servidor y guarda las elecciones en las notas de cocina', async () => {
    const item = await addCartItem(deviceToken, dishId, 2, 'Sin sal', { cooking: ['medium'], extras: ['potatoes'] })
    expect(item.unitPriceSnapshot).toBe(23.5)
    expect(item.notes).toContain('Término de cocción: Término medio')
    expect(item.notes).toContain('Acompañamientos y extras: Papas rústicas')
    expect(item.notes).toContain('Sin sal')
  })

  it('rechaza extras inexistentes, repetidos y más de una cocción', async () => {
    const invalidChoices: DishSelections[] = [
      { cooking: ['medium'], extras: ['fake'] },
      { cooking: ['medium'], extras: ['potatoes', 'potatoes'] },
      { cooking: ['medium', 'done'] },
      { cooking: ['medium'], fake: ['potatoes'] },
    ]
    for (const choices of invalidChoices) await expect(addCartItem(deviceToken, dishId, 1, '', choices)).rejects.toThrow()
  })

  it('permite quitar todas las secciones sin conservar requisitos anteriores', async () => {
    const dish = await upsertDish(restaurantId, {
      id: dishId, categoryId, name: 'Corte', description: '', price: 21, photoUrl: null, isAvailable: true,
      detailSections: [],
    })
    expect(dish.detailSections).toEqual([])
    expect((await addCartItem(deviceToken, dishId, 1)).unitPriceSnapshot).toBe(21)
  })

  it('rechaza configuraciones ambiguas y precios negativos', async () => {
    for (const detailSections of [
      [sections[0], sections[0]],
      [{ ...sections[2], items: [{ ...sections[2].items[0], price: -1 }] }],
      [{ ...sections[1], items: [] }],
    ]) await expect(upsertDish(restaurantId, {
      categoryId, name: 'Inválido', description: '', price: 10, photoUrl: null, isAvailable: true, detailSections,
    })).rejects.toThrow()
  })
})
