# ControlPanel v2 — 重構設計文件

**日期：** 2026-04-03
**作者：** CandleHsu
**狀態：** 設計審核中

---

## 1. 背景與動機

### 為什麼要重構？

ControlPanel v2 是一個 LED 燈光效果編輯器，功能包含：
- 多軌 Timeline 編輯（最多 6 軌）
- 效果參數調整（6 HSV 通道 + 額外參數）
- LED 環形預覽（即時動畫）
- 音樂同步播放
- 硬體控制（透過 Express server 傳送效果至 ESP32）

目前的主要問題：
- `script.js` 高達 3,529 行，Timeline、Audio、參數 UI、序列化邏輯全部混在一起
- 30+ 全域變數（`window.globalEffectData`、`assetCanvas1-6` 等），任何人都可以在任何地方修改，難以追蹤 bug
- 宣告了 Vue 3 但完全沒用
- `stringify()` 函式在 `script.js` 和 `server.js` 各有一份，可能不同步
- 左側資產庫的效果只是 HTML 按鈕，沒有對應的資料物件，使用者無法新增自訂效果類型
- 效果預覽不即時更新、效果在 3-4 秒後變成靜止純色等已知 bug
- 測試硬體時必須匯入音樂才能啟動，效果單獨測試不方便

### 預期成果

- 可維護的組件化架構，5 人以上可以分工開發
- 使用者可以建立、儲存、匯出自訂效果定義
- 所有已知 bug 在重構過程中一併修復
- 完整的開發者文件，新成員可以快速上手

---

## 2. 技術棧

| 工具 | 版本 | 用途 |
|------|------|------|
| **Vite** | latest | 開發伺服器 + 打包（取代目前無打包工具的狀態） |
| **Vue 3** | 3.5.x | UI 框架，組件化 |
| **TypeScript** | 5.x | 型別安全，IDE 補全 |
| **Pinia** | latest | 狀態管理，取代 30+ 全域變數 |
| **Fabric.js** | 6.9.x | 保留，用於 Timeline 畫布渲染 |

---

## 3. 組件架構

### 組件樹

```
App.vue
├── AssetLibrary.vue        左側資產庫
│   ├── PresetEffectList    內建 15 種效果
│   └── CustomEffectList    使用者自訂效果
├── TimelinePanel.vue       中央 Timeline 區域
│   ├── TimescaleCanvas     時間刻度軸（Fabric.js）
│   ├── WaveformCanvas      音樂波形顯示（Fabric.js）
│   └── TrackCanvas.vue     × 6 軌，每軌一個 Fabric.js 畫布
├── PreviewPanel.vue        LED 環形預覽（包裝現有 pre_view Web Component）
└── ParameterPanel.vue      右側參數面板
    ├── HsvChannelGroup.vue × 6（XH/XS/XV/YH/YS/YV）
    └── ExtraParamsGroup.vue 根據效果類型顯示對應額外參數
```

### 每個組件的職責

| 組件 | 只負責 | 不碰 |
|------|--------|------|
| `AssetLibrary.vue` | 顯示效果清單、拖放起始 | Timeline 如何渲染 |
| `TimelinePanel.vue` | Fabric.js 畫布渲染、縮放/拖動、播放頭 | 參數值是什麼 |
| `TrackCanvas.vue` | 單一軌道的 block 顯示與互動 | 其他軌道的狀態 |
| `PreviewPanel.vue` | 把 store 裡的效果資料傳給 pre_view | 資料從哪裡來 |
| `ParameterPanel.vue` | 顯示選中效果的參數、接收使用者輸入 | Timeline 位置 |

---

## 4. 狀態管理（Pinia Stores）

### 4.1 effectStore — 效果資料

```typescript
// stores/effectStore.ts
interface State {
  definitions: EffectDefinition[];    // 效果「類型」庫（內建 + 自訂）
  instances: EffectInstance[];        // Timeline 上的效果「實例」
  selectedInstanceId: string | null;  // 目前選中的 block
}

// Actions
addInstance(definitionName: string, startTime: number, trackIndex: number): string
updateInstance(id: string, patch: Partial<EffectInstance>): void
removeInstance(id: string): void
addCustomDefinition(def: EffectDefinition): void
```

取代：`window.globalEffectData`、`currentEditingId`、`currentLibraryAssetName`

### 4.2 timelineStore — Timeline 視圖狀態

```typescript
// stores/timelineStore.ts
interface State {
  secondsPerPixel: number;   // 縮放比例
  timelineOffset: number;    // 水平滾動位移（像素）
  globalTime: number;        // 目前播放時間（秒）
  isPlaying: boolean;
}
```

取代：`secondsPerPixel`、`timelineOffset`、`globalTime`、`isPlaying`

### 4.3 audioStore — 音訊

```typescript
// stores/audioStore.ts
interface State {
  audioBuffer: AudioBuffer | null;
  peaks: number[];           // 波形資料
  duration: number;          // 音訊總長（秒）
  hasAudio: boolean;         // 允許無音樂狀態（修復「必須有音樂才能啟動」的問題）
}
```

取代：`audioCtx`、`audioBuffer`、`peaks`

### 4.4 projectStore — 專案管理

```typescript
// stores/projectStore.ts
interface State {
  projectName: string;
  musicFilePath: string | null;
  isDirty: boolean;           // 有未儲存的修改
  lastSavedAt: Date | null;
}

// Actions
save(): void       // 儲存為 project.json + effect_library.json
load(path): void   // 從資料夾載入
exportLibrary(): void  // 單獨匯出 effect_library.json
importLibrary(file): void
```

---

## 5. 型別定義

### 5.1 效果「定義」vs「實例」

```typescript
// types/index.ts

// 效果「類型」的描述 — 資產庫裡的東西
interface EffectDefinition {
  name: string;                    // "純色"、"方形"、"我的自訂效果"
  mode: EffectMode;                // 對應硬體的 enum
  isBuiltIn: boolean;              // true = 內建，false = 使用者建立
  defaultParams: EffectParams;     // 拖到 Timeline 時的初始參數值
  extraParamSchema: ExtraParamSchema; // 這個效果支援哪些額外參數
  thumbnail?: string;              // 未來預覽圖（可選）
}

// Timeline 上的一個 block — 有位置、有具體參數值
interface EffectInstance {
  id: string;
  definitionName: string;          // 指向 EffectDefinition.name
  trackIndex: number;              // 0-5，在哪一軌
  startTime: number;               // 毫秒（與 EffectData.start_time 相同單位）
  duration: number;                // 毫秒
  params: EffectParams;            // HSV 通道 + extra（extra 包含在 params.extra 內）
}

// HSV 6 通道參數
interface EffectParams {
  xH: HsvChannel;
  xS: HsvChannel;
  xV: HsvChannel;
  yH: HsvChannel;
  yS: HsvChannel;
  yV: HsvChannel;
}

// 單一 HSV 通道
interface HsvChannel {
  func: HsvFunction;   // 0=None, 1=Const, 2=Ramp, 3=Triangle, 4=Pulse, 5=Step
  value: number;       // 0-255
  period: number;
  phase: number;
  duty: number;
}

// 額外參數（各效果類型不同）
interface ExtraParams {
  bladeCount?: number;
  length?: number;
  curvature?: number;
  boxsize?: number;
  space?: number;
  reverse?: boolean;          // 舊系統為 number 0|1，新架構改為 boolean
  positionFix?: number;       // 注意：舊系統 JSON 為 position_fix（snake_case），載入舊檔需做欄位映射
}
```

### 5.2 硬體相關型別

```typescript
type EffectMode =
  | 'MODES_PLAIN'
  | 'MODES_SQUARE'
  | 'MODES_SICKLE'
  | 'MODES_FAN'
  | 'MODES_BOXES'
  | 'MODES_DNA'
  | 'MODES_FIRE'
  | 'MODES_LOVE'
  | 'MODES_GEAR'
  | 'MODES_ES'
  | 'MODES_ENGR'
  | 'MODES_ESXOPT'
  | 'MODES_OT'
  | 'MODES_PT'
  | 'MODES_CLEAR';

type HsvFunction = 0 | 1 | 2 | 3 | 4 | 5;
```

---

## 6. 服務層（Services）

### 6.1 serializer.ts — 統一序列化

```typescript
// services/serializer.ts
// 目前 script.js 和 server.js 各有一份 stringify()，這裡統一

export function instanceToHardwareString(instance: EffectInstance): string;
export function instanceToJson(instance: EffectInstance): object;
export function jsonToInstance(json: object): EffectInstance;
```

### 6.2 audioService.ts — Web Audio 包裝

```typescript
// services/audioService.ts
export async function loadAudioFile(file: File): Promise<AudioBuffer>;
export function extractPeaks(buffer: AudioBuffer, targetLength: number): number[];
export function createPlaybackNode(buffer: AudioBuffer, startOffset: number): AudioBufferSourceNode;
```

### 6.3 hardwareService.ts — 硬體通訊

```typescript
// services/hardwareService.ts
export function startSync(getTime: () => number): void;  // 每 50ms 傳時間
export function stopSync(): void;
export async function sendEffect(instance: EffectInstance): Promise<void>;
```

---

## 7. 專案檔案格式

```
my_show/
├── project.json           ← 專案主檔
├── effect_library.json    ← 這個專案的效果定義庫（含自訂效果）
└── music.mp3              ← 音樂（可選，不強制）
```

### project.json 結構

```json
{
  "version": "2.0",
  "name": "我的表演",
  "musicFile": "music.mp3",
  "timeline": {
    "instances": [
      {
        "id": "effect_001",
        "definitionName": "純色",
        "trackIndex": 0,
        "startTime": 0,
        "duration": 5.0,
        "params": { "xH": {...}, "xS": {...}, ... },
        "extra": {}
      }
    ]
  }
}
```

### effect_library.json 結構

```json
{
  "version": "2.0",
  "definitions": [
    {
      "name": "我的自訂效果",
      "mode": "MODES_PLAIN",
      "isBuiltIn": false,
      "defaultParams": { "xH": {...}, ... },
      "extraParamSchema": {}
    }
  ]
}
```

---

## 8. 檔案結構

```
ControlPanel_v2/
├── src/
│   ├── main.ts                      ← Vite 進入點
│   ├── App.vue                      ← 根組件
│   │
│   ├── components/
│   │   ├── AssetLibrary.vue
│   │   ├── TimelinePanel.vue
│   │   ├── TrackCanvas.vue
│   │   ├── PreviewPanel.vue
│   │   └── ParameterPanel.vue
│   │       ├── HsvChannelGroup.vue
│   │       └── ExtraParamsGroup.vue
│   │
│   ├── stores/
│   │   ├── effectStore.ts
│   │   ├── timelineStore.ts
│   │   ├── audioStore.ts
│   │   └── projectStore.ts
│   │
│   ├── services/
│   │   ├── serializer.ts
│   │   ├── audioService.ts
│   │   └── hardwareService.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── constants/
│   │   ├── effectDefinitions.ts     ← 15 種內建效果的定義
│   │   └── effectConfig.ts          ← MODE_MAP、EFFECT_CONFIG（統一版）
│   │
│   └── lib/
│       ├── EffectBlock.ts           ← 從 EffectBlock.js 遷移（清理全域依賴）
│       └── PreviewElement.ts        ← 從 pre_view.js 遷移（效能優化）
│
├── server/
│   ├── server.ts                    ← Express server（TypeScript 版）
│   └── package.json
│
├── docs/
│   ├── README.md                    ← 開發者指南（見第 9 節）
│   ├── architecture.md              ← 架構說明
│   ├── hardware-protocol.md         ← 硬體協議字串格式說明
│   └── superpowers/specs/           ← 設計文件
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 9. 開發者文件規劃

文件存放於 `docs/`，涵蓋三個層次：

### README.md（快速上手）
- 環境需求（Node 版本等）
- `npm install` → `npm run dev` 啟動流程
- 目錄結構簡介
- 常見操作：新增效果類型、連接硬體

### architecture.md（架構說明）
- 組件樹與職責
- Store 設計決策
- 資料流：從拖放資產到硬體收到指令的完整路徑
- EffectDefinition vs EffectInstance 的概念說明

### hardware-protocol.md（硬體協議）
- 協議字串格式說明（`"M1S46541D99965X..."` 各欄位意義）
- 目前硬體設定（5 個 lux 單元、10 個 light board）
- 如何在無音樂情況下測試效果

---

## 10. 已知 Bug 修復計劃

| Bug | 根本原因 | 重構後如何修復 |
|-----|---------|--------------|
| Preview 不即時更新 | Preview 不知道參數何時改變 | `PreviewPanel.vue` 監看 `effectStore.selectedInstance`，自動觸發更新 |
| 效果 3-4 秒後變靜止純色 | 待調查 `pre_view.js` 的動畫循環邏輯 | 遷移時深入調查 `drawSomething()` 和幀計數邏輯 |
| 必須有音樂才能啟動硬體 | `hardwareService` 依賴音訊狀態 | `audioStore.hasAudio` 設為可選，無音樂時使用計時器替代 |
| SQUARE/BOXES/FAN 效果有問題 | 待調查 `pre_view.js` 的 `perform()` 遮罩邏輯 | 遷移時逐一測試每種遮罩 |
| Y 軸效果錯誤 | 待調查 HSV Y 通道計算邏輯 | 在 `serializer.ts` 加單元測試驗證 |
| Auto-save 未實作 | 功能缺失 | `projectStore` 的 `isDirty` 觸發自動儲存 |

---

## 11. 驗證計劃

### 開發環境驗證
```bash
npm run dev       # 啟動 Vite dev server，確認 UI 正常載入
npm run build     # 確認 TypeScript 編譯無錯誤
npm run type-check # 型別檢查
```

### 功能驗證清單
- [ ] 拖放資產到 Timeline，block 正確出現
- [ ] 調整右側參數，Preview 即時更新
- [ ] Timeline 縮放/拖動正常
- [ ] 播放音樂，播放頭同步移動
- [ ] 無音樂情況下可以啟動硬體
- [ ] 建立自訂效果定義，儲存為 project 後重新載入仍存在
- [ ] 匯出 effect_library.json，匯入到新專案後效果定義出現在資產庫
- [ ] 硬體接收到正確的協議字串（用 server log 驗證）

### 序列化驗證
對比重構前後的 `stringify()` 輸出，確保對同樣輸入產生相同的硬體協議字串。
