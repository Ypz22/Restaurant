import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const handlers: Record<string, (payload: any) => void> = {}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: (_event: string, _config: any, cb: (payload: any) => void) => {
        handlers.change = cb
        return { subscribe: (statusCb?: (s: string) => void) => { statusCb?.('SUBSCRIBED'); return {} } }
      },
    }),
    removeChannel: () => {},
  }),
}))

import { useDishAvailabilityRealtime } from '@/hooks/use-dish-availability-realtime'

describe('useDishAvailabilityRealtime', () => {
  it('updates isAvailable when a dish UPDATE event arrives', () => {
    const initial = [{ id: 'd1', categoryId: 'c1', name: 'Plato', description: '', price: 10, photoUrl: null, isAvailable: true }]
    const { result } = renderHook(() => useDishAvailabilityRealtime('r1', initial))

    act(() => {
      handlers.change({ new: { id: 'd1', is_available: false } })
    })

    expect(result.current.find((d) => d.id === 'd1')?.isAvailable).toBe(false)
  })
})
