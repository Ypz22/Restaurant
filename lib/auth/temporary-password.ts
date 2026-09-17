// Contraseña temporal para cuentas de staff creadas por un admin o por la
// plataforma (nunca se envía correo; se muestra una sola vez en pantalla).
export function generateTemporaryPassword(): string {
  // 16 bytes = 128 bits, en base64url sin truncar (22 caracteres).
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Buffer.from(bytes).toString('base64url')
}
