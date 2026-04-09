import { defineStore } from 'pinia'
import type { ProjectFile, ProjectFileV2, ProjectTrack, EffectLibraryFile, EffectInstance } from '../types'
import { tracksToEffectMap } from '../services/serializer'
import { useEffectStore } from './effectStore'
import { useTimelineStore } from './timelineStore'
import { useAudioStore } from './audioStore'
import { useHardwareStore } from './hardwareStore'

const LS_KEY = 'cp_v3_project'

interface ProjectState {
  projectName: string
  musicFile: string | null
  isDirty: boolean
  lastSavedAt: Date | null
}

export const useProjectStore = defineStore('project', {
  state: (): ProjectState => ({
    projectName: '新專案',
    musicFile: null,
    isDirty: false,
    lastSavedAt: null,
  }),

  actions: {
    markDirty(): void {
      this.isDirty = true
    },

    toProjectFile(): ProjectFile {
      const effectStore = useEffectStore()
      const timelineStore = useTimelineStore()
      const hardwareStore = useHardwareStore()

      const tracks: ProjectTrack[] = timelineStore.tracks.map((track, idx) => ({
        id: track.id,
        name: track.name,
        deviceIndices: track.deviceIndices,
        effects: effectStore.instances
          .filter(i => i.trackIndex === idx)
          .map(({ id, definitionName, startTime, duration, params }) => ({
            id, definitionName, startTime, duration, params,
          })),
      }))

      return {
        version: '3.0',
        name: this.projectName,
        musicFile: this.musicFile,
        tracks,
        luxUnits: hardwareStore.units.map(({ id, trackIndex }) => ({ id, trackIndex })),
      }
    },

    toLibraryFile(): EffectLibraryFile {
      const effectStore = useEffectStore()
      return {
        version: '2.0',
        definitions: effectStore.customDefinitions,
      }
    },

    loadProject(projectFile: ProjectFile | ProjectFileV2, libraryFile?: EffectLibraryFile): void {
      const effectStore = useEffectStore()
      const timelineStore = useTimelineStore()
      const audioStore = useAudioStore()

      let instances: EffectInstance[]
      let tracks: Parameters<typeof timelineStore.loadTracks>[0]

      if (projectFile.version === '2.0') {
        // Legacy: flat instances with trackIndex — derive tracks from highest index used
        instances = projectFile.timeline.instances
        const maxTrack = instances.length > 0
          ? Math.max(...instances.map(i => i.trackIndex))
          : 0
        tracks = Array.from({ length: maxTrack + 1 }, (_, i) => ({
          id: `track-${i}`,
          name: `軌道 ${i + 1}`,
          deviceIndices: [i],
        }))
      } else {
        // v3.0: nested structure
        tracks = projectFile.tracks.map(t => ({
          id: t.id,
          name: t.name,
          deviceIndices: t.deviceIndices,
        }))
        instances = projectFile.tracks.flatMap((track, idx) =>
          track.effects.map(e => ({ ...e, trackIndex: idx }))
        )
      }

      timelineStore.loadTracks(tracks, tracks.length + 1)
      effectStore.loadFromProject(instances, libraryFile?.definitions ?? [])
      this.projectName = projectFile.name
      this.musicFile = projectFile.musicFile

      if (!audioStore.hasAudio) {
        const lastEnd = instances.length > 0
          ? Math.max(...instances.map(i => i.startTime + i.duration))
          : 0
        timelineStore.setTotalDuration(Math.max(lastEnd, 60_000))
      }

      this.isDirty = false
      this.lastSavedAt = null

      const hardwareStore = useHardwareStore()
      if (projectFile.version === '3.0' && projectFile.luxUnits) {
        // Restore units from saved mapping; clear existing units first
        hardwareStore.units = projectFile.luxUnits.map(u => ({
          id: u.id,
          connected: false,
          trackIndex: u.trackIndex,
        }))
      }
    },

    autoSave(): void {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this.toProjectFile()))
      } catch {
        // storage full or unavailable — silently ignore
      }
    },

    restoreFromLocalStorage(): boolean {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return false
      try {
        const projectFile = JSON.parse(raw) as ProjectFile | ProjectFileV2
        this.loadProject(projectFile)
        return true
      } catch {
        return false
      }
    },

    async pushToServer(): Promise<void> {
      const effectStore = useEffectStore()
      const timelineStore = useTimelineStore()
      const projectFile = this.toProjectFile()
      const effectMap = tracksToEffectMap(
        projectFile.tracks,
        effectStore.definitions,
        timelineStore.totalDuration
      )
      console.log(`EffectMap updated: ${effectMap} device(s)`)
      await fetch('/push_effect_map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(effectMap),
      })
    },

    downloadProjectFile(): void {
      const data = this.toProjectFile()
      this._downloadJson(data, `${this.projectName}_project.json`)
    },

    downloadLibraryFile(): void {
      const data = this.toLibraryFile()
      this._downloadJson(data, `${this.projectName}_effect_library.json`)
    },

    _downloadJson(data: unknown, filename: string): void {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      this.isDirty = false
      this.lastSavedAt = new Date()
    },
  },
})
