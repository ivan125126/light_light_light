import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    appMode: 'edit' as 'edit' | 'perform',
  }),
  actions: {
    toggleMode(): void {
      this.appMode = this.appMode === 'edit' ? 'perform' : 'edit'
    },
  },
})
