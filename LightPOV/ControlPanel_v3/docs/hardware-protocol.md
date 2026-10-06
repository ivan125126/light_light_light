# ControlPanel v2 — 硬體協議說明

## 協議字串格式

```
M{mode}S{start}D{duration}X{n1},{n2}Y{n1},{n2}Z{n1},{n2}U{n1},{n2}V{n1},{n2}W{n1},{n2}P{n1},{n2};
```

每個效果佔一行，以分號 `;` 結尾。

---

## 各欄位說明

| 標記 | 對應欄位 | 說明 |
|------|----------|------|
| `M`  | mode     | 效果模式編號（見下表） |
| `S`  | start_time | 效果開始時間（ms） |
| `D`  | duration  | 效果持續時間（ms） |
| `X`  | XH       | X 軸 Hue 通道 |
| `Y`  | XS       | X 軸 Saturation 通道 |
| `Z`  | XV       | X 軸 Value 通道 |
| `U`  | YH       | Y 軸 Hue 通道 |
| `V`  | YS       | Y 軸 Saturation 通道 |
| `W`  | YV       | Y 軸 Value 通道 |
| `P`  | p1~p4    | 效果特有參數 |

### X 軸 vs Y 軸的意義

- **X 軸（XH/XS/XV）**：沿時間軸（圓弧方向）的顏色變化
- **Y 軸（YH/YS/YV）**：沿徑向（LED 排列方向，由內到外）的顏色偏移

---

## num1 / num2 公式

每個 HSV 通道佔兩個數字（num1, num2），編碼方式：

```
num1 = func × 65536 + range × 256 + lower
num2 = p1 × 256 + p2
```

| 欄位   | 說明 |
|--------|------|
| `func` | 函數類型（0=None, 1=Const, 2=Ramp, 3=Triangle, 4=Pulse, 5=Step） |
| `range` | 週期長度（0–255） |
| `lower` | 最低值（0–255） |
| `p1`   | 第一參數（Const: 常數值; Ramp/Tri: 最高值; Pulse: 峰值寬度; Step: 步進量） |
| `p2`   | 第二參數（Step: 階數; 其他: 0） |

---

## P 參數公式（效果特有參數）

```
pNum1 = p1 × 256 + p2
pNum2 = p3 × 256 + p4
```

協議字串中寫為：`P{pNum1},{pNum2}`

---

## 各效果模式的 extra params 對應

| 模式 | p1 | p2 | p3 | p4 |
|------|-----|-----|-----|-----|
| MODES_CLEAR   | -   | -   | -   | -   |
| MODES_PLAIN   | -   | -   | -   | -   |
| MODES_SQUARE  | -   | -   | boxsize | - |
| MODES_SICKLE  | positionFix | - | curvature | length |
| MODES_FAN     | curvature | - | bladeCount | length |
| MODES_BOXES   | -   | -   | boxsize | space |
| MODES_CMAP_FIRE | - | -   | -   | space |
| MODES_CMAP_GEAR | - | -   | -   | space |
| MODES_CMAP_DNA  | reverse | - | - | space |
| MODES_CMAP_LOVE | reverse | - | - | space |
| MODES_MAP_ES    | reverse | - | - | space |
| MODES_MAP_ES_ZH | reverse | - | - | space |
| MODES_MAP_ESXOPT| reverse | - | - | space |

> p 值在序列化時已由 `serializer.ts` 的 `normalizeTo255()` 將人類可讀值（如 boxsize=300）映射為 0–255。

---

## 效果模式 ENUM（mode 編號）

| 編號 | 模式名稱 |
|------|----------|
| 0  | MODES_CLEAR |
| 1  | MODES_PLAIN |
| 2  | MODES_SQUARE |
| 3  | MODES_SICKLE |
| 4  | MODES_FAN |
| 5  | MODES_BOXES |
| 6  | MODES_SICKLE_ADV |
| 7  | MODES_FAN_ADV |
| 8  | MODES_MAP_ES |
| 9  | MODES_MAP_ES_ZH |
| 10 | MODES_CMAP_DNA |
| 11 | MODES_CMAP_FIRE |
| 12 | MODES_CMAP_BENSON |
| 13 | MODES_CMAP_YEN |
| 14 | MODES_CMAP_LOVE |
| 15 | MODES_CMAP_GEAR |
| 16 | MODES_MAP_ESXOPT |

---

## 硬體設定

| 參數 | 值 | 說明 |
|------|----|------|
| `NUM_OF_LUX` | 5 | 燈圈數量（Lux 單元數） |
| `NUM_OF_LB`  | 10 | 燈板數量 |
| `port`       | 10240 | Express server 通訊埠 |

---

## 範例：純色效果

效果：Hue=120（綠色）、S=255、V=200、持續 3 秒

```
M1S0D3000X65792,30720Y65792,65280Z65792,51200U0,0V0,0W0,0P0,0;
```

拆解：
- `M1` = MODES_PLAIN
- `S0` = 從第 0ms 開始
- `D3000` = 持續 3000ms
- `X65792,30720` = XH: func=1(Const), range=0, lower=0, p1=120, p2=0 → num1=65536+256=65792, num2=120×256=30720
- `Y65792,65280` = XS: Const, p1=255 → num2=255×256=65280
- `Z65792,51200` = XV: Const, p1=200 → num2=200×256=51200
- `U0,0 V0,0 W0,0` = Y 軸無變化（FuncNone）
- `P0,0` = 無 extra params
