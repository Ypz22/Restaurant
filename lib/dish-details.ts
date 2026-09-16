export const detailKinds = {
  characteristics: 'Características del plato',
  ingredients: 'Ingredientes principales',
  single: 'Término de cocción',
  multiple: 'Acompañamientos y extras',
  text: 'Información adicional',
  notes: 'Notas para la cocina',
} as const

export type DishDetailKind = keyof typeof detailKinds
export type DishDetailIcon = 'portion' | 'fire' | 'calendar' | 'time' | 'leaf' | 'info'
export type DishDetailItem = {
  id: string
  label: string
  value: string
  description: string
  icon: DishDetailIcon
  price: number
  recommended: boolean
}
export type DishDetailSection = {
  id: string
  kind: DishDetailKind
  title: string
  required: boolean
  body: string
  items: DishDetailItem[]
}
export type DishSelections = Record<string, string[]>

export function createDetailItem(): DishDetailItem {
  return { id: crypto.randomUUID(), label: '', value: '', description: '', icon: 'info', price: 0, recommended: false }
}

export function createDetailSection(kind: DishDetailKind): DishDetailSection {
  return {
    id: crypto.randomUUID(), kind, title: detailKinds[kind], required: kind === 'single',
    body: kind === 'notes' ? 'Ej. Sin ajo en el aliño, poca sal marina, salsa aparte…' : '',
    items: kind === 'notes' || kind === 'text' ? [] : [createDetailItem()],
  }
}

export function selectedUnitPrice(price: number, sections: DishDetailSection[], selections: DishSelections): number {
  let cents = Math.round(price * 100)
  for (const section of sections) {
    if (section.kind !== 'single' && section.kind !== 'multiple') continue
    for (const item of section.items) {
      if (selections[section.id]?.includes(item.id)) cents += Math.round(item.price * 100)
    }
  }
  return cents / 100
}

export function missingRequiredSections(sections: DishDetailSection[], selections: DishSelections, notes: string): DishDetailSection[] {
  return sections.filter(section => section.required && (
    section.kind === 'notes' ? !notes.trim() :
    (section.kind === 'single' || section.kind === 'multiple') && !section.items.some(item => selections[section.id]?.includes(item.id))
  ))
}

export function detailValidationError(sections: DishDetailSection[]): string | null {
  if (sections.length > 20) return 'Puedes añadir hasta 20 secciones por plato.'
  const ids = new Set<string>()
  let notesCount = 0
  for (const section of sections) {
    if (!section.id || ids.has(section.id)) return 'Las secciones deben tener identificadores únicos.'
    ids.add(section.id)
    if (!section.title.trim() || section.title.length > 100) return 'Cada sección necesita un título de hasta 100 caracteres.'
    if (section.body.length > 1000) return 'El texto de una sección no puede superar 1000 caracteres.'
    if (section.kind === 'notes' && ++notesCount > 1) return 'Solo puede haber una sección de notas para cocina.'
    if (section.kind === 'text' && !section.body.trim()) return 'Completa el texto de la sección informativa.'
    if (section.kind !== 'text' && section.kind !== 'notes' && (!section.items.length || section.items.length > 30)) return 'Cada sección necesita entre 1 y 30 elementos.'
    const itemIds = new Set<string>()
    for (const item of section.items) {
      if (!item.id || itemIds.has(item.id)) return 'Los elementos de una sección deben tener identificadores únicos.'
      itemIds.add(item.id)
      if (!item.label.trim() || item.label.length > 100) return 'Completa el nombre de cada elemento (hasta 100 caracteres).'
      if (item.description.length > 300 || item.value.length > 100) return 'Acorta la descripción o el valor del elemento.'
      if (section.kind === 'characteristics' && !item.value.trim()) return 'Completa el valor de cada característica.'
      if (!Number.isFinite(item.price) || item.price < 0 || item.price > 999999 || Math.abs(item.price * 100 - Math.round(item.price * 100)) > 0.000001) return 'Los extras necesitan un precio válido con hasta dos decimales.'
    }
  }
  return null
}
