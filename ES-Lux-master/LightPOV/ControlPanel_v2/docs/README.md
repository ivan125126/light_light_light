# ControlPanel v2 — 開發者快速上手

## 環境需求

- **Node.js 20+**
- npm 9+

## 啟動流程

### 前端（Vue 3 + TypeScript）

```bash
# 在 ControlPanel_v2/ 目錄下
npm install
npm run dev
# → http://localhost:5173
```

### 後端（Express TypeScript Server）

```bash
# 在 ControlPanel_v2/server/ 目錄下
npm install
npm run start
# → Server listening on port 10240
```

Vite 開發伺服器已設定 proxy，所有 `/start`、`/get_effect` 等 API 請求會自動轉發到 `localhost:10240`。

---

## 目錄結構

```
ControlPanel_v2/
├── src/
│   ├── components/          # Vue 元件（UI 層）
│   │   ├── AssetLibrary.vue     # 左側效果資產庫
│   │   ├── ParameterPanel.vue   # 右側參數調整面板
│   │   ├── PreviewPanel.vue     # 右下 LED 預覽
│   │   ├── TimelinePanel.vue    # 主時間軸 + 播放控制
│   │   └── TrackCanvas.vue      # 單一軌道繪圖
│   ├── stores/              # Pinia 狀態管理
│   │   ├── effectStore.ts       # 效果定義 & 選取狀態
│   │   ├── timelineStore.ts     # 播放時間 & 縮放 & Timeline 實例
│   │   ├── audioStore.ts        # 音訊波形 & 播放狀態
│   │   └── projectStore.ts      # 專案存檔/讀檔
│   ├── services/            # 業務邏輯（無 UI 依賴）
│   │   ├── serializer.ts        # EffectInstance → 硬體協議字串
│   │   ├── hardwareService.ts   # HTTP 呼叫 Express server
│   │   └── audioService.ts      # Web Audio API 包裝
│   ├── lib/
│   │   └── PreviewElement.ts    # <pre-view> 自訂元素（LED 預覽渲染）
│   ├── constants/
│   │   ├── effectConfig.ts      # 效果 ENUM、預設參數設定
│   │   └── effectDefinitions.ts # 內建效果定義清單
│   ├── types/
│   │   └── index.ts             # 所有共用 TypeScript 型別
│   └── tests/
│       └── serializer.test.ts   # 序列化邏輯單元測試
├── server/                  # Express TypeScript 伺服器（獨立套件）
│   ├── server.ts
│   ├── tsconfig.json
│   └── package.json
└── docs/                    # 開發者文件（此目錄）
    ├── README.md
    ├── architecture.md
    ├── hardware-protocol.md
    └── pre_view-investigation.md
```

詳細架構說明見 [architecture.md](architecture.md)。

---

## 常見操作

### 如何新增一種效果類型

1. **在 `src/types/index.ts` 的 `EffectMode` union 加入新模式名稱**

   ```typescript
   | 'MODES_MY_NEW_EFFECT'
   ```

2. **在 `src/constants/effectConfig.ts` 的 `MODE_ENUM` 加入對應的數字**

   ```typescript
   MODES_MY_NEW_EFFECT: 17,  // 按硬體協議順序
   ```

3. **在 `src/constants/effectDefinitions.ts` 新增 EffectDefinition**

   ```typescript
   {
     name: '我的新效果',
     mode: 'MODES_MY_NEW_EFFECT',
     isBuiltIn: true,
     defaultParams: { ...defaultHsvParams, extra: defaultExtraParams },
     extraParamSchema: { boxsize: true },  // 此效果使用的 extra params
   }
   ```

4. **在 `src/services/serializer.ts` 的 switch 加入 extra params 編碼邏輯**

5. **在 `src/lib/PreviewElement.ts` 的 `_perform()` 加入對應的 mask 函式**

6. **在 `server/server.ts` 的 `ENUM_MODES_NAMES` 陣列加入（順序必須與硬體一致）**

---

### 如何連接硬體

1. 確保 LED 控制器（ESP32）與電腦在同一網段
2. 啟動後端 server：`cd server && npm run start`
3. 前端播放時，`hardwareService.ts` 會每 50ms 呼叫 `/start?time=…`，ESP 透過 `/esp_time` 取得目前播放時間和控制模式

硬體協議格式見 [hardware-protocol.md](hardware-protocol.md)。

---

### 如何在沒有音樂的情況下測試

1. 直接在前端點「播放」——**不需要**先載入音樂檔
2. 前端會呼叫 `POST /start_no_audio`，讓 server 從 Time=0 開始
3. LED 效果預覽和硬體輸出均正常運作

---

### 如何存檔 / 讀檔

- **存檔**：Toolbar → 「儲存專案」→ 下載 `project.json`
- **讀檔**：Toolbar → 「載入專案」→ 選取 `project.json`
- **匯出效果庫**：Toolbar → 「匯出效果庫」→ 下載 `effect_library.json`
- **匯入效果庫**：Toolbar → 「匯入效果庫」→ 選取 `effect_library.json`（自訂效果會合併到現有清單）
