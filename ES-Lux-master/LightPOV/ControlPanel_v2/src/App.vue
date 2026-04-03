<template>
  <div class="app-wrapper">
    <!-- Toolbar -->
    <header class="toolbar">
      <span class="project-name">{{ projectStore.projectName }}</span>
      <span v-if="projectStore.isDirty" class="dirty-indicator">●</span>
      <button @click="saveProject">儲存專案</button>
      <button @click="loadProjectDialog">載入專案</button>
      <button @click="projectStore.downloadLibraryFile()">匯出效果庫</button>
      <label class="btn">
        匯入效果庫
        <input type="file" accept=".json" hidden @change="importLibrary" />
      </label>
    </header>

    <!-- Main layout -->
    <div class="app-layout">
      <aside class="panel-left">
        <AssetLibrary />
      </aside>
      <main class="panel-center">
        <TimelinePanel />
      </main>
      <aside class="panel-right">
        <PreviewPanel />
        <ParameterPanel />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProjectStore } from './stores/projectStore'
import { useEffectStore } from './stores/effectStore'
import AssetLibrary from './components/AssetLibrary.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ParameterPanel from './components/ParameterPanel.vue'
import type { ProjectFile, EffectLibraryFile } from './types'

const projectStore = useProjectStore()
const effectStore  = useEffectStore()

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
    const projectFile: ProjectFile = JSON.parse(await file.text())
    projectStore.loadProject(projectFile, { version: '2.0', definitions: [] })
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
