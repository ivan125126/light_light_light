import type { EffectData, EffectDefinition, EffectInstance, EffectMode, HsvChannel, ProjectTrack, ExtraParams } from '../types'
import { MODE_ENUM, defaultExtraParams } from '../constants/effectConfig'

/** Linearly maps `value` from [min, max] to [0, 255]. Returns 0 if min === max. */
function normalizeTo255(value: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.round(((value - min) / (max - min)) * 255)
}

/** Reverses normalizeTo255: maps a 0–255 byte back to the [min, max] range. */
function denormalizeFrom255(byte: number, min: number, max: number): number {
  if (max === min) return min
  return Math.round(byte * (max - min) / 255 + min)
}

/** Decodes mode-specific p1/p2/p3/p4 bytes back to human-readable ExtraParams. */
function decodeExtraParams(data: EffectData): ExtraParams {
  const extra = defaultExtraParams()

  switch (data.mode) {
    case 'MODES_SQUARE':
      extra.boxsize = denormalizeFrom255(data.p3, 0, 300)
      break
    case 'MODES_SICKLE':
    case 'MODES_SICKLE_ADV':
      extra.positionFix = data.p1
      extra.curvature   = denormalizeFrom255(data.p3, 0, 100)
      extra.length      = denormalizeFrom255(data.p4, 0, 300)
      break
    case 'MODES_FAN':
    case 'MODES_FAN_ADV':
      extra.curvature  = denormalizeFrom255(data.p1, 0, 100)
      extra.bladeCount = denormalizeFrom255(data.p3, 0, 12)
      extra.length     = denormalizeFrom255(data.p4, 0, 300)
      break
    case 'MODES_BOXES':
      extra.boxsize = denormalizeFrom255(data.p3, 0, 300)
      extra.space   = denormalizeFrom255(data.p4, 0, 100)
      break
    case 'MODES_CMAP_FIRE':
    case 'MODES_CMAP_GEAR':
      extra.space = denormalizeFrom255(data.p4, 0, 100)
      break
    case 'MODES_CMAP_DNA':
    case 'MODES_CMAP_LOVE':
    case 'MODES_MAP_ES':
    case 'MODES_MAP_ES_ZH':
    case 'MODES_MAP_ESXOPT':
    case 'MODES_CMAP_BENSON':
    case 'MODES_CMAP_YEN':
      extra.reverse = data.p1 >= 128 ? 1 : 0
      extra.space   = denormalizeFrom255(data.p4, 0, 100)
      break
  }

  return extra
}

/**
 * Converts EffectInstance to raw EffectData for hardware transmission.
 * mode must be passed explicitly (looked up from EffectDefinition.mode by caller).
 */
export function instanceToEffectData(instance: EffectInstance, mode: EffectMode): EffectData {
  const { extra } = instance.params
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0

  switch (mode) {
    case 'MODES_CLEAR':
    case 'MODES_PLAIN':
      break
    case 'MODES_SQUARE':
      p3 = normalizeTo255(extra.boxsize, 0, 300)
      break
    case 'MODES_SICKLE':
    case 'MODES_SICKLE_ADV':
      p1 = normalizeTo255(extra.positionFix, 0, 255)
      p3 = normalizeTo255(extra.curvature, 0, 100)
      p4 = normalizeTo255(extra.length, 0, 300)
      break
    case 'MODES_FAN':
    case 'MODES_FAN_ADV':
      p1 = normalizeTo255(extra.curvature, 0, 100)
      p3 = normalizeTo255(extra.bladeCount, 0, 12)
      p4 = normalizeTo255(extra.length, 0, 300)
      break
    case 'MODES_BOXES':
      p3 = normalizeTo255(extra.boxsize, 0, 300)
      p4 = normalizeTo255(extra.space, 0, 100)
      break
    case 'MODES_CMAP_FIRE':
    case 'MODES_CMAP_GEAR':
      p4 = normalizeTo255(extra.space, 0, 100)
      break
    case 'MODES_CMAP_DNA':
    case 'MODES_CMAP_LOVE':
    case 'MODES_MAP_ES':
    case 'MODES_MAP_ES_ZH':
    case 'MODES_MAP_ESXOPT':
    case 'MODES_CMAP_BENSON':
    case 'MODES_CMAP_YEN':
      p1 = extra.reverse >= 1 ? 255 : 0
      p4 = normalizeTo255(extra.space, 0, 100)
      break
  }

  return {
    mode,
    start_time: instance.startTime,
    duration:   instance.duration,
    XH: instance.params.XH,
    XS: instance.params.XS,
    XV: instance.params.XV,
    YH: instance.params.YH,
    YS: instance.params.YS,
    YV: instance.params.YV,
    p1, p2, p3, p4,
  }
}

/**
 * Converts raw EffectData to the hardware protocol string.
 * Output: "M{mode}S{start}D{dur}X{n1},{n2}Y{n1},{n2}Z{n1},{n2}U{n1},{n2}V{n1},{n2}W{n1},{n2}P{n1},{n2};"
 *
 * Must produce identical output to server.js stringify().
 */
export function effectDataToHardwareString(data: EffectData): string {
  const modeNum = MODE_ENUM[data.mode]
  let s = `M${modeNum}S${data.start_time}D${data.duration}`

  const channels = [data.XH, data.XS, data.XV, data.YH, data.YS, data.YV]
  const marks    = ['X', 'Y', 'Z', 'U', 'V', 'W']

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i]
    const num1 = ch.func * 256 * 256 + ch.range * 256 + ch.lower
    const num2 = ch.p1 * 256 + ch.p2
    s += `${marks[i]}${num1},${num2}`
  }

  const pNum1 = data.p1 * 256 + data.p2
  const pNum2 = data.p3 * 256 + data.p4
  s += `P${pNum1},${pNum2};`

  return s
}

/**
 * Convenience: convert EffectInstance + its mode directly to a hardware string.
 */
export function instanceToHardwareString(instance: EffectInstance, mode: EffectMode): string {
  return effectDataToHardwareString(instanceToEffectData(instance, mode))
}

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

      // Reuse instanceToEffectData — trackIndex is not used inside it
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

/**
 * Converts server EffectMap format (EffectData[][]) back to timeline tracks + instances.
 * Each device index becomes one track named "Device N". MODES_CLEAR entries are skipped.
 *
 * Returns:
 *   tracks    — load via timelineStore.loadTracks(tracks, tracks.length + 1)
 *   instances — load via effectStore.loadFromProject(instances, [])
 */
export function effectMapToTracks(
  effectMap: EffectData[][],
  definitions: EffectDefinition[],
): {
  tracks: { id: string; name: string; deviceIndices: number[] }[]
  instances: EffectInstance[]
} {
  const modeToDefName = new Map(definitions.map(d => [d.mode, d.name]))
  const tracks: { id: string; name: string; deviceIndices: number[] }[] = []
  const instances: EffectInstance[] = []

  for (let deviceIdx = 0; deviceIdx < effectMap.length; deviceIdx++) {
    const deviceEffects = effectMap[deviceIdx]
    if (!deviceEffects || deviceEffects.length === 0) continue

    // Only add a track if there are non-CLEAR effects
    const nonClear = deviceEffects.filter(e => e.mode !== 'MODES_CLEAR')
    if (nonClear.length === 0) continue

    const trackId = `track-${Date.now()}-${deviceIdx}`
    tracks.push({ id: trackId, name: `Device ${deviceIdx}`, deviceIndices: [deviceIdx] })
    const trackIndex = tracks.length - 1

    for (const effectData of nonClear) {
      const defName = modeToDefName.get(effectData.mode) ?? effectData.mode
      const extra = decodeExtraParams(effectData)

      instances.push({
        id: `effect_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        definitionName: defName,
        trackIndex,
        startTime: effectData.start_time,
        duration: effectData.duration,
        params: {
          XH: { ...effectData.XH },
          XS: { ...effectData.XS },
          XV: { ...effectData.XV },
          YH: { ...effectData.YH },
          YS: { ...effectData.YS },
          YV: { ...effectData.YV },
          extra,
        },
      })
    }
  }

  return { tracks, instances }
}
