<template>
  <div class="performance_preview">
    <div class="preview_toolbar">
      <label class="live_hw_label">
        <input type="checkbox" v-model="liveHardware" class="live_hw_check" />
        推播硬體
      </label>
    </div>

    <div class="preview_multi">
      <div
        v-for="(unit, i) in hardwareStore.units"
        :key="unit.id"
        class="preview_lux_slot"
      >
        <pre-view
          :ref="el => { if (el) previewRefs[i] = el as PreviewEl }"
          :id="`perf_preview_lux_${unit.id}`"
          :speed="60"
        />
        <span class="preview_lux_label">Lux {{ unit.id }}</span>
        <span class="preview_lux_effect">{{ unitEffectName(unit) }}</span>
        <span class="preview_lux_status" :class="unit.connected ? 'connected' : 'disconnected'">
          {{ unit.connected ? '● 已連線' : '○ 斷線' }}
        </span>
      </div>
      <div v-if="hardwareStore.units.length === 0" class="preview_empty">
        尚未新增 Lux 裝置
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect, onUnmounted } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useHardwareStore } from '../stores/hardwareStore'
import { useTimelineStore } from '../stores/timelineStore'
import { instanceToEffectData } from '../services/serializer'
import { pushLiveEffect, stopLiveEffect } from '../services/hardwareService'
import type { EffectData, LuxUnit } from '../types'

type PreviewEl = { updateData: (data: EffectData) => void }

const effectStore = useEffectStore()
const hardwareStore = useHardwareStore()
const timelineStore = useTimelineStore()
const liveHardware = ref(false)
const previewRefs = ref<(PreviewEl | null)[]>([])

// Reset refs array when unit count changes to avoid index drift
watch(() => hardwareStore.units.length, () => {
  previewRefs.value = []
})

// Drive each Lux preview from globalTime + effectStore (avoids reactivity bug
// of calling composables inside computed)
watchEffect(() => {
  hardwareStore.units.forEach((unit, i) => {
    const el = previewRefs.value[i]
    if (!el?.updateData || unit.trackIndex === null) return
    const time = timelineStore.globalTime
    const instance = effectStore.instances.find(
      inst => inst.trackIndex === unit.trackIndex &&
               inst.startTime <= time && time < inst.startTime + inst.duration
    )
    if (!instance) return
    const def = effectStore.getDefinition(instance.definitionName)
    if (!def) return
    const effectData = instanceToEffectData(instance, def.mode)
    el.updateData(effectData)
    // Note: pushLiveEffect broadcasts to all hardware — last unit's effect wins.
    // This matches V2 live-mode behavior (broadcast test mode).
    // Per-unit addressing requires server-side changes.
    if (liveHardware.value) pushLiveEffect(effectData)
  })
})

watch(liveHardware, val => {
  if (!val) stopLiveEffect()
})

function unitEffectName(unit: LuxUnit): string {
  if (unit.trackIndex === null) return '--'
  const time = timelineStore.globalTime
  const instance = effectStore.instances.find(
    i => i.trackIndex === unit.trackIndex! &&
         i.startTime <= time &&
         time < i.startTime + i.duration
  )
  return instance?.definitionName ?? '--'
}

onUnmounted(() => {
  if (liveHardware.value) stopLiveEffect()
  previewRefs.value = []
})
</script>
