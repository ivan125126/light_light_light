// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useHardwareStore } from '../stores/hardwareStore'

// Mock hardwareService so we control server responses
vi.mock('../services/hardwareService', () => ({
  getLuxStat: vi.fn().mockResolvedValue(0),
  checkServerHealth: vi.fn(),
}))

import { checkServerHealth } from '../services/hardwareService'

describe('hardwareStore — server polling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('serverOnline 初始為 false', () => {
    const store = useHardwareStore()
    expect(store.serverOnline).toBe(false)
  })

  it('startServerPolling 在 server 回應 true 時將 serverOnline 設為 true', async () => {
    vi.mocked(checkServerHealth).mockResolvedValue(true)
    const store = useHardwareStore()
    store.startServerPolling()
    await flushPromises()
    expect(store.serverOnline).toBe(true)
  })

  it('startServerPolling 在 server 回應 false 時將 serverOnline 設為 false', async () => {
    vi.mocked(checkServerHealth).mockResolvedValue(false)
    const store = useHardwareStore()
    store.serverOnline = true
    store.startServerPolling()
    await flushPromises()
    expect(store.serverOnline).toBe(false)
  })

  it('stopServerPolling 停止後不再更新 serverOnline', async () => {
    vi.mocked(checkServerHealth).mockResolvedValue(true)
    const store = useHardwareStore()
    store.startServerPolling()
    await flushPromises()
    expect(store.serverOnline).toBe(true)

    store.stopServerPolling()
    vi.mocked(checkServerHealth).mockResolvedValue(false)
    await vi.advanceTimersByTimeAsync(9000)
    expect(store.serverOnline).toBe(true)
  })
})
