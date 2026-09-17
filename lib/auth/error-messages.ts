// Traduce los códigos de error de la DB/Auth (en inglés, "raise exception
// '<code>'") al mensaje en español que ve el staff. Ver
// docs/superpowers/specs/2026-09-17-auth-multitenant-design.md, "Manejo de errores".
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos',
  not_authenticated: 'Debes iniciar sesión',
  forbidden: 'No tienes permiso para esta acción',
  restaurant_suspended: 'Este restaurante está suspendido',
  email_already_registered: 'Ese correo ya tiene una cuenta',
  slug_taken: 'Ese identificador ya está en uso',
  weak_password: 'La contraseña debe tener al menos 8 caracteres',
  rate_limited: 'Demasiados intentos, espera un momento',
  invalid_restaurant_name: 'El nombre del restaurante no es válido',
  invalid_slug: 'El identificador no es válido',
  invalid_theme: 'El tema no es válido',
  invalid_status: 'El estado no es válido',
  restaurant_not_found: 'No encontramos ese restaurante',
  cannot_modify_admin: 'No podés modificar a otro administrador',
  staff_not_found: 'No encontramos esa cuenta en el equipo',
}

export function staffErrorMessage(code: string | null | undefined): string {
  if (!code) return 'Ocurrió un error inesperado'
  return MESSAGES[code] ?? 'Ocurrió un error inesperado'
}
