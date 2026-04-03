# ControlPanel v2 — Plan 3: Pre-view Migration, Server, & Docs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 遷移 `pre_view.js` 為 TypeScript、將 Express server 遷移為 TypeScript、修復剩餘 bug、撰寫開發者文件。

**Architecture:** 三個獨立子系統（Pre-view、Server、Docs），可以並行開發。Pre-view 遷移需要逐一驗證每種效果類型的遮罩渲染正確性。

**Tech Stack:** TypeScript、Vue 3 Web Component、Node.js Express TypeScript

**Spec:** `docs/superpowers/specs/2026-04-03-controlpanel-v2-refactor-design.md`
**前置條件:** Plan 2 已完成

---

## 新增/修改的檔案

```
新增：
  src/lib/PreviewElement.ts          ← pre_view.js → TypeScript
  server/server.ts                   ← server.js → TypeScript
  server/tsconfig.json
  docs/README.md
  docs/architecture.md
  docs/hardware-protocol.md

修改：
  src/components/PreviewPanel.vue    ← 改用 PreviewElement.ts
  src/main.ts                        ← 移除 pre_view.js import

刪除：
  src/js/pre_view.js                 ← 被 PreviewElement.ts 取代
```

---

### Task 1: Pre-view 遷移前調查（必讀）

在遷移之前，必須先理解現有 `pre_view.js` 的已知 bug：

**已知問題（來自 todo.md）：**
1. 效果在 3-4 秒後變成靜止純色 → 調查 `drawSomething()` 和幀計數邏輯
2. SQUARE/BOXES/FAN 效果顯示異常 → 調查 `perform()` 遮罩函式
3. Y 軸效果錯誤 → 調查 HSV Y 通道計算

- [ ] **Step 1: 閱讀並記錄 `src/js/pre_view.js` 的架構**

閱讀 `src/js/pre_view.js`（1,351 行），記錄：
- `updateData()` 如何觸發重新渲染
- `drawSomething()` 的幀計數邏輯（10,000 幀的限制）
- `perform()` 的遮罩類型（sickle、fan、boxes）
- HSV Y 通道計算（`updateHeading()` 函式）

- [ ] **Step 2: 寫下調查結果**

在 `docs/` 建立 `pre_view-investigation.md`，記錄：
- 3-4 秒停止的根本原因
- 每種遮罩的計算方式
- Y 通道 bug 的位置

這份文件將指導 Task 2 的遷移和 bug 修復。

---

### Task 2: PreviewElement.ts — 遷移 + 修 Bug

**Files:**
- Create: `src/lib/PreviewElement.ts`

將 `pre_view.js` 逐段遷移為 TypeScript，並在遷移過程中修復調查出的 bug。

- [ ] **Step 1: 建立 `src/lib/PreviewElement.ts` 骨架**

```typescript
// Custom HTML element <pre-view>
// Replaces src/js/pre_view.js

export class PreviewElement extends HTMLElement {
  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private animationId: number | null = null
  private frames: ImageData[] = []
  private currentFrame = 0

  static get observedAttributes() {
    return ['anime', 'speed', 'led-bulb-size', 'led-bulb-spacing', 'inner-radius']
  }

  connectedCallback() {
    this.canvas = document.createElement('canvas')
    this.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    // ... init
  }

  updateData(effectData: unknown): void {
    // 接受 EffectData 格式，重新計算所有幀
    this._precomputeFrames(effectData)
    this._startAnimation()
  }

  private _precomputeFrames(effectData: unknown): void {
    // 遷移自 updateData() + drawSomething()
    // BUG FIX: 10,000 幀限制導致 3-4 秒後靜止 → 改為循環
  }

  private _startAnimation(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId)
    const loop = () => {
      this._renderFrame(this.currentFrame % this.frames.length)
      this.currentFrame++
      this.animationId = requestAnimationFrame(loop)
    }
    this.animationId = requestAnimationFrame(loop)
  }

  private _renderFrame(index: number): void {
    if (this.frames[index]) {
      this.ctx.putImageData(this.frames[index], 0, 0)
    }
  }

  disconnectedCallback() {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId)
  }
}

customElements.define('pre-view', PreviewElement)
```

> 注意：`_precomputeFrames()` 的完整實作需要根據 Task 1 的調查結果填入，涵蓋所有 HSV 函式（Const/Ramp/Triangle/Pulse/Step）和所有遮罩類型。

- [ ] **Step 2: 逐一驗證每種效果類型**

啟動 dev server，在 Timeline 上測試每種效果：
- [ ] MODES_PLAIN 純色顯示正確
- [ ] MODES_SQUARE 方形遮罩正確
- [ ] MODES_SICKLE 鐮刀遮罩正確
- [ ] MODES_FAN 扇形遮罩正確
- [ ] MODES_BOXES 方塊遮罩正確
- [ ] 效果動畫持續超過 4 秒不停止（bug 修復驗證）
- [ ] Y 軸效果顯示正確（bug 修復驗證）

- [ ] **Step 3: 更新 `src/components/PreviewPanel.vue` 改用新元素**

```typescript
// src/main.ts — 換掉舊的 import
// 移除：import './js/pre_view.js'
// 新增：
import { PreviewElement } from './lib/PreviewElement'
if (!customElements.get('pre-view')) {
  customElements.define('pre-view', PreviewElement)
}
```

- [ ] **Step 4: 刪除 `src/js/pre_view.js`**

```bash
git rm src/js/pre_view.js
```

- [ ] **Step 5: type-check + tests**

```bash
npm run type-check && npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/PreviewElement.ts src/main.ts
git commit -m "feat: migrate pre_view to TypeScript, fix 3-4s freeze and mask bugs"
```

---

### Task 3: Server TypeScript 遷移

**Files:**
- Create: `server/server.ts`
- Create: `server/tsconfig.json`

將現有的 `src/server/server.js`（309 行）遷移為 TypeScript，加入型別和錯誤處理。

- [ ] **Step 1: 建立 `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["server.ts"]
}
```

- [ ] **Step 2: 安裝 server TypeScript 依賴**

```bash
cd server
npm install --save-dev typescript ts-node @types/node @types/express
```

- [ ] **Step 3: 建立 `server/server.ts`**

從 `src/server/server.js` 遷移，加入：
- 型別標注（`EffectMap` 的結構、`Request`/`Response` 型別）
- 錯誤處理（`res.status(404)` 取代 `res.send("ERROR!!")` ）
- 移除未使用的 `formidable` 依賴
- 加入 `// 無音樂模式` 支援：新增 `/start_no_audio` endpoint，在沒有載入音樂時也能啟動硬體

關鍵變更：

```typescript
// 原本：res.send("ERROR!!")
// 改為：
if (conditionFails) {
  return res.status(400).json({ error: 'Effect not found' })
}

// 新增無音樂模式支援
app.post('/start_no_audio', (req, res) => {
  // 允許從 time=0 開始，無需音樂
  Time = 0
  EXE_MODE = 0
  res.json({ ok: true })
})
```

- [ ] **Step 4: 更新 `server/package.json` scripts**

```json
{
  "scripts": {
    "start": "ts-node server.ts",
    "build": "tsc",
    "start:js": "node dist/server.js"
  }
}
```

- [ ] **Step 5: 確認 server 可啟動**

```bash
cd server && npm run start
# 應看到：Server listening on port 10240
# Ctrl+C
```

- [ ] **Step 6: Commit**

```bash
git add server/server.ts server/tsconfig.json server/package.json
git commit -m "feat: migrate server to TypeScript, add no-audio mode support"
```

---

### Task 4: hardwareService 補充無音樂模式

**Files:**
- Modify: `src/services/hardwareService.ts`

Plan 1 的 `hardwareService` 缺少「無音樂啟動」功能。

- [ ] **Step 1: 加入 `startWithoutAudio()` 函式**

```typescript
/** Start hardware playback without audio — calls /start_no_audio on server */
export async function startWithoutAudio(): Promise<void> {
  try {
    await fetch('/start_no_audio', { method: 'POST' })
  } catch {
    // Server unreachable — silently ignore
  }
}
```

- [ ] **Step 2: 更新 `TimelinePanel.vue` 的 `play()` 函式**

在 `TimelinePanel.vue` 中，`play()` 改為：

```typescript
function play() {
  // ...existing code...
  if (!audioStore.hasAudio) {
    startWithoutAudio()  // 無音樂也能啟動硬體
  }
}
```

- [ ] **Step 3: type-check + Commit**

```bash
npm run type-check
git add src/services/hardwareService.ts src/components/TimelinePanel.vue
git commit -m "feat: add no-audio hardware start mode, fix hardware dependency on music"
```

---

### Task 5: 開發者文件

**Files:**
- Create: `docs/README.md`
- Create: `docs/architecture.md`
- Create: `docs/hardware-protocol.md`

- [ ] **Step 1: 建立 `docs/README.md`（快速上手）**

內容：
- 環境需求（Node.js 20+）
- 啟動流程：`npm install` → `npm run dev`（前端）+ `cd server && npm run start`（後端）
- 目錄結構說明（指向 architecture.md）
- 常見操作：
  - 如何新增一種效果類型
  - 如何連接硬體
  - 如何在沒有音樂的情況下測試

- [ ] **Step 2: 建立 `docs/architecture.md`（架構說明）**

內容：
- 組件樹圖（文字版 ASCII）
- 4 個 Pinia Store 的職責說明
- EffectDefinition vs EffectInstance 概念圖
- 資料流：「拖放資產 → 建立 Instance → 調整參數 → 傳給硬體」完整路徑

- [ ] **Step 3: 建立 `docs/hardware-protocol.md`（硬體協議）**

內容：
- 協議字串格式：`M{mode}S{start}D{duration}X{n1},{n2}...P{n1},{n2};`
- 各欄位對照表（`X`=XH, `Y`=XS, `Z`=XV, `U`=YH, `V`=YS, `W`=YV）
- num1 公式：`func*65536 + range*256 + lower`
- num2 公式：`p1*256 + p2`
- p 參數公式：`p1*256+p2` 和 `p3*256+p4`
- 各效果模式的 extra params 對應
- 硬體設定：NUM_OF_LUX=5, NUM_OF_LB=10, port=10240

- [ ] **Step 4: Commit**

```bash
git add docs/README.md docs/architecture.md docs/hardware-protocol.md
git commit -m "docs: add developer guide, architecture overview, hardware protocol docs"
```

---

### Task 6: 最終驗證清單

- [ ] `npm run type-check` 無 error
- [ ] `npm test` 全部通過
- [ ] `npm run build` 成功
- [ ] 功能驗證：
  - [ ] 拖放資產到 Timeline，block 正確出現
  - [ ] 調整右側參數，Preview 即時更新（不再有延遲）
  - [ ] 效果動畫持續超過 4 秒不靜止
  - [ ] Timeline 縮放/拖動正常（舊 todo.md bug）
  - [ ] 播放頭在捲動後仍然顯示（舊 todo.md bug）
  - [ ] 無音樂情況下可以啟動硬體
  - [ ] 建立自訂效果定義，存檔後重新載入仍存在
  - [ ] 匯出 effect_library.json，匯入到新專案成功

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: Plan 3 complete — refactor finished"
```

---

## 整個重構完成後的狀態

| 功能 | 狀態 |
|------|------|
| Vue 3 + TypeScript 架構 | ✅ |
| Pinia 狀態管理 | ✅ |
| 序列化與硬體協議對齊 | ✅（TDD 驗證） |
| Preview 即時更新 | ✅ |
| 效果動畫不靜止 | ✅ |
| 無音樂測試模式 | ✅ |
| 自訂效果定義 | ✅ |
| 專案存檔/讀檔 | ✅ |
| 開發者文件 | ✅ |
