// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSelectionStore } from '../stores/selectionStore'
import { useEffectStore } from '../stores/effectStore'

describe('selectionStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初始狀態 selectedIds 為空，clipboard 為 null', () => {
    const store = useSelectionStore()
    expect(store.selectedIds).toHaveLength(0)
    expect(store.clipboard).toBeNull()
  })

  it('setOnly 清除其他選取並只選一個 id', () => {
    const store = useSelectionStore()
    store.setOnly('a')
    store.setOnly('b')
    expect(store.selectedIds).toEqual(['b'])
  })

  it('toggle 加入未選取的 id', () => {
    const store = useSelectionStore()
    store.toggle('a')
    expect(store.selectedIds).toContain('a')
  })

  it('toggle 移除已選取的 id', () => {
    const store = useSelectionStore()
    store.toggle('a')
    store.toggle('a')
    expect(store.selectedIds).not.toContain('a')
  })

  it('clear 清空 selectedIds', () => {
    const store = useSelectionStore()
    store.setOnly('a')
    store.clear()
    expect(store.selectedIds).toHaveLength(0)
  })

  it('setCopy 深拷貝 instances，移除 id，記錄 anchorTime', () => {
    const effectStore = useEffectStore()
    const store = useSelectionStore()
    const id1 = effectStore.addInstance('Plain', 1000, 3000, 0)
    const id2 = effectStore.addInstance('Plain', 4000, 2000, 0)
    const instances = effectStore.instances.filter(i => [id1, id2].includes(i.id))
    store.setCopy(instances)
    expect(store.clipboard).toHaveLength(2)
    expect(store.clipboardAnchorTime).toBe(1000)
    store.clipboard!.forEach(entry => {
      expect('id' in entry).toBe(false)
    })
  })

  it('setCopy 空陣列時不修改 clipboard', () => {
    const store = useSelectionStore()
    store.setCopy([])
    expect(store.clipboard).toBeNull()
  })

  it('setMany 設定多個選取並取代舊的', () => {
    const store = useSelectionStore()
    store.setOnly('a')
    store.setMany(['b', 'c'])
    expect(store.selectedIds).toEqual(['b', 'c'])
  })
})
