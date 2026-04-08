import { computed, type ComputedRef } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { instanceToEffectData } from '../services/serializer'
import type { EffectData, HsvChannel } from '../types'

const ZERO_CHANNEL: HsvChannel = { func: 0, range: 0, lower: 0, p1: 0, p2: 0 }

function makeClearEffectData(time: number): EffectData {
  return {
    mode: 'MODES_CLEAR',
    start_time: time,
    duration: 0,
    XH: ZERO_CHANNEL, XS: ZERO_CHANNEL, XV: ZERO_CHANNEL,
    YH: ZERO_CHANNEL, YS: ZERO_CHANNEL, YV: ZERO_CHANNEL,
    p1: 0, p2: 0, p3: 0, p4: 0,
  }
}

/**
 * Returns a computed EffectData for the effect active on the given track
 * at the current timelineStore.globalTime.
 * Returns MODES_CLEAR if no effect covers that time (empty space on track).
 * Returns null only if trackIndex is null (no track assigned).
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
    if (!instance) return makeClearEffectData(time)

    const def = effectStore.getDefinition(instance.definitionName)
    if (!def) return makeClearEffectData(time)

    return instanceToEffectData(instance, def.mode)
  })
}
