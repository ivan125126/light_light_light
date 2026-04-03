<template>
  <div class="Asset_library">
    <!-- 頁籤 -->
    <div class="Asset_library_header">
      <button
        v-for="tab in ['preset', 'custom']"
        :key="tab"
        class="tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'preset' ? '預設效果' : '自定義' }}
      </button>
    </div>

    <!-- 內建效果 -->
    <div v-show="activeTab === 'preset'" class="Asset_library_content preset">
      <div
        v-for="def in builtInDefs"
        :key="def.name"
        class="asset_item"
        draggable="true"
        @dragstart="onDragStart($event, def.name)"
      >
        {{ def.name }}
      </div>
    </div>

    <!-- 自訂效果 -->
    <div v-show="activeTab === 'custom'" class="Asset_library_content custom">
      <div
        v-for="def in customDefs"
        :key="def.name"
        class="asset_item"
        draggable="true"
        @dragstart="onDragStart($event, def.name)"
      >
        {{ def.name }}
        <button class="delete-btn" @click.stop="removeCustom(def.name)">×</button>
      </div>
      <button class="add-custom-btn" @click="showAddDialog = true">+ 新增效果</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEffectStore } from '../stores/effectStore'

const effectStore = useEffectStore()
const activeTab = ref('preset')
const showAddDialog = ref(false)

const builtInDefs = computed(() => effectStore.definitions.filter(d => d.isBuiltIn))
const customDefs  = computed(() => effectStore.definitions.filter(d => !d.isBuiltIn))

function onDragStart(event: DragEvent, definitionName: string) {
  event.dataTransfer?.setData('text/plain', definitionName)
}

function removeCustom(name: string) {
  effectStore.removeCustomDefinition(name)
}
</script>
