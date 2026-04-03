import { defineStore } from 'pinia'

interface TimelineState {
  secondsPerPixel: number
  timelineOffset: number
  globalTime: number
  isPlaying: boolean
  totalDuration: number
}

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    secondsPerPixel: 0.01,
    timelineOffset: 0,
    globalTime: 0,
    isPlaying: false,
    totalDuration: 60_000,
  }),

  getters: {
    playheadPixel: (state): number =>
      (state.globalTime / 1000) / state.secondsPerPixel - state.timelineOffset,

    msToPixel: (state) => (ms: number): number =>
      (ms / 1000) / state.secondsPerPixel - state.timelineOffset,

    pixelToMs: (state) => (px: number): number =>
      (px + state.timelineOffset) * state.secondsPerPixel * 1000,
  },

  actions: {
    setTime(ms: number): void {
      this.globalTime = Math.max(0, Math.min(ms, this.totalDuration))
    },

    setPlaying(playing: boolean): void {
      this.isPlaying = playing
    },

    zoom(factor: number, anchorPixel: number): void {
      const anchorMs = this.pixelToMs(anchorPixel)
      this.secondsPerPixel = Math.max(0.003, Math.min(0.5, this.secondsPerPixel * factor))
      this.timelineOffset = (anchorMs / 1000) / this.secondsPerPixel - anchorPixel
    },

    setOffset(offset: number): void {
      this.timelineOffset = Math.max(0, offset)
    },

    setTotalDuration(ms: number): void {
      this.totalDuration = ms
    },
  },
})
