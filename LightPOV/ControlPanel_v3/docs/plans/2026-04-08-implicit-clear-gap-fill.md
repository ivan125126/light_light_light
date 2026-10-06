# Implicit CLEAR Gap-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empty space on a timeline track is implicitly treated as `MODES_CLEAR` during both live preview (cursor) and hardware export (pushToServer), without changing how the timeline looks.

**Architecture:** Two independent inline fixes — `useActiveEffect` returns a CLEAR `EffectData` fallback when no instance covers the current time; `tracksToEffectMap` receives `totalDuration` and inserts CLEAR blocks to fill all gaps before, between, and after effects.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest

---

## Files Modified

| File | Change |
|------|--------|
| `src/tests/useActiveEffect.test.ts` | Update 2 existing tests + add 1 new test |
| `src/composables/useActiveEffect.ts` | Return CLEAR fallback instead of null for empty time |
| `src/tests/serializer.test.ts` | Add gap-fill tests for `tracksToEffectMap` |
| `src/services/serializer.ts` | Add `totalDuration?` param + gap-filling logic to `tracksToEffectMap` |
| `src/stores/projectStore.ts` | Pass `timelineStore.totalDuration` to `tracksToEffectMap` in `pushToServer` |

---

## Task 1: Update useActiveEffect tests

**Files:**
- Modify: `src/tests/useActiveEffect.test.ts`

Two existing tests expect `null` for empty-time cases — these will fail after our change. Update them first so TDD is correct: tests fail before implementation, pass after.

- [ ] **Step 1: Update the two existing tests that will break**

Replace lines 26–52 in `src/tests/useActiveEffect.test.ts`:

```ts
  it('returns CLEAR when no effect is active at current time', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(5000)
    effectStore.addInstance('純色', 0, 3000, 0)  // track 0, 0–3000ms
    const effectData = useActiveEffect(() => 0)
    expect(effectData.value).not.toBeNull()       // was: toBeNull()
    expect(effectData.value?.mode).toBe('MODES_CLEAR')
  })

  it('returns CLEAR when trackIndex has no instances', () => {
    const effectStore = useEffectStore()
    const timelineStore = useTimelineStore()
    timelineStore.setTime(1000)
    effectStore.addInstance('純色', 0, 3000, 0)  // only track 0
    const effectData = useActiveEffect(() => 1)   // track 1 has nothing
    expect(effectData.value).not.toBeNull()       // was: toBeNull()
    expect(effectData.value?.mode).toBe('MODES_CLEAR')
  })
```

Also add one new test after the existing `'returns EffectData when an effect covers current time'` test:

```ts
  it('returns null only when trackIndex is null', () => {
    const effectData = useActiveEffect(() => null)
    expect(effectData.value).toBeNull()
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ControlPanel_v3 && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×|useActiveEffect"
```

Expected: the two updated tests FAIL (still returning null), the null-trackIndex test PASSES.

---

## Task 2: Implement CLEAR fallback in useActiveEffect

**Files:**
- Modify: `src/composables/useActiveEffect.ts`

- [ ] **Step 3: Replace the full file content**

```ts
import { computed, type ComputedRef } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { instanceToEffectData } from '../services/serializer'
import type { EffectData, HsvChannel } from '../types'

const ZERO_CHANNEL: HsvChannel = { func: 0, range: 0, lower: 0, p1: 0, p2: 0 }

function makeClearEffectData(time: number): EffectData {
  return {
    mode: 'MODES_CLEAR',
    start_time: time,
    duration: 0,
    XH: ZERO_CHANNEL, XS: ZERO_CHANNEL, XV: ZERO_CHANNEL,
    YH: ZERO_CHANNEL, YS: ZERO_CHANNEL, YV: ZERO_CHANNEL,
    p1: 0, p2: 0, p3: 0, p4: 0,
  }
}

/**
 * Returns a computed EffectData for the effect active on the given track
 * at the current timelineStore.globalTime.
 * Returns MODES_CLEAR if no effect covers that time (empty space on track).
 * Returns null only if trackIndex is null (no track assigned).
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
    if (!instance) return makeClearEffectData(time)

    const def = effectStore.getDefinition(instance.definitionName)
    if (!def) return makeClearEffectData(time)

    return instanceToEffectData(instance, def.mode)
  })
}
```

- [ ] **Step 4: Run tests — all useActiveEffect tests should pass**

```bash
cd ControlPanel_v3 && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×|useActiveEffect"
```

Expected: all 4 `useActiveEffect` tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ControlPanel_v3 && git add src/tests/useActiveEffect.test.ts src/composables/useActiveEffect.ts
git commit -m "feat: useActiveEffect returns MODES_CLEAR for empty track time"
```

---

## Task 3: Add gap-fill tests for tracksToEffectMap

**Files:**
- Modify: `src/tests/serializer.test.ts`

- [ ] **Step 6: Add imports and new describe block to serializer.test.ts**

First, update line 3 in `src/tests/serializer.test.ts` to add `tracksToEffectMap` to the existing import:

```ts
import { effectDataToHardwareString, instanceToEffectData, instanceToHardwareString, tracksToEffectMap } from '../services/serializer'
```

Also add to line 5 (after the existing type import):

```ts
import type { EffectData, EffectInstance, EffectDefinition, ProjectTrack } from '../types'
```

Then append the following after the last closing `})` in the file:

```ts
// Helpers for tracksToEffectMap tests
const zeroCh = () => ({ func: 0 as const, range: 0, lower: 0, p1: 0, p2: 0 })
const zeroParams = () => ({
  XH: zeroCh(), XS: zeroCh(), XV: zeroCh(),
  YH: zeroCh(), YS: zeroCh(), YV: zeroCh(),
  extra: { bladeCount: 0, length: 0, curvature: 0, boxsize: 0, space: 0, reverse: 0, positionFix: 0 },
})

const plainDef: EffectDefinition = {
  name: '純色', mode: 'MODES_PLAIN', isBuiltIn: true,
  defaultParams: zeroParams(), extraParamSchema: {},
}

function makeTrack(effects: { startTime: number; duration: number }[]): ProjectTrack {
  return {
    id: 'track-0', name: 'Track 0', deviceIndices: [0],
    effects: effects.map((e, i) => ({
      id: `e${i}`, definitionName: '純色',
      startTime: e.startTime, duration: e.duration,
      params: zeroParams(),
    })),
  }
}

describe('tracksToEffectMap — gap filling', () => {
  it('no totalDuration: no tail CLEAR, no leading CLEAR if effect starts at 0', () => {
    const track = makeTrack([{ startTime: 0, duration: 5000 }])
    const result = tracksToEffectMap([track], [plainDef])
    expect(result[0].length).toBe(1)
    expect(result[0][0].mode).toBe('MODES_PLAIN')
  })

  it('with totalDuration: inserts CLEAR before first effect', () => {
    const track = makeTrack([{ startTime: 3000, duration: 2000 }])
    const result = tracksToEffectMap([track], [plainDef], 10000)
    // Expect: CLEAR(0→3000), PLAIN(3000→5000), CLEAR(5000→10000)
    expect(result[0].length).toBe(3)
    expect(result[0][0]).toMatchObject({ mode: 'MODES_CLEAR', start_time: 0, duration: 3000 })
    expect(result[0][1]).toMatchObject({ mode: 'MODES_PLAIN', start_time: 3000, duration: 2000 })
    expect(result[0][2]).toMatchObject({ mode: 'MODES_CLEAR', start_time: 5000, duration: 5000 })
  })

  it('with totalDuration: inserts CLEAR between two effects', () => {
    const track = makeTrack([
      { startTime: 0, duration: 2000 },
      { startTime: 5000, duration: 2000 },
    ])
    const result = tracksToEffectMap([track], [plainDef], 10000)
    // Expect: PLAIN(0), CLEAR(2000→5000), PLAIN(5000), CLEAR(7000→10000)
    expect(result[0].length).toBe(4)
    expect(result[0][1]).toMatchObject({ mode: 'MODES_CLEAR', start_time: 2000, duration: 3000 })
    expect(result[0][3]).toMatchObject({ mode: 'MODES_CLEAR', start_time: 7000, duration: 3000 })
  })

  it('with totalDuration: inserts tail CLEAR after last effect', () => {
    const track = makeTrack([{ startTime: 0, duration: 5000 }])
    const result = tracksToEffectMap([track], [plainDef], 10000)
    expect(result[0].length).toBe(2)
    expect(result[0][1]).toMatchObject({ mode: 'MODES_CLEAR', start_time: 5000, duration: 5000 })
  })

  it('with totalDuration: no tail CLEAR if last effect reaches totalDuration', () => {
    const track = makeTrack([{ startTime: 0, duration: 10000 }])
    const result = tracksToEffectMap([track], [plainDef], 10000)
    expect(result[0].length).toBe(1)
    expect(result[0][0].mode).toBe('MODES_PLAIN')
  })

  it('empty track with totalDuration: single CLEAR covering full duration', () => {
    const track: ProjectTrack = {
      id: 'track-0', name: 'Track 0', deviceIndices: [0], effects: [],
    }
    const result = tracksToEffectMap([track], [plainDef], 10000)
    expect(result[0].length).toBe(1)
    expect(result[0][0]).toMatchObject({ mode: 'MODES_CLEAR', start_time: 0, duration: 10000 })
  })

  it('CLEAR blocks have all-zero HSV channels and p1–p4', () => {
    const track = makeTrack([{ startTime: 2000, duration: 1000 }])
    const result = tracksToEffectMap([track], [plainDef], 5000)
    const clear = result[0][0]  // leading CLEAR
    expect(clear.mode).toBe('MODES_CLEAR')
    expect(clear.XH).toEqual({ func: 0, range: 0, lower: 0, p1: 0, p2: 0 })
    expect(clear.p1).toBe(0)
    expect(clear.p2).toBe(0)
    expect(clear.p3).toBe(0)
    expect(clear.p4).toBe(0)
  })
})
```

- [ ] **Step 7: Run tests to confirm new tests fail**

```bash
cd ControlPanel_v3 && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|gap filling"
```

Expected: all `gap filling` tests FAIL (function doesn't accept totalDuration yet).

---

## Task 4: Implement gap-filling in tracksToEffectMap

**Files:**
- Modify: `src/services/serializer.ts:111-156`

- [ ] **Step 8: Replace the tracksToEffectMap function**

Replace the entire `tracksToEffectMap` function (lines 111–156) in `src/services/serializer.ts` with:

```ts
/**
 * Converts project tracks to the server EffectMap format: EffectData[][].
 * Outer index = lux device index. One track can map to multiple devices.
 * If multiple tracks share a device, their effects are merged and sorted by startTime.
 *
 * Empty gaps between effects — including before the first effect and after the last
 * effect (up to totalDuration) — are filled with MODES_CLEAR blocks.
 *
 * definitions: the full list of EffectDefinition (to look up mode by definitionName)
 * totalDuration: optional, in milliseconds. If provided, a CLEAR block is inserted
 *   from the end of the last effect to totalDuration.
 */
export function tracksToEffectMap(
  tracks: ProjectTrack[],
  definitions: EffectDefinition[],
  totalDuration?: number
): EffectData[][] {
  const defMap = new Map(definitions.map(d => [d.name, d]))

  // Find highest device index across all tracks
  let maxDeviceIdx = -1
  for (const track of tracks) {
    for (const idx of track.deviceIndices) {
      if (idx > maxDeviceIdx) maxDeviceIdx = idx
    }
  }
  if (maxDeviceIdx < 0) return []

  const result: EffectData[][] = Array.from({ length: maxDeviceIdx + 1 }, () => [])

  for (const track of tracks) {
    for (const effect of track.effects) {
      const def = defMap.get(effect.definitionName)
      if (!def) continue

      const instance: EffectInstance = {
        id: effect.id,
        definitionName: effect.definitionName,
        trackIndex: 0,
        startTime: effect.startTime,
        duration: effect.duration,
        params: effect.params,
      }
      const effectData = instanceToEffectData(instance, def.mode)

      for (const deviceIdx of track.deviceIndices) {
        result[deviceIdx].push(effectData)
      }
    }
  }

  const zeroCh = (): HsvChannel => ({ func: 0, range: 0, lower: 0, p1: 0, p2: 0 })
  const makeClear = (start: number, duration: number): EffectData => ({
    mode: 'MODES_CLEAR',
    start_time: start,
    duration,
    XH: zeroCh(), XS: zeroCh(), XV: zeroCh(),
    YH: zeroCh(), YS: zeroCh(), YV: zeroCh(),
    p1: 0, p2: 0, p3: 0, p4: 0,
  })

  // Fill gaps per device
  for (let i = 0; i < result.length; i++) {
    const effects = result[i].sort((a, b) => a.start_time - b.start_time)
    const filled: EffectData[] = []
    let cursor = 0

    for (const effect of effects) {
      if (effect.start_time > cursor) {
        filled.push(makeClear(cursor, effect.start_time - cursor))
      }
      filled.push(effect)
      cursor = effect.start_time + effect.duration
    }

    if (totalDuration != null && cursor < totalDuration) {
      filled.push(makeClear(cursor, totalDuration - cursor))
    }

    result[i] = filled
  }

  return result
}
```

Also add `HsvChannel` to the import at the top of the file (line 1):

```ts
import type { EffectData, EffectDefinition, EffectInstance, EffectMode, HsvChannel, ProjectTrack } from '../types'
```

- [ ] **Step 9: Run all tests — everything should pass**

```bash
cd ControlPanel_v3 && npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all tests PASS, no failures.

- [ ] **Step 10: Commit**

```bash
cd ControlPanel_v3 && git add src/tests/serializer.test.ts src/services/serializer.ts
git commit -m "feat: tracksToEffectMap fills gaps with MODES_CLEAR"
```

---

## Task 5: Pass totalDuration in projectStore.pushToServer

**Files:**
- Modify: `src/stores/projectStore.ts:141-150`

- [ ] **Step 11: Update pushToServer**

Replace lines 141–150 in `src/stores/projectStore.ts`:

```ts
    async pushToServer(): Promise<void> {
      const effectStore = useEffectStore()
      const timelineStore = useTimelineStore()
      const projectFile = this.toProjectFile()
      const effectMap = tracksToEffectMap(
        projectFile.tracks,
        effectStore.definitions,
        timelineStore.totalDuration
      )
      await fetch('/push_effect_map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(effectMap),
      })
    },
```

Note: `useTimelineStore` is already imported at the top of this file (line 6).

- [ ] **Step 12: Run all tests one final time**

```bash
cd ControlPanel_v3 && npm test 2>&1 | tail -10
```

Expected: all tests PASS.

- [ ] **Step 13: Type-check**

```bash
cd ControlPanel_v3 && npm run type-check 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 14: Commit**

```bash
cd ControlPanel_v3 && git add src/stores/projectStore.ts
git commit -m "feat: pass totalDuration to tracksToEffectMap in pushToServer"
```
