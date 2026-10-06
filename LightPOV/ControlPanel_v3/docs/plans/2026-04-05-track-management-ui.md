# Track Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將「新增軌道」移至右上角、加入軌道名稱欄（可 inline 編輯）、以及透過 Dialog 刪除指定軌道。

**Architecture:** 重構 `timelineStore` 以穩定 track ID 取代純數字計數，讓 Vue 的 v-for key 能正確追蹤每條軌道；`TimelinePanel.vue` 負責所有 UI 互動（按鈕、Dialog、inline 編輯）與跨 store 協調（刪除時同步清理 effectStore instances）。

**Tech Stack:** Vue 3 Composition API, Pinia, Vitest, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-05-track-management-ui-design.md`

---

### Task 1: 重構 `timelineStore` — trackCount → tracks[]

**Files:**
- Modify: `src/stores/timelineStore.ts`
- Create: `src/tests/timelineStore.test.ts`

- [ ] **Step 1: 建立 store 測試檔（先寫測試）**

建立 `src/tests/timelineStore.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTimelineStore } from '../stores/timelineStore'

describe('timelineStore — track management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始狀態有一條軌道，名稱為「軌道 1」', () => {
    const store = useTimelineStore()
    expect(store.tracks).toHaveLength(1)
    expect(store.tracks[0].name).toBe('軌道 1')
    expect(store.tracks[0].id).toBeTruthy()
  })

  it('addTrack 新增一條軌道，名稱為「軌道 N」', () => {
    const store = useTimelineStore()
    store.addTrack()
    expect(store.tracks).toHaveLength(2)
    expect(store.tracks[1].name).toBe('軌道 2')
  })

  it('removeTrack 移除指定 id 的軌道', () => {
    const store = useTimelineStore()
    store.addTrack()
    const idToRemove = store.tracks[0].id
    store.removeTrack(idToRemove)
    expect(store.tracks).toHaveLength(1)
    expect(store.tracks.find(t => t.id === idToRemove)).toBeUndefined()
  })

  it('renameTrack 更新指定 id 的軌道名稱', () => {
    const store = useTimelineStore()
    const id = store.tracks[0].id
    store.renameTrack(id, '主軌道')
    expect(store.tracks[0].name).toBe('主軌道')
  })
})
```

- [ ] **Step 2: 執行測試，確認全部失敗**

```bash
cd /Users/candle/light_light_light/ES-Lux-master/LightPOV/ControlPanel_v3
npm test -- src/tests/timelineStore.test.ts
```

Expected: 4 tests FAIL（`tracks is not a function` 或類似錯誤）

- [ ] **Step 3: 重構 `timelineStore.ts`**

將 `src/stores/timelineStore.ts` 完整替換為：

```ts
import { defineStore } from 'pinia'

interface Track {
  id: string
  name: string
}

interface TimelineState {
  secondsPerPixel: number
  timelineOffset: number
  globalTime: number
  isPlaying: boolean
  totalDuration: number
  tracks: Track[]
}

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    secondsPerPixel: 0.01,
    timelineOffset: 0,
    globalTime: 0,
    isPlaying: false,
    totalDuration: 60_000,
    tracks: [{ id: 'track-0', name: '軌道 1' }],
  }),

  getters: {
    playheadPixel: (state): number =>
      (state.globalTime / 1000) / state.secondsPerPixel - state.timelineOffset,

    msToPixel: (state) => (ms: number): number =>
      (ms / 1000) / state.secondsPerPixel - state.timelineOffset,

    pixelToMs: (state) => (px: number): number =>
      (px + state.timelineOffset) * state.secondsPerPixel * 1000,
  },

  actions: {
    setTime(ms: number): void {
      this.globalTime = Math.max(0, Math.min(ms, this.totalDuration))
    },

    setPlaying(playing: boolean): void {
      this.isPlaying = playing
    },

    zoom(factor: number, anchorPixel: number): void {
      const anchorMs = this.pixelToMs(anchorPixel)
      this.secondsPerPixel = Math.max(0.003, Math.min(0.5, this.secondsPerPixel * factor))
      this.timelineOffset = (anchorMs / 1000) / this.secondsPerPixel - anchorPixel
    },

    setOffset(offset: number): void {
      this.timelineOffset = Math.max(0, offset)
    },

    setTotalDuration(ms: number): void {
      this.totalDuration = ms
    },

    addTrack(): void {
      const n = this.tracks.length + 1
      this.tracks.push({ id: `track-${Date.now()}`, name: `軌道 ${n}` })
    },

    removeTrack(id: string): void {
      this.tracks = this.tracks.filter(t => t.id !== id)
    },

    renameTrack(id: string, name: string): void {
      const track = this.tracks.find(t => t.id === id)
      if (track) track.name = name
    },
  },
})
```

- [ ] **Step 4: 執行測試，確認全部通過**

```bash
npm test -- src/tests/timelineStore.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: 確認現有 serializer 測試不受影響**

```bash
npm test -- src/tests/serializer.test.ts
```

Expected: 全部 PASS（serializer 不依賴 timelineStore）

- [ ] **Step 6: Commit**

```bash
git add src/stores/timelineStore.ts src/tests/timelineStore.test.ts
git commit -m "refactor: replace trackCount with tracks[] in timelineStore, add removeTrack/renameTrack"
```

---

### Task 2: 新增 CSS classes

**Files:**
- Modify: `src/css/style.css`

- [ ] **Step 1: 在 `style.css` 的 `/* ========== TimelinePanel ========== */` 區塊之後加入以下樣式**

找到 `.add-track-btn` 與 `.add-track-btn:hover` 區塊，**整段替換**為以下內容（移除舊的 add-track-btn 並加入新 class）：

```css
/* 右上角新增/刪除按鈕群 */
.track-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
  align-items: center;
}

/* 軌道列（label + canvas 的容器） */
.track-row {
  display: flex;
  height: 40px;
  border-bottom: 1px solid #2a2a2a;
}

/* 左側軌道名稱欄 */
.track-label {
  width: 72px;
  flex-shrink: 0;
  background: #222;
  border-right: 1px solid #333;
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
}

.track-label span {
  font-size: 11px;
  color: #888;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.track-label span:hover {
  color: #ccc;
}

/* Inline 編輯輸入框 */
.track-name-input {
  width: 100%;
  font-size: 11px;
  background: #1a2332;
  border: 1px solid #4fb3d6;
  border-radius: 3px;
  color: #d0eaff;
  padding: 2px 4px;
  outline: none;
}

/* 刪除 dialog 軌道清單 */
.track-delete-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
  max-height: 200px;
  overflow-y: auto;
}

.track-delete-item {
  padding: 7px 12px;
  border-radius: 5px;
  border: 1px solid #2e3e50;
  background: #0f1c2a;
  color: #aac8de;
  font-size: 13px;
  cursor: pointer;
}

.track-delete-item:hover {
  background: #1a2a3a;
}

.track-delete-item.selected {
  border-color: #ff5555;
  background: #2a1010;
  color: #ff9090;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/css/style.css
git commit -m "style: add track-row, track-label, track-actions, track-delete CSS classes"
```

---

### Task 3: 重構 `TimelinePanel.vue` — template、script、刪除 Dialog

**Files:**
- Modify: `src/components/TimelinePanel.vue`

此 task 將 template 與 script 一次整合完成，分為三個 step。

- [ ] **Step 1: 更新 `<template>` 中的 playback_controls 與 tracks_container**

找到 `TimelinePanel.vue` 的 `<template>` 區塊，做以下兩處修改：

**修改一：** 在 `.playback_controls` 內，將原本的按鈕區末尾（`</div>` 之前）加入 track-actions：

```html
    <!-- 音檔名稱 -->
    <span v-if="audioStore.hasAudio" class="audio-name">{{ audioStore.fileName }}</span>

    <!-- 新增 / 刪除軌道 -->
    <div class="track-actions">
      <button @click="timelineStore.addTrack()">+ 新增軌道</button>
      <button
        :disabled="timelineStore.tracks.length <= 1"
        @click="openDeleteDialog"
      >− 刪除軌道</button>
    </div>
  </div>
```

**修改二：** 將 `tracks_container` 內的 `<TrackCanvas>` v-for 改為帶 wrapper 的 track-row：

```html
    <!-- 動態軌道 -->
    <div
      ref="tracksContainerRef"
      class="tracks_container"
      @wheel.prevent="onWheel"
    >
      <div
        class="track-row"
        v-for="(track, index) in timelineStore.tracks"
        :key="track.id"
      >
        <div class="track-label">
          <span
            v-if="editingTrackId !== track.id"
            @click="startEdit(track.id)"
          >{{ track.name }}</span>
          <input
            v-else
            class="track-name-input"
            :value="editingName"
            @input="editingName = ($event.target as HTMLInputElement).value"
            @blur="finishEdit(track.id)"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
            @keydown.esc="cancelEdit"
            autofocus
          />
        </div>
        <TrackCanvas :trackIndex="index" />
      </div>
    </div>
```

**移除：** 底部的 `<button class="add-track-btn" ...>` 整行刪除。

**新增 Dialog：** 在 `</div>` 結尾（`timeline_panel` 最後）加入：

```html
    <!-- 刪除軌道 Dialog -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click.self="showDeleteDialog = false">
      <div class="dialog-box">
        <div class="dialog-title">刪除軌道</div>
        <div class="track-delete-list">
          <div
            v-for="track in timelineStore.tracks"
            :key="track.id"
            class="track-delete-item"
            :class="{ selected: deleteTargetId === track.id }"
            @click="deleteTargetId = track.id"
          >{{ track.name }}</div>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn--cancel" @click="showDeleteDialog = false">取消</button>
          <button
            class="dialog-btn dialog-btn--confirm"
            :disabled="!deleteTargetId"
            @click="confirmDelete"
          >刪除</button>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: 更新 `<script setup>` — 新增 import、state 與函式**

在現有 script 的 import 區塊，加入 `nextTick`（如未 import）與 `useEffectStore`：

```ts
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
// ... 其他 import 不變 ...
import { useEffectStore } from '../stores/effectStore'
```

在 `const timelineStore = useTimelineStore()` 後新增：

```ts
const effectStore = useEffectStore()
```

在 script 末尾（`watch(...)` 之後）加入以下所有新函式與 state：

```ts
// ── inline 編輯軌道名稱 ──────────────────────────────────
const editingTrackId = ref<string | null>(null)
const editingName = ref('')

function startEdit(id: string) {
  const track = timelineStore.tracks.find(t => t.id === id)
  if (!track) return
  editingTrackId.value = id
  editingName.value = track.name
}

function finishEdit(id: string) {
  const name = editingName.value.trim()
  if (name) timelineStore.renameTrack(id, name)
  editingTrackId.value = null
}

function cancelEdit() {
  editingTrackId.value = null
}

// ── 刪除軌道 Dialog ──────────────────────────────────────
const showDeleteDialog = ref(false)
const deleteTargetId = ref<string | null>(null)

function openDeleteDialog() {
  deleteTargetId.value = null
  showDeleteDialog.value = true
}

function confirmDelete() {
  const id = deleteTargetId.value
  if (!id) return
  const idx = timelineStore.tracks.findIndex(t => t.id === id)
  // snapshot 先取出，避免 removeInstance 過程中陣列改變
  const toRemove = effectStore.instances
    .filter(i => i.trackIndex === idx)
    .map(i => i.id)
  const toReindex = effectStore.instances
    .filter(i => i.trackIndex > idx)
  toRemove.forEach(instanceId => effectStore.removeInstance(instanceId))
  toReindex.forEach(i => effectStore.updateInstance(i.id, { trackIndex: i.trackIndex - 1 }))
  timelineStore.removeTrack(id)
  showDeleteDialog.value = false
  deleteTargetId.value = null
}
```

- [ ] **Step 3: 啟動 dev server，手動驗證**

```bash
npm run dev
```

驗證清單：
1. **按鈕位置**：`playback_controls` 右側出現「+ 新增軌道」和「− 刪除軌道」，底部無多餘按鈕
2. **軌道名稱**：每條軌道左側顯示「軌道 1」等名稱（72px 欄位）
3. **新增軌道**：點「+ 新增軌道」，出現「軌道 2」，effect canvas 並排
4. **Inline 編輯**：點擊軌道名稱，出現 input；輸入新名稱 + Enter，名稱更新；Esc 取消
5. **刪除按鈕 disabled**：只剩 1 條軌道時「− 刪除軌道」變灰不可按
6. **刪除 Dialog**：有 3 條軌道時點「− 刪除軌道」，Dialog 開啟，清單列出 3 條；點選一條高亮（紅色）；點「刪除」關閉 Dialog，該軌道消失
7. **中間刪除**：刪除第 2 條後，第 3 條正確出現在第 2 列，Fabric.js 內容不錯位
8. **Zoom/Pan sync**（前一個 PR 的功能）：刪除後剩餘軌道的 effect block 仍正確跟隨 zoom/pan

- [ ] **Step 4: Commit**

```bash
git add src/components/TimelinePanel.vue
git commit -m "feat: move add-track btn to top-right, add track labels with inline rename, add delete track dialog"
```

---

## 完整執行順序總結

| Task | 主要檔案 | 重點 |
|------|----------|------|
| 1 | `timelineStore.ts` + test | trackCount → tracks[], TDD |
| 2 | `style.css` | 新增 CSS classes |
| 3 | `TimelinePanel.vue` | template + script + Dialog |
