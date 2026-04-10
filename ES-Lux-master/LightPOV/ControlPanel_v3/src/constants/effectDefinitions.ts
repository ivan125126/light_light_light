import type { EffectDefinition } from '../types'
import { defaultEffectParams, MODE_EXTRA_SCHEMA } from './effectConfig'

export const BUILT_IN_DEFINITIONS: EffectDefinition[] = [
  { name: '清除',   mode: 'MODES_CLEAR',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: {} },
  { name: '純色',   mode: 'MODES_PLAIN',        isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: {} },
  { name: '方形',   mode: 'MODES_SQUARE',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_SQUARE']   ?? {} },
  { name: '鐮刀',   mode: 'MODES_SICKLE',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_SICKLE']   ?? {} },
  { name: '扇形',   mode: 'MODES_FAN',          isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_FAN']      ?? {} },
  { name: '方塊',   mode: 'MODES_BOXES',        isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_BOXES']    ?? {} },
  { name: 'DNA',    mode: 'MODES_CMAP_DNA',     isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_DNA']  ?? {} },
  { name: '火焰',   mode: 'MODES_CMAP_FIRE',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_FIRE'] ?? {} },
  { name: 'Love',   mode: 'MODES_CMAP_LOVE',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_LOVE'] ?? {} },
  { name: '齒輪',   mode: 'MODES_CMAP_GEAR',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_GEAR'] ?? {} },
  { name: 'ES',     mode: 'MODES_MAP_ES',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ES']    ?? {} },
  { name: '工科',   mode: 'MODES_MAP_ES_ZH',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ES_ZH'] ?? {} },
  { name: 'ESXOPT', mode: 'MODES_MAP_ESXOPT',   isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ESXOPT']?? {} },
  { name: 'OT',     mode: 'MODES_CMAP_YEN',     isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_YEN']    ?? {} },
  { name: 'PT',     mode: 'MODES_CMAP_BENSON',  isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_BENSON'] ?? {} },
]
