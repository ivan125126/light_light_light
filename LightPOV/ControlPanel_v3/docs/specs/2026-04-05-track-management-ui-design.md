# Track Management UI Design

**Date:** 2026-04-05  
**Status:** Approved

---

## 背景與目標

目前時間軸的「新增軌道」按鈕位於底部，且沒有刪除個別軌道或重新命名的機制。本次設計目標：

1. 將「新增軌道」移至時間軸右上角，版面更直覺
2. 新增「刪除軌道」功能，透過 Dialog 選取特定軌道刪除
3. 左側加入軌道名稱顯示，支援點擊 inline 編輯

---

## Store 重構：`timelineStore`

### 變更前
```ts
trackCount: number   // 初始值 1
addTrack(): void     // this.trackCount++
```

### 變更後
```ts
tracks: Array<{ id: string; name: string }>  // 初始值 [{ id: 'track-0', name: '軌道 1' }]

addTrack(): void       // push { id: `track-${Date.now()}`, name: `軌道 ${tracks.length + 1}` }
removeTrack(id: string): void   // filter out by id（不處理 effectStore，由呼叫方負責）
renameTrack(id: string, name: string): void  // update name in place
```

**`trackCount` 完全移除。**

---

## 版面變更：`TimelinePanel.vue`

### 1. Playback Controls 右側加兩個按鈕

`.playback_controls` 最右側（`margin-left: auto` 或 `flex spacer`）加入：

```html
<div class="track-actions">
  <button @click="timelineStore.addTrack()">+ 新增軌道</button>
  <button @click="openDeleteDialog">− 刪除軌道</button>
</div>
```

移除底部的 `<button class="add-track-btn">`。

### 2. 每條軌道加 wrapper + 左側名稱欄

`tracks_container` 改為對 `timelineStore.tracks` 做 v-for，key 改用 `track.id`：

```html
<div class="tracks_container">
  <div
    class="track-row"
    v-for="(track, index) in timelineStore.tracks"
    :key="track.id"
  >
    <!-- 左側名稱欄 -->
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
        @keydown.enter="finishEdit(track.id)"
        @keydown.esc="cancelEdit"
        ref="nameInputRef"
        autofocus
      />
    </div>

    <!-- Fabric.js Canvas -->
    <TrackCanvas :trackIndex="index" />
  </div>
</div>
```

Script 新增：
```ts
const editingTrackId = ref<string | null>(null)
const editingName = ref('')

function startEdit(id: string) {
  const track = timelineStore.tracks.find(t => t.id === id)!
  editingTrackId.value = id
  editingName.value = track.name
  nextTick(() => (nameInputRef.value as HTMLInputElement | null)?.focus())
}

function finishEdit(id: string) {
  const name = editingName.value.trim()
  if (name) timelineStore.renameTrack(id, name)
  editingTrackId.value = null
}

function cancelEdit() {
  editingTrackId.value = null
}
```

### 3. 刪除軌道 Dialog

State：
```ts
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
  // snapshot 先取出，避免 removeInstance 過程中 instances 陣列改變
  const toRemove = effectStore.instances.filter(i => i.trackIndex === idx).map(i => i.id)
  const toReindex = effectStore.instances.filter(i => i.trackIndex > idx)
  // 1. 移除此軌道的所有 effect instances
  toRemove.forEach(id => effectStore.removeInstance(id))
  // 2. 上方軌道的 instances reindex
  toReindex.forEach(i => effectStore.updateInstance(i.id, { trackIndex: i.trackIndex - 1 }))
  // 3. 從 store 移除軌道
  timelineStore.removeTrack(id)
  showDeleteDialog.value = false
  deleteTargetId.value = null
}
```

Template（加在 `timeline_panel` 底部）：
```html
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

---

## CSS 新增（`style.css`）

```css
/* 軌道列容器 */
.track-row {
  display: flex;
  height: 40px;
  border-bottom: 1px solid #2a2a2a;
}

/* 左側名稱欄 */
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

/* 右上角按鈕群 */
.track-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
  align-items: center;
}

/* 刪除 dialog 清單 */
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

---

## 修改的檔案

| 檔案 | 變更 |
|------|------|
| `src/stores/timelineStore.ts` | `trackCount` → `tracks[]`，新增 `removeTrack`、`renameTrack` |
| `src/components/TimelinePanel.vue` | 按鈕位置、v-for 改 tracks、track-row wrapper、inline 編輯、刪除 Dialog |
| `src/css/style.css` | 新增 `.track-row`、`.track-label`、`.track-name-input`、`.track-actions`、`.track-delete-list`、`.track-delete-item` |

---

## 驗證方式

1. 啟動 dev server
2. **新增軌道**：右上角「+ 新增軌道」可正常新增，軌道名稱預設為「軌道 N」
3. **重新命名**：點擊左側軌道名稱進入編輯，Enter / 失焦確認，Esc 取消
4. **刪除軌道（中間）**：有 3 條軌道，刪除第 2 條：
   - 第 2 條的 effect block 消失
   - 第 3 條的內容出現在第 2 列，位置對齊正確
   - effectStore 中的 trackIndex 正確遞減
5. **刪除後只剩 1 條**：「− 刪除軌道」按鈕 disabled（不可刪最後一條）
