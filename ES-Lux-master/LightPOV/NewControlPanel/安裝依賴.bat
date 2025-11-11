@echo off
chcp 65001 >nul
echo ========================================
echo 正在安裝光效編輯系統依賴...
echo ========================================
echo.

cd /d %~dp0

echo [1/2] 檢查 Node.js 和 npm...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤：未找到 Node.js！
    echo 請先安裝 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤：未找到 npm！
    echo 請先安裝 Node.js（包含 npm）: https://nodejs.org/
    pause
    exit /b 1
)

node --version
npm --version
echo.

echo [2/2] 安裝後端依賴...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 後端依賴安裝失敗！
    pause
    exit /b 1
)
echo.

echo [3/3] 安裝前端依賴...
cd client
call npm install
if %errorlevel% neq 0 (
    echo ❌ 前端依賴安裝失敗！
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo ✅ 依賴安裝完成！
echo ========================================
echo.
echo 您現在可以執行「啟動server.bat」來啟動系統
echo.
pause

