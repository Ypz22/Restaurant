import { describe, it, expect } from 'vitest'
import { resolveStaffHome, type StaffAccess, type StaffRestaurant } from '@/lib/auth/resolve-staff-home'

function restaurant(overrides: Partial<StaffRestaurant> = {}): StaffRestaurant {
  return { id: 'r1', slug: 'brasa', name: 'Sabor & Brasa', status: 'active', role: 'admin', ...overrides }
}

function access(overrides: Partial<StaffAccess> = {}): StaffAccess {
  return { mustChangePassword: false, isPlatformAdmin: false, restaurants: [], ...overrides }
}

describe('resolveStaffHome', () => {
  it('sends to /cambiar-contrasena when the password change is pending, before anything else', () => {
    const result = resolveStaffHome(access({ mustChangePassword: true, isPlatformAdmin: true }))
    expect(result).toEqual({ kind: 'redirect', path: '/cambiar-contrasena' })
  })

  it('reports no_access when the account has no roles at all', () => {
    const result = resolveStaffHome(access())
    expect(result).toEqual({ kind: 'no_access' })
  })

  it('reports all_suspended when every restaurant of a non-platform account is suspended', () => {
    const result = resolveStaffHome(access({ restaurants: [restaurant({ status: 'suspended' })] }))
    expect(result).toEqual({ kind: 'all_suspended' })
  })

  it('sends a platform_admin with no active restaurants to /plataforma', () => {
    const result = resolveStaffHome(access({ isPlatformAdmin: true }))
    expect(result).toEqual({ kind: 'redirect', path: '/plataforma' })
  })

  it('sends a lone admin to /admin/[slug]', () => {
    const result = resolveStaffHome(access({ restaurants: [restaurant({ role: 'admin', slug: 'brasa' })] }))
    expect(result).toEqual({ kind: 'redirect', path: '/admin/brasa' })
  })

  it('sends a lone kitchen account to /kitchen/[slug]', () => {
    const result = resolveStaffHome(access({ restaurants: [restaurant({ role: 'kitchen', slug: 'brasa' })] }))
    expect(result).toEqual({ kind: 'redirect', path: '/kitchen/brasa' })
  })

  it('sends an account with two active restaurants to /elegir-restaurante', () => {
    const result = resolveStaffHome(access({
      restaurants: [restaurant({ id: 'r1', slug: 'brasa' }), restaurant({ id: 'r2', slug: 'mar' })],
    }))
    expect(result).toEqual({ kind: 'redirect', path: '/elegir-restaurante' })
  })

  it('sends a platform_admin who is also an admin of one active restaurant to /elegir-restaurante', () => {
    const result = resolveStaffHome(access({
      isPlatformAdmin: true,
      restaurants: [restaurant({ status: 'active' })],
    }))
    expect(result).toEqual({ kind: 'redirect', path: '/elegir-restaurante' })
  })

  it('ignores suspended restaurants when picking the lone active destination', () => {
    const result = resolveStaffHome(access({
      restaurants: [restaurant({ id: 'r1', status: 'suspended' }), restaurant({ id: 'r2', status: 'active', slug: 'mar' })],
    }))
    expect(result).toEqual({ kind: 'redirect', path: '/admin/mar' })
  })

  it('a platform_admin with only suspended restaurants still goes to /plataforma', () => {
    const result = resolveStaffHome(access({
      isPlatformAdmin: true,
      restaurants: [restaurant({ status: 'suspended' })],
    }))
    expect(result).toEqual({ kind: 'redirect', path: '/plataforma' })
  })
})
