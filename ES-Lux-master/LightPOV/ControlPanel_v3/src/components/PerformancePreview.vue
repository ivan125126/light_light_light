<template>
  <div class="performance_preview">
    <div class="preview_multi" :style="gridStyle">
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
import { ref, computed, watch, watchEffect, onUnmounted, type CSSProperties } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useHardwareStore } from '../stores/hardwareStore'
import { useTimelineStore } from '../stores/timelineStore'
import { instanceToEffectData } from '../services/serializer'
import { pushLiveEffect, stopLiveEffect } from '../services/hardwareService'
import type { EffectData, LuxUnit } from '../types'

type PreviewEl = { updateData: (data: EffectData) => void }

const ZERO_CH = { func: 0 as const, range: 0, lower: 0, p1: 0, p2: 0 }
const CLEAR_EFFECT_DATA: EffectData = {
  mode: 'MODES_CLEAR', start_time: 0, duration: 0,
  XH: ZERO_CH, XS: ZERO_CH, XV: ZERO_CH,
  YH: ZERO_CH, YS: ZERO_CH, YV: ZERO_CH,
  p1: 0, p2: 0, p3: 0, p4: 0,
}

const effectStore = useEffectStore()
const hardwareStore = useHardwareStore()
const timelineStore = useTimelineStore()
const previewRefs = ref<(PreviewEl | null)[]>([])

function gridLayout(n: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 }
  if (n <= 2) return { cols: 2, rows: 1 }
  if (n <= 4) return { cols: 2, rows: 2 }
  if (n <= 6) return { cols: 3, rows: 2 }
  if (n <= 9) return { cols: 3, rows: 3 }
  return { cols: 4, rows: Math.ceil(n / 4) }
}

const gridStyle = computed((): CSSProperties => {
  const { cols, rows } = gridLayout(hardwareStore.units.length)
  return { '--grid-cols': String(cols), '--grid-rows': String(rows) } as CSSProperties
})

// Reset refs array when unit count changes to avoid index drift
watch(() => hardwareStore.units.length, () => {
  previewRefs.value = []
  activeInstanceIds.value = []
})

// 記錄每個 slot 目前播放的 instance id
const activeInstanceIds = ref<(string | null)[]>([])

// Effect 1: 偵測 globalTime 跨越效果邊界 → 只在 instance 切換時呼叫 updateData
watchEffect(() => {
  hardwareStore.units.forEach((unit, i) => {
    if (unit.trackIndex === null) {
      activeInstanceIds.value[i] = null
      return
    }
    const time = timelineStore.globalTime
    const instance = effectStore.instances.find(
      inst => inst.trackIndex === unit.trackIndex &&
               inst.startTime <= time && time < inst.startTime + inst.duration
    ) ?? null

    const newId = instance?.id ?? null
    if (newId === activeInstanceIds.value[i]) return  // 同一個 instance，RAF 自己在跑

    activeInstanceIds.value[i] = newId
    const el = previewRefs.value[i]
    if (!el?.updateData) return
    if (!instance) {
      el.updateData(CLEAR_EFFECT_DATA)
      if (hardwareStore.liveHardware) pushLiveEffect(CLEAR_EFFECT_DATA)
      return
    }
    const def = effectStore.getDefinition(instance.definitionName)
    const effectData = def ? instanceToEffectData(instance, def.mode) : CLEAR_EFFECT_DATA
    el.updateData(effectData)
    // Note: pushLiveEffect broadcasts to all hardware — last unit's effect wins.
    // This matches V2 live-mode behavior (broadcast test mode).
    // Per-unit addressing requires server-side changes.
    if (hardwareStore.liveHardware) pushLiveEffect(effectData)
  })
})

// Effect 2: 偵測 params 變更（ParameterPanel 編輯時）→ 對目前活躍的 instance 重新計算
watch(
  () => effectStore.instances,
  (instances) => {
    hardwareStore.units.forEach((unit, i) => {
      const id = activeInstanceIds.value[i]
      if (!id) return
      const instance = instances.find(inst => inst.id === id)
      if (!instance) return
      const el = previewRefs.value[i]
      if (!el?.updateData) return
      const def = effectStore.getDefinition(instance.definitionName)
      if (!def) return
      const effectData = instanceToEffectData(instance, def.mode)
      el.updateData(effectData)
      if (hardwareStore.liveHardware) pushLiveEffect(effectData)
    })
  },
  { deep: true }
)

watch(() => hardwareStore.liveHardware, val => {
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
  if (hardwareStore.liveHardware) stopLiveEffect()
  previewRefs.value = []
})
</script>
