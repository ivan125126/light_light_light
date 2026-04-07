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

  it('returns null when no effect is active at current time', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(5000)
    effectStore.addInstance('純色', 0, 3000, 0)  // track 0, 0–3000ms
    const effectData = useActiveEffect(() => 0)
    expect(effectData.value).toBeNull()  // 5000 > 3000
  })

  it('returns EffectData when an effect covers current time', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(1000)
    effectStore.addInstance('純色', 0, 3000, 0)  // track 0, 0–3000ms
    const effectData = useActiveEffect(() => 0)
    expect(effectData.value).not.toBeNull()
    expect(effectData.value?.mode).toBe('MODES_PLAIN')
  })

  it('returns null when trackIndex does not match any instance', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(1000)
    effectStore.addInstance('純色', 0, 3000, 0)  // track 0
    const effectData = useActiveEffect(() => 1)  // asking for track 1
    expect(effectData.value).toBeNull()
  })
})
