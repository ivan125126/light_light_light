import type { EffectDefinition } from '../types'
import { defaultEffectParams, defaultEffectParamsRed, MODE_EXTRA_SCHEMA } from './effectConfig'

export const BUILT_IN_DEFINITIONS: EffectDefinition[] = [
  // ── Non-bitmap effects (red default color) ────────────────────────────────
  { name: '清除',   mode: 'MODES_CLEAR',      isBuiltIn: true, defaultParams: defaultEffectParams(),                                               extraParamSchema: {} },
  { name: '純色',   mode: 'MODES_PLAIN',       isBuiltIn: true, defaultParams: defaultEffectParamsRed(),                                            extraParamSchema: {} },
  { name: '方形',   mode: 'MODES_SQUARE',      isBuiltIn: true, defaultParams: defaultEffectParamsRed({ boxsize: 30 }),                             extraParamSchema: MODE_EXTRA_SCHEMA['MODES_SQUARE']   ?? {} },
  { name: '鐮刀',   mode: 'MODES_SICKLE',      isBuiltIn: true, defaultParams: defaultEffectParamsRed({ length: 15, curvature: 80, positionFix: 0 }), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_SICKLE']   ?? {} },
  { name: '扇形',   mode: 'MODES_FAN',         isBuiltIn: true, defaultParams: defaultEffectParamsRed({ bladeCount: 10, length: 2, curvature: 30 }), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_FAN']      ?? {} },
  { name: '方塊',   mode: 'MODES_BOXES',       isBuiltIn: true, defaultParams: defaultEffectParamsRed({ boxsize: 15, space: 10 }),                  extraParamSchema: MODE_EXTRA_SCHEMA['MODES_BOXES']    ?? {} },
  { name: 'OT',     mode: 'MODES_CMAP_YEN',    isBuiltIn: true, defaultParams: defaultEffectParamsRed(),                                            extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_YEN']    ?? {} },
  { name: 'PT',     mode: 'MODES_CMAP_BENSON', isBuiltIn: true, defaultParams: defaultEffectParamsRed(),                                            extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_BENSON'] ?? {} },
  // ── Bitmap effects (space: 5 default, no red override) ───────────────────
  { name: 'DNA',    mode: 'MODES_CMAP_DNA',    isBuiltIn: true, defaultParams: defaultEffectParams({ space: 5 }),                                   extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_DNA']  ?? {} },
  { name: '火焰',   mode: 'MODES_CMAP_FIRE',   isBuiltIn: true, defaultParams: defaultEffectParams({ space: 5 }),                                   extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_FIRE'] ?? {} },
  { name: 'Love',   mode: 'MODES_CMAP_LOVE',   isBuiltIn: true, defaultParams: defaultEffectParams({ space: 5 }),                                   extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_LOVE'] ?? {} },
  { name: '齒輪',   mode: 'MODES_CMAP_GEAR',   isBuiltIn: true, defaultParams: defaultEffectParams({ space: 5 }),                                   extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_GEAR'] ?? {} },
  { name: 'ES',     mode: 'MODES_MAP_ES',      isBuiltIn: true, defaultParams: defaultEffectParams({ space: 5 }),                                   extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ES']    ?? {} },
  { name: '工科',   mode: 'MODES_MAP_ES_ZH',   isBuiltIn: true, defaultParams: defaultEffectParams({ space: 5 }),                                   extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ES_ZH'] ?? {} },
  { name: 'ESXOPT', mode: 'MODES_MAP_ESXOPT',  isBuiltIn: true, defaultParams: defaultEffectParams({ space: 5 }),                                   extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ESXOPT']?? {} },
]
