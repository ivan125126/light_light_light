<template>
  <div class="preview_panel">
    <pre-view
      ref="previewRef"
      id="live_preview"
      :anime="true"
      :speed="60"
    ></pre-view>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { instanceToEffectData } from '../services/serializer'
import type { EffectInstance } from '../types'

const effectStore = useEffectStore()
const previewRef = ref<HTMLElement | null>(null)

// Resolve what to preview: selected timeline instance takes priority,
// then fall back to the definition clicked in asset library
const previewSource = computed<EffectInstance | null>(() => {
  if (effectStore.selectedInstance) return effectStore.selectedInstance

  const defName = effectStore.previewDefinitionName
  if (!defName) return null
  const def = effectStore.getDefinition(defName)
  if (!def) return null
  // Build a temporary instance from the definition's defaultParams
  return {
    id: '__preview__',
    definitionName: def.name,
    trackIndex: 0,
    startTime: 0,
    duration: 3000,
    params: def.defaultParams,
  }
})

function sendToPreview(instance: EffectInstance | null) {
  const el = previewRef.value as Record<string, unknown> | null
  if (!el?.updateData || !instance) return
  const def = effectStore.getDefinition(instance.definitionName)
  if (!def) return
  const effectData = instanceToEffectData(instance, def.mode)
  ;(el.updateData as (data: unknown) => void)(effectData)
}

watch(previewSource, sendToPreview, { deep: true })
</script>

<script lang="ts">
// 讓 TypeScript 知道 <pre-view> 是有效的自訂元素
declare module 'vue' {
  interface GlobalComponents {
    'pre-view': Record<string, unknown>
  }
}
export default {}
</script>
