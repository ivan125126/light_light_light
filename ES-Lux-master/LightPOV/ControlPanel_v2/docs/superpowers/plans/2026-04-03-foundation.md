# ControlPanel v2 — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Vite + Vue 3 + TypeScript + Pinia 的專案基礎，包含型別定義、常數、序列化服務和所有 Pinia stores，取代現有的全域變數架構。

**Architecture:** 不動現有的 `src/js/`、`src/index.html`、`src/server/` — 這些在 Plan 2/3 才遷移。本計劃只新增基礎設施層，讓新舊 code 並存。序列化邏輯是最高風險項目，用 TDD 驗證與現有 `stringify()` 的輸出完全一致。

**Tech Stack:** Vite 6, Vue 3.5, TypeScript 5, Pinia 2, Vitest（測試）

**Spec:** `docs/superpowers/specs/2026-04-03-controlpanel-v2-refactor-design.md`

---

## 新增/修改的檔案

```
新增：
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  src/main.ts
  src/App.vue
  src/types/index.ts
  src/constants/effectConfig.ts
  src/constants/effectDefinitions.ts
  src/services/serializer.ts
  src/services/audioService.ts
  src/services/hardwareService.ts
  src/stores/effectStore.ts
  src/stores/timelineStore.ts
  src/stores/audioStore.ts
  src/stores/projectStore.ts
  src/tests/serializer.test.ts

修改：
  package.json  （加入 Vite scripts 和 devDependencies）
  index.html    （Vite 進入點，暫時保留舊 script tags 並存）
```

---

### Task 1: 安裝依賴，建立 Vite 設定

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`

- [ ] **Step 1: 安裝 Vite 相關依賴**

```bash
cd /Users/candle/light_light_light/ES-Lux-master/LightPOV/ControlPanel_v2
npm install --save-dev vite @vitejs/plugin-vue typescript vue-tsc vitest @vue/test-utils jsdom
npm install pinia
```

預期輸出：`added N packages` 無 error。

- [ ] **Step 2: 更新 package.json scripts**

找到 `package.json` 裡的 `"scripts"` 區塊，換成：

```json
"scripts": {
  "dev": "vite",
  "build": "vue-tsc && vite build",
  "preview": "vite preview",
  "type-check": "vue-tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 3: 建立 `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/get_effect': 'http://localhost:10240',
      '/start':      'http://localhost:10240',
      '/esp_time':   'http://localhost:10240',
      '/exe_mode':   'http://localhost:10240',
      '/get_stat':   'http://localhost:10240',
      '/update_file':'http://localhost:10240',
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
```

- [ ] **Step 4: 建立 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: 建立 `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: 建立 `src/main.ts`（Vite 進入點，空殼）**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 7: 建立 `src/App.vue`（暫時空殼）**

```vue
<template>
  <div id="app-root">
    <!-- UI components will be added in Plan 2 -->
    <p style="color:white; padding: 20px;">ControlPanel v2 — Foundation ready</p>
  </div>
</template>

<script setup lang="ts">
// stores and components will be imported in Plan 2
</script>
```

- [ ] **Step 8: 更新 `index.html`，加入 Vite 進入點但保留舊 script tags**

在 `index.html` 的 `</body>` 前加入：

```html
<!-- Vite entry point (replaces script tags in Plan 2) -->
<script type="module" src="/src/main.ts"></script>
```

> 注意：舊的 `<script src="...script.js">` 等 tags 暫時保留，兩套並存。Plan 2 才移除。

- [ ] **Step 9: 確認 dev server 啟動**

```bash
npm run dev
```

預期輸出：
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

打開瀏覽器 http://localhost:3000，頁面應載入（可能有舊 UI 加上白字 "Foundation ready"）。無 console error 即通過。

- [ ] **Step 10: Commit**

```bash
git add vite.config.ts tsconfig.json tsconfig.node.json src/main.ts src/App.vue package.json index.html
git commit -m "feat: add Vite + Vue3 + TypeScript scaffold"
```

---

### Task 2: 型別定義

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 建立 `src/types/index.ts`**

```typescript
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
```

- [ ] **Step 2: 執行型別檢查**

```bash
npm run type-check
```

預期輸出：無 error（`src/main.ts` 和 `src/App.vue` 此時尚未使用這些型別，所以應該乾淨通過）。

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: 效果常數

**Files:**
- Create: `src/constants/effectConfig.ts`
- Create: `src/constants/effectDefinitions.ts`

- [ ] **Step 1: 建立 `src/constants/effectConfig.ts`**

```typescript
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
```

- [ ] **Step 2: 繼續在 `src/constants/effectConfig.ts` 末尾加入 default 輔助函式**

```typescript
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
```

- [ ] **Step 3: 建立 `src/constants/effectDefinitions.ts`**

```typescript
import type { EffectDefinition } from '../types'
import { defaultEffectParams, MODE_EXTRA_SCHEMA } from './effectConfig'

export const BUILT_IN_DEFINITIONS: EffectDefinition[] = [
  { name: '清除',   mode: 'MODES_CLEAR',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: {} },
  { name: '純色',   mode: 'MODES_PLAIN',        isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: {} },
  { name: '方形',   mode: 'MODES_SQUARE',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_SQUARE']  ?? {} },
  { name: '鐮刀',   mode: 'MODES_SICKLE',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_SICKLE']  ?? {} },
  { name: '扇形',   mode: 'MODES_FAN',          isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_FAN']     ?? {} },
  { name: '方塊',   mode: 'MODES_BOXES',        isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_BOXES']   ?? {} },
  { name: 'DNA',    mode: 'MODES_CMAP_DNA',     isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_DNA']  ?? {} },
  { name: '火焰',   mode: 'MODES_CMAP_FIRE',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_FIRE'] ?? {} },
  { name: 'Love',   mode: 'MODES_CMAP_LOVE',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_LOVE'] ?? {} },
  { name: '齒輪',   mode: 'MODES_CMAP_GEAR',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_CMAP_GEAR'] ?? {} },
  { name: 'ES',     mode: 'MODES_MAP_ES',       isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ES']    ?? {} },
  { name: '工科',   mode: 'MODES_MAP_ES_ZH',    isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ES_ZH'] ?? {} },
  { name: 'ESXOPT', mode: 'MODES_MAP_ESXOPT',   isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: MODE_EXTRA_SCHEMA['MODES_MAP_ESXOPT']?? {} },
  { name: 'OT',     mode: 'MODES_CMAP_YEN',     isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: {} },
  { name: 'PT',     mode: 'MODES_CMAP_BENSON',  isBuiltIn: true, defaultParams: defaultEffectParams(), extraParamSchema: {} },
]
```

- [ ] **Step 4: 型別檢查**

```bash
npm run type-check
```

預期：無 error。

- [ ] **Step 5: Commit**

```bash
git add src/constants/effectConfig.ts src/constants/effectDefinitions.ts
git commit -m "feat: add effect constants and built-in definitions"
```

---

### Task 4: Serializer 服務（TDD）

這是最高風險的任務。先寫測試，確認與現有 `server.js` 的 `stringify()` 輸出完全一致，再實作。

**Files:**
- Create: `src/tests/serializer.test.ts`
- Create: `src/services/serializer.ts`

- [ ] **Step 1: 先寫失敗的測試**

建立 `src/tests/serializer.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { effectDataToHardwareString, instanceToEffectData } from '../services/serializer'
import type { EffectData, EffectInstance } from '../types'
import { defaultEffectParams } from '../constants/effectConfig'

// Helper: all-zero channel
const zeroChannel = () => ({ func: 0 as const, range: 0, lower: 0, p1: 0, p2: 0 })

describe('effectDataToHardwareString', () => {

  it('MODES_PLAIN, all zero → M1S0D1000X0,0Y0,0Z0,0U0,0V0,0W0,0P0,0;', () => {
    const data: EffectData = {
      mode: 'MODES_PLAIN',
      start_time: 0,
      duration: 1000,
      XH: zeroChannel(), XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    expect(effectDataToHardwareString(data)).toBe(
      'M1S0D1000X0,0Y0,0Z0,0U0,0V0,0W0,0P0,0;'
    )
  })

  it('MODES_PLAIN, XH=FuncConst value=128 → X65536,32768', () => {
    // XH: func=1, range=0, lower=0, p1=128, p2=0
    // num1 = 1*65536 + 0 + 0 = 65536
    // num2 = 128*256 + 0 = 32768
    const data: EffectData = {
      mode: 'MODES_PLAIN',
      start_time: 0,
      duration: 1000,
      XH: { func: 1, range: 0, lower: 0, p1: 128, p2: 0 },
      XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    expect(effectDataToHardwareString(data)).toBe(
      'M1S0D1000X65536,32768Y0,0Z0,0U0,0V0,0W0,0P0,0;'
    )
  })

  it('MODES_CLEAR has mode enum 0', () => {
    const data: EffectData = {
      mode: 'MODES_CLEAR',
      start_time: 500, duration: 2000,
      XH: zeroChannel(), XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    expect(effectDataToHardwareString(data)).toMatch(/^M0S500D2000/)
  })

  it('Extra params p1=1 p3=128 p4=255 → P256,32895;', () => {
    // pNum1 = p1*256 + p2 = 1*256 + 0 = 256
    // pNum2 = p3*256 + p4 = 128*256 + 255 = 32895 + 128*256 = 32768+255 = wait:
    // 128*256 = 32768, 32768+255 = 33023
    const data: EffectData = {
      mode: 'MODES_PLAIN', start_time: 0, duration: 0,
      XH: zeroChannel(), XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 1, p2: 0, p3: 128, p4: 255,
    }
    // pNum1 = 1*256+0=256, pNum2=128*256+255=33023
    expect(effectDataToHardwareString(data)).toMatch(/P256,33023;$/)
  })

  it('FuncStep (func=5): num1 includes func code 5', () => {
    // num1 = 5*65536 + range*256 + lower = 327680 + 0 + 0 = 327680
    const data: EffectData = {
      mode: 'MODES_PLAIN', start_time: 0, duration: 0,
      XH: { func: 5, range: 0, lower: 0, p1: 200, p2: 10 },
      XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    // num2 = 200*256 + 10 = 51210
    expect(effectDataToHardwareString(data)).toMatch(/^M1S0D0X327680,51210/)
  })
})

describe('instanceToEffectData', () => {

  it('MODES_FAN bladeCount=6, length=150 → p1=curvature(0), p3=bladeCount→128, p4=length→128', () => {
    // normalizeTo255(6, 0, 12) = round(6/12*255) = round(127.5) = 128
    // normalizeTo255(150, 0, 300) = round(150/300*255) = round(127.5) = 128
    // p1 = normalizeTo255(curvature=0, 0, 100) = 0
    const instance: EffectInstance = {
      id: 'test-1',
      definitionName: '扇形',
      trackIndex: 0,
      startTime: 0,
      duration: 1000,
      params: {
        ...defaultEffectParams(),
        extra: {
          bladeCount: 6, length: 150, curvature: 0,
          boxsize: 0, space: 0, reverse: 0, positionFix: 0,
        },
      },
    }
    const data = instanceToEffectData(instance, 'MODES_FAN')
    expect(data.p1).toBe(0)   // curvature=0
    expect(data.p3).toBe(128) // bladeCount=6
    expect(data.p4).toBe(128) // length=150
  })

  it('MODES_SICKLE reverse has no effect; MODES_CMAP_DNA reverse=1 → p1=255', () => {
    const instance: EffectInstance = {
      id: 'test-2',
      definitionName: 'DNA',
      trackIndex: 0,
      startTime: 0,
      duration: 1000,
      params: {
        ...defaultEffectParams(),
        extra: {
          bladeCount: 0, length: 0, curvature: 0,
          boxsize: 0, space: 0, reverse: 1, positionFix: 0,
        },
      },
    }
    const data = instanceToEffectData(instance, 'MODES_CMAP_DNA')
    expect(data.p1).toBe(255)
  })
})
```

- [ ] **Step 2: 確認測試失敗（因為 serializer.ts 還不存在）**

```bash
npm test
```

預期：所有 tests FAIL，錯誤訊息包含 `Cannot find module '../services/serializer'`。

- [ ] **Step 3: 實作 `src/services/serializer.ts`**

```typescript
import type { EffectData, EffectInstance, EffectMode } from '../types'
import { MODE_ENUM } from '../constants/effectConfig'

function normalizeTo255(value: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.round(((value - min) / (max - min)) * 255)
}

/**
 * Converts EffectInstance to raw EffectData for hardware transmission.
 * The mode must be passed explicitly (looked up from EffectDefinition.mode).
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
 * Output format: "M{mode}S{start}D{dur}X{n1},{n2}...P{n1},{n2};"
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
 * Convenience: convert an EffectInstance + its mode directly to a hardware string.
 */
export function instanceToHardwareString(instance: EffectInstance, mode: EffectMode): string {
  return effectDataToHardwareString(instanceToEffectData(instance, mode))
}
```

- [ ] **Step 4: 執行測試，確認全部通過**

```bash
npm test
```

預期輸出：
```
 ✓ src/tests/serializer.test.ts (7)
   ✓ effectDataToHardwareString (5)
   ✓ instanceToEffectData (2)

 Test Files  1 passed (1)
 Tests       7 passed (7)
```

如果有 test 失敗，比對輸出差異，對照 `server.js` `stringify()` 邏輯逐行確認。

- [ ] **Step 5: Commit**

```bash
git add src/services/serializer.ts src/tests/serializer.test.ts
git commit -m "feat: add serializer service with hardware string encoding (TDD)"
```

---

### Task 5: effectStore

**Files:**
- Create: `src/stores/effectStore.ts`

- [ ] **Step 1: 建立 `src/stores/effectStore.ts`**

```typescript
import { defineStore } from 'pinia'
import type { EffectInstance, EffectDefinition } from '../types'
import { BUILT_IN_DEFINITIONS } from '../constants/effectDefinitions'
import { defaultEffectParams } from '../constants/effectConfig'

interface EffectState {
  definitions: EffectDefinition[]
  instances: EffectInstance[]
  selectedInstanceId: string | null
}

export const useEffectStore = defineStore('effect', {
  state: (): EffectState => ({
    definitions: [...BUILT_IN_DEFINITIONS],
    instances: [],
    selectedInstanceId: null,
  }),

  getters: {
    selectedInstance: (state): EffectInstance | null =>
      state.instances.find(i => i.id === state.selectedInstanceId) ?? null,

    getDefinition: (state) => (name: string): EffectDefinition | undefined =>
      state.definitions.find(d => d.name === name),

    customDefinitions: (state): EffectDefinition[] =>
      state.definitions.filter(d => !d.isBuiltIn),
  },

  actions: {
    addInstance(
      definitionName: string,
      startTime: number,
      duration: number,
      trackIndex: number
    ): string {
      const def = this.definitions.find(d => d.name === definitionName)
      if (!def) throw new Error(`Definition not found: ${definitionName}`)

      const id = `effect_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const instance: EffectInstance = {
        id,
        definitionName,
        trackIndex,
        startTime,
        duration,
        params: JSON.parse(JSON.stringify(def.defaultParams)),
      }
      this.instances.push(instance)
      return id
    },

    updateInstance(id: string, patch: Partial<Omit<EffectInstance, 'id'>>): void {
      const idx = this.instances.findIndex(i => i.id === id)
      if (idx === -1) throw new Error(`Instance not found: ${id}`)
      this.instances[idx] = { ...this.instances[idx], ...patch }
    },

    removeInstance(id: string): void {
      this.instances = this.instances.filter(i => i.id !== id)
      if (this.selectedInstanceId === id) this.selectedInstanceId = null
    },

    selectInstance(id: string | null): void {
      this.selectedInstanceId = id
    },

    addCustomDefinition(def: EffectDefinition): void {
      if (def.isBuiltIn) throw new Error('Cannot add definition with isBuiltIn=true')
      if (this.definitions.some(d => d.name === def.name)) {
        throw new Error(`Definition already exists: ${def.name}`)
      }
      this.definitions.push(def)
    },

    removeCustomDefinition(name: string): void {
      const def = this.definitions.find(d => d.name === name)
      if (!def) throw new Error(`Definition not found: ${name}`)
      if (def.isBuiltIn) throw new Error(`Cannot remove built-in definition: ${name}`)
      this.definitions = this.definitions.filter(d => d.name !== name)
    },

    /** Called by projectStore when loading a project file */
    loadFromProject(
      instances: EffectInstance[],
      customDefinitions: EffectDefinition[]
    ): void {
      this.instances = instances
      this.definitions = [
        ...BUILT_IN_DEFINITIONS,
        ...customDefinitions.map(d => ({ ...d, isBuiltIn: false })),
      ]
      this.selectedInstanceId = null
    },

    /** Reset to empty project */
    clear(): void {
      this.instances = []
      this.definitions = [...BUILT_IN_DEFINITIONS]
      this.selectedInstanceId = null
    },
  },
})
```

- [ ] **Step 2: 型別檢查**

```bash
npm run type-check
```

預期：無 error。

- [ ] **Step 3: Commit**

```bash
git add src/stores/effectStore.ts
git commit -m "feat: add effectStore (Pinia)"
```

---

### Task 6: timelineStore

**Files:**
- Create: `src/stores/timelineStore.ts`

- [ ] **Step 1: 建立 `src/stores/timelineStore.ts`**

```typescript
import { defineStore } from 'pinia'

interface TimelineState {
  secondsPerPixel: number   // zoom level (小 = 放大)
  timelineOffset: number    // horizontal scroll in pixels
  globalTime: number        // current playback time in milliseconds
  isPlaying: boolean
  totalDuration: number     // total project duration in milliseconds (from audio or last block)
}

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    secondsPerPixel: 0.01,   // default: 100px per second
    timelineOffset: 0,
    globalTime: 0,
    isPlaying: false,
    totalDuration: 60_000,   // default 60 seconds
  }),

  getters: {
    /** Current playhead position in pixels from timeline left edge */
    playheadPixel: (state): number =>
      (state.globalTime / 1000) / state.secondsPerPixel - state.timelineOffset,

    /** Convert milliseconds to pixels (relative to timeline left edge) */
    msToPixel: (state) => (ms: number): number =>
      (ms / 1000) / state.secondsPerPixel - state.timelineOffset,

    /** Convert pixel position to milliseconds */
    pixelToMs: (state) => (px: number): number =>
      (px + state.timelineOffset) * state.secondsPerPixel * 1000,
  },

  actions: {
    setTime(ms: number): void {
      this.globalTime = Math.max(0, Math.min(ms, this.totalDuration))
    },

    setPlaying(playing: boolean): void {
      this.isPlaying = playing
    },

    zoom(factor: number, anchorPixel: number): void {
      // Zoom in/out keeping anchorPixel fixed on screen
      const anchorMs = this.pixelToMs(anchorPixel)
      this.secondsPerPixel = Math.max(0.003, Math.min(0.5, this.secondsPerPixel * factor))
      // Re-anchor: adjust offset so anchorMs stays at anchorPixel
      this.timelineOffset = (anchorMs / 1000) / this.secondsPerPixel - anchorPixel
    },

    setOffset(offset: number): void {
      this.timelineOffset = Math.max(0, offset)
    },

    setTotalDuration(ms: number): void {
      this.totalDuration = ms
    },
  },
})
```

- [ ] **Step 2: 型別檢查 + Commit**

```bash
npm run type-check
git add src/stores/timelineStore.ts
git commit -m "feat: add timelineStore (Pinia)"
```

---

### Task 7: audioStore

**Files:**
- Create: `src/stores/audioStore.ts`

- [ ] **Step 1: 建立 `src/stores/audioStore.ts`**

```typescript
import { defineStore } from 'pinia'

interface AudioState {
  hasAudio: boolean              // false = no music loaded (hardware can still run)
  duration: number               // total audio duration in milliseconds
  peaks: number[]                // normalized waveform peaks for rendering
  fileName: string | null        // loaded file name for display
}

export const useAudioStore = defineStore('audio', {
  state: (): AudioState => ({
    hasAudio: false,
    duration: 0,
    peaks: [],
    fileName: null,
  }),

  actions: {
    setAudio(duration: number, peaks: number[], fileName: string): void {
      this.hasAudio = true
      this.duration = duration
      this.peaks = peaks
      this.fileName = fileName
    },

    clearAudio(): void {
      this.hasAudio = false
      this.duration = 0
      this.peaks = []
      this.fileName = null
    },
  },
})
```

- [ ] **Step 2: 型別檢查 + Commit**

```bash
npm run type-check
git add src/stores/audioStore.ts
git commit -m "feat: add audioStore (Pinia)"
```

---

### Task 8: projectStore

**Files:**
- Create: `src/stores/projectStore.ts`

- [ ] **Step 1: 建立 `src/stores/projectStore.ts`**

```typescript
import { defineStore } from 'pinia'
import type { ProjectFile, EffectLibraryFile } from '../types'
import { useEffectStore } from './effectStore'
import { useTimelineStore } from './timelineStore'
import { useAudioStore } from './audioStore'

interface ProjectState {
  projectName: string
  musicFile: string | null
  isDirty: boolean
  lastSavedAt: Date | null
}

export const useProjectStore = defineStore('project', {
  state: (): ProjectState => ({
    projectName: '新專案',
    musicFile: null,
    isDirty: false,
    lastSavedAt: null,
  }),

  actions: {
    markDirty(): void {
      this.isDirty = true
    },

    /** Serialize current state to ProjectFile JSON */
    toProjectFile(): ProjectFile {
      const effectStore = useEffectStore()
      return {
        version: '2.0',
        name: this.projectName,
        musicFile: this.musicFile,
        timeline: {
          instances: effectStore.instances,
        },
      }
    },

    /** Serialize custom definitions to EffectLibraryFile JSON */
    toLibraryFile(): EffectLibraryFile {
      const effectStore = useEffectStore()
      return {
        version: '2.0',
        definitions: effectStore.customDefinitions,
      }
    },

    /** Load from parsed project.json + effect_library.json objects */
    loadProject(projectFile: ProjectFile, libraryFile: EffectLibraryFile): void {
      const effectStore = useEffectStore()
      const timelineStore = useTimelineStore()
      const audioStore = useAudioStore()

      effectStore.loadFromProject(projectFile.timeline.instances, libraryFile.definitions)
      this.projectName = projectFile.name
      this.musicFile = projectFile.musicFile

      // If there's audio loaded, update timeline duration from audio
      if (!audioStore.hasAudio) {
        // Calculate duration from last instance end time
        const lastEnd = Math.max(
          0,
          ...projectFile.timeline.instances.map(i => i.startTime + i.duration)
        )
        timelineStore.setTotalDuration(Math.max(lastEnd, 60_000))
      }

      this.isDirty = false
      this.lastSavedAt = null
    },

    /** Trigger browser download of project.json */
    downloadProjectFile(): void {
      const data = this.toProjectFile()
      this._downloadJson(data, `${this.projectName}_project.json`)
    },

    /** Trigger browser download of effect_library.json */
    downloadLibraryFile(): void {
      const data = this.toLibraryFile()
      this._downloadJson(data, `${this.projectName}_effect_library.json`)
    },

    _downloadJson(data: unknown, filename: string): void {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      this.isDirty = false
      this.lastSavedAt = new Date()
    },
  },
})
```

- [ ] **Step 2: 型別檢查 + Commit**

```bash
npm run type-check
git add src/stores/projectStore.ts
git commit -m "feat: add projectStore with save/load/export (Pinia)"
```

---

### Task 9: audioService

**Files:**
- Create: `src/services/audioService.ts`

- [ ] **Step 1: 建立 `src/services/audioService.ts`**

```typescript
/**
 * Web Audio API utilities.
 * Stateless — all audio state lives in audioStore.
 */

let _audioContext: AudioContext | null = null
let _sourceNode: AudioBufferSourceNode | null = null
let _audioBuffer: AudioBuffer | null = null

function getAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}

/** Load an MP3/WAV File into an AudioBuffer */
export async function loadAudioFile(file: File): Promise<{ buffer: AudioBuffer; duration: number }> {
  const ctx = getAudioContext()
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  _audioBuffer = audioBuffer
  return {
    buffer: audioBuffer,
    duration: Math.round(audioBuffer.duration * 1000), // return ms
  }
}

/**
 * Extract normalized peak values for waveform rendering.
 * @param buffer  Decoded AudioBuffer
 * @param numPeaks  Number of peaks to extract (one per pixel-column roughly)
 */
export function extractPeaks(buffer: AudioBuffer, numPeaks: number): number[] {
  const channelData = buffer.getChannelData(0)
  const blockSize = Math.floor(channelData.length / numPeaks)
  const peaks: number[] = []

  for (let i = 0; i < numPeaks; i++) {
    let max = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(channelData[start + j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }
  return peaks
}

/** Start playback from offsetMs (in milliseconds) */
export function startPlayback(offsetMs: number): void {
  if (!_audioBuffer) return
  stopPlayback()
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  const source = ctx.createBufferSource()
  source.buffer = _audioBuffer
  source.connect(ctx.destination)
  source.start(0, offsetMs / 1000)
  _sourceNode = source
}

/** Stop current playback */
export function stopPlayback(): void {
  if (_sourceNode) {
    try { _sourceNode.stop() } catch { /* already stopped */ }
    _sourceNode = null
  }
}

/** Get current AudioContext time in milliseconds */
export function getAudioContextTime(): number {
  return _audioContext ? _audioContext.currentTime * 1000 : 0
}
```

- [ ] **Step 2: 型別檢查 + Commit**

```bash
npm run type-check
git add src/services/audioService.ts
git commit -m "feat: add audioService (Web Audio API wrapper)"
```

---

### Task 10: hardwareService

**Files:**
- Create: `src/services/hardwareService.ts`

- [ ] **Step 1: 建立 `src/services/hardwareService.ts`**

```typescript
/**
 * Communication with the Express hardware server (port 10240).
 * All fetch calls go through Vite proxy → http://localhost:10240
 */

let _syncInterval: ReturnType<typeof setInterval> | null = null

/**
 * Start sending playback time to server every 50ms.
 * @param getTimeMs  Function that returns current playback time in ms
 */
export function startHardwareSync(getTimeMs: () => number): void {
  if (_syncInterval) return
  _syncInterval = setInterval(async () => {
    const timeMs = getTimeMs()
    try {
      await fetch(`/start?time=${timeMs}`)
    } catch {
      // Server unreachable — silently ignore, don't break playback
    }
  }, 50)
}

/** Stop the hardware sync interval */
export function stopHardwareSync(): void {
  if (_syncInterval) {
    clearInterval(_syncInterval)
    _syncInterval = null
  }
}

/** Fetch effect string from server (used to verify hardware receives correct data) */
export async function getEffectFromServer(effectId: number, luxId: number): Promise<string> {
  const res = await fetch(`/get_effect?id=${effectId}&luxid=${luxId}`)
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
  return res.text()
}

/** Send hardware to auto execution mode (0) or manual mode (1) */
export async function setExecutionMode(mode: 0 | 1): Promise<void> {
  await fetch(`/exe_mode?mode=${mode}`)
}
```

- [ ] **Step 2: 型別檢查 + Commit**

```bash
npm run type-check
git add src/services/hardwareService.ts
git commit -m "feat: add hardwareService (hardware sync and API calls)"
```

---

### Task 11: 最終驗證

- [ ] **Step 1: 全套 type-check + 測試**

```bash
npm run type-check && npm test
```

預期輸出：
```
[type-check] 無 error
 ✓ src/tests/serializer.test.ts (7)
 Test Files  1 passed (1)
 Tests  7 passed (7)
```

- [ ] **Step 2: 確認 dev server 仍可正常啟動**

```bash
npm run dev
```

開啟 http://localhost:3000，舊的 UI 應仍然可以操作（此時 Vue App 和舊 script.js 並存）。

- [ ] **Step 3: 最終 commit**

```bash
git add -A
git commit -m "chore: Plan 1 complete — Foundation layer ready"
```

---

## Plan 1 完成後的狀態

- Vite dev server 啟動，舊 UI 並存不受影響
- 所有型別定義完整
- 序列化邏輯有 7 個 passing tests，確認與現有硬體協議一致
- 4 個 Pinia stores 就位（effectStore, timelineStore, audioStore, projectStore）
- 3 個服務層就位（serializer, audioService, hardwareService）

## 下一步：Plan 2 — UI Components

Plan 2 將把現有的 `src/index.html` + `src/js/script.js` 拆分成 Vue 組件，並讓組件接入 Plan 1 建立的 stores。
