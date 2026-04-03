<template>
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
</template>

<script setup lang="ts">
import AssetLibrary from './components/AssetLibrary.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ParameterPanel from './components/ParameterPanel.vue'
</script>
