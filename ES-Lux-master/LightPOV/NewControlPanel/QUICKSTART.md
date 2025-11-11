# 快速開始指南

## 第一步：安裝依賴

在 `NewControlPanel` 目錄下執行：

```bash
npm install
cd client
npm install
cd ..
```

或者使用自動安裝腳本：

```bash
npm run install-all
```

## 第二步：複製舊系統的光效檔案

將舊系統的光效 JSON 檔案複製到 `public` 目錄：

```bash
# 從舊系統複製光效檔案
copy ..\ControlPanel\public\*.json public\
copy ..\ControlPanel\public\uploads public\uploads
```

## 第三步：啟動系統

雙擊 `啟動server.bat` 或執行：

```bash
npm run dev
```

這會同時啟動：
- 後端伺服器（端口 10241）
- 前端 React 應用（端口 3000）

## 第四步：打開瀏覽器

打開瀏覽器訪問：http://localhost:3000

## 使用說明

### 添加光效片段
1. 在左側素材庫中選擇「預設效果」標籤
2. 點擊任意光效（如「清除」、「純色」等）
3. 光效會自動添加到第一個軌道（LUX 1）

### 編輯時間軸
- **移動片段**：點擊並拖曳光效片段
- **調整長度**：將滑鼠移到片段右側邊緣，拖曳調整
- **選擇片段**：點擊片段選中，按住 Ctrl 可多選
- **刪除片段**：選中片段後按 Delete 鍵（未來功能）

### 工具列功能
- **撤銷/重做**：Ctrl+Z / Ctrl+Y
- **複製/剪下/貼上**：Ctrl+C / Ctrl+X / Ctrl+V

### 音樂波形
- 點擊波形圖可跳轉到對應時間點
- 紅色線條表示當前播放位置

## 下一步開發建議

1. **連接音樂檔案**：實作音樂上傳和選擇功能
2. **光效參數編輯**：點擊片段可編輯詳細參數
3. **預覽功能**：實作即時預覽面板
4. **保存/載入**：實作專案檔案的保存和載入
5. **鍵盤快捷鍵**：完整支援 Ctrl+Z, Ctrl+C 等快捷鍵

## 疑難排解

### 端口被占用
如果 10241 或 3000 端口被占用，請：
1. 修改 `server.js` 中的端口號
2. 修改 `client/package.json` 中的 proxy 設定

### 依賴安裝失敗
嘗試使用國內鏡像：
```bash
npm config set registry https://registry.npmmirror.com
```

### React 應用無法啟動
確保 Node.js 版本 >= 14.0.0

