# Multi-select / Cut / Copy / Paste / Undo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Shift+click multi-select, Cmd+X/C/V cut/copy/paste (paste at playhead), Backspace delete, and Cmd+Z multi-step undo to timeline effect blocks within a single track.

**Architecture:** Two new Pinia stores (`selectionStore` for selected IDs + clipboard, `undoStore` for snapshot-based history) keep `effectStore` clean. EffectBlock gains Shift+click awareness and a `setHighlight()` method. TrackCanvas watches selection state to sync visuals and pushes undo on drag/scale/drop. TimelinePanel handles all keyboard shortcuts.

**Tech Stack:** Vue 3, Pinia, Fabric.js v6, Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/stores/selectionStore.ts` | CREATE | Selected IDs + clipboard state |
| `src/stores/undoStore.ts` | CREATE | Snapshot-based undo stack |
| `src/stores/effectStore.ts` | MODIFY | Add `restoreInstances()` action |
| `src/lib/EffectBlock.ts` | MODIFY | Shift+click, `setHighlight()`, undo on drag/scale |
| `src/components/TrackCanvas.vue` | MODIFY | Watch selection, empty-click clear, undo on drop |
| `src/components/TimelinePanel.vue` | MODIFY | Keyboard: Backspace, Cmd+X/C/V/Z |
| `src/tests/selectionStore.test.ts` | CREATE | Unit tests for selectionStore |
| `src/tests/undoStore.test.ts` | CREATE | Unit tests for undoStore |

---

## Task 1: selectionStore — state + actions

**Files:**
- Create: `src/stores/selectionStore.ts`
- Create: `src/tests/selectionStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/selectionStore.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSelectionStore } from '../stores/selectionStore'
import { useEffectStore } from '../stores/effectStore'

describe('selectionStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初始狀態 selectedIds 為空，clipboard 為 null', () => {
    const store = useSelectionStore()
    expect(store.selectedIds).toHaveLength(0)
    expect(store.clipboard).toBeNull()
  })

  it('setOnly 清除其他選取並只選一個 id', () => {
    const store = useSelectionStore()
    store.setOnly('a')
    store.setOnly('b')
    expect(store.selectedIds).toEqual(['b'])
  })

  it('toggle 加入未選取的 id', () => {
    const store = useSelectionStore()
    store.toggle('a')
    expect(store.selectedIds).toContain('a')
  })

  it('toggle 移除已選取的 id', () => {
    const store = useSelectionStore()
    store.toggle('a')
    store.toggle('a')
    expect(store.selectedIds).not.toContain('a')
  })

  it('clear 清空 selectedIds', () => {
    const store = useSelectionStore()
    store.setOnly('a')
    store.clear()
    expect(store.selectedIds).toHaveLength(0)
  })

  it('setCopy 深拷貝 instances，移除 id，記錄 anchorTime', () => {
    const effectStore = useEffectStore()
    const store = useSelectionStore()
    const id1 = effectStore.addInstance('純色', 1000, 3000, 0)
    const id2 = effectStore.addInstance('純色', 4000, 2000, 0)
    const instances = effectStore.instances.filter(i => [id1, id2].includes(i.id))
    store.setCopy(instances)
    expect(store.clipboard).toHaveLength(2)
    expect(store.clipboardAnchorTime).toBe(1000)
    store.clipboard!.forEach(entry => {
      expect('id' in entry).toBe(false)
    })
  })

  it('setCopy 空陣列時不修改 clipboard', () => {
    const store = useSelectionStore()
    store.setCopy([])
    expect(store.clipboard).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/candle/light_light_light/ES-Lux-master/LightPOV/ControlPanel_v3
npm test -- selectionStore
```

Expected: FAIL with "Cannot find module '../stores/selectionStore'"

- [ ] **Step 3: Create selectionStore**

Create `src/stores/selectionStore.ts`:

```ts
import { defineStore } from 'pinia'
import type { EffectInstance } from '../types'

type ClipboardEntry = Omit<EffectInstance, 'id'>

interface SelectionState {
  selectedIds: string[]
  clipboard: ClipboardEntry[] | null
  clipboardAnchorTime: number
}

export const useSelectionStore = defineStore('selection', {
  state: (): SelectionState => ({
    selectedIds: [],
    clipboard: null,
    clipboardAnchorTime: 0,
  }),

  actions: {
    setOnly(id: string): void {
      this.selectedIds = [id]
    },

    toggle(id: string): void {
      const idx = this.selectedIds.indexOf(id)
      if (idx === -1) this.selectedIds.push(id)
      else this.selectedIds.splice(idx, 1)
    },

    clear(): void {
      this.selectedIds = []
    },

    setCopy(instances: EffectInstance[]): void {
      if (instances.length === 0) return
      this.clipboardAnchorTime = Math.min(...instances.map(i => i.startTime))
      this.clipboard = instances.map(({ id: _id, ...rest }) =>
        JSON.parse(JSON.stringify(rest)) as ClipboardEntry
      )
    },
  },
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- selectionStore
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/selectionStore.ts src/tests/selectionStore.test.ts
git commit -m "feat: add selectionStore for multi-select and clipboard state"
```

---

## Task 2: undoStore + effectStore.restoreInstances

**Files:**
- Create: `src/stores/undoStore.ts`
- Create: `src/tests/undoStore.test.ts`
- Modify: `src/stores/effectStore.ts` (add `restoreInstances` action)

- [ ] **Step 1: Write the failing tests**

Create `src/tests/undoStore.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUndoStore } from '../stores/undoStore'
import { useEffectStore } from '../stores/effectStore'
import { useSelectionStore } from '../stores/selectionStore'

describe('undoStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初始 stack 為空', () => {
    expect(useUndoStore().stack).toHaveLength(0)
  })

  it('push 存下 effectStore.instances 的深拷貝快照', () => {
    const undoStore = useUndoStore()
    const effectStore = useEffectStore()
    effectStore.addInstance('純色', 0, 3000, 0)
    undoStore.push()
    expect(undoStore.stack).toHaveLength(1)
    expect(undoStore.stack[0]).toHaveLength(1)
    // 確認是深拷貝（修改 store 不影響快照）
    effectStore.addInstance('純色', 5000, 3000, 0)
    expect(undoStore.stack[0]).toHaveLength(1)
  })

  it('undo 還原 instances 並清空選取', () => {
    const undoStore = useUndoStore()
    const effectStore = useEffectStore()
    const selectionStore = useSelectionStore()

    effectStore.addInstance('純色', 0, 3000, 0)
    undoStore.push()
    const id2 = effectStore.addInstance('純色', 5000, 3000, 0)
    selectionStore.setOnly(id2)
    effectStore.selectInstance(id2)

    undoStore.undo()

    expect(effectStore.instances).toHaveLength(1)
    expect(selectionStore.selectedIds).toHaveLength(0)
    expect(effectStore.selectedInstanceId).toBeNull()
  })

  it('stack 超過 50 步時移除最舊快照', () => {
    const undoStore = useUndoStore()
    for (let i = 0; i < 55; i++) undoStore.push()
    expect(undoStore.stack.length).toBeLessThanOrEqual(50)
  })

  it('stack 為空時 undo 不拋出錯誤，不改變 instances', () => {
    const undoStore = useUndoStore()
    const effectStore = useEffectStore()
    effectStore.addInstance('純色', 0, 3000, 0)
    expect(() => undoStore.undo()).not.toThrow()
    expect(effectStore.instances).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- undoStore
```

Expected: FAIL with "Cannot find module '../stores/undoStore'"

- [ ] **Step 3: Add `restoreInstances` to effectStore**

In `src/stores/effectStore.ts`, add this action inside the `actions` block (after `clear()`):

```ts
restoreInstances(instances: EffectInstance[]): void {
  this.instances = JSON.parse(JSON.stringify(instances))
  this.selectedInstanceId = null
},
```

Also add the import at top if not already present — `EffectInstance` is already imported via `'../types'`, so no change needed there.

- [ ] **Step 4: Create undoStore**

Create `src/stores/undoStore.ts`:

```ts
import { defineStore } from 'pinia'
import type { EffectInstance } from '../types'
import { useEffectStore } from './effectStore'
import { useSelectionStore } from './selectionStore'

const MAX_STACK = 50

interface UndoState {
  stack: EffectInstance[][]
}

export const useUndoStore = defineStore('undo', {
  state: (): UndoState => ({
    stack: [],
  }),

  actions: {
    push(): void {
      const effectStore = useEffectStore()
      const snapshot: EffectInstance[] = JSON.parse(JSON.stringify(effectStore.instances))
      this.stack.push(snapshot)
      if (this.stack.length > MAX_STACK) this.stack.shift()
    },

    undo(): void {
      if (this.stack.length === 0) return
      const snapshot = this.stack.pop()!
      const effectStore = useEffectStore()
      const selectionStore = useSelectionStore()
      effectStore.restoreInstances(snapshot)
      selectionStore.clear()
    },
  },
})
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- undoStore
```

Expected: all 5 tests PASS

- [ ] **Step 6: Run all tests to confirm nothing broken**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/stores/undoStore.ts src/stores/effectStore.ts src/tests/undoStore.test.ts
git commit -m "feat: add undoStore with snapshot-based undo, add restoreInstances to effectStore"
```

---

## Task 3: EffectBlock — Shift+click, setHighlight, undo on drag/scale

**Files:**
- Modify: `src/lib/EffectBlock.ts`

- [ ] **Step 1: Add imports and `setHighlight` method**

In `src/lib/EffectBlock.ts`, add `useSelectionStore` and `useUndoStore` imports:

```ts
import * as fabric from 'fabric'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useSelectionStore } from '../stores/selectionStore'
import { useUndoStore } from '../stores/undoStore'
import type { EffectParams } from '../types'
```

Then add the `setHighlight` method to the `EffectBlock` class, after the `reposition()` method:

```ts
setHighlight(selected: boolean): void {
  if (!this.fabricGroup) return
  const bgRect = this.fabricGroup.item(0) as fabric.Rect
  bgRect.set({
    stroke: selected ? '#4a9eff' : '#888',
    strokeWidth: selected ? 2 : 1,
  })
  this._canvas.requestRenderAll()
}
```

- [ ] **Step 2: Update `_bindEvents` — Shift+click + undo on drag/scale**

Replace the entire `_bindEvents` method in `src/lib/EffectBlock.ts`:

```ts
private _bindEvents(canvas: fabric.Canvas) {
  const group = this.fabricGroup!
  const timelineStore = useTimelineStore()
  const effectStore = useEffectStore()
  const selectionStore = useSelectionStore()
  const undoStore = useUndoStore()

  let gestureSnapped = false

  group.on('mousedown', (opt) => {
    gestureSnapped = false
    const isShift = (opt.e as MouseEvent).shiftKey
    if (isShift) {
      selectionStore.toggle(this.id)
    } else {
      selectionStore.setOnly(this.id)
      effectStore.selectInstance(this.id)
    }
  })

  group.on('moving', () => {
    if (!gestureSnapped) {
      undoStore.push()
      gestureSnapped = true
    }
    const bounds = this._getSafeBoundaries(canvas)
    const currentWidth = group.getScaledWidth()
    if (group.left < bounds.minX) group.left = bounds.minX
    if (group.left + currentWidth > bounds.maxX) group.left = bounds.maxX - currentWidth

    this.startTime = timelineStore.pixelToMs(group.left)
  })

  group.on('scaling', () => {
    if (!gestureSnapped) {
      undoStore.push()
      gestureSnapped = true
    }
    const bounds = this._getSafeBoundaries(canvas)
    const currentWidth = group.getScaledWidth()
    const textObj = group.item(1) as fabric.FabricText

    textObj.set({ scaleX: 1 / group.scaleX, scaleY: 1 / group.scaleY })

    if (group.left < bounds.minX) group.left = bounds.minX
    if (group.left + currentWidth > bounds.maxX) {
      const maxWidth = bounds.maxX - group.left
      group.scaleX = maxWidth / group.width
    }

    this.duration = group.getScaledWidth() * timelineStore.secondsPerPixel * 1000
    this.startTime = timelineStore.pixelToMs(group.left)
  })

  group.on('modified', () => {
    effectStore.updateInstance(this.id, {
      startTime: this.startTime,
      duration: this.duration,
    })
  })
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS (EffectBlock has no unit tests — verify no compile errors)

- [ ] **Step 4: Commit**

```bash
git add src/lib/EffectBlock.ts
git commit -m "feat: EffectBlock — Shift+click multi-select, setHighlight, undo on drag/scale"
```

---

## Task 4: TrackCanvas — watch selection, empty-click, undo on drop

**Files:**
- Modify: `src/components/TrackCanvas.vue`

- [ ] **Step 1: Add imports**

In `src/components/TrackCanvas.vue`, update the imports:

```ts
import { computed, onMounted, onUnmounted, watch } from 'vue'
import * as fabric from 'fabric'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useSelectionStore } from '../stores/selectionStore'
import { useUndoStore } from '../stores/undoStore'
import EffectBlock from '../lib/EffectBlock'
```

And add store instances in the `<script setup>` block after existing stores:

```ts
const effectStore = useEffectStore()
const timelineStore = useTimelineStore()
const selectionStore = useSelectionStore()
const undoStore = useUndoStore()
```

- [ ] **Step 2: Watch selectionStore to sync highlight on all blocks**

Add this watch after the existing watches (after `watch(trackInstances, syncFromStore)`):

```ts
watch(
  () => selectionStore.selectedIds,
  (ids) => {
    for (const [id, block] of blockMap.entries()) {
      block.setHighlight(ids.includes(id))
    }
  },
  { deep: true }
)
```

- [ ] **Step 3: Add empty-canvas click handler in onMounted**

Inside `onMounted`, after `syncFromStore()`, add this canvas event listener:

```ts
canvas.on('mouse:down', (opt) => {
  if (!opt.target) {
    selectionStore.clear()
    effectStore.selectInstance(null)
  }
})
```

- [ ] **Step 4: Push undo before addInstance in drop handler**

In `onMounted`, update the `drop` event handler so it pushes undo before adding the instance:

```ts
canvasContainer?.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const definitionName = e.dataTransfer?.getData('text/plain')
  if (!definitionName) return
  const startTime = timelineStore.pixelToMs(e.offsetX)
  undoStore.push()
  effectStore.addInstance(definitionName, startTime, 3000, props.trackIndex)
})
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/TrackCanvas.vue
git commit -m "feat: TrackCanvas — sync highlight from selectionStore, clear on empty click, undo on drop"
```

---

## Task 5: TimelinePanel — keyboard handlers

**Files:**
- Modify: `src/components/TimelinePanel.vue`

- [ ] **Step 1: Add imports**

In `src/components/TimelinePanel.vue`, add imports for the two new stores:

```ts
import { useSelectionStore } from '../stores/selectionStore'
import { useUndoStore } from '../stores/undoStore'
```

And add store instances after the existing store declarations:

```ts
const selectionStore = useSelectionStore()
const undoStore = useUndoStore()
```

- [ ] **Step 2: Replace `onKeyDown` with the multi-select version**

Replace the existing `onKeyDown` function entirely:

```ts
function onKeyDown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
  const isMeta = e.metaKey || e.ctrlKey

  // Cmd+Z — undo
  if (isMeta && e.key === 'z' && !e.shiftKey) {
    if (isEditable) return
    e.preventDefault()
    undoStore.undo()
    return
  }

  // Cmd+X — cut
  if (isMeta && e.key === 'x') {
    if (isEditable) return
    e.preventDefault()
    const ids = [...selectionStore.selectedIds]   // snapshot before mutations
    if (ids.length === 0) return
    const instances = effectStore.instances.filter(i => ids.includes(i.id))
    selectionStore.setCopy(instances)
    undoStore.push()
    ids.forEach(id => effectStore.removeInstance(id))
    selectionStore.clear()
    effectStore.selectInstance(null)
    return
  }

  // Cmd+C — copy
  if (isMeta && e.key === 'c') {
    if (isEditable) return
    e.preventDefault()
    const ids = [...selectionStore.selectedIds]   // snapshot
    if (ids.length === 0) return
    const instances = effectStore.instances.filter(i => ids.includes(i.id))
    selectionStore.setCopy(instances)
    return
  }

  // Cmd+V — paste at playhead
  if (isMeta && e.key === 'v') {
    if (isEditable) return
    e.preventDefault()
    const { clipboard, clipboardAnchorTime } = selectionStore
    if (!clipboard || clipboard.length === 0) return
    undoStore.push()
    const playhead = timelineStore.globalTime
    const newIds: string[] = []
    for (const entry of clipboard) {
      const newStartTime = playhead + (entry.startTime - clipboardAnchorTime)
      const newId = effectStore.addInstance(
        entry.definitionName,
        newStartTime,
        entry.duration,
        entry.trackIndex
      )
      effectStore.updateInstance(newId, { params: JSON.parse(JSON.stringify(entry.params)) })
      newIds.push(newId)
    }
    selectionStore.selectedIds = newIds
    if (newIds.length === 1) effectStore.selectInstance(newIds[0])
    return
  }

  // Backspace — delete selected (multi or single)
  if (e.key === 'Backspace') {
    if (isEditable) return
    e.preventDefault()
    const multiIds = [...selectionStore.selectedIds]   // snapshot before mutations
    if (multiIds.length > 0) {
      undoStore.push()
      multiIds.forEach(id => effectStore.removeInstance(id))
      selectionStore.clear()
      effectStore.selectInstance(null)
    } else {
      const id = effectStore.selectedInstanceId
      if (id) {
        undoStore.push()
        effectStore.removeInstance(id)
      }
    }
    return
  }

  // Escape — clear selection
  if (e.key === 'Escape') {
    selectionStore.clear()
  }
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/TimelinePanel.vue
git commit -m "feat: TimelinePanel — Backspace multi-delete, Cmd+X/C/V cut/copy/paste, Cmd+Z undo"
```

---

## Task 6: Manual verification checklist

Start the dev server and verify all interactions work:

```bash
npm run dev
```

- [ ] **Shift+click** selects multiple blocks on same track (blue border)
- [ ] **Plain click** on a block deselects others, selects one
- [ ] **Click empty canvas** clears all selection
- [ ] **Escape** clears selection
- [ ] **Backspace** with one block selected deletes it
- [ ] **Backspace** with multiple selected deletes all
- [ ] **Cmd+Z** restores deleted blocks
- [ ] **Cmd+Z** multiple times walks back through history
- [ ] **Cmd+C** then **Cmd+V** pastes copies at playhead position
- [ ] **Cmd+X** removes selected blocks, **Cmd+V** pastes at playhead
- [ ] Multiple pasted blocks maintain relative spacing
- [ ] Drag a block, **Cmd+Z** restores its position
- [ ] Drop new block from library, **Cmd+Z** removes it

- [ ] **Final commit**

```bash
git add -p   # review any remaining unstaged changes
git commit -m "feat: multi-select cut/copy/paste undo complete"
```
