# Preview Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split PreviewPanel into EditPreview (timeline playback) and PerformancePreview (live hardware monitoring), and add Lux→Track mapping to ControlPanel.

**Architecture:** PreviewPanel becomes a thin shell with an Edit/Performance mode toggle. EditPreview reads `timelineStore.globalTime` reactively to drive per-Lux `<pre-view>` instances, with a smart-switch to single-effect preview when asset library is active. PerformancePreview uses the same reactive pattern but adds the "推播硬體" checkbox.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Pinia, TypeScript, Vitest, Web Component (`<pre-view>` / `PreviewElement`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Remove `modeName` from `LuxUnit`, add `trackIndex`, add `luxUnits` to `ProjectFile` |
| Modify | `src/stores/hardwareStore.ts` | Remove `modeName` from state; add `trackIndex: null` to `addUnit` |
| Modify | `src/stores/projectStore.ts` | Persist `hardwareStore.units` in project file |
| Create | `src/composables/useActiveEffect.ts` | Pure computed: trackIndex + globalTime → EffectData\|null |
| Create | `src/tests/useActiveEffect.test.ts` | Unit tests for the composable |
| Modify | `src/components/PreviewPanel.vue` | Thin shell: mode toggle only |
| Create | `src/components/EditPreview.vue` | Smart-switch preview (single or multi-Lux) |
| Create | `src/components/PerformancePreview.vue` | Live multi-Lux preview + push hardware |
| Modify | `src/components/ControlPanel.vue` | Add Track dropdown + computed effect name column |

---

## Task 1: Update `LuxUnit` type

**Files:**
- Modify: `src/types/index.ts:140-144`

- [ ] **Step 1: Update the interface**

Replace the `LuxUnit` interface (lines 140–144 in `src/types/index.ts`):

```ts
// A single lux unit shown in the control panel
export interface LuxUnit {
  id: number          // 1-based display id
  connected: boolean  // last server timestamp diff < 1000ms
  trackIndex: number | null  // which timeline track this Lux maps to (null = unmapped)
}
```

- [ ] **Step 2: Add `luxUnits` to `ProjectFile`**

Add optional `luxUnits` field to `ProjectFile` interface (after `tracks:` line):

```ts
export interface ProjectFile {
  version: '3.0'
  name: string
  musicFile: string | null
  tracks: ProjectTrack[]
  luxUnits?: Pick<LuxUnit, 'id' | 'trackIndex'>[]  // persisted mapping, no runtime state
}
```

- [ ] **Step 3: Commit**

```bash
git add ControlPanel_v3/src/types/index.ts
git commit -m "feat: update LuxUnit type — add trackIndex, remove modeName; add luxUnits to ProjectFile"
```

---

## Task 2: Update `hardwareStore`

**Files:**
- Modify: `src/stores/hardwareStore.ts`

- [ ] **Step 1: Remove `modeName`, add `trackIndex`**

Replace the full file content:

```ts
import { defineStore } from 'pinia'
import { getLuxStat } from '../services/hardwareService'
import type { LuxUnit } from '../types'

export const useHardwareStore = defineStore('hardware', {
  state: () => ({
    units: [] as LuxUnit[],
    _pollingId: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    addUnit() {
      const nextId = this.units.length > 0
        ? Math.max(...this.units.map(u => u.id)) + 1
        : 1
      this.units.push({ id: nextId, connected: false, trackIndex: null })
    },

    removeUnit(id: number) {
      this.units = this.units.filter(u => u.id !== id)
    },

    removeLastUnit() {
      if (this.units.length > 0) {
        this.units.pop()
      }
    },

    setTrackIndex(id: number, trackIndex: number | null) {
      const unit = this.units.find(u => u.id === id)
      if (unit) unit.trackIndex = trackIndex
    },

    startPolling() {
      if (this._pollingId) return
      this._refresh()
      this._pollingId = setInterval(() => this._refresh(), 1000)
    },

    stopPolling() {
      if (this._pollingId) {
        clearInterval(this._pollingId)
        this._pollingId = null
      }
    },

    async _refresh() {
      const now = Date.now()
      const ids = this.units.map(u => u.id)
      for (const id of ids) {
        const zeroBasedId = id - 1
        const stat = await getLuxStat(zeroBasedId).catch(() => 0)
        const unit = this.units.find(u => u.id === id)
        if (!unit) continue
        unit.connected = (now - stat) < 1000
      }
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add ControlPanel_v3/src/stores/hardwareStore.ts
git commit -m "feat: hardwareStore — remove modeName, add trackIndex + setTrackIndex action"
```

---

## Task 3: Create `useActiveEffect` composable

**Files:**
- Create: `src/composables/useActiveEffect.ts`
- Create: `src/tests/useActiveEffect.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/useActiveEffect.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useActiveEffect } from '../composables/useActiveEffect'
import type { EffectParams } from '../types'

const BLANK_CHANNEL = { func: 1 as const, range: 0, lower: 0, p1: 128, p2: 0 }
const BLANK_PARAMS: EffectParams = {
  XH: BLANK_CHANNEL, XS: BLANK_CHANNEL, XV: BLANK_CHANNEL,
  YH: BLANK_CHANNEL, YS: BLANK_CHANNEL, YV: BLANK_CHANNEL,
  extra: { bladeCount: 0, length: 0, curvature: 0, boxsize: 0, space: 0, reverse: 0, positionFix: 0 },
}

describe('useActiveEffect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns null when trackIndex is null', () => {
    const effectData = useActiveEffect(() => null)
    expect(effectData.value).toBeNull()
  })

  it('returns null when no effect is active at current time', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(5000)
    effectStore.addInstance('純色', 0, 3000, 0)  // track 0, 0–3000ms
    const effectData = useActiveEffect(() => 0)
    expect(effectData.value).toBeNull()  // 5000 > 3000
  })

  it('returns EffectData when an effect covers current time', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(1000)
    effectStore.addInstance('純色', 0, 3000, 0)  // track 0, 0–3000ms
    const effectData = useActiveEffect(() => 0)
    expect(effectData.value).not.toBeNull()
    expect(effectData.value?.mode).toBe('MODES_PLAIN')
  })

  it('returns null when trackIndex does not match any instance', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(1000)
    effectStore.addInstance('純色', 0, 3000, 0)  // track 0
    const effectData = useActiveEffect(() => 1)  // asking for track 1
    expect(effectData.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ControlPanel_v3 && npx vitest run src/tests/useActiveEffect.test.ts
```

Expected: FAIL — `Cannot find module '../composables/useActiveEffect'`

- [ ] **Step 3: Create the composable**

Create `src/composables/useActiveEffect.ts`:

```ts
import { computed, type ComputedRef } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { instanceToEffectData } from '../services/serializer'
import type { EffectData } from '../types'

/**
 * Returns a computed EffectData for the effect active on the given track
 * at the current timelineStore.globalTime. Returns null if no effect covers
 * that time, the trackIndex is null, or the definition is not found.
 */
export function useActiveEffect(trackIndex: () => number | null): ComputedRef<EffectData | null> {
  const effectStore = useEffectStore()
  const timelineStore = useTimelineStore()

  return computed<EffectData | null>(() => {
    const idx = trackIndex()
    if (idx === null) return null

    const time = timelineStore.globalTime
    const instance = effectStore.instances.find(
      i => i.trackIndex === idx && i.startTime <= time && time < i.startTime + i.duration
    )
    if (!instance) return null

    const def = effectStore.getDefinition(instance.definitionName)
    if (!def) return null

    return instanceToEffectData(instance, def.mode)
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd ControlPanel_v3 && npx vitest run src/tests/useActiveEffect.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add ControlPanel_v3/src/composables/useActiveEffect.ts ControlPanel_v3/src/tests/useActiveEffect.test.ts
git commit -m "feat: add useActiveEffect composable + tests"
```

---

## Task 4: Update `projectStore` to persist Lux units

**Files:**
- Modify: `src/stores/projectStore.ts`

- [ ] **Step 1: Import hardwareStore and update `toProjectFile`**

At the top of `projectStore.ts`, add `hardwareStore` import after the existing imports:

```ts
import { useHardwareStore } from './hardwareStore'
```

Replace the `toProjectFile()` action body:

```ts
toProjectFile(): ProjectFile {
  const effectStore = useEffectStore()
  const timelineStore = useTimelineStore()
  const hardwareStore = useHardwareStore()

  const tracks: ProjectTrack[] = timelineStore.tracks.map((track, idx) => ({
    id: track.id,
    name: track.name,
    deviceIndices: track.deviceIndices,
    effects: effectStore.instances
      .filter(i => i.trackIndex === idx)
      .map(({ id, definitionName, startTime, duration, params }) => ({
        id, definitionName, startTime, duration, params,
      })),
  }))

  return {
    version: '3.0',
    name: this.projectName,
    musicFile: this.musicFile,
    tracks,
    luxUnits: hardwareStore.units.map(({ id, trackIndex }) => ({ id, trackIndex })),
  }
},
```

- [ ] **Step 2: Update `loadProject` to restore Lux units**

In `loadProject()`, after `this.isDirty = false`, add:

```ts
const hardwareStore = useHardwareStore()
if (projectFile.version === '3.0' && projectFile.luxUnits) {
  // Restore units from saved mapping; clear existing units first
  hardwareStore.units = projectFile.luxUnits.map(u => ({
    id: u.id,
    connected: false,
    trackIndex: u.trackIndex,
  }))
}
```

Also add `useHardwareStore` to the import at the top of `loadProject`:

```ts
const hardwareStore = useHardwareStore()
```

(The import line at the top of the file already imports from `'./hardwareStore'` after Step 1.)

- [ ] **Step 3: Commit**

```bash
git add ControlPanel_v3/src/stores/projectStore.ts
git commit -m "feat: persist luxUnits (id + trackIndex) in project file"
```

---

## Task 5: Refactor `PreviewPanel.vue` → thin shell

**Files:**
- Modify: `src/components/PreviewPanel.vue`

The existing logic moves to `EditPreview` (Task 6). This task strips `PreviewPanel` down to just the mode toggle.

- [ ] **Step 1: Replace PreviewPanel.vue**

```vue
<template>
  <div class="preview_panel">
    <div class="preview_toolbar">
      <label class="mode_toggle_label">
        <span :class="{ active: mode === 'edit' }">編輯</span>
        <input
          type="checkbox"
          class="mode_toggle_check"
          :checked="mode === 'performance'"
          @change="mode = ($event.target as HTMLInputElement).checked ? 'performance' : 'edit'"
        />
        <span :class="{ active: mode === 'performance' }">表演</span>
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
```

- [ ] **Step 2: Verify app still compiles (EditPreview/PerformancePreview don't exist yet — expect import error)**

```bash
cd ControlPanel_v3 && npx vue-tsc --noEmit 2>&1 | grep -c "error"
```

Expected: errors for missing EditPreview/PerformancePreview — that's fine, will be fixed in Task 6/7.

- [ ] **Step 3: Commit**

```bash
git add ControlPanel_v3/src/components/PreviewPanel.vue
git commit -m "refactor: PreviewPanel → thin shell with edit/performance mode toggle"
```

---

## Task 6: Create `EditPreview.vue`

**Files:**
- Create: `src/components/EditPreview.vue`

**Logic:**
- If `effectStore.previewDefinitionName` is set → smart-switch to single `<pre-view>` (shows def's defaultParams)
- Else → one `<pre-view>` per `hardwareStore.unit`, each driven by `useActiveEffect`
- Clicking off the asset library clears `previewDefinitionName` (existing behaviour via `effectStore.setPreviewDefinition(null)`)

- [ ] **Step 1: Create EditPreview.vue**

```vue
<template>
  <div class="edit_preview">
    <!-- Single-effect smart switch (asset library selection) -->
    <div v-if="isSinglePreview" class="preview_single">
      <pre-view ref="singleRef" id="edit_preview_single" :speed="60" />
    </div>

    <!-- Multi-Lux preview (timeline playback) -->
    <div v-else class="preview_multi">
      <div
        v-for="(unit, i) in hardwareStore.units"
        :key="unit.id"
        class="preview_lux_slot"
        :class="{ highlighted: effectStore.selectedInstanceId !== null && activeInstanceTrack === unit.trackIndex }"
      >
        <pre-view
          :ref="el => { if (el) previewRefs[i] = el as PreviewEl }"
          :id="`edit_preview_lux_${unit.id}`"
          :speed="60"
        />
        <span class="preview_lux_label">Lux {{ unit.id }}</span>
      </div>
      <div v-if="hardwareStore.units.length === 0" class="preview_empty">
        尚未新增 Lux 裝置
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useHardwareStore } from '../stores/hardwareStore'
import { useActiveEffect } from '../composables/useActiveEffect'
import { instanceToEffectData } from '../services/serializer'
import type { EffectData } from '../types'

type PreviewEl = { updateData: (data: EffectData) => void }

const effectStore = useEffectStore()
const hardwareStore = useHardwareStore()

// ── Single-preview (smart switch) ────────────────────────────
const isSinglePreview = computed(() => !!effectStore.previewDefinitionName)

const singleRef = ref<PreviewEl | null>(null)

const singleEffectData = computed<EffectData | null>(() => {
  // Priority 1: asset library preview
  const defName = effectStore.previewDefinitionName
  if (defName) {
    const def = effectStore.getDefinition(defName)
    if (!def) return null
    const instance = {
      id: '__preview__',
      definitionName: def.name,
      trackIndex: 0,
      startTime: 0,
      duration: 10000,
      params: def.defaultParams,
    }
    return instanceToEffectData(instance, def.mode)
  }
  return null
})

watch(singleEffectData, data => {
  if (data && singleRef.value?.updateData) {
    singleRef.value.updateData(data)
  }
}, { deep: true })

// ── Multi-Lux preview (timeline driven) ──────────────────────
const previewRefs = ref<(PreviewEl | null)[]>([])

// Track which track the selected instance belongs to (for highlight)
const activeInstanceTrack = computed(() => {
  const inst = effectStore.selectedInstance
  return inst ? inst.trackIndex : null
})

// Build one computed effectData per unit
const perUnitEffectData = computed(() =>
  hardwareStore.units.map(unit =>
    useActiveEffect(() => unit.trackIndex).value
  )
)

watch(perUnitEffectData, dataArr => {
  dataArr.forEach((data, i) => {
    const el = previewRefs.value[i]
    if (data && el?.updateData) el.updateData(data)
  })
}, { deep: true })

onUnmounted(() => {
  previewRefs.value = []
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add ControlPanel_v3/src/components/EditPreview.vue
git commit -m "feat: add EditPreview component with smart-switch and multi-Lux preview"
```

---

## Task 7: Create `PerformancePreview.vue`

**Files:**
- Create: `src/components/PerformancePreview.vue`

- [ ] **Step 1: Create PerformancePreview.vue**

```vue
<template>
  <div class="performance_preview">
    <div class="preview_toolbar">
      <label class="live_hw_label">
        <input type="checkbox" v-model="liveHardware" class="live_hw_check" />
        推播硬體
      </label>
    </div>

    <div class="preview_multi">
      <div
        v-for="(unit, i) in hardwareStore.units"
        :key="unit.id"
        class="preview_lux_slot"
      >
        <pre-view
          :ref="el => { if (el) previewRefs[i] = el as PreviewEl }"
          :id="`perf_preview_lux_${unit.id}`"
          :speed="60"
        />
        <span class="preview_lux_label">Lux {{ unit.id }}</span>
        <span class="preview_lux_effect">{{ unitEffectName(unit) }}</span>
        <span class="preview_lux_status" :class="unit.connected ? 'connected' : 'disconnected'">
          {{ unit.connected ? '● 已連線' : '○ 斷線' }}
        </span>
      </div>
      <div v-if="hardwareStore.units.length === 0" class="preview_empty">
        尚未新增 Lux 裝置
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useHardwareStore } from '../stores/hardwareStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useActiveEffect } from '../composables/useActiveEffect'
import { pushLiveEffect, stopLiveEffect } from '../services/hardwareService'
import type { EffectData, LuxUnit } from '../types'

type PreviewEl = { updateData: (data: EffectData) => void }

const effectStore = useEffectStore()
const hardwareStore = useHardwareStore()
const timelineStore = useTimelineStore()
const liveHardware = ref(false)
const previewRefs = ref<(PreviewEl | null)[]>([])

const perUnitEffectData = computed(() =>
  hardwareStore.units.map(unit =>
    useActiveEffect(() => unit.trackIndex).value
  )
)

watch(perUnitEffectData, dataArr => {
  dataArr.forEach((data, i) => {
    const el = previewRefs.value[i]
    if (data && el?.updateData) el.updateData(data)
    if (data && liveHardware.value) pushLiveEffect(data)
  })
}, { deep: true })

watch(liveHardware, val => {
  if (!val) stopLiveEffect()
})

function unitEffectName(unit: LuxUnit): string {
  if (unit.trackIndex === null) return '--'
  const time = timelineStore.globalTime
  const instance = effectStore.instances.find(
    i => i.trackIndex === unit.trackIndex! &&
         i.startTime <= time &&
         time < i.startTime + i.duration
  )
  return instance?.definitionName ?? '--'
}

onUnmounted(() => {
  if (liveHardware.value) stopLiveEffect()
  previewRefs.value = []
})
</script>
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd ControlPanel_v3 && npx vue-tsc --noEmit 2>&1 | grep "error TS"
```

Expected: no output (0 errors)

- [ ] **Step 3: Commit**

```bash
git add ControlPanel_v3/src/components/PerformancePreview.vue
git commit -m "feat: add PerformancePreview component with live multi-Lux monitoring"
```

---

## Task 8: Update `ControlPanel.vue`

**Files:**
- Modify: `src/components/ControlPanel.vue`

- [ ] **Step 1: Replace ControlPanel.vue**

```vue
<template>
  <div class="control_panel">
    <!-- 表頭 -->
    <div class="control_table_header">
      <span>ID</span>
      <span>狀態</span>
      <span>當前效果</span>
      <span>對應 Track</span>
    </div>

    <!-- lux 列表 -->
    <div
      v-for="unit in store.units"
      :key="unit.id"
      class="control_row"
    >
      <span>{{ unit.id }}</span>
      <span
        class="state_text"
        :class="unit.connected ? 'connected' : 'disconnected'"
      >{{ unit.connected ? '已連線' : '斷線' }}</span>
      <span class="time_text">{{ currentEffectName(unit) }}</span>
      <select
        class="track_select"
        :value="unit.trackIndex ?? ''"
        @change="onTrackChange(unit.id, $event)"
      >
        <option value="">未對應</option>
        <option
          v-for="(track, i) in timelineStore.tracks"
          :key="track.id"
          :value="i"
        >{{ track.name }}</option>
      </select>
    </div>

    <!-- 無 lux 時的空狀態提示 -->
    <div v-if="store.units.length === 0" class="control_empty">
      尚未新增 lux 單元
    </div>

    <!-- 底部操作列 -->
    <div class="control_actions">
      <button class="control_btn" @click="store.addUnit()">＋ 新增 lux</button>
      <button
        class="control_btn control_btn--danger"
        :disabled="store.units.length === 0"
        @click="store.removeLastUnit()"
      >－ 刪除最後一個</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useHardwareStore } from '../stores/hardwareStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useEffectStore } from '../stores/effectStore'
import type { LuxUnit } from '../types'

const props = defineProps<{ active: boolean }>()
const store = useHardwareStore()
const timelineStore = useTimelineStore()
const effectStore = useEffectStore()

watch(
  () => props.active,
  (val) => {
    if (val) store.startPolling()
    else store.stopPolling()
  },
  { immediate: true }
)

onUnmounted(() => store.stopPolling())

function onTrackChange(unitId: number, event: Event) {
  const val = (event.target as HTMLSelectElement).value
  store.setTrackIndex(unitId, val === '' ? null : Number(val))
}

function currentEffectName(unit: LuxUnit): string {
  if (unit.trackIndex === null) return '--'
  const time = timelineStore.globalTime
  const instance = effectStore.instances.find(
    i => i.trackIndex === unit.trackIndex! &&
         i.startTime <= time &&
         time < i.startTime + i.duration
  )
  return instance?.definitionName ?? '--'
}
</script>

<style scoped></style>
```

- [ ] **Step 2: Run all tests**

```bash
cd ControlPanel_v3 && npx vitest run
```

Expected: all tests passing (including the new useActiveEffect tests)

- [ ] **Step 3: TypeScript check**

```bash
cd ControlPanel_v3 && npx vue-tsc --noEmit 2>&1 | grep "error TS"
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add ControlPanel_v3/src/components/ControlPanel.vue
git commit -m "feat: ControlPanel — add Track mapping dropdown and computed current effect name"
```

---

## Self-Review Notes

- `timelineStore.globalTime` and `isPlaying` already exist — no new fields needed in Task 1.
- `useActiveEffect` is called inside a `computed()` in `perUnitEffectData`. Since Vue's reactivity system tracks all reactive reads inside a `computed`, calling a composable that returns a `computed` inside another `computed` is valid — the outer computed re-runs when `globalTime` or `instances` changes.
- `liveHardware` in `PerformancePreview` pushes ALL Lux effects on every change. This matches the existing V2 behaviour where live mode is a broadcast test mode.
- `modeName` removal from `hardwareStore._refresh` means the `getLuxLight` import in `hardwareService.ts` is no longer called, but the function itself is kept in case it's used elsewhere. No deletion needed.
- `projectStore.loadProject` for `version === '2.0'` (legacy) skips `luxUnits` — correct, since old files don't have the field.
