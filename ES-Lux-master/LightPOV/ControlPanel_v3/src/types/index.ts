// HSV function codes
export type HsvFunction = 0 | 1 | 2 | 3 | 4 | 5
// 0=None, 1=Const, 2=Ramp, 3=Triangle, 4=Pulse, 5=Step

// Hardware mode names (must match ENUM_MODES_NAMES in server.js)
export type EffectMode =
  | 'MODES_CLEAR'
  | 'MODES_PLAIN'
  | 'MODES_SQUARE'
  | 'MODES_SICKLE'
  | 'MODES_FAN'
  | 'MODES_BOXES'
  | 'MODES_SICKLE_ADV'
  | 'MODES_FAN_ADV'
  | 'MODES_MAP_ES'
  | 'MODES_MAP_ES_ZH'
  | 'MODES_CMAP_DNA'
  | 'MODES_CMAP_FIRE'
  | 'MODES_CMAP_BENSON'
  | 'MODES_CMAP_YEN'
  | 'MODES_CMAP_LOVE'
  | 'MODES_CMAP_GEAR'
  | 'MODES_MAP_ESXOPT'

// Single HSV channel — matches the object shape in script.js packHsvBlock()
export interface HsvChannel {
  func: HsvFunction
  range: number    // 0–255
  lower: number    // 0–255
  p1: number       // 0–255  (meaning depends on func: value/upper/top/height)
  p2: number       // 0–255  (step count for FuncStep, else 0)
}

// All 6 HSV channels + extra params (user-visible, before encoding)
export interface EffectParams {
  XH: HsvChannel
  XS: HsvChannel
  XV: HsvChannel
  YH: HsvChannel
  YS: HsvChannel
  YV: HsvChannel
  extra: ExtraParams
}

// Extra parameters (decoded, human-readable values)
export interface ExtraParams {
  bladeCount: number    // 0–12
  length: number        // 0–300
  curvature: number     // 0–100
  boxsize: number       // 0–300
  space: number         // 0–100
  reverse: number       // 0 or 1
  positionFix: number   // 0–255
}

// Which extra params a given effect mode supports
export interface ExtraParamSchema {
  bladeCount?: boolean
  length?: boolean
  curvature?: boolean
  boxsize?: boolean
  space?: boolean
  reverse?: boolean
  positionFix?: boolean
}

// Raw hardware-ready data (matches server.js EffectMap entry format)
export interface EffectData {
  mode: EffectMode
  start_time: number     // milliseconds
  duration: number       // milliseconds
  XH: HsvChannel
  XS: HsvChannel
  XV: HsvChannel
  YH: HsvChannel
  YS: HsvChannel
  YV: HsvChannel
  p1: number             // encoded extra param (0–255)
  p2: number
  p3: number
  p4: number
}

// Effect "type" definition — what appears in the asset library
export interface EffectDefinition {
  name: string                      // display name, e.g. "純色"
  mode: EffectMode                  // hardware mode
  isBuiltIn: boolean
  defaultParams: EffectParams       // initial values when dropped onto timeline
  extraParamSchema: ExtraParamSchema
  thumbnail?: string                // future: preview image data URL (optional)
}

// A single block placed on the timeline
export interface EffectInstance {
  id: string
  definitionName: string            // references EffectDefinition.name
  trackIndex: number                // 0–5
  startTime: number                 // milliseconds
  duration: number                  // milliseconds
  params: EffectParams
}

// Serialized project file (project.json)
export interface ProjectFile {
  version: '2.0'
  name: string
  musicFile: string | null
  timeline: {
    instances: EffectInstance[]
  }
}

// Serialized effect library file (effect_library.json)
export interface EffectLibraryFile {
  version: '2.0'
  definitions: EffectDefinition[]
}
