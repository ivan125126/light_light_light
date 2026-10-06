# Implicit CLEAR Gap-Fill Design

**Date:** 2026-04-08  
**Status:** Approved

## Problem

When the timeline cursor moves to an empty area on a track, the hardware/preview does not receive a CLEAR command — it keeps showing the last active effect. The same gap exists in the serialized effect map sent via `pushToServer`: no CLEAR blocks are generated for empty space between effects.

## Requirements

- Empty space on a track is implicitly treated as `MODES_CLEAR`
- The timeline UI is unchanged — no visible CLEAR blocks are inserted
- Gap-filling covers: `[0 → first effect]`, gaps between effects, and `[last effect end → totalDuration]`
- Only affects preview (cursor) and serialization (export to server)

## Approach: Two-Point Inline Fix (A)

No new abstractions. Modify two existing functions independently.

---

## Part 1 — Preview: `useActiveEffect`

**File:** `src/composables/useActiveEffect.ts`

### Change

When no `EffectInstance` covers `globalTime` for a valid `trackIndex`, return a CLEAR `EffectData` fallback instead of `null`.

### Fallback shape

```ts
{
  mode: 'MODES_CLEAR',
  start_time: time,
  duration: 0,
  XH: defaultChannel, XS: defaultChannel, XV: defaultChannel,
  YH: defaultChannel, YS: defaultChannel, YV: defaultChannel,
  p1: 0, p2: 0, p3: 0, p4: 0,
}
```

`defaultChannel` = `{ func: 0, range: 0, lower: 0, p1: 0, p2: 0 }`

### Return type

`ComputedRef<EffectData | null>` is unchanged. `null` still means "no track assigned" (`trackIndex() === null`). Callers require no changes.

### Null cases (unchanged)

| Condition | Return |
|---|---|
| `trackIndex() === null` | `null` (no track assigned) |
| No instance at current time | `CLEAR EffectData` (was `null`) |
| Definition not found | `CLEAR EffectData` (was `null`) |

---

## Part 2 — Serialization: `tracksToEffectMap`

**File:** `src/services/serializer.ts`

### Signature change

```ts
export function tracksToEffectMap(
  tracks: ProjectTrack[],
  definitions: EffectDefinition[],
  totalDuration?: number          // new optional parameter
): EffectData[][]
```

### Gap-filling logic

Applied per device, after the existing sort by `start_time`:

```
cursor = 0
for each effect in sorted effects:
  if effect.start_time > cursor:
    insert CLEAR { start_time: cursor, duration: effect.start_time - cursor }
  cursor = effect.start_time + effect.duration

if totalDuration != null && cursor < totalDuration:
  insert CLEAR { start_time: cursor, duration: totalDuration - cursor }

re-sort result by start_time
```

### CLEAR block shape

All HSV channels at default (`{ func: 0, range: 0, lower: 0, p1: 0, p2: 0 }`), p1–p4 = 0. Consistent with how `instanceToEffectData` handles `MODES_CLEAR`.

### Caller change

**File:** `src/stores/projectStore.ts`, `pushToServer()`

```ts
const effectMap = tracksToEffectMap(
  projectFile.tracks,
  effectStore.definitions,
  timelineStore.totalDuration    // pass totalDuration
)
```

No other callers of `tracksToEffectMap` exist.

---

## Out of Scope

- Making CLEAR blocks visible on the timeline
- Storing CLEAR instances in `effectStore`
- Changing how `autoSave` or `toProjectFile` work (gap-fill is only applied at preview/push time)
