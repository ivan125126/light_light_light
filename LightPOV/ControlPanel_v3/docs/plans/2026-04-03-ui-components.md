# ControlPanel v2 — Plan 2: UI Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將現有的 `src/index.html` + `src/js/script.js`（3,529 行）拆分成 Vue 組件，接入 Plan 1 建立的 Pinia stores，讓舊的 `script.js` 可以完全移除。

**Architecture:** 由外到內逐步替換。先建立 App 佈局和最簡單的組件（AssetLibrary），確認 store 串接正常後，再處理最複雜的 Timeline 和 ParameterPanel。每個 task 完成後舊 UI 和新組件可以並存並驗證。最後一個 task 移除 `script.js` 等舊檔案。

**Tech Stack:** Vue 3 SFC（`<script setup>`）、Pinia stores（Plan 1）、Fabric.js（保留用於 Timeline）、TypeScript

**Spec:** `docs/superpowers/specs/2026-04-03-controlpanel-v2-refactor-design.md`
**前置條件:** Plan 1 已完成（`b942fe8`）

---

## 新增/修改的檔案

```
新增：
  src/components/AssetLibrary.vue
  src/components/TimelinePanel.vue
  src/components/TrackCanvas.vue         （× 6 軌，由 TimelinePanel 動態建立）
  src/components/PreviewPanel.vue
  src/components/ParameterPanel.vue
  src/components/HsvChannelGroup.vue
  src/components/ExtraParamsGroup.vue
  src/lib/EffectBlock.ts                 （從 EffectBlock.js 遷移，清理全域依賴）

修改：
  src/App.vue                            （加入組件樹和佈局）
  src/index.html                         （移除舊 script tags）

刪除（Task 9）：
  src/js/script.js
  src/js/EffectBlock.js
  src/public/（整個 public/ 目錄，已由 Vite 取代）
```

---

### Task 1: App.vue 佈局 + CSS 引入

**Files:**
- Modify: `src/App.vue`
- Modify: `src/css/style.css`（確認 Vite 能引入）

- [ ] **Step 1: 確認 CSS 引入路徑**

在 `src/main.ts` 加入：

```typescript
import './css/style.css'
```

- [ ] **Step 2: 更新 `src/App.vue` 為三欄佈局**

```vue
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
```

- [ ] **Step 3: 建立佔位組件（空殼）讓 App.vue 可以編譯**

建立以下空殼檔案（之後各 task 填充內容）：
- `src/components/AssetLibrary.vue`
- `src/components/TimelinePanel.vue`
- `src/components/PreviewPanel.vue`
- `src/components/ParameterPanel.vue`

每個檔案格式：

```vue
<template>
  <div class="[component-name]"><!-- TODO --></div>
</template>
<script setup lang="ts"></script>
```

- [ ] **Step 4: type-check + dev server 確認**

```bash
npm run type-check
npm run dev
# Ctrl+C
```

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/App.vue src/components/
git commit -m "feat: add App layout and placeholder components"
```

---

### Task 2: EffectBlock.ts（遷移 EffectBlock.js）

**Files:**
- Create: `src/lib/EffectBlock.ts`

舊的 `EffectBlock.js` 直接存取 `window.globalEffectData` 和 `window.assetCanvas1-6`。這個 task 把它改成透過 `effectStore` 和傳入的 canvas 引用。

- [ ] **Step 1: 建立 `src/lib/EffectBlock.ts`**

核心邏輯從 `src/js/EffectBlock.js` 複製，做以下修改：

1. 把 `get params()` / `set params()` 改為使用 `useEffectStore()`：
```typescript
import { useEffectStore } from '../stores/effectStore'

get params(): EffectParams {
  return useEffectStore().instances.find(i => i.id === this.id)?.params ?? defaultEffectParams()
}
set params(v: EffectParams) {
  useEffectStore().updateInstance(this.id, { params: v })
}
```

2. Constructor 改為接受 `canvas: fabric.Canvas` 參數，不再從 `window` 抓：
```typescript
constructor(id: string, name: string, canvas: fabric.Canvas) {
  this.id = id
  this.name = name
  this._canvas = canvas
  // ...
}
```

3. 加 TypeScript 型別標注（id, name, startTime, duration, trackIndex 等）

4. `_getSafeBoundaries()` 邏輯保持不變

- [ ] **Step 2: type-check**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/EffectBlock.ts
git commit -m "feat: migrate EffectBlock to TypeScript, decouple from globals"
```

---

### Task 3: AssetLibrary.vue

**Files:**
- Modify: `src/components/AssetLibrary.vue`

顯示內建效果和自訂效果，支援拖放到 Timeline。

- [ ] **Step 1: 實作 `src/components/AssetLibrary.vue`**

```vue
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
```

- [ ] **Step 2: type-check + 確認 dev server 能看到左側清單**

```bash
npm run type-check && npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AssetLibrary.vue
git commit -m "feat: implement AssetLibrary component"
```

---

### Task 4: TimelinePanel.vue + TrackCanvas.vue

**Files:**
- Modify: `src/components/TimelinePanel.vue`
- Create: `src/components/TrackCanvas.vue`

這是最複雜的組件。從 `script.js` 的 `initTimelineFabric()`、`drawTimeline()`、音訊波形邏輯中抽取。

- [ ] **Step 1: 實作 `src/components/TrackCanvas.vue`**

單一軌道，包裝 Fabric.js canvas，負責：
- 初始化 `fabric.Canvas`
- 接受 drop 事件建立 `EffectBlock`
- 暴露 `canvas` ref 給 TimelinePanel

```vue
<template>
  <canvas :id="`track-canvas-${trackIndex}`" class="asset_canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
  canvas.getElement().parentElement?.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault()
    const definitionName = e.dataTransfer?.getData('text/plain')
    if (!definitionName || !canvas) return

    const dropX = e.offsetX
    const startTime = timelineStore.pixelToMs(dropX)
    const duration = 3000  // default 3 seconds

    const id = effectStore.addInstance(definitionName, startTime, duration, props.trackIndex)
    const block = new EffectBlock(id, definitionName, canvas)
    block.render()
  })

  canvas.getElement().parentElement?.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault()
  })
})

onUnmounted(() => {
  canvas?.dispose()
})
</script>
```

- [ ] **Step 2: 實作 `src/components/TimelinePanel.vue`**

包含：時間刻度軸（原生 Canvas）、音訊波形、6 個 TrackCanvas、播放控制、縮放/拖動。

```vue
<template>
  <div class="timeline_panel">
    <!-- 播放控制 -->
    <div class="playback_controls">
      <button @click="togglePlay">{{ timelineStore.isPlaying ? '暫停' : '播放' }}</button>
      <button @click="stop">停止</button>
      <input type="file" accept="audio/*" @change="loadAudio" />
      <span>{{ formatTime(timelineStore.globalTime) }}</span>
    </div>

    <!-- 時間刻度軸 -->
    <canvas ref="timescaleCanvasRef" class="timescale_canvas" :width="canvasWidth" height="30"></canvas>

    <!-- 6 軌 -->
    <div
      ref="tracksContainerRef"
      class="tracks_container"
      @wheel.prevent="onWheel"
    >
      <TrackCanvas v-for="i in 6" :key="i" :trackIndex="i - 1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import TrackCanvas from './TrackCanvas.vue'
import { useTimelineStore } from '../stores/timelineStore'
import { useAudioStore } from '../stores/audioStore'
import { loadAudioFile, extractPeaks, startPlayback, stopPlayback } from '../services/audioService'
import { startHardwareSync, stopHardwareSync } from '../services/hardwareService'

const timelineStore = useTimelineStore()
const audioStore = useAudioStore()
const timescaleCanvasRef = ref<HTMLCanvasElement | null>(null)
const tracksContainerRef = ref<HTMLElement | null>(null)
const canvasWidth = ref(1200)

let animationFrameId: number | null = null
let playStartWallTime = 0
let playStartGlobalTime = 0

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}

function togglePlay() {
  if (timelineStore.isPlaying) {
    pause()
  } else {
    play()
  }
}

function play() {
  playStartWallTime = performance.now()
  playStartGlobalTime = timelineStore.globalTime
  if (audioStore.hasAudio) {
    startPlayback(timelineStore.globalTime)
  }
  startHardwareSync(() => timelineStore.globalTime)
  timelineStore.setPlaying(true)
  tick()
}

function pause() {
  timelineStore.setPlaying(false)
  stopPlayback()
  stopHardwareSync()
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function stop() {
  pause()
  timelineStore.setTime(0)
  drawTimescale()
}

function tick() {
  if (!timelineStore.isPlaying) return
  const elapsed = performance.now() - playStartWallTime
  timelineStore.setTime(playStartGlobalTime + elapsed)
  drawTimescale()
  animationFrameId = requestAnimationFrame(tick)
}

async function loadAudio(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const { buffer, duration } = await loadAudioFile(file)
  const peaks = extractPeaks(buffer, canvasWidth.value)
  audioStore.setAudio(duration, peaks, file.name)
  timelineStore.setTotalDuration(duration)
  drawTimescale()
}

function onWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    // zoom
    const factor = event.deltaY > 0 ? 1.1 : 0.9
    timelineStore.zoom(factor, event.offsetX)
  } else {
    // scroll
    timelineStore.setOffset(timelineStore.timelineOffset + event.deltaX * 0.5)
  }
  drawTimescale()
}

function drawTimescale() {
  const canvas = timescaleCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#444'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw time ticks
  const { secondsPerPixel, timelineOffset } = timelineStore
  ctx.fillStyle = '#aaa'
  ctx.font = '10px monospace'

  const startSec = timelineOffset * secondsPerPixel
  const endSec = (timelineOffset + canvas.width) * secondsPerPixel
  const tickInterval = Math.max(0.5, Math.ceil((endSec - startSec) / 20))

  for (let s = Math.ceil(startSec / tickInterval) * tickInterval; s < endSec; s += tickInterval) {
    const x = s / secondsPerPixel - timelineOffset
    ctx.strokeStyle = '#666'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 30)
    ctx.stroke()
    ctx.fillText(`${s.toFixed(1)}s`, x + 2, 20)
  }

  // Draw waveform
  if (audioStore.peaks.length > 0) {
    ctx.fillStyle = '#4a9eff44'
    const peaks = audioStore.peaks
    for (let i = 0; i < canvas.width; i++) {
      const peakIdx = Math.floor((i + timelineOffset) / canvas.width * peaks.length)
      const peak = peaks[peakIdx] ?? 0
      const h = peak * 28
      ctx.fillRect(i, (28 - h) / 2, 1, h)
    }
  }

  // Draw playhead
  const playheadX = timelineStore.playheadPixel
  if (playheadX >= 0 && playheadX <= canvas.width) {
    ctx.strokeStyle = '#ff4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, 30)
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

onMounted(() => {
  drawTimescale()
})

watch(() => timelineStore.secondsPerPixel, drawTimescale)
watch(() => timelineStore.timelineOffset, drawTimescale)
</script>
```

- [ ] **Step 3: type-check**

```bash
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TimelinePanel.vue src/components/TrackCanvas.vue src/lib/EffectBlock.ts
git commit -m "feat: implement TimelinePanel and TrackCanvas with Fabric.js"
```

---

### Task 5: ParameterPanel.vue + HsvChannelGroup.vue + ExtraParamsGroup.vue

**Files:**
- Modify: `src/components/ParameterPanel.vue`
- Create: `src/components/HsvChannelGroup.vue`
- Create: `src/components/ExtraParamsGroup.vue`

顯示選中 EffectInstance 的 HSV 參數，即時寫回 effectStore。

- [ ] **Step 1: 建立 `src/components/HsvChannelGroup.vue`**

```vue
<template>
  <div class="hsv_block" v-if="channel">
    <label>{{ label }}</label>
    <select v-model="funcName" @change="onFuncChange">
      <option value="None">None</option>
      <option value="Const">Const</option>
      <option value="Ramp">Ramp</option>
      <option value="Triangle">Triangle</option>
      <option value="Pulse">Pulse</option>
      <option value="Step">Step</option>
    </select>

    <!-- Const -->
    <template v-if="funcName === 'Const'">
      <label>Value</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emit" />
      <span>{{ channel.p1 }}</span>
    </template>

    <!-- Ramp / Triangle -->
    <template v-if="funcName === 'Ramp' || funcName === 'Triangle'">
      <label>Upper</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emit" />
      <label>Range</label>
      <input type="range" min="0" max="255" v-model.number="channel.range" @input="emit" />
      <label>Lower</label>
      <input type="range" min="0" max="255" v-model.number="channel.lower" @input="emit" />
    </template>

    <!-- Pulse -->
    <template v-if="funcName === 'Pulse'">
      <label>Top</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emit" />
      <label>Range</label>
      <input type="range" min="0" max="255" v-model.number="channel.range" @input="emit" />
      <label>Lower</label>
      <input type="range" min="0" max="255" v-model.number="channel.lower" @input="emit" />
    </template>

    <!-- Step -->
    <template v-if="funcName === 'Step'">
      <label>Height</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emit" />
      <label>Steps</label>
      <input type="range" min="0" max="255" v-model.number="channel.p2" @input="emit" />
      <label>Range</label>
      <input type="range" min="0" max="255" v-model.number="channel.range" @input="emit" />
      <label>Lower</label>
      <input type="range" min="0" max="255" v-model.number="channel.lower" @input="emit" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { HsvChannel } from '../types'

const FUNC_CODES: Record<string, 0|1|2|3|4|5> = {
  None: 0, Const: 1, Ramp: 2, Triangle: 3, Pulse: 4, Step: 5
}
const FUNC_NAMES = ['None', 'Const', 'Ramp', 'Triangle', 'Pulse', 'Step']

const props = defineProps<{ label: string; channel: HsvChannel }>()
const emit = defineEmits<{ (e: 'update:channel', v: HsvChannel): void }>()

const funcName = ref(FUNC_NAMES[props.channel.func] ?? 'None')

watch(() => props.channel.func, (f) => {
  funcName.value = FUNC_NAMES[f] ?? 'None'
})

function onFuncChange() {
  props.channel.func = FUNC_CODES[funcName.value] ?? 0
  emit('update:channel', { ...props.channel })
}

function emit() {
  emit('update:channel', { ...props.channel })
}
</script>
```

- [ ] **Step 2: 建立 `src/components/ExtraParamsGroup.vue`**

```vue
<template>
  <div class="extra_params" v-if="schema && extra">
    <template v-if="schema.bladeCount">
      <label>Blade Count</label>
      <input type="number" min="0" max="12" v-model.number="extra.bladeCount" @input="emit" />
    </template>
    <template v-if="schema.length">
      <label>Length</label>
      <input type="range" min="0" max="300" v-model.number="extra.length" @input="emit" />
      <span>{{ extra.length }}</span>
    </template>
    <template v-if="schema.curvature">
      <label>Curvature</label>
      <input type="range" min="0" max="100" v-model.number="extra.curvature" @input="emit" />
    </template>
    <template v-if="schema.boxsize">
      <label>Box Size</label>
      <input type="range" min="0" max="300" v-model.number="extra.boxsize" @input="emit" />
    </template>
    <template v-if="schema.space">
      <label>Space</label>
      <input type="range" min="0" max="100" v-model.number="extra.space" @input="emit" />
    </template>
    <template v-if="schema.reverse">
      <label>Reverse</label>
      <input type="checkbox" :checked="extra.reverse === 1"
        @change="extra.reverse = ($event.target as HTMLInputElement).checked ? 1 : 0; emit()" />
    </template>
    <template v-if="schema.positionFix">
      <label>Position Fix</label>
      <input type="range" min="0" max="255" v-model.number="extra.positionFix" @input="emit" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ExtraParams, ExtraParamSchema } from '../types'

const props = defineProps<{ schema: ExtraParamSchema; extra: ExtraParams }>()
const emit = defineEmits<{ (e: 'update:extra', v: ExtraParams): void }>()

function emit() {
  emit('update:extra', { ...props.extra })
}
</script>
```

- [ ] **Step 3: 實作 `src/components/ParameterPanel.vue`**

```vue
<template>
  <div class="param_panel" v-if="selected">
    <h3>{{ selected.definitionName }}</h3>

    <!-- HSV 六通道 -->
    <HsvChannelGroup label="XH" :channel="selected.params.XH"
      @update:channel="updateChannel('XH', $event)" />
    <HsvChannelGroup label="XS" :channel="selected.params.XS"
      @update:channel="updateChannel('XS', $event)" />
    <HsvChannelGroup label="XV" :channel="selected.params.XV"
      @update:channel="updateChannel('XV', $event)" />
    <HsvChannelGroup label="YH" :channel="selected.params.YH"
      @update:channel="updateChannel('YH', $event)" />
    <HsvChannelGroup label="YS" :channel="selected.params.YS"
      @update:channel="updateChannel('YS', $event)" />
    <HsvChannelGroup label="YV" :channel="selected.params.YV"
      @update:channel="updateChannel('YV', $event)" />

    <!-- 額外參數 -->
    <ExtraParamsGroup
      v-if="definition"
      :schema="definition.extraParamSchema"
      :extra="selected.params.extra"
      @update:extra="updateExtra"
    />
  </div>
  <div class="param_panel empty" v-else>
    <p>點選 Timeline 上的效果 block 以編輯參數</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import HsvChannelGroup from './HsvChannelGroup.vue'
import ExtraParamsGroup from './ExtraParamsGroup.vue'
import type { HsvChannel, ExtraParams } from '../types'

const effectStore = useEffectStore()
const selected  = computed(() => effectStore.selectedInstance)
const definition = computed(() =>
  selected.value ? effectStore.getDefinition(selected.value.definitionName) : undefined
)

function updateChannel(key: 'XH'|'XS'|'XV'|'YH'|'YS'|'YV', value: HsvChannel) {
  if (!selected.value) return
  effectStore.updateInstance(selected.value.id, {
    params: { ...selected.value.params, [key]: value }
  })
}

function updateExtra(value: ExtraParams) {
  if (!selected.value) return
  effectStore.updateInstance(selected.value.id, {
    params: { ...selected.value.params, extra: value }
  })
}
</script>
```

- [ ] **Step 4: type-check**

```bash
npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ParameterPanel.vue src/components/HsvChannelGroup.vue src/components/ExtraParamsGroup.vue
git commit -m "feat: implement ParameterPanel with HSV channels and extra params"
```

---

### Task 6: PreviewPanel.vue

**Files:**
- Modify: `src/components/PreviewPanel.vue`

包裝現有的 `<pre-view>` Web Component，監看 `effectStore.selectedInstance`，自動更新預覽。

- [ ] **Step 1: 引入 pre_view.js（暫時保留原始 Web Component）**

在 `src/main.ts` 加入：

```typescript
// pre_view Web Component（Plan 3 遷移為 PreviewElement.ts）
import './js/pre_view.js'
```

- [ ] **Step 2: 實作 `src/components/PreviewPanel.vue`**

```vue
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
    const el = previewRef.value as any
    if (!el?.updateData || !instance) return
    const def = effectStore.getDefinition(instance.definitionName)
    if (!def) return
    const effectData = instanceToEffectData(instance, def.mode)
    el.updateData(effectData)
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
```

- [ ] **Step 3: type-check + 驗證 Preview 自動更新**

```bash
npm run type-check
npm run dev
```

點選 Timeline 上的 block 後，右側 LED 環形預覽應自動更新（這修復了 todo.md 的 bug #1）。

- [ ] **Step 4: Commit**

```bash
git add src/components/PreviewPanel.vue src/main.ts
git commit -m "feat: implement PreviewPanel, fix auto-update bug"
```

---

### Task 7: 專案存檔/讀檔 UI

**Files:**
- Modify: `src/App.vue`（加入 toolbar）

新增頂部工具列：儲存、載入、匯出效果庫、匯入效果庫。

- [ ] **Step 1: 在 `src/App.vue` 加入 toolbar**

```vue
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

    <!-- Main layout (existing three columns) -->
    <div class="app-layout">
      ...
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProjectStore } from './stores/projectStore'
import { useEffectStore } from './stores/effectStore'
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
    // Try to find matching library file
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
```

- [ ] **Step 2: type-check + Commit**

```bash
npm run type-check
git add src/App.vue
git commit -m "feat: add toolbar with save/load/export/import project"
```

---

### Task 8: 移除舊 script tags，清理舊檔案

**Files:**
- Modify: `src/index.html`（移除舊 script tags）
- Delete: `src/js/script.js`, `src/js/EffectBlock.js`
- Keep: `src/js/pre_view.js`（Plan 3 才替換）

- [ ] **Step 1: 從 `src/index.html` 移除以下 script tags**

移除：
```html
<script src="./js/EffectBlock.js"></script>
<script src="./js/script.js"></script>
```

保留 `pre_view.js`（Plan 3 才移除）。
保留 Fabric.js CDN（直到確認 npm 版本正常運作）。

- [ ] **Step 2: 確認 dev server 正常，功能驗證清單**

```bash
npm run dev
```

驗證：
- [ ] 資產庫顯示 15 個內建效果
- [ ] 可以拖放效果到 Timeline
- [ ] 點選 block，右側參數面板出現
- [ ] 調整參數，Preview 即時更新
- [ ] 時間刻度軸可縮放（Ctrl+Wheel）和滾動

- [ ] **Step 3: Commit**

```bash
git rm src/js/script.js src/js/EffectBlock.js
git add src/index.html
git commit -m "chore: remove legacy script.js and EffectBlock.js"
```

---

## Plan 2 完成後的狀態

- 完整的 Vue 3 UI，舊 `script.js` 完全移除
- Preview 自動更新 bug ✅ 修復
- 專案可以儲存/載入/匯出效果庫
- 剩餘工作：`pre_view.js` 遷移、server TypeScript 化、文件撰寫（Plan 3）

## 下一步：Plan 3
