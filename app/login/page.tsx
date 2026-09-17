import { redirect } from 'next/navigation'
import { getStaffAccess } from '@/lib/auth/get-staff-access'
import { resolveStaffHome } from '@/lib/auth/resolve-staff-home'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  const access = await getStaffAccess()
  if (access) {
    const result = resolveStaffHome(access)
    if (result.kind === 'redirect') redirect(result.path)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-title-lg text-foreground">Iniciar sesión</h1>
        <p className="mt-1 text-body-md text-muted-foreground">Panel de administración y cocina.</p>
        <LoginForm next={next ?? null} />
      </div>
    </div>
  )
}
