import { defineStore } from 'pinia'

interface Track {
  id: string
  name: string
}

interface TimelineState {
  secondsPerPixel: number
  timelineOffset: number
  globalTime: number
  isPlaying: boolean
  totalDuration: number
  tracks: Track[]
}

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    secondsPerPixel: 0.01,
    timelineOffset: 0,
    globalTime: 0,
    isPlaying: false,
    totalDuration: 60_000,
    tracks: [{ id: 'track-0', name: '軌道 1' }],
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

    addTrack(): void {
      const n = this.tracks.length + 1
      this.tracks.push({ id: `track-${Date.now()}`, name: `軌道 ${n}` })
    },

    removeTrack(id: string): void {
      this.tracks = this.tracks.filter(t => t.id !== id)
    },

    renameTrack(id: string, name: string): void {
      const track = this.tracks.find(t => t.id === id)
      if (track) track.name = name
    },
  },
})
