<template>
  <div class="app-wrapper" :class="{ resizing: activeResize !== null }">
    <!-- ── Toolbar ── -->
    <header class="toolbar">
      <span
        v-if="!editingProjectName"
        class="project-name"
        @dblclick="startEditProjectName"
      >{{ projectStore.projectName }}</span>
      <input
        v-else
        ref="projectNameInputRef"
        class="project-name-input"
        :value="editingProjectNameValue"
        @input="editingProjectNameValue = ($event.target as HTMLInputElement).value"
        @blur="finishEditProjectName"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
        @keydown.esc="editingProjectName = false"
      />
      <span v-if="projectStore.isDirty" class="dirty-indicator">●</span>
      <span class="server-status" :class="hardwareStore.serverOnline ? 'online' : 'offline'">
        ● {{ hardwareStore.serverOnline ? 'Server 已連線' : 'Server 未連線' }}
      </span>
      <button @click="saveProject">儲存專案</button>
      <button @click="loadProjectDialog">載入專案</button>
      <button @click="projectStore.downloadLibraryFile()">匯出效果庫</button>
      <label class="btn">
        匯入效果庫
        <input type="file" accept=".json" hidden @change="importLibrary" />
      </label>
      <label class="live_hw_label">
        <input type="checkbox" class="live_hw_check" v-model="hardwareStore.liveHardware" />
        推播硬體
      </label>
    </header>

    <!-- ── 上半：三欄（素材庫 | 預覽 | 參數） ── -->
    <div class="top-section" :style="{ height: topHeight + 'px' }">

      <aside class="panel panel-left" :style="{ width: leftWidth + 'px' }">
        <AssetLibrary />
      </aside>

      <!-- 左垂直分隔線 -->
      <div class="resize-handle resize-handle--v" @mousedown="startResize('left', $event)"></div>

      <main class="panel panel-center">
        <PreviewPanel />
      </main>

      <!-- 右垂直分隔線 -->
      <div class="resize-handle resize-handle--v" @mousedown="startResize('right', $event)"></div>

      <aside class="panel panel-right" :style="{ width: rightWidth + 'px' }">
        <ParameterPanel />
      </aside>
    </div>

    <!-- ── 水平分隔線 ── -->
    <div class="resize-handle resize-handle--h" @mousedown="startResize('top', $event)"></div>

    <!-- ── 下半：Timeline ── -->
    <section class="timeline-section">
      <TimelinePanel />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from './stores/projectStore'
import { useEffectStore } from './stores/effectStore'
import { useTimelineStore } from './stores/timelineStore'
import { useHardwareStore } from './stores/hardwareStore'
import AssetLibrary from './components/AssetLibrary.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ParameterPanel from './components/ParameterPanel.vue'
import type { ProjectFile, EffectLibraryFile } from './types'

const projectStore   = useProjectStore()
const effectStore    = useEffectStore()
const timelineStore  = useTimelineStore()
const hardwareStore  = useHardwareStore()

// ── 面板尺寸狀態 ────────────────────────────────────────
const leftWidth  = ref(260)
const rightWidth = ref(320)
const topHeight  = ref(480)

type ResizeTarget = 'left' | 'right' | 'top'
const activeResize = ref<ResizeTarget | null>(null)
let resizeStartX = 0
let resizeStartY = 0
let resizeStartValue = 0

function startResize(target: ResizeTarget, e: MouseEvent) {
  activeResize.value = target
  resizeStartX = e.clientX
  resizeStartY = e.clientY
  resizeStartValue = target === 'left'  ? leftWidth.value
                   : target === 'right' ? rightWidth.value
                                        : topHeight.value
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!activeResize.value) return
  if (activeResize.value === 'left') {
    const dx = e.clientX - resizeStartX
    leftWidth.value = Math.max(160, Math.min(500, resizeStartValue + dx))
  } else if (activeResize.value === 'right') {
    const dx = e.clientX - resizeStartX
    rightWidth.value = Math.max(200, Math.min(560, resizeStartValue - dx))
  } else {
    const dy = e.clientY - resizeStartY
    topHeight.value = Math.max(160, Math.min(window.innerHeight * 0.82, resizeStartValue + dy))
  }
}

function onMouseUp() {
  activeResize.value = null
}

// Auto-save to localStorage on any effect or track change
watch(
  [() => effectStore.instances, () => timelineStore.tracks],
  () => { projectStore.autoSave() },
  { deep: true }
)

onMounted(() => {
  projectStore.restoreFromLocalStorage()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  hardwareStore.startServerPolling()
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  hardwareStore.stopServerPolling()
})

// ── 專案名稱 inline 編輯 ────────────────────────────────
const editingProjectName = ref(false)
const editingProjectNameValue = ref('')
const projectNameInputRef = ref<HTMLInputElement | null>(null)

function startEditProjectName() {
  editingProjectNameValue.value = projectStore.projectName
  editingProjectName.value = true
  nextTick(() => projectNameInputRef.value?.select())
}

function finishEditProjectName() {
  const name = editingProjectNameValue.value.trim()
  if (name) projectStore.projectName = name
  editingProjectName.value = false
}

// ── 專案操作 ────────────────────────────────────────────
function saveProject() {
  projectStore.downloadProjectFile()
}

async function loadProjectDialog() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.click()
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const projectFile = JSON.parse(await file.text()) as ProjectFile
    projectStore.loadProject(projectFile)
  }
}

async function importLibrary(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const libraryFile: EffectLibraryFile = JSON.parse(await file.text())
  libraryFile.definitions.forEach(def => {
    try { effectStore.addCustomDefinition({ ...def, isBuiltIn: false }) } catch { /* skip duplicates */ }
  })
}
</script>

<style scoped>
.server-status {
  font-size: 0.8rem;
  margin-right: 12px;
  user-select: none;
}
.server-status.online  { color: #4caf50; }
.server-status.offline { color: #f44336; opacity: 0.7; }
</style>
