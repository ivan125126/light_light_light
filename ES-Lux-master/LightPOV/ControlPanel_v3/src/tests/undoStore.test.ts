// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUndoStore } from '../stores/undoStore'
import { useEffectStore } from '../stores/effectStore'
import { useSelectionStore } from '../stores/selectionStore'

describe('undoStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初始 stack 為空', () => {
    expect(useUndoStore().stack).toHaveLength(0)
  })

  it('push 存下 effectStore.instances 的深拷貝快照', () => {
    const undoStore = useUndoStore()
    const effectStore = useEffectStore()
    effectStore.addInstance('純色', 0, 3000, 0)
    undoStore.push()
    expect(undoStore.stack).toHaveLength(1)
    expect(undoStore.stack[0]).toHaveLength(1)
    // 確認是深拷貝（修改 store 不影響快照）
    effectStore.addInstance('純色', 5000, 3000, 0)
    expect(undoStore.stack[0]).toHaveLength(1)
  })

  it('undo 還原 instances 並清空選取', () => {
    const undoStore = useUndoStore()
    const effectStore = useEffectStore()
    const selectionStore = useSelectionStore()

    effectStore.addInstance('純色', 0, 3000, 0)
    undoStore.push()
    const id2 = effectStore.addInstance('純色', 5000, 3000, 0)
    selectionStore.setOnly(id2)
    effectStore.selectInstance(id2)

    undoStore.undo()

    expect(effectStore.instances).toHaveLength(1)
    expect(selectionStore.selectedIds).toHaveLength(0)
    expect(effectStore.selectedInstanceId).toBeNull()
  })

  it('stack 超過 50 步時移除最舊快照', () => {
    const undoStore = useUndoStore()
    for (let i = 0; i < 55; i++) undoStore.push()
    expect(undoStore.stack.length).toBeLessThanOrEqual(50)
  })

  it('stack 為空時 undo 不拋出錯誤，不改變 instances', () => {
    const undoStore = useUndoStore()
    const effectStore = useEffectStore()
    effectStore.addInstance('純色', 0, 3000, 0)
    expect(() => undoStore.undo()).not.toThrow()
    expect(effectStore.instances).toHaveLength(1)
  })
})
