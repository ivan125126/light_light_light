import { defineStore } from 'pinia'

interface AudioState {
  hasAudio: boolean
  duration: number
  peaks: number[]
  fileName: string | null
  volume: number
  playbackRate: number
}

export const useAudioStore = defineStore('audio', {
  state: (): AudioState => ({
    hasAudio: false,
    duration: 0,
    peaks: [],
    fileName: null,
    volume: 1,
    playbackRate: 1,
  }),

  actions: {
    setAudio(duration: number, peaks: number[], fileName: string): void {
      this.hasAudio = true
      this.duration = duration
      this.peaks = peaks
      this.fileName = fileName
    },

    setVolume(vol: number): void {
      this.volume = Math.max(0, Math.min(1, vol))
    },

    setPlaybackRate(rate: number): void {
      this.playbackRate = Math.max(0.01, rate)
    },

    clearAudio(): void {
      this.hasAudio = false
      this.duration = 0
      this.peaks = []
      this.fileName = null
    },
  },
})
