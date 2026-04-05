import { defineStore } from 'pinia'
import type { EffectInstance } from '../types'
import { useEffectStore } from './effectStore'
import { useSelectionStore } from './selectionStore'

const MAX_STACK = 50

interface UndoState {
  stack: EffectInstance[][]
}

export const useUndoStore = defineStore('undo', {
  state: (): UndoState => ({
    stack: [],
  }),

  actions: {
    push(): void {
      const effectStore = useEffectStore()
      const snapshot: EffectInstance[] = JSON.parse(JSON.stringify(effectStore.instances))
      this.stack.push(snapshot)
      if (this.stack.length > MAX_STACK) this.stack.shift()
    },

    undo(): void {
      if (this.stack.length === 0) return
      const snapshot = this.stack.pop()!
      const effectStore = useEffectStore()
      const selectionStore = useSelectionStore()
      effectStore.restoreInstances(snapshot)
      selectionStore.clear()
    },
  },
})
