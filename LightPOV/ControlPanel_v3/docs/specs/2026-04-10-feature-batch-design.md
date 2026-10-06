# Feature Batch Design — 2026-04-10

## 1. 音樂倍速調整 (Audio Playback Rate)

### Goal
Let the user slow down or speed up timeline playback relative to the loaded audio.

### UI
In `TimelinePanel.vue` playback controls bar:
- `<input type="range" min="1" max="4" step="1">` mapped to rates `[0.25, 0.5, 0.75, 1.0]`
- Adjacent `<input type="number" min="0.01" step="0.05">` for custom rate entry
- Both inputs are kept in sync; changing either updates `audioStore.playbackRate`

### State
`audioStore.ts` gains `playbackRate: number` (default `1.0`) and `setPlaybackRate(r: number)`.

### Playback logic
- `audioService.ts`: `startPlayback(offsetMs)` applies rate via `source.playbackRate.value = rate`; new `setPlaybackRate(r)` updates `_sourceNode?.playbackRate.value` live during playback
- `TimelinePanel.tick()`: `elapsed = (performance.now() - playStartWallTime) * audioStore.playbackRate` so the timeline cursor moves at the same rate as audio

---

## 2. 快捷鍵 (Keyboard Shortcuts)

Added to the existing `onKeyDown` handler in `TimelinePanel.vue`.

| Shortcut | Action |
|---|---|
| `Space` | Toggle play / pause (skipped when focus is in an editable element) |
| `Ctrl+B` | Split selected effect at playhead |

### Split-at-cursor (Ctrl+B) logic
1. Get `selectedInstance` from `effectStore`
2. If playhead is NOT inside the instance's `[startTime, startTime+duration)` range → no-op
3. Push undo snapshot
4. Shorten the original instance: `duration = playhead - startTime`
5. Add a new instance with same `definitionName`, `trackIndex`, `params` (deep copy); `startTime = playhead`, `duration = original end - playhead`
6. Select the new (right-hand) instance

---

## 3. ParameterPanel — start_time / duration Editing

### Condition
Only shown when `displayKind === 'instance'` (a timeline block is selected).

### UI
Below the effect name, before the colour picker:
```
開始時間  [______ s]
持續時間  [______ s]
```
Both are `<input type="number" step="0.001">` displaying seconds (ms ÷ 1000).

### Mutation
On blur / Enter: validate > 0, convert to ms, push undo snapshot, call `effectStore.updateInstance(id, { startTime, duration })`.

---

## 4. 刪除 /settime POST API (Dead-code Removal)

`server.js` removes:
- `app.post('/settime', ...)` — sets unused `time` variable
- `app.get('/gettime', ...)` — returns unused `time` variable

Time synchronisation already works via `GET /start?time=` (sets `Time`) + `GET /esp_time` (returns `Time`).

---

## 5. Edit / Perform 模式切換 (Mode Toggle)

### New store: `uiStore.ts`
```ts
appMode: 'edit' | 'perform'   // default 'edit'
toggleMode(): void
```

### UI — App.vue toolbar
CSS toggle switch (pure-CSS checkbox hack) labelled **EDIT / PERFORM**, placed in the toolbar alongside existing controls.

### Perform-mode restrictions (appMode === 'perform')

| Component | Locked behaviour |
|---|---|
| `TrackCanvas` | All mousedown/drag handlers return early → effects cannot be moved, resized, or created |
| `ParameterPanel` | All param inputs and buttons get `disabled` attribute |
| `AssetLibrary` | Drag-to-timeline disabled |
| `TimelinePanel` | 「新增軌道」「刪除軌道」「匯入 JSON」「匯出 JSON」buttons hidden; play/pause/seek remain functional |

### Files changed
- `src/stores/uiStore.ts` — new file
- `src/App.vue` — import uiStore, add toggle switch in toolbar
- `src/components/TrackCanvas.vue` — guard drag handlers with `uiStore.appMode`
- `src/components/ParameterPanel.vue` — bind `disabled` to perform mode
- `src/components/AssetLibrary.vue` — guard drag start with `uiStore.appMode`
- `src/components/TimelinePanel.vue` — conditionally hide edit-only controls
