import { computed, type ComputedRef } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { instanceToEffectData } from '../services/serializer'
import type { EffectData } from '../types'

/**
 * Returns a computed EffectData for the effect active on the given track
 * at the current timelineStore.globalTime. Returns null if no effect covers
 * that time, the trackIndex is null, or the definition is not found.
 */
export function useActiveEffect(trackIndex: () => number | null): ComputedRef<EffectData | null> {
  const effectStore = useEffectStore()
  const timelineStore = useTimelineStore()

  return computed<EffectData | null>(() => {
    const idx = trackIndex()
    if (idx === null) return null

    const time = timelineStore.globalTime
    const instance = effectStore.instances.find(
      i => i.trackIndex === idx && i.startTime <= time && time < i.startTime + i.duration
    )
    if (!instance) return null

    const def = effectStore.getDefinition(instance.definitionName)
    if (!def) return null

    return instanceToEffectData(instance, def.mode)
  })
}
