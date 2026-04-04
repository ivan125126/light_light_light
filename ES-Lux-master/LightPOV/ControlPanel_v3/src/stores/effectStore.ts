import { defineStore } from 'pinia'
import type { EffectInstance, EffectDefinition } from '../types'
import { BUILT_IN_DEFINITIONS } from '../constants/effectDefinitions'
import { defaultEffectParams } from '../constants/effectConfig'

interface EffectState {
  definitions: EffectDefinition[]
  instances: EffectInstance[]
  selectedInstanceId: string | null
  previewDefinitionName: string | null
}

export const useEffectStore = defineStore('effect', {
  state: (): EffectState => ({
    definitions: [...BUILT_IN_DEFINITIONS],
    instances: [],
    selectedInstanceId: null,
    previewDefinitionName: null,
  }),

  getters: {
    selectedInstance: (state): EffectInstance | null =>
      state.instances.find(i => i.id === state.selectedInstanceId) ?? null,

    getDefinition: (state) => (name: string): EffectDefinition | undefined =>
      state.definitions.find(d => d.name === name),

    customDefinitions: (state): EffectDefinition[] =>
      state.definitions.filter(d => !d.isBuiltIn),
  },

  actions: {
    addInstance(
      definitionName: string,
      startTime: number,
      duration: number,
      trackIndex: number
    ): string {
      const def = this.definitions.find(d => d.name === definitionName)
      if (!def) throw new Error(`Definition not found: ${definitionName}`)

      const id = `effect_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const instance: EffectInstance = {
        id,
        definitionName,
        trackIndex,
        startTime,
        duration,
        params: JSON.parse(JSON.stringify(def.defaultParams)),
      }
      this.instances.push(instance)
      return id
    },

    updateInstance(id: string, patch: Partial<Omit<EffectInstance, 'id'>>): void {
      const idx = this.instances.findIndex(i => i.id === id)
      if (idx === -1) throw new Error(`Instance not found: ${id}`)
      this.instances[idx] = { ...this.instances[idx], ...patch }
    },

    removeInstance(id: string): void {
      this.instances = this.instances.filter(i => i.id !== id)
      if (this.selectedInstanceId === id) this.selectedInstanceId = null
    },

    selectInstance(id: string | null): void {
      this.selectedInstanceId = id
    },

    setPreviewDefinition(name: string | null): void {
      this.previewDefinitionName = name
    },

    addCustomDefinition(def: EffectDefinition): void {
      if (def.isBuiltIn) throw new Error('Cannot add definition with isBuiltIn=true')
      if (this.definitions.some(d => d.name === def.name)) {
        throw new Error(`Definition already exists: ${def.name}`)
      }
      this.definitions.push(def)
    },

    removeCustomDefinition(name: string): void {
      const def = this.definitions.find(d => d.name === name)
      if (!def) throw new Error(`Definition not found: ${name}`)
      if (def.isBuiltIn) throw new Error(`Cannot remove built-in definition: ${name}`)
      this.definitions = this.definitions.filter(d => d.name !== name)
    },

    loadFromProject(
      instances: EffectInstance[],
      customDefinitions: EffectDefinition[]
    ): void {
      this.instances = instances
      this.definitions = [
        ...BUILT_IN_DEFINITIONS,
        ...customDefinitions.map(d => ({ ...d, isBuiltIn: false })),
      ]
      this.selectedInstanceId = null
    },

    clear(): void {
      this.instances = []
      this.definitions = [...BUILT_IN_DEFINITIONS]
      this.selectedInstanceId = null
    },
  },
})
