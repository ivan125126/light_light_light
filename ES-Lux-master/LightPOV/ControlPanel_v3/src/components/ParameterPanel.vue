<template>
  <div class="param_panel">

    <!-- Tabs -->
    <div class="param_header">
      <button class="param_tab" :class="{ active: activeTab === 'param' }" @click="activeTab = 'param'">參數</button>
      <button class="param_tab" :class="{ active: activeTab === 'control' }" @click="activeTab = 'control'">控制</button>
    </div>

    <!-- ── 參數 tab ───────────────────────────────── -->
    <fieldset v-show="activeTab === 'param'" class="param_body param_body--param" :disabled="isPerform" style="border:none;padding:0;margin:0;">

      <div v-if="!displayParams" class="param_empty">點選 Timeline 上的效果或左側素材庫以查看參數</div>

      <template v-else>
        <div class="param_effect_title">
          {{ displayName }}
          <span v-if="displayKind === 'definition'" class="param_source_hint">（預設值）</span>
        </div>

        <!-- 時間資訊（僅 instance 模式） -->
        <div v-if="displayKind === 'instance'" class="param_group param_timing_group">
          <div class="param_timing_row">
            <span class="param_label">開始時間</span>
            <input
              class="param_timing_input"
              type="number"
              min="0"
              step="0.001"
              :value="(displayInstance!.startTime / 1000).toFixed(3)"
              @change="onStartTimeChange"
            />
            <span class="param_timing_unit">s</span>
          </div>
          <div class="param_timing_row">
            <span class="param_label">持續時間</span>
            <input
              class="param_timing_input"
              type="number"
              min="0.001"
              step="0.001"
              :value="(displayInstance!.duration / 1000).toFixed(3)"
              @change="onDurationChange"
            />
            <span class="param_timing_unit">s</span>
          </div>
        </div>

        <!-- 快速選色 -->
        <div class="param_group color_picker_group">
          <div class="param_label_row">
            <span class="param_label">顏色</span>
            <input type="color" class="color_preview" :value="colorHex" @input="onColorInput" />
          </div>
        </div>

        <!-- 額外幾何參數 -->
        <ExtraParamsGroup
          v-if="definition"
          :schema="definition.extraParamSchema"
          :extra="displayParams.extra"
          @update:extra="updateExtra"
        />

        <!-- HSV 六通道 -->
        <HsvChannelGroup label="XH (色相) °"  :channel="displayParams.XH"
          @update:channel="updateChannel('XH', $event)" />
        <HsvChannelGroup label="XS (飽和) %"  :channel="displayParams.XS"
          @update:channel="updateChannel('XS', $event)" />
        <HsvChannelGroup label="XV (明度) %"  :channel="displayParams.XV"
          @update:channel="updateChannel('XV', $event)" />
        <HsvChannelGroup label="YH (色相) °"  :channel="displayParams.YH"
          @update:channel="updateChannel('YH', $event)" />
        <HsvChannelGroup label="YS (飽和) %"  :channel="displayParams.YS"
          @update:channel="updateChannel('YS', $event)" />
        <HsvChannelGroup label="YV (明度) %"  :channel="displayParams.YV"
          @update:channel="updateChannel('YV', $event)" />

        <!-- 加入自定義素材庫 -->
        <button class="save-custom-btn" @click="saveAsCustom">+ 加入自訂義素材庫</button>

        <!-- 刪除自定義效果（僅自定義效果才顯示） -->
        <button v-if="definition && !definition.isBuiltIn" class="delete-custom-btn" @click="deleteCustom">刪除自定義效果</button>
      </template>
    </fieldset>

    <!-- ── 控制 tab ───────────────────────────────── -->
    <div v-show="activeTab === 'control'" class="param_body param_body--control">
      <ControlPanel :active="activeTab === 'control'" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useUndoStore } from '../stores/undoStore'
import { useUiStore } from '../stores/uiStore'
import HsvChannelGroup from './HsvChannelGroup.vue'
import ExtraParamsGroup from './ExtraParamsGroup.vue'
import ControlPanel from './ControlPanel.vue'
import type { HsvChannel, ExtraParams } from '../types'

const effectStore = useEffectStore()
const undoStore = useUndoStore()
const uiStore = useUiStore()
const activeTab   = ref<'param' | 'control'>('param')

const isPerform = computed(() => uiStore.appMode === 'perform')

// ── 時間輸入處理 ────────────────────────────────────────
function onStartTimeChange(event: Event) {
  const input = event.target as HTMLInputElement
  const inst = effectStore.selectedInstance
  if (!inst) return
  const secs = parseFloat(input.value)
  if (isNaN(secs) || secs < 0) {
    input.value = (inst.startTime / 1000).toFixed(3)
    return
  }
  undoStore.push()
  effectStore.updateInstance(inst.id, { startTime: Math.round(secs * 1000) })
}

function onDurationChange(event: Event) {
  const input = event.target as HTMLInputElement
  const inst = effectStore.selectedInstance
  if (!inst) return
  const secs = parseFloat(input.value)
  if (isNaN(secs) || secs < 0.001) {
    input.value = (inst.duration / 1000).toFixed(3)
    return
  }
  undoStore.push()
  effectStore.updateInstance(inst.id, { duration: Math.round(secs * 1000) })
}

// ── 顯示來源判斷 ────────────────────────────────────────
// 'instance' = 選取 Timeline block；'definition' = 點選素材庫；null = 無選取
const displayKind = computed<'instance' | 'definition' | null>(() => {
  if (effectStore.selectedInstance) return 'instance'
  if (effectStore.previewParams) return 'definition'
  return null
})

const displayParams = computed(() => {
  if (displayKind.value === 'instance') return effectStore.selectedInstance!.params
  if (displayKind.value === 'definition') return effectStore.previewParams
  return null
})

const displayName = computed<string>(() => {
  if (displayKind.value === 'instance') return effectStore.selectedInstance!.definitionName
  if (displayKind.value === 'definition') return effectStore.previewDefinitionName ?? ''
  return ''
})

const definition = computed(() => {
  if (!displayName.value) return undefined
  return effectStore.getDefinition(displayName.value)
})

const displayInstance = computed(() =>
  displayKind.value === 'instance' ? effectStore.selectedInstance : null
)

// ── 參數更新（同時支援 instance 和 definition 模式） ──────────
function updateChannel(key: 'XH'|'XS'|'XV'|'YH'|'YS'|'YV', value: HsvChannel) {
  if (displayKind.value === 'instance') {
    const inst = effectStore.selectedInstance!
    effectStore.updateInstance(inst.id, { params: { ...inst.params, [key]: value } })
  } else if (displayKind.value === 'definition' && effectStore.previewParams) {
    effectStore.setPreviewParams({ ...effectStore.previewParams, [key]: value })
  }
}

function updateExtra(value: ExtraParams) {
  if (displayKind.value === 'instance') {
    const inst = effectStore.selectedInstance!
    effectStore.updateInstance(inst.id, { params: { ...inst.params, extra: value } })
  } else if (displayKind.value === 'definition' && effectStore.previewParams) {
    effectStore.setPreviewParams({ ...effectStore.previewParams, extra: value })
  }
}

// ── 快速選色 ────────────────────────────────────────────
function hsv255ToHex(h: number, s: number, v: number): string {
  const hN = h / 255, sN = s / 255, vN = v / 255
  const i = Math.floor(hN * 6)
  const f = hN * 6 - i
  const p = vN * (1 - sN)
  const q = vN * (1 - f * sN)
  const t = vN * (1 - (1 - f) * sN)
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = vN; g = t;  b = p;  break
    case 1: r = q;  g = vN; b = p;  break
    case 2: r = p;  g = vN; b = t;  break
    case 3: r = p;  g = q;  b = vN; break
    case 4: r = t;  g = p;  b = vN; break
    case 5: r = vN; g = p;  b = q;  break
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToHsv255(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r)      h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else                h = (r - g) / d + 4
    h = h / 6
    if (h < 0) h += 1
  }
  return [Math.round(h * 255), Math.round((max === 0 ? 0 : d / max) * 255), Math.round(max * 255)]
}

const colorHex = computed((): string => {
  if (!displayParams.value) return '#808080'
  const { XH, XS, XV } = displayParams.value
  if (XH.func === 1 && XS.func === 1 && XV.func === 1)
    return hsv255ToHex(XH.p1, XS.p1, XV.p1)
  return '#808080'
})

function onColorInput(event: Event) {
  if (!displayParams.value) return
  const hex = (event.target as HTMLInputElement).value
  const [h, s, v] = hexToHsv255(hex)
  const makeConst = (val: number) => ({ func: 1 as const, range: 0, lower: 0, p1: val, p2: 0 })
  updateChannel('XH', makeConst(h))
  updateChannel('XS', makeConst(s))
  updateChannel('XV', makeConst(v))
}

// ── 刪除自定義效果 ───────────────────────────────────────
function deleteCustom() {
  if (!definition.value || definition.value.isBuiltIn) return
  if (!window.confirm(`確定要刪除「${definition.value.name}」？`)) return
  effectStore.removeCustomDefinition(definition.value.name)
}

// ── 加入自定義素材庫 ─────────────────────────────────────
function saveAsCustom() {
  if (!displayParams.value || !definition.value) return
  const name = window.prompt('請輸入自定義效果名稱：', displayName.value)
  if (!name?.trim()) return
  if (effectStore.definitions.some(d => d.name === name.trim())) {
    window.alert(`「${name.trim()}」已存在，請使用其他名稱`)
    return
  }
  effectStore.addCustomDefinition({
    name: name.trim(),
    mode: definition.value.mode,
    isBuiltIn: false,
    defaultParams: JSON.parse(JSON.stringify(displayParams.value)),
    extraParamSchema: definition.value.extraParamSchema,
  })
}
</script>
