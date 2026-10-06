// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useActiveEffect } from '../composables/useActiveEffect'
import type { EffectParams } from '../types'

const BLANK_CHANNEL = { func: 1 as const, range: 0, lower: 0, p1: 128, p2: 0 }
const BLANK_PARAMS: EffectParams = {
  XH: BLANK_CHANNEL, XS: BLANK_CHANNEL, XV: BLANK_CHANNEL,
  YH: BLANK_CHANNEL, YS: BLANK_CHANNEL, YV: BLANK_CHANNEL,
  extra: { bladeCount: 0, length: 0, curvature: 0, boxsize: 0, space: 0, reverse: 0, positionFix: 0 },
}

describe('useActiveEffect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns null when trackIndex is null', () => {
    const effectData = useActiveEffect(() => null)
    expect(effectData.value).toBeNull()
  })

  it('returns CLEAR when no effect is active at current time', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(5000)
    effectStore.addInstance('Plain', 0, 3000, 0)  // track 0, 0–3000ms
    const effectData = useActiveEffect(() => 0)
    expect(effectData.value).not.toBeNull()
    expect(effectData.value?.mode).toBe('MODES_CLEAR')
  })

  it('returns EffectData when an effect covers current time', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(1000)
    effectStore.addInstance('Plain', 0, 3000, 0)  // track 0, 0–3000ms
    const effectData = useActiveEffect(() => 0)
    expect(effectData.value).not.toBeNull()
    expect(effectData.value?.mode).toBe('MODES_PLAIN')
  })

  it('returns CLEAR when trackIndex has no instances', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(1000)
    effectStore.addInstance('Plain', 0, 3000, 0)  // only track 0
    const effectData = useActiveEffect(() => 1)   // track 1 has nothing
    expect(effectData.value).not.toBeNull()
    expect(effectData.value?.mode).toBe('MODES_CLEAR')
  })
})
