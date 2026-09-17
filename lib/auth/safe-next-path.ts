// Evita un open redirect en /login?next=... (solo rutas internas del propio sitio).
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  // "//evil.com" y "/\evil.com" son protocol-relative: el navegador los
  // trata como otro host, no como una ruta interna.
  if (/^\/[/\\]/.test(value)) return null
  // CR/LF y otros de control habilitan inyección de encabezados en algunos
  // parsers intermedios.
  if (/[\x00-\x1f]/.test(value)) return null
  return value
}
