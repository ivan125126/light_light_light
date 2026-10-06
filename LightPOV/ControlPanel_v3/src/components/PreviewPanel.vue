<template>
  <div class="preview_panel">
    <div class="preview_toolbar">
      <label class="mode_toggle_label">
        <span :class="{ active: mode === 'edit' }">Edit</span>
        <input
          type="checkbox"
          class="mode_toggle_check"
          :checked="mode === 'performance'"
          @change="mode = ($event.target as HTMLInputElement).checked ? 'performance' : 'edit'"
        />
        <span :class="{ active: mode === 'performance' }">Perform</span>
      </label>
    </div>

    <EditPreview v-if="mode === 'edit'" />
    <PerformancePreview v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EditPreview from './EditPreview.vue'
import PerformancePreview from './PerformancePreview.vue'

const mode = ref<'edit' | 'performance'>('edit')
</script>
