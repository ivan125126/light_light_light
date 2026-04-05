import { defineStore } from 'pinia'
import type { EffectInstance } from '../types'

type ClipboardEntry = Omit<EffectInstance, 'id'>

interface SelectionState {
  selectedIds: string[]
  clipboard: ClipboardEntry[] | null
  clipboardAnchorTime: number
}

export const useSelectionStore = defineStore('selection', {
  state: (): SelectionState => ({
    selectedIds: [],
    clipboard: null,
    clipboardAnchorTime: 0,
  }),

  actions: {
    setOnly(id: string): void {
      this.selectedIds = [id]
    },

    toggle(id: string): void {
      const idx = this.selectedIds.indexOf(id)
      if (idx === -1) this.selectedIds.push(id)
      else this.selectedIds.splice(idx, 1)
    },

    clear(): void {
      this.selectedIds = []
    },

    setCopy(instances: EffectInstance[]): void {
      if (instances.length === 0) return
      this.clipboardAnchorTime = Math.min(...instances.map(i => i.startTime))
      this.clipboard = instances.map(({ id: _id, ...rest }) =>
        JSON.parse(JSON.stringify(rest)) as ClipboardEntry
      )
    },
  },
})
