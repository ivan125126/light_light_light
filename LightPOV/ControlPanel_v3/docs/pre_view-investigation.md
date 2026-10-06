# pre_view.js 架構調查報告

> 此文件為 Plan 3 Task 1 的輸出，指導 PreviewElement.ts 的遷移與 bug 修復。

---

## 整體架構

`pre_view.js` 是一個 Custom HTML Element (`<pre-view>`)，負責模擬 LED 圓環燈效的前端預覽。

### 主要資料流

```
PreviewPanel.vue
  └── 呼叫 el.updateData(effectData: EffectData)
        ├── 1. 停止舊動畫
        ├── 2. 建立 led_show_arr[10000][32][4]
        ├── 3. updateHeading() × calcFrames → 計算每幀 HSV→RGB
        ├── 4. perform() × 1 → 套用遮罩
        └── 5. requestAnimationFrame loop → drawSomething(currentTimer)
```

---

## `updateData()` 呼叫機制

- 由 `PreviewPanel.vue` 透過 `watch(effectStore.selectedInstance)` 觸發
- 每次選中效果或參數改變都會重呼叫
- 收到的資料格式：`EffectData`（定義在 `src/types/index.ts`）

---

## `drawSomething()` 幀計數邏輯

```javascript
// 動畫主迴圈（updateData 啟動後持續運行）
const loop = () => {
    this.drawSomething(this.currentTimer, led_show_arr);
    this.currentTimer++;
    if (this.currentTimer > 10000) {
        this.currentTimer = 0;  // ← 硬式重置到 0
    }
    this.animationFrameId = requestAnimationFrame(loop);
};
```

### drawSomething() 的渲染邏輯（anime=true 模式）

```javascript
// 以 timer 決定要畫幾顆 LED（彗星效果）
for (let i = 0; i < timer*speed/20 + 30; i++) {
    // 從 led_show_arr[i][j] 取 RGB，畫到 canvas 對應圓弧位置
}
```

當 `anime=true`（PreviewPanel.vue 設定），每幀會繪製一段「彗星弧線」，長度隨 timer 增長。
當 timer 超過 show_time（約 166 幀）後，`led_show_arr[i]` 的索引範圍已超出有效計算資料。

---

## Bug 1：3-4 秒後變靜止純色

### 根本原因

`led_show_arr` 中的幀資料是在 `updateData()` 呼叫時一次性計算，只算了
`calcFrames = Math.max(10000, modeData.duration)` 幀。

但 `drawSomething()` 中，當 `anime=true`，渲染的 LED 數量隨 `timer` 增長。
當 `timer × speed/20 + 30 > calcFrames`（約在 3-4 秒後），`led_show_arr[i]` 存取範圍超出有效資料。

**更深層的問題**：`drawSomething()` 的渲染迴圈在高 timer 值時要迴圈極多次（性能爆炸）。例如：
- timer=200, speed=60 → loop 執行 200×3+30 = 630 次，每次 × 32 LEDs = 20,160 個像素操作
- timer=500 → 1,530 次 × 32 = 48,960 個像素操作
- 最終導致 UI 卡頓或顯示異常

### TypeScript 修復策略

1. **不使用「彗星動畫」邏輯**（anime 參數廢棄）
2. 改為「靜態顯示當前幀」：每幀 `_renderFrame(currentFrame % frameCount)` 顯示固定的完整 LED 圓環
3. `_precomputeFrames()` 計算 `min(duration, MAX_FRAMES)` 幀
4. 動畫速度由 `requestAnimationFrame` 每 N 幀才推進一格來控制

---

## Bug 2：SQUARE/BOXES/FAN 效果顯示異常

### SQUARE 分析

使用 BigInt 位元運算產生遮罩，按 `boxsize` 參數生成不同密度的燈帶圖案。
問題在於 `boxes()` 函式（不是 `square()`）：`map` 使用一般 number 而非 BigInt，
而 `chuse_bit <<= 1` 在超過 31 bit 時會變成 0（JavaScript 的 32 位元整數限制），
導致只有前 31 顆 LED 被正確計算。

### FAN 分析

`fan()` 內部有獨立的 HSV 計算（`getFuncValue(m.XH, idx)` 等），
**不依賴** `updateHeading()` 預計算的 `led_show_arr`，而是直接覆寫。
這是正確的設計：fan 效果需要依時間變化的單一顏色，再套上扇形遮罩。

### TypeScript 修復策略

- `boxes()` 改用 BigInt（與 `square()` 一致）
- `fan()` 邏輯保持不變（設計是正確的）

---

## Bug 3：Y 軸效果顯示錯誤

### 根本原因

`updateHeading()` 的第 5 個參數 `timer` 在 `updateData()` 中未傳入：

```javascript
// updateData() 呼叫：只傳 4 個參數
this.updateHeading(modeData, i, 0, led_show_arr);  // timer = undefined

// updateHeading() 內部
updateHeading(mode_json_data, idx, restart, led_show_arr, timer){
    if (idx > timer*30) return;  // ← undefined*30 = NaN，比較永遠為 false
    // ... 正常執行
}
```

**目前狀態**：因為 `timer` 未傳，`NaN` 比較使 early-return 永遠不觸發，
所以顏色計算**目前是正確的**。

### Y 通道計算方式

```javascript
yh = (h + getFuncValue(YH, j)) % 256  // j = LED 索引 0-31
ys = (s + getFuncValue(YS, j)) % 256
yv = (v + getFuncValue(YV, j)) % 256
```

Y 通道的意義：在 X 軸（時間軸）顏色的基礎上，為每顆 LED（Y 軸/徑向方向）增加偏移。

**TypeScript 修復策略**：移除 `timer` 參數，`if (idx > timer*30)` 整行刪除（此判斷邏輯無意義）。

---

## 遮罩類型對照表

| 遮罩名稱 | 函式 | 主要參數 | 說明 |
|----------|------|----------|------|
| `MODES_CLEAR` | `clear()` | - | 全黑 |
| `MODES_PLAIN` | `plain()` | - | 無遮罩，直接顯示 HSV 顏色 |
| `MODES_SQUARE` | `square()` | p3=boxsize | BigInt 位元遮罩，產生箱形圖案 |
| `MODES_SICKLE` | `sickle()` | p3=width, p4=space | 逐步顯示弧形，有空隙週期 |
| `MODES_FAN` | `fan()` | p1=width, p3=density, p4=thickness | 扇形遮罩，有獨立 HSV 計算 |
| `MODES_BOXES` | `boxes()` | p3=boxsize, p4=space | 方塊遮罩（有 bigint bug） |
| bitmap 系列 | `bitmap()` | p1=reverse, p4=space | 預存二進位圖案，逐幀顯示 |
| colormap 系列 | `colormap()` | p4=space | 預存 RGB 色彩映射 |

---

## 靜態資料（Bitmap 陣列）

以下靜態成員含有大量數值資料，遷移時直接複製：

| 成員 | 大小 | 說明 |
|------|------|------|
| `BITMAP_ES` | 不明 | ES 字樣點陣圖 |
| `BITMAP_ES_ZH` | 89 幀 × 32bit | ES中文版點陣圖 |
| `BITMAP_ESXOPT` | 不明 | ES 最佳化版 |
| `BITMAP_DNA` | 不明 | DNA 圖案 |
| `FIRE` | 32 幀 | 火焰效果 |
| `BENSON` | 不明 | Benson 字樣 |
| `YEN` | 不明 | 日幣符號 |
| `LOVE` | 不明 | 愛心圖案 |
| `GEAR` | 40 幀 × 32 | 齒輪圖案（colormap 格式） |

---

## 結論

PreviewElement.ts 遷移重點：

1. **保留**所有效果計算邏輯（updateHeading, getFuncValue, hsvToRgb, 所有遮罩函式）
2. **修改**動畫迴圈：`currentFrame % frameCount`（循環取模）
3. **修改** `boxes()` 改用 BigInt
4. **移除** `updateHeading()` 的 `timer` 參數和相關 early-return
5. **改為** 靜態完整圓環渲染（不用彗星效果），每幀顯示對應 index 的完整 LED 狀態
6. **保留** 所有 static 點陣圖資料（直接複製）
