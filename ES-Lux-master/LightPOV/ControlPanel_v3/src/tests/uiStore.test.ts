// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('預設 appMode 為 edit', () => {
    const store = useUiStore()
    expect(store.appMode).toBe('edit')
  })

  it('toggleMode 切換至 perform', () => {
    const store = useUiStore()
    store.toggleMode()
    expect(store.appMode).toBe('perform')
  })

  it('toggleMode 再次切換回 edit', () => {
    const store = useUiStore()
    store.toggleMode()
    store.toggleMode()
    expect(store.appMode).toBe('edit')
  })
})
