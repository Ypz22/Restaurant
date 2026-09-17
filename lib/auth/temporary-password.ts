// Contraseña temporal para cuentas de staff creadas por un admin o por la
// plataforma (nunca se envía correo; se muestra una sola vez en pantalla).
export function generateTemporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16)
}
