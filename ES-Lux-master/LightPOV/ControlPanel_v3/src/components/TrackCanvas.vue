<template>
  <canvas :id="`track-canvas-${trackIndex}`" class="asset_canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import * as fabric from 'fabric'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import EffectBlock from '../lib/EffectBlock'

const props = defineProps<{ trackIndex: number }>()
const effectStore = useEffectStore()
const timelineStore = useTimelineStore()
let canvas: fabric.Canvas | null = null

onMounted(() => {
  canvas = new fabric.Canvas(`track-canvas-${props.trackIndex}`, {
    selection: false,
    height: 40,
    backgroundColor: '#333',
  })

  // Drop handler
  const wrapperEl = canvas.getElement().parentElement
  wrapperEl?.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault()
    const definitionName = e.dataTransfer?.getData('text/plain')
    if (!definitionName || !canvas) return

    const dropX = e.offsetX
    const startTime = timelineStore.pixelToMs(dropX)
    const duration = 3000  // default 3 seconds

    const id = effectStore.addInstance(definitionName, startTime, duration, props.trackIndex)
    const block = new EffectBlock(id, definitionName, canvas)
    block.startTime = startTime
    block.duration = duration
    block.render()
  })

  wrapperEl?.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault()
  })
})

onUnmounted(() => {
  canvas?.dispose()
})
</script>
