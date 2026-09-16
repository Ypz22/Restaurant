import { describe, it, expect } from 'vitest'
import { tableStatus } from '@/lib/data/admin-tables'

describe('tableStatus', () => {
  const session = { id: 's', openedAt: '2026-09-16T12:00:00Z' }

  it('uses the manual availability when there is no open session', () => {
    expect(tableStatus({ availability: 'available', session: null })).toBe('available')
    expect(tableStatus({ availability: 'reserved', session: null })).toBe('reserved')
    expect(tableStatus({ availability: 'unavailable', session: null })).toBe('unavailable')
  })

  it('reports occupied whenever a session is open', () => {
    expect(tableStatus({ availability: 'reserved', session })).toBe('occupied')
    expect(tableStatus({ availability: 'available', session })).toBe('occupied')
  })
})
