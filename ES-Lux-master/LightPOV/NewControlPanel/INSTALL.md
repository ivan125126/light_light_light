# 安裝指南

## 前提條件

本系統需要 Node.js 和 npm。如果您的系統已經有舊版 ControlPanel 在運行，說明您已經安裝了 Node.js。

## 安裝步驟

### 方法一：使用安裝腳本（推薦）

1. 雙擊執行 `安裝依賴.bat`
2. 腳本會自動：
   - 檢查 Node.js 和 npm 是否安裝
   - 安裝後端依賴
   - 安裝前端依賴

### 方法二：手動安裝

打開命令提示字元（CMD）或 PowerShell，執行以下命令：

```bash
# 1. 進入專案目錄
cd ES-Lux-master\LightPOV\NewControlPanel

# 2. 安裝後端依賴
npm install

# 3. 安裝前端依賴
cd client
npm install
cd ..
```

### 方法三：一鍵安裝

專案根目錄的 `package.json` 已配置了 `install-all` 腳本：

```bash
npm run install-all
```

## 驗證安裝

安裝完成後，您可以執行：

```bash
npm run dev
```

這會同時啟動：
- 後端伺服器（端口 10241）
- 前端 React 應用（端口 3000）

## 疑難排解

### 如果 npm 命令找不到

1. 確保已安裝 Node.js：https://nodejs.org/
2. 重新啟動命令提示字元
3. 檢查環境變數 PATH 是否包含 Node.js 的路徑

### 如果安裝失敗

1. 嘗試清除快取：`npm cache clean --force`
2. 刪除 `node_modules` 資料夾後重新安裝
3. 檢查網路連線（需要下載套件）

### 使用國內鏡像加速

如果下載速度慢，可以使用淘寶鏡像：

```bash
npm config set registry https://registry.npmmirror.com
```

恢復原設定：
```bash
npm config set registry https://registry.npmjs.org
```

## 下一步

安裝完成後，請參閱 `QUICKSTART.md` 開始使用系統。

