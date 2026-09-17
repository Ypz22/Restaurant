import { redirect } from 'next/navigation'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { ChangePasswordForm } from '@/components/auth/change-password-form'

export default async function ChangePasswordPage() {
  const access = await getStaffAccess()
  if (!access) redirect('/login')

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-title-lg text-foreground">Elegí una nueva contraseña</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Es tu primer ingreso: necesitás cambiar la contraseña temporal antes de continuar.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
