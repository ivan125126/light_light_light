<template>
  <canvas :id="`track-canvas-${trackIndex}`" class="asset_canvas"></canvas>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import * as fabric from 'fabric'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useSelectionStore } from '../stores/selectionStore'
import { useUndoStore } from '../stores/undoStore'
import { useUiStore } from '../stores/uiStore'
import EffectBlock from '../lib/EffectBlock'

const props = defineProps<{ trackIndex: number }>()
const effectStore = useEffectStore()
const timelineStore = useTimelineStore()
const selectionStore = useSelectionStore()
const undoStore = useUndoStore()
const uiStore = useUiStore()
let canvas: fabric.Canvas | null = null
let resizeObserver: ResizeObserver | null = null
let rafId: number | null = null

// Tracks all EffectBlock objects on this canvas by instance id
const blockMap = new Map<string, EffectBlock>()

// ── Store → Canvas sync ───────────────────────────────────
// Computed slice of effectStore.instances belonging to this track
const trackInstances = computed(() =>
  effectStore.instances.filter(i => i.trackIndex === props.trackIndex)
)

function syncFromStore() {
  if (!canvas) return
  const instances = trackInstances.value
  const storeIds = new Set(instances.map(i => i.id))

  // Remove fabric blocks that no longer exist in the store
  for (const [id, block] of blockMap.entries()) {
    if (!storeIds.has(id)) {
      if (block.fabricGroup) canvas.remove(block.fabricGroup)
      blockMap.delete(id)
    }
  }

  // Add or reconcile fabric blocks
  for (const instance of instances) {
    const existing = blockMap.get(instance.id)
    if (existing) {
      // Reconcile position/size from store (e.g. after undo)
      existing.startTime = instance.startTime
      existing.duration = instance.duration
      existing.reposition()
      existing.fabricGroup?.setCoords()
    } else {
      const block = new EffectBlock(instance.id, instance.definitionName, canvas)
      block.startTime = instance.startTime
      block.duration = instance.duration
      block.render()
      if (uiStore.appMode === 'perform') {
        block.fabricGroup?.set({ evented: false, selectable: false })
      }
      blockMap.set(instance.id, block)
    }
  }

  canvas.requestRenderAll()
}

// Reposition all blocks (e.g. after zoom/pan)
function repositionAll() {
  if (!canvas) return
  canvas.getObjects().forEach(obj => {
    const block = (obj as fabric.Group & { logicBlock?: EffectBlock }).logicBlock
    block?.reposition()
    ;(obj as fabric.Group).setCoords()
  })
  canvas.requestRenderAll()
}

function scheduleReposition() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    repositionAll()
  })
}

watch(
  [() => timelineStore.secondsPerPixel, () => timelineStore.timelineOffset],
  scheduleReposition
)

// Sync canvas whenever this track's instances change (handles load, delete, etc.)
watch(trackInstances, syncFromStore)

watch(
  () => uiStore.appMode,
  (mode) => {
    if (!canvas) return
    const locked = mode === 'perform'
    canvas.getObjects().forEach(obj => {
      obj.set({ evented: !locked, selectable: !locked })
    })
    canvas.requestRenderAll()
  }
)

// Sync highlight state on all blocks whenever the selection changes
watch(
  () => selectionStore.selectedIds,
  (ids) => {
    for (const [id, block] of blockMap.entries()) {
      block.setHighlight(ids.includes(id))
    }
  },
  { deep: true }
)

onMounted(() => {
  const el = document.getElementById(`track-canvas-${props.trackIndex}`) as HTMLCanvasElement
  const containerWidth = el.parentElement?.clientWidth ?? 1200

  canvas = new fabric.Canvas(`track-canvas-${props.trackIndex}`, {
    selection: false,
    width: containerWidth,
    height: 40,
    backgroundColor: '#333',
  })

  // Sync any instances that already exist in store (e.g. after project load)
  syncFromStore()

  // Clear selection when clicking on empty canvas area
  canvas.on('mouse:down', (opt) => {
    if (!opt.target) {
      selectionStore.clear()
      effectStore.selectInstance(null)
    }
  })

  const canvasContainer = canvas.getElement().parentElement
  if (canvasContainer) {
    resizeObserver = new ResizeObserver(entries => {
      const newWidth = entries[0].contentRect.width
      canvas?.setDimensions({ width: newWidth })
      canvas?.requestRenderAll()
    })
    resizeObserver.observe(canvasContainer.parentElement ?? canvasContainer)
  }

  // Drop: only update the store — the watch above handles block creation
  canvasContainer?.addEventListener('drop', (e: DragEvent) => {
    if (uiStore.appMode === 'perform') return
    e.preventDefault()
    e.stopPropagation()
    const definitionName = e.dataTransfer?.getData('text/plain')
    if (!definitionName) return
    const startTime = timelineStore.pixelToMs(e.offsetX)
    undoStore.push()
    effectStore.addInstance(definitionName, startTime, 3000, props.trackIndex)
  })

  canvasContainer?.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault()
  })
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  canvas?.dispose()
  blockMap.clear()
})
</script>
