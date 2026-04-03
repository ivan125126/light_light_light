import type { EffectMode, ExtraParamSchema, HsvChannel, ExtraParams, EffectParams } from '../types'

// Hardware mode enum index (must match ENUM_MODES_NAMES order in server.js)
export const MODE_ENUM: Record<EffectMode, number> = {
  MODES_CLEAR:       0,
  MODES_PLAIN:       1,
  MODES_SQUARE:      2,
  MODES_SICKLE:      3,
  MODES_FAN:         4,
  MODES_BOXES:       5,
  MODES_SICKLE_ADV:  6,
  MODES_FAN_ADV:     7,
  MODES_MAP_ES:      8,
  MODES_MAP_ES_ZH:   9,
  MODES_CMAP_DNA:   10,
  MODES_CMAP_FIRE:  11,
  MODES_CMAP_BENSON:12,
  MODES_CMAP_YEN:   13,
  MODES_CMAP_LOVE:  14,
  MODES_CMAP_GEAR:  15,
  MODES_MAP_ESXOPT: 16,
}

// Which extra params each mode exposes in the parameter panel
export const MODE_EXTRA_SCHEMA: Partial<Record<EffectMode, ExtraParamSchema>> = {
  MODES_SQUARE:      { boxsize: true },
  MODES_SICKLE:      { positionFix: true, curvature: true, length: true },
  MODES_SICKLE_ADV:  { positionFix: true, curvature: true, length: true },
  MODES_FAN:         { curvature: true, bladeCount: true, length: true },
  MODES_FAN_ADV:     { curvature: true, bladeCount: true, length: true },
  MODES_BOXES:       { boxsize: true, space: true },
  MODES_CMAP_FIRE:   { space: true },
  MODES_CMAP_GEAR:   { space: true },
  MODES_CMAP_DNA:    { reverse: true, space: true },
  MODES_CMAP_LOVE:   { reverse: true, space: true },
  MODES_MAP_ES:      { reverse: true, space: true },
  MODES_MAP_ES_ZH:   { reverse: true, space: true },
  MODES_MAP_ESXOPT:  { reverse: true, space: true },
}

// Chinese display names → EffectMode (for backward compatibility when loading old JSON)
export const CHINESE_NAME_TO_MODE: Record<string, EffectMode> = {
  '清除':   'MODES_CLEAR',
  '純色':   'MODES_PLAIN',
  '方形':   'MODES_SQUARE',
  '鐮刀':   'MODES_SICKLE',
  '扇形':   'MODES_FAN',
  '方塊':   'MODES_BOXES',
  'DNA':    'MODES_CMAP_DNA',
  '火焰':   'MODES_CMAP_FIRE',
  'Love':   'MODES_CMAP_LOVE',
  '齒輪':   'MODES_CMAP_GEAR',
  'ES':     'MODES_MAP_ES',
  '工科':   'MODES_MAP_ES_ZH',
  'ESXOPT': 'MODES_MAP_ESXOPT',
  'OT':     'MODES_CMAP_YEN',
  'PT':     'MODES_CMAP_BENSON',
}

export function defaultHsvChannel(): HsvChannel {
  return { func: 0, range: 0, lower: 0, p1: 0, p2: 0 }
}

export function defaultExtraParams(): ExtraParams {
  return {
    bladeCount: 1,
    length: 150,
    curvature: 0,
    boxsize: 50,
    space: 10,
    reverse: 0,
    positionFix: 0,
  }
}

export function defaultEffectParams(): EffectParams {
  return {
    XH: defaultHsvChannel(),
    XS: defaultHsvChannel(),
    XV: defaultHsvChannel(),
    YH: defaultHsvChannel(),
    YS: defaultHsvChannel(),
    YV: defaultHsvChannel(),
    extra: defaultExtraParams(),
  }
}
