// Evita un open redirect en /login?next=... (solo rutas internas del propio sitio).
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  return value
}
