import { defineStore } from 'pinia'
import type { ProjectFile, EffectLibraryFile } from '../types'
import { useEffectStore } from './effectStore'
import { useTimelineStore } from './timelineStore'
import { useAudioStore } from './audioStore'

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
      return {
        version: '2.0',
        name: this.projectName,
        musicFile: this.musicFile,
        timeline: {
          instances: effectStore.instances,
        },
      }
    },

    toLibraryFile(): EffectLibraryFile {
      const effectStore = useEffectStore()
      return {
        version: '2.0',
        definitions: effectStore.customDefinitions,
      }
    },

    loadProject(projectFile: ProjectFile, libraryFile: EffectLibraryFile): void {
      const effectStore = useEffectStore()
      const timelineStore = useTimelineStore()
      const audioStore = useAudioStore()

      effectStore.loadFromProject(projectFile.timeline.instances, libraryFile.definitions)
      this.projectName = projectFile.name
      this.musicFile = projectFile.musicFile

      if (!audioStore.hasAudio) {
        const lastEnd = Math.max(
          0,
          ...projectFile.timeline.instances.map(i => i.startTime + i.duration)
        )
        timelineStore.setTotalDuration(Math.max(lastEnd, 60_000))
      }

      this.isDirty = false
      this.lastSavedAt = null
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
