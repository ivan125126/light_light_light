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
import { ref, watch } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { instanceToEffectData } from '../services/serializer'

const effectStore = useEffectStore()
const previewRef = ref<HTMLElement | null>(null)

// 每次選中效果或參數改變，自動更新預覽
watch(
  () => effectStore.selectedInstance,
  (instance) => {
    const el = previewRef.value as Record<string, unknown> | null
    if (!el?.updateData || !instance) return
    const def = effectStore.getDefinition(instance.definitionName)
    if (!def) return
    const effectData = instanceToEffectData(instance, def.mode)
    ;(el.updateData as (data: unknown) => void)(effectData)
  },
  { deep: true }
)
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
