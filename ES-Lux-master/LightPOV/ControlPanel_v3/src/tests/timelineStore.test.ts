// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTimelineStore } from '../stores/timelineStore'

describe('timelineStore — track management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始狀態有一條軌道，名稱為「軌道 1」', () => {
    const store = useTimelineStore()
    expect(store.tracks).toHaveLength(1)
    expect(store.tracks[0].name).toBe('軌道 1')
    expect(store.tracks[0].id).toBeTruthy()
  })

  it('addTrack 新增一條軌道，名稱為「軌道 N」', () => {
    const store = useTimelineStore()
    store.addTrack()
    expect(store.tracks).toHaveLength(2)
    expect(store.tracks[1].name).toBe('軌道 2')
  })

  it('removeTrack 移除指定 id 的軌道', () => {
    const store = useTimelineStore()
    store.addTrack()
    const idToRemove = store.tracks[0].id
    store.removeTrack(idToRemove)
    expect(store.tracks).toHaveLength(1)
    expect(store.tracks.find(t => t.id === idToRemove)).toBeUndefined()
  })

  it('renameTrack 更新指定 id 的軌道名稱', () => {
    const store = useTimelineStore()
    const id = store.tracks[0].id
    store.renameTrack(id, '主軌道')
    expect(store.tracks[0].name).toBe('主軌道')
  })

  it('addTrack 刪除後仍使用遞增編號', () => {
    const store = useTimelineStore()
    store.addTrack()  // 軌道 2
    store.addTrack()  // 軌道 3
    const trackToRemoveId = store.tracks[0].id  // 刪除 軌道 1
    store.removeTrack(trackToRemoveId)
    store.addTrack()  // should be 軌道 4, not 軌道 3
    const names = store.tracks.map(t => t.name)
    // After deletion and adding, we should have 軌道 2, 軌道 3, and 軌道 4 (monotonically increasing)
    expect(names).toContain('軌道 4')
    expect(names.filter(n => n === '軌道 2')).toHaveLength(1)
    expect(names.filter(n => n === '軌道 3')).toHaveLength(1)
    expect(names.filter(n => n === '軌道 4')).toHaveLength(1)
  })
})
