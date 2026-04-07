<template>
  <div class="edit_preview">
    <!-- Single-effect smart switch (asset library selection) -->
    <div v-if="isSinglePreview" class="preview_single">
      <pre-view ref="singleRef" id="edit_preview_single" :speed="60" />
    </div>

    <!-- Multi-Lux preview (timeline playback) -->
    <div v-else class="preview_multi">
      <div
        v-for="(unit, i) in hardwareStore.units"
        :key="unit.id"
        class="preview_lux_slot"
        :class="{ highlighted: effectStore.selectedInstanceId !== null && activeInstanceTrack === unit.trackIndex }"
      >
        <pre-view
          :ref="el => { if (el) previewRefs[i] = el as PreviewEl }"
          :id="`edit_preview_lux_${unit.id}`"
          :speed="60"
        />
        <span class="preview_lux_label">Lux {{ unit.id }}</span>
      </div>
      <div v-if="hardwareStore.units.length === 0" class="preview_empty">
        尚未新增 Lux 裝置
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useHardwareStore } from '../stores/hardwareStore'
import { useActiveEffect } from '../composables/useActiveEffect'
import { instanceToEffectData } from '../services/serializer'
import type { EffectData } from '../types'

type PreviewEl = { updateData: (data: EffectData) => void }

const effectStore = useEffectStore()
const hardwareStore = useHardwareStore()

// ── Single-preview (smart switch) ────────────────────────────
const isSinglePreview = computed(() => !!effectStore.previewDefinitionName)

const singleRef = ref<PreviewEl | null>(null)

const singleEffectData = computed<EffectData | null>(() => {
  // Priority 1: asset library preview
  const defName = effectStore.previewDefinitionName
  if (defName) {
    const def = effectStore.getDefinition(defName)
    if (!def) return null
    const instance = {
      id: '__preview__',
      definitionName: def.name,
      trackIndex: 0,
      startTime: 0,
      duration: 10000,
      params: def.defaultParams,
    }
    return instanceToEffectData(instance, def.mode)
  }
  return null
})

watch(singleEffectData, data => {
  if (data && singleRef.value?.updateData) {
    singleRef.value.updateData(data)
  }
}, { deep: true })

// ── Multi-Lux preview (timeline driven) ──────────────────────
const previewRefs = ref<(PreviewEl | null)[]>([])

// Track which track the selected instance belongs to (for highlight)
const activeInstanceTrack = computed(() => {
  const inst = effectStore.selectedInstance
  return inst ? inst.trackIndex : null
})

// Build one computed effectData per unit
const perUnitEffectData = computed(() =>
  hardwareStore.units.map(unit =>
    useActiveEffect(() => unit.trackIndex).value
  )
)

watch(perUnitEffectData, dataArr => {
  dataArr.forEach((data, i) => {
    const el = previewRefs.value[i]
    if (data && el?.updateData) el.updateData(data)
  })
}, { deep: true })

onUnmounted(() => {
  previewRefs.value = []
})
</script>
