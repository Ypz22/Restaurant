import { describe, it, expect } from 'vitest'
import { safeNextPath } from '@/lib/auth/safe-next-path'

describe('safeNextPath', () => {
  it('accepts an internal path', () => {
    expect(safeNextPath('/admin/brasa')).toBe('/admin/brasa')
  })

  it('rejects an absolute URL to another site', () => {
    expect(safeNextPath('https://evil.com')).toBeNull()
  })

  it('rejects a protocol-relative URL (open redirect)', () => {
    expect(safeNextPath('//evil.com')).toBeNull()
  })

  it('rejects empty, null and undefined', () => {
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
  })
})
