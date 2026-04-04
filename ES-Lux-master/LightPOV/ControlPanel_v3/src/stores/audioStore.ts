import { defineStore } from 'pinia'

interface AudioState {
  hasAudio: boolean
  duration: number
  peaks: number[]
  fileName: string | null
}

export const useAudioStore = defineStore('audio', {
  state: (): AudioState => ({
    hasAudio: false,
    duration: 0,
    peaks: [],
    fileName: null,
  }),

  actions: {
    setAudio(duration: number, peaks: number[], fileName: string): void {
      this.hasAudio = true
      this.duration = duration
      this.peaks = peaks
      this.fileName = fileName
    },

    clearAudio(): void {
      this.hasAudio = false
      this.duration = 0
      this.peaks = []
      this.fileName = null
    },
  },
})
