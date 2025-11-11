const NUM_OF_LUX = 5
const NUM_OF_LB = 10;
const express = require('express');
const fs = require('fs');
const path = require('path');
var formidable = require('formidable');
const cors = require('cors');
const app = express();
const port = 10241; // 使用不同端口避免衝突

var light_state = new Array(NUM_OF_LUX).fill(0);
var light_effect = new Array(NUM_OF_LUX).fill(0);
var lux_mode = new Array(NUM_OF_LUX).fill(0);
var light_reset = new Array(NUM_OF_LUX).fill(0);
var EXE_MODE = 0 //0 auto 1 manual
var SONG = "ESC.json"
var Time = 0;
var time = 0;
var last_connect_time = new Array(NUM_OF_LB).fill(0);

// 允許 CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// 確保 EffectMap 從文件讀取
let EffectMapData = null;
let EffectMap = null;

function loadEffectMap() {
    try {
        EffectMapData = fs.readFileSync(path.join(__dirname, "public", SONG));
        EffectMap = JSON.parse(EffectMapData);
    } catch (err) {
        console.error("Error loading effect map:", err);
        EffectMap = [];
    }
}

loadEffectMap();

function createEnum(name_list) {
    enum_dict = {};
    id = 0
    name_list.forEach((e) => {
        enum_dict[e] = id;
        id += 1
    })
    return enum_dict
}

const ENUM_FUNC_NAMES = [
    "FuncNone",
    "FuncConst",
    "FuncRamp",
    "FuncTri",
    "FuncPulse",
    "FuncStep"
]

const ENUM_MODES_NAMES = [
    "MODES_CLEAR",
    "MODES_PLAIN",
    "MODES_SQUARE",
    "MODES_SICKLE",
    "MODES_FAN",
    "MODES_BOXES",
    "MODES_SICKLE_ADV",
    "MODES_FAN_ADV",
    "MODES_MAP_ES",
    "MODES_MAP_ES_ZH",
    "MODES_CMAP_DNA",
    "MODES_CMAP_FIRE",
    "MODES_CMAP_BENSON",
    "MODES_CMAP_YEN",
    "MODES_CMAP_LOVE",
    "MODES_CMAP_GEAR",
    "MODES_MAP_ESXOPT"
]

ENUM_MODES = createEnum(ENUM_MODES_NAMES);
ENUM_FUNC = createEnum(ENUM_FUNC_NAMES);

const ENG_MARK = ["XH", "XS", "XV", "YH", "YS", "YV", "X", "Y", "Z", "U", "V", "W"]

function stringify(content) {
    var s = ""
    s += "M" + ENUM_MODES[content.mode] + "S" + content.start_time + "D" + content.duration
    for (let i = 0; i < ENG_MARK.length / 2; i++) {
        var num1 = content[ENG_MARK[i]].func * 256 * 256 + content[ENG_MARK[i]].range * 256 + content[ENG_MARK[i]].lower
        var num2 = content[ENG_MARK[i]].p1 * 256 + content[ENG_MARK[i]].p2
        s += ENG_MARK[i + 6] + num1 + "," + num2
    }
    var num1 = content.p1 * 256 + content.p2
    var num2 = content.p3 * 256 + content.p4
    s += "P" + num1 + "," + num2 + ";"
    return s
}

// API 端點
app.get("/api/get_effect", (req, res) => {
    var ID = req.query.id;
    var LUX_ID = req.query.luxid;
    if (ID >= Object.keys(EffectMap[0]).length || LUX_ID >= NUM_OF_LUX) {
        res.send("ERROR!!")
    }
    else {
        res.send(stringify(EffectMap[lux_mode[LUX_ID]][ID]))
        console.log(EffectMap[lux_mode[LUX_ID]][ID].mode);
        console.log(ID);
    }
})

app.get("/api/start", (req, res) => {
    var time = req.query.time
    Time = time;
    res.send(time)
})

app.get("/api/esp_time", (req, res) => {
    var id = req.query.id
    var now = new Date();
    light_state[id] = now.getTime()
    light_effect[id] = req.query.effect
    var mode =(light_reset[id]) ? "C" : ((EXE_MODE == 0) ? "A" : "M")
    res.send(mode + (Time).toString())
})

app.get("/api/exe_mode", (req, res) => {
    EXE_MODE = req.query.mode
    res.send(EXE_MODE)
})

app.get("/api/get_stat", (req, res) => {
    var id = req.query.id
    res.send(light_state[id].toString());
})

app.get("/api/get_light", (req, res) => {
    var id = req.query.id
    res.send(light_effect[id].toString());
})

app.get("/api/update_lux_mode", (req, res) => {
    var id = parseInt(req.query.id);
    var mode = parseInt(req.query.mode);

    if (isNaN(id) || id < 0 || id >= lux_mode.length) {
        return res.status(400).send("Invalid ID");
    }

    if (isNaN(mode)) {
        return res.status(400).send("Invalid mode");
    }

    lux_mode[id] = mode;
    res.send("Lux " + id.toString() + " mode: " + mode.toString());
});

app.get("/api/update_lux_reset", (req, res) => {
    var id = parseInt(req.query.id);
    var reset = req.query.clear === 'true';

    if (isNaN(id) || id < 0 || id >= NUM_OF_LUX) {
        return res.status(400).send("Invalid ID");
    }

    light_reset[id] = reset;
    res.send("Lux " + id.toString() + " reset: " + reset);
})

app.get("/api/gettime", (req, res) => {
    const ID = parseInt(req.query.id);
    var now = new Date();
    last_connect_time[ID] = now.getTime();
    res.send(time.toString());
});

app.post("/api/settime", (req, res) => {
    time = req.body.time;
    res.status(200).send('Time updated');
});

// 獲取所有光效模式列表
app.get("/api/modes", (req, res) => {
    res.json({
        modes: ENUM_MODES_NAMES,
        funcs: ENUM_FUNC_NAMES
    });
});

// 獲取當前光效映射
app.get("/api/effect_map", (req, res) => {
    res.json(EffectMap);
});

// 保存光效映射
app.post("/api/save_effect_map", (req, res) => {
    try {
        const { fileName, effectData } = req.body;
        const filePath = path.join(__dirname, "public", fileName);
        fs.writeFileSync(filePath, JSON.stringify(effectData, null, 2));
        EffectMap = effectData;
        SONG = fileName;
        res.status(200).json({ success: true, message: "Effect map saved" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 文件上傳
app.post('/api/fileupload', function (req, res) {
    var form = new formidable.IncomingForm();
    form.uploadDir = "./public/uploads"
    form.parse(req, function (err, fields, files) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        var oldpath = files.file.path;
        var newpath = './public/uploads/' + files.file.name;
        fs.rename(oldpath, newpath, function (err) {
            if (err) throw err;
            res.json({ success: true, path: newpath });
        });
    });
})

console.log(`Listening on port:${port} `);
app.listen(port);

