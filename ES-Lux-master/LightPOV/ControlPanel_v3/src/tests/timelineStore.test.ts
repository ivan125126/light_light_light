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
})
