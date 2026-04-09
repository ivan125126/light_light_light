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
        :class="{ active: effectStore.previewDefinitionName === def.name }"
        draggable="true"
        @dragstart="onDragStart($event, def.name)"
        @click="selectDefinition(def.name)"
      >
        {{ def.name }}
      </div>
    </div>

    <!-- 自訂效果 -->
    <div v-show="activeTab === 'custom'" class="Asset_library_content custom">
      <button class="add-custom-btn" @click="openAddDialog">+ 新增效果</button>
      <div
        v-for="def in customDefs"
        :key="def.name"
        class="asset_item"
        :class="{ active: effectStore.previewDefinitionName === def.name }"
        draggable="true"
        @dragstart="onDragStart($event, def.name)"
        @click="selectDefinition(def.name)"
      >
        {{ def.name }}
      </div>
    </div>

    <!-- 新增效果 Dialog -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-box">
        <div class="dialog-title">新增自定義效果</div>

        <label class="dialog-label">效果名稱</label>
        <input
          ref="nameInputRef"
          v-model.trim="dialogName"
          class="dialog-input"
          type="text"
          placeholder="請輸入名稱"
          @keydown.enter="confirmAdd"
          @keydown.esc="closeDialog"
        />

        <label class="dialog-label">效果模式</label>
        <select v-model="dialogMode" class="dialog-select">
          <option v-for="m in ALL_MODES" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>

        <label class="dialog-checkbox-row" v-if="effectStore.selectedInstance">
          <input type="checkbox" v-model="dialogCopyParams" />
          <span>複製目前選取效果的參數</span>
        </label>

        <div v-if="dialogError" class="dialog-error">{{ dialogError }}</div>

        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn--cancel" @click="closeDialog">取消</button>
          <button class="dialog-btn dialog-btn--confirm" @click="confirmAdd">確定新增</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import type { EffectMode } from '../types'
import { defaultEffectParams } from '../constants/effectConfig'

const effectStore = useEffectStore()
const timelineStore = useTimelineStore()
const activeTab = ref('preset')

const builtInDefs = computed(() => effectStore.definitions.filter(d => d.isBuiltIn))
const customDefs  = computed(() => effectStore.definitions.filter(d => !d.isBuiltIn))

function onDragStart(event: DragEvent, definitionName: string) {
  event.dataTransfer?.setData('text/plain', definitionName)
}

function selectDefinition(name: string) {
  // 點擊效果庫時暫停 timeline，避免兩個 watchEffect 同時驅動 pre-view 造成卡頓
  if (timelineStore.isPlaying) timelineStore.setPlaying(false)
  // 清除 timeline 選取，讓 param panel 切換至 definition 模式
  effectStore.selectInstance(null)
  // Toggle: clicking the active preview item again clears it (returns to multi-Lux view)
  effectStore.setPreviewDefinition(
    effectStore.previewDefinitionName === name ? null : name
  )
}

function removeCustom(name: string) {
  effectStore.removeCustomDefinition(name)
}

// ── 新增效果 Dialog ────────────────────────────────────────
const ALL_MODES: { value: EffectMode; label: string }[] = [
  { value: 'MODES_PLAIN',      label: '純色 (PLAIN)' },
  { value: 'MODES_SQUARE',     label: '方形 (SQUARE)' },
  { value: 'MODES_SICKLE',     label: '鐮刀 (SICKLE)' },
  { value: 'MODES_FAN',        label: '扇形 (FAN)' },
  { value: 'MODES_BOXES',      label: '方塊 (BOXES)' },
  { value: 'MODES_SICKLE_ADV', label: '鐮刀進階 (SICKLE_ADV)' },
  { value: 'MODES_FAN_ADV',    label: '扇形進階 (FAN_ADV)' },
  { value: 'MODES_CMAP_DNA',   label: 'DNA' },
  { value: 'MODES_CMAP_FIRE',  label: '火焰 (FIRE)' },
  { value: 'MODES_CMAP_LOVE',  label: 'Love' },
  { value: 'MODES_CMAP_GEAR',  label: '齒輪 (GEAR)' },
  { value: 'MODES_CMAP_YEN',   label: 'OT' },
  { value: 'MODES_CMAP_BENSON',label: 'PT' },
  { value: 'MODES_MAP_ES',     label: 'ES' },
  { value: 'MODES_MAP_ES_ZH',  label: '工科' },
  { value: 'MODES_MAP_ESXOPT', label: 'ESXOPT' },
  { value: 'MODES_CLEAR',      label: '清除 (CLEAR)' },
]

const showAddDialog = ref(false)
const dialogName = ref('')
const dialogMode = ref<EffectMode>('MODES_PLAIN')
const dialogCopyParams = ref(false)
const dialogError = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

function openAddDialog() {
  dialogName.value = ''
  dialogMode.value = 'MODES_PLAIN'
  dialogCopyParams.value = !!effectStore.selectedInstance
  dialogError.value = ''
  showAddDialog.value = true
  nextTick(() => nameInputRef.value?.focus())
}

function closeDialog() {
  showAddDialog.value = false
}

function confirmAdd() {
  const name = dialogName.value
  if (!name) { dialogError.value = '請輸入效果名稱'; return }
  if (effectStore.definitions.some(d => d.name === name)) {
    dialogError.value = `「${name}」已存在，請使用其他名稱`
    return
  }

  const baseParams = dialogCopyParams.value && effectStore.selectedInstance
    ? JSON.parse(JSON.stringify(effectStore.selectedInstance.params))
    : defaultEffectParams()

  effectStore.addCustomDefinition({
    name,
    mode: dialogMode.value,
    isBuiltIn: false,
    defaultParams: baseParams,
    extraParamSchema: {},
  })

  closeDialog()
  activeTab.value = 'custom'
}
</script>
