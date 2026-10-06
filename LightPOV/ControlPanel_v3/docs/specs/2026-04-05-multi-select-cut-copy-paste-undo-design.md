# Multi-select / Cut / Copy / Paste / Undo — Design Spec

Date: 2026-04-05

## Overview

Add multi-select, cut, copy, paste, and multi-step undo to the timeline track blocks. All operations are scoped to a single track (no cross-track selection).

## Constraints

- Multi-select: Shift+click only (no rubber-band)
- Keyboard shortcuts: Cmd/Ctrl+X (cut), Cmd/Ctrl+C (copy), Cmd/Ctrl+V (paste), Cmd/Ctrl+Z (undo)
- Delete: Backspace only (Delete key support removed)
- Paste target: playhead position
- Undo: multi-step, snapshot-based, max 50 steps

---

## Architecture

### New: `selectionStore.ts`

Manages selected instance IDs and clipboard state.

**State:**
```ts
selectedIds: string[]
clipboard: Array<Omit<EffectInstance, 'id'>> | null
clipboardAnchorTime: number   // min startTime of clipboard entries
```

**Actions:**
- `setOnly(id)` — clear selection, select only this id
- `toggle(id)` — add/remove from selectedIds
- `clear()` — clear selectedIds (does not touch effectStore.selectedInstanceId)
- `setCopy(instances)` — deep-copy instances into clipboard, record anchorTime
- `clearClipboard()` — set clipboard to null

### New: `undoStore.ts`

Manages snapshot-based undo history.

**State:**
```ts
stack: EffectInstance[][]   // array of snapshots
```

**Actions:**
- `push()` — deep-copy current `effectStore.instances` and push to stack (cap at 50)
- `undo()` — pop latest snapshot, restore to `effectStore.instances`, clear selection

---

## Modified Files

### `EffectBlock.ts`

- `_bindEvents`: on `mousedown`, check if Shift is held
  - Shift held → `selectionStore.toggle(id)`
  - No Shift → `selectionStore.setOnly(id)` + `effectStore.selectInstance(id)`
- Add `setHighlight(selected: boolean)` method: toggles bgRect `stroke` between `#4a9eff` (width 2) and `#888` (width 1)

### `TrackCanvas.vue`

- Import `selectionStore`
- Watch `selectionStore.selectedIds`: on change, iterate `blockMap` and call `block.setHighlight(selectedIds.includes(id))`
- On canvas `mousedown` on empty area (no object hit): call `selectionStore.clear()` + `effectStore.selectInstance(null)`
- On block `modified` (drag / scale end): call `undoStore.push()` before the store update (move push to `moving`/`scaling` start, not `modified`)

  > Correction: push snapshot on `mousedown` of a block that is about to be dragged/scaled — detect via `object:moving` fired first time. Use a per-drag flag.

- On drop (new block added): call `undoStore.push()` before `effectStore.addInstance()`

### `TimelinePanel.vue`

- Update `onKeyDown`:
  - Remove `Delete` key handling; keep only `Backspace`
  - `Backspace`: if `selectionStore.selectedIds.length > 0`, delete all selected; else fall back to `effectStore.selectedInstanceId` (single-select legacy path)
  - `Cmd/Ctrl+Z`: call `undoStore.undo()`
  - `Cmd/Ctrl+X`: cut selected
  - `Cmd/Ctrl+C`: copy selected
  - `Cmd/Ctrl+V`: paste at playhead
  - `Escape`: `selectionStore.clear()`

---

## Detailed Behavior

### Selection

| Action | Result |
|---|---|
| Plain click on block | `selectionStore.setOnly(id)`, `effectStore.selectInstance(id)` |
| Shift+click on block | `selectionStore.toggle(id)` |
| Click empty canvas area | `selectionStore.clear()`, `effectStore.selectInstance(null)` |
| Escape | `selectionStore.clear()` |

### Backspace — Delete

1. `undoStore.push()`
2. Remove all instances in `selectionStore.selectedIds`
3. `selectionStore.clear()`, `effectStore.selectInstance(null)`

If `selectedIds` is empty but `effectStore.selectedInstanceId` is set, delete that single instance (legacy fallback).

### Cmd+X — Cut

1. `undoStore.push()`
2. Deep-copy selected instances (strip `id`) into `selectionStore.clipboard`; record `clipboardAnchorTime` = min startTime
3. Remove all selected instances from `effectStore`
4. `selectionStore.clear()`

### Cmd+C — Copy

1. Deep-copy selected instances (strip `id`) into `selectionStore.clipboard`; record `clipboardAnchorTime`
2. No undo snapshot (nothing changed)

### Cmd+V — Paste

If clipboard is null: no-op.

1. `undoStore.push()`
2. For each clipboard entry:
   - `newStartTime = timelineStore.globalTime + (entry.startTime − clipboardAnchorTime)`
   - Call `effectStore.addInstance(entry.definitionName, newStartTime, entry.duration, entry.trackIndex)` then patch params
3. Newly added instance IDs become `selectionStore.selectedIds`

### Cmd+Z — Undo

1. Pop latest snapshot from `undoStore.stack`
2. Overwrite `effectStore.instances` with snapshot
3. `selectionStore.clear()`, `effectStore.selectInstance(null)`
4. If stack is empty: no-op

### Undo Snapshot Trigger Points

| Operation | Snapshot triggered by |
|---|---|
| Backspace delete | `onKeyDown` before removal |
| Cmd+X cut | `onKeyDown` before removal |
| Cmd+V paste | `onKeyDown` before add |
| Block drag/scale | `TrackCanvas` on first `object:moving`/`object:scaling` per gesture |
| Drop new block | `TrackCanvas` drop handler before `addInstance` |

---

## Visual Highlight

Selected block: `bgRect.set({ stroke: '#4a9eff', strokeWidth: 2 })`
Unselected block: `bgRect.set({ stroke: '#888', strokeWidth: 1 })`

Called via `EffectBlock.setHighlight(boolean)`, triggered by watching `selectionStore.selectedIds` in `TrackCanvas`.

---

## Files Summary

| File | Action |
|---|---|
| `src/stores/selectionStore.ts` | CREATE |
| `src/stores/undoStore.ts` | CREATE |
| `src/lib/EffectBlock.ts` | MODIFY |
| `src/components/TrackCanvas.vue` | MODIFY |
| `src/components/TimelinePanel.vue` | MODIFY |
