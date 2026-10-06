# ControlPanel v2 — 架構說明

## 組件樹（ASCII）

```
App.vue
├── AssetLibrary.vue          # 左側效果資產庫
│   └── effectStore           # 讀取 definitions，拖放觸發 addInstance
├── TimelinePanel.vue         # 主時間軸
│   ├── TrackCanvas.vue × 6   # 每軌一個 Canvas，繪製 EffectBlock
│   ├── timelineStore         # 播放時間、縮放、instances 列表
│   ├── audioStore            # 音訊播放、波形峰值
│   └── hardwareService       # HTTP sync to Express server
├── ParameterPanel.vue        # 右側參數面板
│   ├── HsvChannelGroup.vue × 6  # XH/XS/XV/YH/YS/YV 參數
│   └── ExtraParamsGroup.vue  # 效果特有參數（boxsize、space 等）
└── PreviewPanel.vue          # 右下 LED 圓環預覽
    └── <pre-view>            # PreviewElement.ts（Custom Element）
```

---

## 4 個 Pinia Store 的職責

### `effectStore`（`src/stores/effectStore.ts`）

- **EffectDefinition 清單**：從 `effectDefinitions.ts` 載入內建定義，可透過 import/export 增減自訂定義
- **EffectInstance 清單**：Timeline 上所有已放置的效果 block
- **`selectedInstance`**：目前選取的 instance（由 ParameterPanel 讀取 / 修改）
- 提供：`addInstance()`、`removeInstance()`、`updateInstance()`、`getDefinition()`

### `timelineStore`（`src/stores/timelineStore.ts`）

- **`globalTime`**：目前播放位置（ms）
- **`isPlaying`**：播放狀態
- **`secondsPerPixel`**：縮放比例
- **`timelineOffset`**：水平捲動偏移（像素）
- **`playheadPixel`**：播放頭在 canvas 上的 X 座標（computed）
- 提供：`setTime()`、`zoom()`、`setOffset()`

### `audioStore`（`src/stores/audioStore.ts`）

- **`hasAudio`**：是否已載入音樂
- **`duration`**：音訊總長度（ms）
- **`peaks`**：波形峰值陣列（用於 timescale 顯示）
- 提供：`setAudio()`、`clear()`

### `projectStore`（`src/stores/projectStore.ts`）

- **存檔**：將 `effectStore.instances` + `audioStore` 元資料序列化為 `project.json`
- **讀檔**：從 `project.json` 還原 instances 和音訊元資料
- **匯入/匯出效果庫**：操作 `effectStore.definitions`

---

## 核心概念：EffectDefinition vs EffectInstance

```
EffectDefinition（資產庫中的「模板」）
  ├── name: '純色'
  ├── mode: 'MODES_PLAIN'
  ├── defaultParams: { XH, XS, XV, YH, YS, YV, extra }
  └── extraParamSchema: { }  ← 此效果有哪些 extra params

EffectInstance（Timeline 上的「實例」）
  ├── id: 'uuid-...'
  ├── definitionName: '純色'       ← 參考 EffectDefinition
  ├── trackIndex: 0               ← 放在第幾軌
  ├── startTime: 1000             ← ms
  ├── duration: 3000              ← ms
  └── params: { XH, XS, ..., extra }  ← 使用者調整後的值
```

一個 Definition 可以對應多個 Instance（同樣的效果放了好幾次）。

---

## 資料流：拖放 → 播放 → 硬體

```
1. 使用者從 AssetLibrary 拖放效果到 TrackCanvas
   └── effectStore.addInstance(definition, trackIndex, dropTimeMs)

2. 使用者在 ParameterPanel 調整 XH/XV/extra 等參數
   └── effectStore.updateInstance(id, newParams)
       └── [watch] PreviewPanel → el.updateData(instanceToEffectData(...))
           └── PreviewElement._updateHeading() + _perform() → Canvas 渲染

3. 使用者點「播放」
   └── TimelinePanel.play()
       ├── audioService.startPlayback(currentTime)  [若有音訊]
       ├── hardwareService.startWithoutAudio()       [若無音訊]
       └── hardwareService.startHardwareSync(getTime)
           └── 每 50ms: GET /start?time={ms}

4. ESP32 硬體端輪詢
   └── GET /esp_time?id={luxId}&effect={effectIdx}
       └── server 回傳: "A{time}" (Auto mode + 時間)

5. ESP32 讀取效果字串
   └── GET /get_effect?id={effectIdx}&luxid={luxId}
       └── server 回傳: "M1S0D3000X65536,256Y..."
```

---

## 序列化（`serializer.ts`）

`EffectInstance` → `EffectData` → 硬體字串，三層轉換：

```typescript
// Layer 1: 人類可讀 → 硬體 raw 格式
instanceToEffectData(instance, mode)  → EffectData

// Layer 2: EffectData → 協議字串
effectDataToHardwareString(data)      → "M1S0D3000X..."

// 一步完成
instanceToHardwareString(instance, mode) → "M1S0D3000X..."
```

序列化邏輯與 `server/server.ts` 的 `stringify()` **必須保持一致**，兩者都有單元測試（`src/tests/serializer.test.ts`）覆蓋。
