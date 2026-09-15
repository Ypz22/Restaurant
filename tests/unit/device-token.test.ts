import { describe, it, expect, beforeEach } from 'vitest'
import { saveDeviceToken, getDeviceToken, clearDeviceToken } from '@/lib/session/device-token'

describe('device-token storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing is stored', () => {
    expect(getDeviceToken()).toBeNull()
  })

  it('saves and retrieves a token', () => {
    saveDeviceToken('abc-123')
    expect(getDeviceToken()).toBe('abc-123')
  })

  it('clears the token', () => {
    saveDeviceToken('abc-123')
    clearDeviceToken()
    expect(getDeviceToken()).toBeNull()
  })
})
