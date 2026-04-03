import type { EffectData, EffectInstance, EffectMode } from '../types'
import { MODE_ENUM } from '../constants/effectConfig'

function normalizeTo255(value: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.round(((value - min) / (max - min)) * 255)
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
      p1 = extra.reverse >= 1 ? 255 : 0
      p4 = normalizeTo255(extra.space, 0, 100)
      break
    // MODES_CMAP_BENSON, MODES_CMAP_YEN: no extra params
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
