# Feature Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audio playback rate control, Space/Ctrl+B hotkeys, editable start_time/duration in param panel, remove dead `/settime` server route, and implement edit/perform mode toggle.

**Architecture:** Each feature is self-contained. New `uiStore` provides the single source of truth for app mode; all components read from it reactively. Audio rate is stored in `audioStore` and applied in `audioService` + `TimelinePanel.tick()`. The five features share no inter-dependencies except that perform-mode guards in three components all read `uiStore.appMode`.

**Tech Stack:** Vue 3 + Pinia, TypeScript, Fabric.js (TrackCanvas), Web Audio API, Vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/stores/uiStore.ts` | **Create** | `appMode: 'edit'|'perform'`, `toggleMode()` |
| `src/stores/audioStore.ts` | **Modify** | add `playbackRate: number`, `setPlaybackRate()` |
| `src/services/audioService.ts` | **Modify** | apply rate in `startPlayback`, expose `setPlaybackRate()` |
| `src/components/TimelinePanel.vue` | **Modify** | tick() × rate, speed UI, Space+Ctrl+B hotkeys, hide edit controls in perform mode |
| `src/components/ParameterPanel.vue` | **Modify** | start_time/duration inputs; disable all in perform mode |
| `src/server/server.js` | **Modify** | remove `/settime` POST + `/gettime` GET dead routes |
| `src/App.vue` | **Modify** | toggle switch in toolbar |
| `src/components/TrackCanvas.vue` | **Modify** | block drop + fabric interactions in perform mode |
| `src/components/AssetLibrary.vue` | **Modify** | block drag-start in perform mode |
| `src/tests/uiStore.test.ts` | **Create** | unit tests for uiStore |
| `src/tests/audioStore.test.ts` | **Create** | unit tests for playbackRate |

---

## Task 1: uiStore — app mode state

**Files:**
- Create: `src/stores/uiStore.ts`
- Create: `src/tests/uiStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/tests/uiStore.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('預設 appMode 為 edit', () => {
    const store = useUiStore()
    expect(store.appMode).toBe('edit')
  })

  it('toggleMode 切換至 perform', () => {
    const store = useUiStore()
    store.toggleMode()
    expect(store.appMode).toBe('perform')
  })

  it('toggleMode 再次切換回 edit', () => {
    const store = useUiStore()
    store.toggleMode()
    store.toggleMode()
    expect(store.appMode).toBe('edit')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/candle/light_light_light/ES-Lux-master/LightPOV/ControlPanel_v3
npm run test -- src/tests/uiStore.test.ts
```

Expected: `Cannot find module '../stores/uiStore'`

- [ ] **Step 3: Implement uiStore**

Create `src/stores/uiStore.ts`:

```ts
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    appMode: 'edit' as 'edit' | 'perform',
  }),
  actions: {
    toggleMode(): void {
      this.appMode = this.appMode === 'edit' ? 'perform' : 'edit'
    },
  },
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- src/tests/uiStore.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/uiStore.ts src/tests/uiStore.test.ts
git commit -m "feat(store): add uiStore with appMode toggle"
```

---

## Task 2: audioStore — playbackRate

**Files:**
- Modify: `src/stores/audioStore.ts`
- Create: `src/tests/audioStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/tests/audioStore.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAudioStore } from '../stores/audioStore'

describe('audioStore — playbackRate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('預設 playbackRate 為 1', () => {
    const store = useAudioStore()
    expect(store.playbackRate).toBe(1)
  })

  it('setPlaybackRate 更新值', () => {
    const store = useAudioStore()
    store.setPlaybackRate(0.5)
    expect(store.playbackRate).toBe(0.5)
  })

  it('setPlaybackRate 最小限制 0.01', () => {
    const store = useAudioStore()
    store.setPlaybackRate(0)
    expect(store.playbackRate).toBe(0.01)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- src/tests/audioStore.test.ts
```

Expected: `store.playbackRate is undefined`

- [ ] **Step 3: Add playbackRate to audioStore**

In `src/stores/audioStore.ts`, update the state interface and store:

```ts
import { defineStore } from 'pinia'

interface AudioState {
  hasAudio: boolean
  duration: number
  peaks: number[]
  fileName: string | null
  volume: number
  playbackRate: number
}

export const useAudioStore = defineStore('audio', {
  state: (): AudioState => ({
    hasAudio: false,
    duration: 0,
    peaks: [],
    fileName: null,
    volume: 1,
    playbackRate: 1,
  }),

  actions: {
    setAudio(duration: number, peaks: number[], fileName: string): void {
      this.hasAudio = true
      this.duration = duration
      this.peaks = peaks
      this.fileName = fileName
    },

    setVolume(vol: number): void {
      this.volume = Math.max(0, Math.min(1, vol))
    },

    setPlaybackRate(rate: number): void {
      this.playbackRate = Math.max(0.01, rate)
    },

    clearAudio(): void {
      this.hasAudio = false
      this.duration = 0
      this.peaks = []
      this.fileName = null
    },
  },
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- src/tests/audioStore.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/audioStore.ts src/tests/audioStore.test.ts
git commit -m "feat(store): add playbackRate to audioStore"
```

---

## Task 3: audioService — apply playbackRate

**Files:**
- Modify: `src/services/audioService.ts`

No new unit test (audioService uses real Web Audio API — browser-only, not testable in vitest node env). Verified by manual playback.

- [ ] **Step 1: Update audioService.ts**

Replace the full file `src/services/audioService.ts` with:

```ts
/**
 * Web Audio API utilities.
 * Audio playback state (context, buffer, source node) is held at module scope;
 * reactive state (peaks, duration, hasAudio) is delegated to audioStore.
 */

let _audioContext: AudioContext | null = null
let _gainNode: GainNode | null = null
let _sourceNode: AudioBufferSourceNode | null = null
let _audioBuffer: AudioBuffer | null = null
let _currentRate = 1

function getAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}

function getGainNode(): GainNode {
  const ctx = getAudioContext()
  if (!_gainNode) {
    _gainNode = ctx.createGain()
    _gainNode.connect(ctx.destination)
  }
  return _gainNode
}

/** Load an MP3/WAV File into an AudioBuffer. Stops any current playback first. */
export async function loadAudioFile(file: File): Promise<{ buffer: AudioBuffer; duration: number }> {
  stopPlayback()
  const ctx = getAudioContext()
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  _audioBuffer = audioBuffer
  return {
    buffer: audioBuffer,
    duration: Math.round(audioBuffer.duration * 1000),
  }
}

/**
 * Extract normalized peak values for waveform rendering.
 */
export function extractPeaks(buffer: AudioBuffer, numPeaks: number): number[] {
  const channelData = buffer.getChannelData(0)
  const blockSize = Math.floor(channelData.length / numPeaks)
  const peaks: number[] = []

  for (let i = 0; i < numPeaks; i++) {
    let max = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(channelData[start + j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }
  return peaks
}

/** Start playback from offsetMs (in milliseconds) at the given rate */
export function startPlayback(offsetMs: number, rate = _currentRate): void {
  if (!_audioBuffer) return
  stopPlayback()
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  const source = ctx.createBufferSource()
  source.buffer = _audioBuffer
  source.playbackRate.value = rate
  source.connect(getGainNode())
  source.start(0, offsetMs / 1000)
  _sourceNode = source
  _currentRate = rate
}

/** Change playback rate in real-time without restarting */
export function setPlaybackRate(rate: number): void {
  _currentRate = Math.max(0.01, rate)
  if (_sourceNode) {
    _sourceNode.playbackRate.value = _currentRate
  }
}

/** Stop current playback */
export function stopPlayback(): void {
  if (_sourceNode) {
    try { _sourceNode.stop() } catch { /* already stopped */ }
    _sourceNode = null
  }
}

/** Set playback volume (0–1) */
export function setVolume(vol: number): void {
  getGainNode().gain.value = Math.max(0, Math.min(1, vol))
}

/** Get current AudioContext time in milliseconds */
export function getAudioContextTime(): number {
  return _audioContext ? _audioContext.currentTime * 1000 : 0
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/audioService.ts
git commit -m "feat(audio): apply playbackRate in audioService"
```

---

## Task 4: TimelinePanel — tick() rate + speed UI

**Files:**
- Modify: `src/components/TimelinePanel.vue`

- [ ] **Step 1: Update imports and add audioStore import**

In `TimelinePanel.vue` `<script setup>`, add imports:

```ts
import { useAudioStore } from '../stores/audioStore'
import { setPlaybackRate as setAudioPlaybackRate } from '../services/audioService'
```

And add after existing store declarations:
```ts
const audioStore = useAudioStore()
```

- [ ] **Step 2: Update tick() to apply playbackRate**

Find the `tick()` function and replace it:

```ts
function tick() {
  if (!timelineStore.isPlaying) return
  const elapsed = (performance.now() - playStartWallTime) * audioStore.playbackRate
  timelineStore.setTime(playStartGlobalTime + elapsed)
  drawTimescale()
  animationFrameId = requestAnimationFrame(tick)
}
```

- [ ] **Step 3: Update play() to pass rate to startPlayback**

Find the `play()` function and update the `startPlayback` call:

```ts
function play() {
  playStartWallTime = performance.now()
  playStartGlobalTime = timelineStore.globalTime
  if (audioStore.hasAudio) {
    startPlayback(timelineStore.globalTime, audioStore.playbackRate)
  } else {
    startWithoutAudio()
  }
  startHardwareSync(() => timelineStore.globalTime)
  timelineStore.setPlaying(true)
  tick()
}
```

- [ ] **Step 4: Add speed UI to template**

In the `<template>`, find the `<div class="playback_controls">` section. Add the following block **after** the volume controls block (after the `</span>` of `volume-value`) and **before** the audio filename span:

```html
<!-- 播放速度 -->
<span class="speed-label">速度：</span>
<input
  class="speed-slider"
  type="range"
  min="1" max="4" step="1"
  :value="speedSliderIndex"
  @input="onSpeedSliderInput"
/>
<input
  class="speed-input"
  type="number"
  min="0.01"
  step="0.05"
  :value="audioStore.playbackRate"
  @change="onSpeedTextInput"
/>
<span class="speed-value">x{{ audioStore.playbackRate.toFixed(2) }}</span>
```

- [ ] **Step 5: Add speed logic to script**

Add these computed/functions in the `<script setup>` section:

```ts
const SPEED_STEPS = [0.25, 0.5, 0.75, 1.0]

const speedSliderIndex = computed(() => {
  const idx = SPEED_STEPS.indexOf(audioStore.playbackRate)
  return idx >= 0 ? idx + 1 : 1  // fallback to step 1 if custom value
})

function onSpeedSliderInput(event: Event) {
  const idx = Number((event.target as HTMLInputElement).value) - 1
  const rate = SPEED_STEPS[idx] ?? 1.0
  audioStore.setPlaybackRate(rate)
  setAudioPlaybackRate(rate)
}

function onSpeedTextInput(event: Event) {
  const val = parseFloat((event.target as HTMLInputElement).value)
  if (isNaN(val) || val < 0.01) return
  audioStore.setPlaybackRate(val)
  setAudioPlaybackRate(val)
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/TimelinePanel.vue
git commit -m "feat(timeline): playback rate slider + tick() rate scaling"
```

---

## Task 5: TimelinePanel — Space + Ctrl+B hotkeys

**Files:**
- Modify: `src/components/TimelinePanel.vue` (existing `onKeyDown`)

- [ ] **Step 1: Add Space hotkey to onKeyDown**

In the `onKeyDown` function, add this block right before the `// Cmd+Z` comment:

```ts
  // Space — play / pause
  if (e.key === ' ') {
    if (isEditable) return
    e.preventDefault()
    togglePlay()
    return
  }
```

- [ ] **Step 2: Add Ctrl+B (split at cursor) hotkey to onKeyDown**

In the `onKeyDown` function, add this block after the Cmd+V block (after its closing `return`):

```ts
  // Ctrl+B — split selected effect at cursor
  if (isMeta && e.key === 'b') {
    if (isEditable) return
    e.preventDefault()
    const inst = effectStore.selectedInstance
    if (!inst) return
    const playhead = timelineStore.globalTime
    if (playhead <= inst.startTime || playhead >= inst.startTime + inst.duration) return
    undoStore.push()
    const leftDuration = playhead - inst.startTime
    const rightDuration = inst.duration - leftDuration
    // Shorten the original to the left half
    effectStore.updateInstance(inst.id, { duration: leftDuration })
    // Create right half
    const newId = effectStore.addInstance(
      inst.definitionName,
      playhead,
      rightDuration,
      inst.trackIndex
    )
    effectStore.updateInstance(newId, { params: JSON.parse(JSON.stringify(inst.params)) })
    selectionStore.setOnly(newId)
    effectStore.selectInstance(newId)
    return
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TimelinePanel.vue
git commit -m "feat(hotkeys): Space play/pause, Ctrl+B split effect at cursor"
```

---

## Task 6: ParameterPanel — start_time / duration inputs

**Files:**
- Modify: `src/components/ParameterPanel.vue`

- [ ] **Step 1: Add timing inputs to template**

In `ParameterPanel.vue` template, find the `<div class="param_effect_title">` block and add the timing inputs **right after** it (before the colour picker group):

```html
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
```

- [ ] **Step 2: Add computed and handlers in script**

In `ParameterPanel.vue` `<script setup>`, add imports:

```ts
import { useUndoStore } from '../stores/undoStore'
const undoStore = useUndoStore()
```

Add computed:

```ts
const displayInstance = computed(() =>
  displayKind.value === 'instance' ? effectStore.selectedInstance : null
)
```

Add handlers:

```ts
function onStartTimeChange(event: Event) {
  const inst = effectStore.selectedInstance
  if (!inst) return
  const secs = parseFloat((event.target as HTMLInputElement).value)
  if (isNaN(secs) || secs < 0) return
  undoStore.push()
  effectStore.updateInstance(inst.id, { startTime: Math.round(secs * 1000) })
}

function onDurationChange(event: Event) {
  const inst = effectStore.selectedInstance
  if (!inst) return
  const secs = parseFloat((event.target as HTMLInputElement).value)
  if (isNaN(secs) || secs < 0.001) return
  undoStore.push()
  effectStore.updateInstance(inst.id, { duration: Math.round(secs * 1000) })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ParameterPanel.vue
git commit -m "feat(params): editable start_time and duration in ParameterPanel"
```

---

## Task 7: Remove dead server routes

**Files:**
- Modify: `src/server/server.js`

- [ ] **Step 1: Remove /gettime and /settime**

Open `src/server/server.js` and delete these two route blocks (around lines 288–298):

```js
// DELETE THIS BLOCK:
app.get('/gettime', (req, res) => {
    const ID = parseInt(req.query.id);  // 從查詢參數中取得ID
    var now = new Date();
    last_connect_time[ID] = now.getTime();
    res.send(time.toString());
});
app.post('/settime', (req, res) => {
    time = req.body.time;
    //console.log(`Received time: ${time} ms`);
    res.status(200).send('Time updated');
});
```

Also find and delete the `var time = ...` (or `let time = ...`) variable declaration at the top of server.js if it is only referenced by these two deleted routes. Search for `time` at module scope — if it appears in other routes, leave it.

- [ ] **Step 2: Verify server still starts**

```bash
node src/server/server.js &
sleep 1
curl http://localhost:20480/health
kill %1
```

Expected: `ok` response (or similar), no crash.

- [ ] **Step 3: Commit**

```bash
git add src/server/server.js
git commit -m "refactor(server): remove dead /settime and /gettime routes"
```

---

## Task 8: App.vue — EDIT / PERFORM toggle switch

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Import uiStore in App.vue**

In `<script setup>`, add:

```ts
import { useUiStore } from './stores/uiStore'
const uiStore = useUiStore()
```

- [ ] **Step 2: Add toggle switch to toolbar template**

In `App.vue` `<header class="toolbar">`, add the toggle **after** the server-status span and **before** the 儲存專案 button:

```html
<!-- Edit / Perform toggle -->
<label class="mode-toggle" :class="uiStore.appMode">
  <input
    type="checkbox"
    class="mode-toggle__input"
    :checked="uiStore.appMode === 'perform'"
    @change="uiStore.toggleMode()"
  />
  <span class="mode-toggle__track">
    <span class="mode-toggle__thumb"></span>
  </span>
  <span class="mode-toggle__label">{{ uiStore.appMode === 'edit' ? 'EDIT' : 'PERFORM' }}</span>
</label>
```

- [ ] **Step 3: Add CSS for toggle switch**

In `App.vue` `<style scoped>`, add:

```css
.mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}
.mode-toggle__input {
  display: none;
}
.mode-toggle__track {
  position: relative;
  width: 40px;
  height: 22px;
  background: #555;
  border-radius: 11px;
  transition: background 0.2s;
}
.mode-toggle.perform .mode-toggle__track {
  background: #e05a00;
}
.mode-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.mode-toggle.perform .mode-toggle__thumb {
  transform: translateX(18px);
}
.mode-toggle__label {
  font-size: 0.75rem;
  font-weight: bold;
  min-width: 54px;
  color: #ccc;
}
.mode-toggle.perform .mode-toggle__label {
  color: #e05a00;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat(ui): add Edit/Perform mode toggle switch in toolbar"
```

---

## Task 9: TrackCanvas + AssetLibrary — perform mode guard

**Files:**
- Modify: `src/components/TrackCanvas.vue`
- Modify: `src/components/AssetLibrary.vue`

### TrackCanvas

- [ ] **Step 1: Import uiStore in TrackCanvas.vue**

In `<script setup>`:

```ts
import { useUiStore } from '../stores/uiStore'
const uiStore = useUiStore()
```

- [ ] **Step 2: Watch appMode to lock/unlock fabric canvas**

Add a watch after the existing `watch(trackInstances, syncFromStore)` line:

```ts
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
```

- [ ] **Step 3: Also lock new blocks added while in perform mode**

In `syncFromStore()`, after `block.render()` add:

```ts
if (uiStore.appMode === 'perform') {
  block.fabricGroup?.set({ evented: false, selectable: false })
}
```

- [ ] **Step 4: Guard the drop handler**

In the `canvasContainer?.addEventListener('drop', ...)` handler, add at the top:

```ts
if (uiStore.appMode === 'perform') return
```

### AssetLibrary

- [ ] **Step 5: Import uiStore in AssetLibrary.vue**

In `<script setup>`:

```ts
import { useUiStore } from '../stores/uiStore'
const uiStore = useUiStore()
```

- [ ] **Step 6: Guard onDragStart**

Replace `onDragStart`:

```ts
function onDragStart(event: DragEvent, definitionName: string) {
  if (uiStore.appMode === 'perform') {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('text/plain', definitionName)
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/TrackCanvas.vue src/components/AssetLibrary.vue
git commit -m "feat(perform): lock TrackCanvas drag and AssetLibrary drag in perform mode"
```

---

## Task 10: ParameterPanel — disable in perform mode

**Files:**
- Modify: `src/components/ParameterPanel.vue`

- [ ] **Step 1: Import uiStore**

In `<script setup>`, add:

```ts
import { useUiStore } from '../stores/uiStore'
const uiStore = useUiStore()
```

- [ ] **Step 2: Add isPerform computed**

```ts
const isPerform = computed(() => uiStore.appMode === 'perform')
```

- [ ] **Step 3: Disable all interactive elements in perform mode**

Add `:disabled="isPerform"` to every `<input>`, `<button>`, and `<select>` inside `<div v-show="activeTab === 'param'" ...>`. Specifically:

1. The color picker `<input type="color" ...>` → add `:disabled="isPerform"`
2. All `<HsvChannelGroup>` components → add `:disabled="isPerform"` prop (see note below)
3. `<ExtraParamsGroup>` → add `:disabled="isPerform"` prop (see note below)
4. `<button class="save-custom-btn" ...>` → add `:disabled="isPerform"`
5. `<button class="delete-custom-btn" ...>` → add `:disabled="isPerform"`
6. The timing inputs added in Task 6 → add `:disabled="isPerform"` to both

**Note on HsvChannelGroup / ExtraParamsGroup:** If these components don't already accept a `disabled` prop, a simpler approach is to wrap the whole param body in a `<fieldset :disabled="isPerform">`:

Replace `<div v-show="activeTab === 'param'" class="param_body param_body--param">` with:

```html
<fieldset v-show="activeTab === 'param'" class="param_body param_body--param" :disabled="isPerform" style="border:none;padding:0;margin:0;">
```

And close with `</fieldset>` instead of `</div>`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ParameterPanel.vue
git commit -m "feat(perform): disable ParameterPanel in perform mode"
```

---

## Task 11: TimelinePanel — hide edit controls in perform mode

**Files:**
- Modify: `src/components/TimelinePanel.vue`

- [ ] **Step 1: Import uiStore**

In `<script setup>`, add:

```ts
import { useUiStore } from '../stores/uiStore'
const uiStore = useUiStore()
```

- [ ] **Step 2: Wrap edit-only controls with v-if**

In the template, wrap the following sections with `v-if="uiStore.appMode === 'edit'"`:

1. The track-actions block for 新增/刪除軌道:
```html
<div v-if="uiStore.appMode === 'edit'" class="track-actions">
  <button @click="timelineStore.addTrack()">+ 新增軌道</button>
  <button
    :disabled="timelineStore.tracks.length <= 1"
    @click="openDeleteDialog"
  >− 刪除軌道</button>
</div>
```

2. The track-actions block for 匯入/匯出 JSON:
```html
<div v-if="uiStore.appMode === 'edit'" class="track-actions">
  <label class="load-audio-btn">
    匯入 JSON
    <input type="file" accept=".json" hidden @change="handleImportJson" />
  </label>
  <button @click="exportJson">匯出 JSON</button>
</div>
```

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```

Expected: All existing tests PASS plus new uiStore and audioStore tests.

- [ ] **Step 4: Commit**

```bash
git add src/components/TimelinePanel.vue
git commit -m "feat(perform): hide edit controls in TimelinePanel perform mode"
```

---

## Final Verification

- [ ] Start the dev server: `npm run dev`
- [ ] Load an audio file, change speed slider to 0.5 → playback slows down, cursor follows
- [ ] Press Space → play/pause toggles
- [ ] Select an effect, seek cursor inside it, press Ctrl+B → effect splits into two
- [ ] Select an effect → param panel shows start_time and duration; edit both
- [ ] Toggle to PERFORM → cannot drag effects, cannot change params, track add/delete hidden; can still play/pause/seek
- [ ] Toggle back to EDIT → everything editable again
- [ ] Check server.js `/gettime` and `/settime` are gone
