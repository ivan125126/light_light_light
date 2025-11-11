# 光效編輯系統

現代化的光效編輯與控制系統，使用 React 構建，提供直觀的影音剪輯式介面。

## 功能特色

- 🎬 **多軌時間軸編輯** - 支援 5 個 LUX 軌道，可拖曳、調整片段長度
- 📚 **素材庫** - 預設光效片段和使用者自定義效果
- 🎵 **音樂波形顯示** - 簡單直觀的波形視覺化
- ✂️ **編輯功能** - 撤銷/重做、剪下/複製/貼上
- 🎨 **深色主題** - 現代化的深色 UI 設計
- 🔄 **即時預覽** - 預留即時預覽功能位置

## 安裝

### 後端伺服器
```bash
npm install
```

### 前端應用
```bash
cd client
npm install
```

### 同時安裝所有依賴
```bash
npm run install-all
```

## 啟動

### 開發模式（同時啟動前後端）
```bash
npm run dev
```

### 分別啟動
```bash
# 後端伺服器（端口 10241）
npm run server

# 前端應用（端口 3000）
npm run client
```

## 專案結構

```
NewControlPanel/
├── server.js              # Express 後端伺服器
├── package.json           # 後端依賴配置
├── client/                # React 前端應用
│   ├── src/
│   │   ├── components/   # React 組件
│   │   │   ├── TimelineEditor.js
│   │   │   ├── AssetLibrary.js
│   │   │   ├── WaveformDisplay.js
│   │   │   └── Toolbar.js
│   │   ├── context/       # React Context（狀態管理）
│   │   │   └── EffectContext.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json       # 前端依賴配置
└── public/                # 靜態資源（光效 JSON、音樂檔案等）
```

## API 端點

所有 API 端點都添加了 `/api` 前綴：

- `GET /api/get_effect` - 獲取光效
- `GET /api/start` - 開始播放
- `GET /api/esp_time` - ESP32 時間同步
- `GET /api/modes` - 獲取所有光效模式
- `GET /api/effect_map` - 獲取光效映射
- `POST /api/save_effect_map` - 保存光效映射
- `POST /api/fileupload` - 上傳檔案

## 使用說明

1. **添加光效片段**：從左側素材庫點擊光效，會自動添加到第一個軌道
2. **拖曳片段**：在時間軸上點擊並拖曳片段可移動位置
3. **調整長度**：將滑鼠移到片段右側邊緣，拖曳可調整時長
4. **選擇片段**：點擊片段可選中，按住 Ctrl 可多選
5. **編輯操作**：使用工具列的撤銷/重做/剪下/複製/貼上功能

## 技術棧

- **前端**：React 18, CSS3
- **後端**：Express.js, Node.js
- **拖曳**：react-draggable
- **音頻**：Web Audio API

## 授權

ISC

