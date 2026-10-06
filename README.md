# Lux — 無線 LED 表演道具

成大工科系的 LED 表演道具系統。道具旋轉時利用**視覺暫留（Persistence of Vision, POV）**在空中畫出 2D 圖案，並透過 WiFi 和音樂同步演出，主要用於新生營表演。

> 更完整的設計說明（電路、機構、韌體、編輯器）：[LightPOV 專案頁](https://hsupingjhao.info/projects/LightPOV/)

## 🎬 表演影片

點圖片在 YouTube 觀看。

**117th 新生營**

| Stick | Ball | Snake |
|:---:|:---:|:---:|
| [![117th Stick](https://img.youtube.com/vi/YyiI2fg6KxA/0.jpg)](https://www.youtube.com/watch?v=YyiI2fg6KxA) | [![117th Ball](https://img.youtube.com/vi/KIUfSW9J6ho/0.jpg)](https://youtu.be/KIUfSW9J6ho) | [![117th Snake](https://img.youtube.com/vi/Cy09c8EzSV8/0.jpg)](https://www.youtube.com/watch?v=Cy09c8EzSV8) |

| 27th ESCamp（Stick、Ball、Snake） | 118th 新生營（Stick） |
|:---:|:---:|
| [![27th ESCamp](https://img.youtube.com/vi/DXz8Qr7GCnU/0.jpg)](https://www.youtube.com/watch?v=DXz8Qr7GCnU) | [![118th](https://img.youtube.com/vi/Ix1kZmECrI4/0.jpg)](https://www.youtube.com/watch?v=Ix1kZmECrI4) |

## 專案一覽

| 資料夾 | 內容 | 狀態 |
|---|---|---|
| [`LightPOV/`](LightPOV/) | 光棒、光蛇：ESP32 韌體、效果編輯器（ControlPanel_v3）、PCB 與 3D 機構 | 主力開發中 |
| [`LightBall/`](LightBall/) | 光球：ESP8266 韌體、控制器、C# 編輯工具、PCB | 維護中 |

`LightPOV/legacy/` 收的是舊版控制面板和過去的表演檔，只供參考，請不要在裡面開發。

## 使用方式

### 環境需求

- [Node.js](https://nodejs.org/) 20 以上
- [Arduino IDE](https://www.arduino.cc/en/software)，需安裝 ESP32 board package 和函式庫 `FastLED`、`cppQueue`、`MPU6050`

### 1. 效果編輯器（ControlPanel_v3）

```bash
cd LightPOV/ControlPanel_v3
npm install
npm run dev        # 開啟 http://localhost:3000
npm run test       # 執行單元測試
```

### 2. 硬體 server

道具透過 WiFi 向 server 取得效果和同步時間。兩個 server 分別對應不同的道具：

| Server | 啟動方式 | Port | 道具 |
|---|---|---|---|
| `ControlPanel_v3/server/server.ts` | `cd LightPOV/ControlPanel_v3/server && npm install && npm run start` | 10240 | TBD |
| `ControlPanel_v3/src/server/server.js` | `cd LightPOV/ControlPanel_v3/src/server && npm install && node server.js`（Windows 可以直接執行 `啟動server.bat`） | 20480 | TBD |

### 3. 韌體燒錄（LightPOV）

1. 用 Arduino IDE 開啟 `LightPOV/ESP32/ESP32.ino`
2. 在 `config.h` 設定 WiFi 名稱、密碼和 `LUX_ID_DEFAULT`（每支道具的編號）
3. 選擇 ESP32 開發板後上傳；之後可以透過 WiFi（OTA）更新

### 4. 表演流程

TBD（編效果 → 推送到 server → 道具連線 → 播放音樂開始表演）

### LightBall

```bash
cd LightBall/controller
npm install
node server.js     # 開啟 http://localhost:3000
```

韌體在 `LightBall/Code/LightBall_v2/`。

### 開發文件

- [ControlPanel_v3 開發者快速上手](LightPOV/ControlPanel_v3/docs/README.md)
- [架構說明](LightPOV/ControlPanel_v3/docs/architecture.md)
- [硬體通訊協議](LightPOV/ControlPanel_v3/docs/hardware-protocol.md)

## 團隊

| GitHub | 負責 |
|---|---|
| [@KendellHsu](https://github.com/KendellHsu) | TBD |
| [@ivan125126](https://github.com/ivan125126) | TBD |
| [@chenfeng1212](https://github.com/chenfeng1212) | TBD |
| [@alien1105](https://github.com/alien1105) | TBD |
| [@zhewei11](https://github.com/zhewei11) | TBD |

有問題請開 [Issue](https://github.com/ivan125126/light_light_light/issues) 或直接聯絡上面的成員。

## 致謝

本專案 fork 自 [sciyen/ES-Lux](https://github.com/sciyen/ES-Lux)（成大工科系創課計畫），感謝原作者 [@sciyen](https://github.com/sciyen) 和 [@BensonYang1999](https://github.com/BensonYang1999)。原專案中的 Lux-starter 入門套件沒有收進這個 repo，需要的話請到上游 repo 取得。

本專案採用 [BSD 3-Clause License](LICENSE)。
