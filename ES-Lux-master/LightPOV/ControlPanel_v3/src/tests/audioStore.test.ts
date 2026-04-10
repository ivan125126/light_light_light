// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAudioStore } from '../stores/audioStore'

describe('audioStore — playbackRate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('預設 playbackRate 為 1', () => {
    const store = useAudioStore()
    expect(store.playbackRate).toBe(1)
  })

  it('setPlaybackRate 更新值', () => {
    const store = useAudioStore()
    store.setPlaybackRate(0.5)
    expect(store.playbackRate).toBe(0.5)
  })

  it('setPlaybackRate 最小限制 0.01', () => {
    const store = useAudioStore()
    store.setPlaybackRate(0)
    expect(store.playbackRate).toBe(0.01)
  })
})
