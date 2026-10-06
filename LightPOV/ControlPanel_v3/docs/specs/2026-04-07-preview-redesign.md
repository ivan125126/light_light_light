# Preview Panel Redesign

**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

重新設計預覽面板，支援「編輯模式」與「表演模式」兩種場景，同時維持現有的單一效果設計預覽功能。

---

## Architecture

```
App.vue
└── PreviewPanel.vue              ← 薄殼，持有 mode toggle
    ├── [Edit / Performance 切換]
    ├── EditPreview.vue            ← 編輯模式
    └── PerformancePreview.vue     ← 表演模式

ControlPanel.vue                  ← 新增 Track 對應欄位
```

原本 `PreviewPanel` 的所有邏輯下移至兩個子 component，PreviewPanel 只負責 mode 狀態與切換。

---

## Component: PreviewPanel.vue（改為薄殼）

**職責：**
- 持有 `mode: 'edit' | 'performance'` 狀態
- 渲染 toggle switch
- 依 mode 顯示 `EditPreview` 或 `PerformancePreview`

**原「推播硬體」checkbox：** 移至 `PerformancePreview`。

---

## Component: EditPreview.vue（新增）

**職責：** Timeline 播放預覽 + 單一效果設計預覽（智慧切換）

### 智慧切換邏輯（previewSource 優先順序）

1. 使用者點素材庫某個效果 → 切換成**單一效果預覽**（暫時覆蓋裝置預覽，timeline scrub 凍結）
2. 使用者點 timeline block → 對應裝置的 `<pre-view>` 高亮更新
3. 無選取 → 跟著 `timelineStore.currentTime` 走

### 播放控制

- 播放 / 暫停按鈕
- 時間游標（scrub）
- 目前播放時間顯示（`timelineStore.currentTime`）

### 裝置預覽區

- 依 `hardwareStore.units` 動態生成對應數量的 `<pre-view>` 實例
- 每個 Lux 的 `<pre-view>` 只顯示該 Lux 對應 track 在當前時間播放的效果
- 顯示數量由使用者可調整（UI 上有「顯示 N 個」控制）

### 資料流（裝置預覽）

```
timelineStore.currentTime
  + hardwareStore.units[i].trackIndex
  + timelineStore.tracks[trackIndex]  → 找到當前時間的 EffectInstance
  + effectStore.getDefinition()
  → instanceToEffectData()
  → <pre-view>.updateData()
```

### Store 異動

- `timelineStore` 新增 `currentTime: number`（毫秒）
- `timelineStore` 新增 `isPlaying: boolean`

---

## Component: PerformancePreview.vue（新增）

**職責：** 即時顯示 server 目前傳送給每個 Lux 的效果

### 資料來源

不依賴 server polling 取得 `EffectData`，改由 client 端推算（因為 ControlPanel 本身就是資料發送方，有完整參數）：

```
timelineStore.currentTime
  + hardwareStore.units[i].trackIndex
  + timelineStore.tracks[trackIndex]  → 找到當前時間的 EffectInstance
  + effectStore.getDefinition()
  → instanceToEffectData()
  → <pre-view>.updateData()
```

### 每個 Lux 的顯示格

```
┌──────────────────┐
│   <pre-view>     │  ← 由上述資料流驅動
│  Lux 1           │  ← 名稱
│  Sickle_red      │  ← 當前 effect 的 definitionName
│  ● 已連線        │  ← 來自 hardwareStore polling
└──────────────────┘
```

- `trackIndex = null` 時，`<pre-view>` 不顯示（或顯示黑畫面），modeName 顯示 `--`
- 「推播硬體」checkbox 移到此 component

### hardwareStore 職責

保持現有 polling 負責連線狀態；`modeName` 改從 client 端 `definitionName` 取得，不再依賴 `/get_light` 的回傳值。

---

## Component: ControlPanel.vue（修改）

### 新增欄位：對應 Track

```
┌────┬────────┬──────────────┬─────────────────┐
│ ID │ 狀態   │ 當前效果      │ 對應 Track       │
├────┼────────┼──────────────┼─────────────────┤
│ 1  │ ● 已連 │ Sickle_red   │ [Track 1  ▼]    │
│ 2  │ ● 已連 │ Plain_blue   │ [Track 2  ▼]    │
│ 3  │ ○ 斷線 │ --           │ [未對應   ▼]    │
└────┴────────┴──────────────┴─────────────────┘
```

- Dropdown 選項：「未對應」+ 依 `timelineStore.tracks` 動態生成
- 「當前效果」欄：從 `trackIndex → currentTime → definitionName` 推算

### Store 異動：LuxUnit 型別

```ts
// 現有
interface LuxUnit {
  id: number
  connected: boolean
  modeName: string
}

// 更新後
interface LuxUnit {
  id: number
  connected: boolean
  trackIndex: number | null  // 新增；null = 未對應任何 track
  // modeName 移除：改為 component 內 computed，不存在 store
}
```

### 持久化

`hardwareStore.units`（含 `trackIndex`）隨 `projectStore` 一起存入 project JSON。

---

## 不在此次範圍內

- ESP32 硬體主導的即時監控（只做 server 主導）
- 多 client 同步
- Hardware string log monitor

---

## 異動檔案清單

| 檔案 | 動作 |
|------|------|
| `src/components/PreviewPanel.vue` | 重構為薄殼 |
| `src/components/EditPreview.vue` | 新增 |
| `src/components/PerformancePreview.vue` | 新增 |
| `src/components/ControlPanel.vue` | 新增 Track 對應欄位 |
| `src/stores/timelineStore.ts` | 新增 `currentTime`, `isPlaying` |
| `src/stores/hardwareStore.ts` | `LuxUnit` 新增 `trackIndex` |
| `src/stores/projectStore.ts` | 持久化 `hardwareStore.units` |
| `src/types.ts` | `LuxUnit` 型別更新 |
