const NUM_OF_LUX = 5
const NUM_OF_LB = 10;
const express = require('express');
const fs = require('fs');
const path = require('path');
var formidable = require('formidable');
const app = express();
const port = 10240;
var light_state = new Array(NUM_OF_LUX).fill(0);
var light_effect = new Array(NUM_OF_LUX).fill(0);
var lux_mode = new Array(NUM_OF_LUX).fill(0);
var light_reset = new Array(NUM_OF_LUX).fill(0);
var light_stop = new Array(NUM_OF_LUX).fill(0);
var EXE_MODE = 0 //0 auto 1 manual
var SONG = "unravel.json"
var Time = 0;
var time = 0;
var last_connect_time = new Array(NUM_OF_LB).fill(0);

let EffectMapData = fs.readFileSync(path.join(__dirname, 'public', SONG));
let EffectMap = JSON.parse(EffectMapData);

//setInterval(state_update, 1000)
// function stringify(m) {
//     if (!m) return "ERROR!!"; // 防呆

//     // 1. 基本參數 (Mode, Start, Duration)
//     let s = "M" + (m.mode || 0) + 
//             "S" + (m.start_time || 0) + 
//             "D" + (m.duration || 0);

//     // 2. 顏色參數打包 (XH, XS, XV, YH, YS, YV)
//     // 對應 C++: upper = (func<<16 | range<<8 | lower), lower = (p1<<8 | p2)
//     const packColor = (obj) => {
//         if (!obj) return "0,0";
//         let upper = ((obj.func || 0) << 16) | ((obj.range || 0) << 8) | (obj.lower || 0);
//         let lower_val = ((obj.p1 || 0) << 8) | (obj.p2 || 0);
//         return upper + "," + lower_val;
//     };

//     s += "X" + packColor(m.XH);
//     s += "Y" + packColor(m.XS);
//     s += "Z" + packColor(m.XV);
//     s += "U" + packColor(m.YH);
//     s += "V" + packColor(m.YS);
//     s += "W" + packColor(m.YV);

//     // 3. 全域參數打包 (Param)
//     // 對應 C++: upper = (p0<<8 | p1), lower = (p2<<8 | p3)
//     let p0 = m.p1 || 0; // JSON 裡的 key 可能是 p1, p2, p3, p4
//     let p1 = m.p2 || 0;
//     let p2 = m.p3 || 0;
//     let p3 = m.p4 || 0;
    
//     // 如果您的 JSON 結構是用 param 陣列，請改用 m.param[0]...
//     if (m.param && Array.isArray(m.param)) {
//         p0 = m.param[0] || 0;
//         p1 = m.param[1] || 0;
//         p2 = m.param[2] || 0;
//         p3 = m.param[3] || 0;
//     }

//     let p_upper = (p0 << 8) | p1;
//     let p_lower = (p2 << 8) | p3;
//     s += "P" + p_upper + "," + p_lower;

//     // 結尾分號
//     return s + ";";
// }


function createEnum(name_list) {
    enum_dict = {};
    id = 0
    name_list.forEach((e) => {
        enum_dict[e] = id;
        id += 1
    })
    //console.log(enum_dict)
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

app.get("/get_effect", (req, res) => {
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

    // res.send(EffectMap);
})

app.get("/start", (req, res) => {
    //if (req.query.time !== undefined) {
    var time = req.query.time
    Time = time;
    res.send(time)
})

app.get("/esp_time", (req, res) => {
    var id = req.query.id
    var now = new Date();
    light_state[id] = now.getTime()
    light_effect[id] = req.query.effect
    var mode =(light_reset[id]) ? "C" : (light_stop[id]) ? "P" : (EXE_MODE == 0) ? "A" : "M"
    res.send(mode + (Time).toString())
})

/*function state_update() {
    var now = new Date();
    for (var i = 0; i < 3; i++) {
        if (now.getTime() - light_state[i] > 5000) {
            light_state[i] = 0
        }
    }
}*/

app.get("/exe_mode", (req, res) => {
    EXE_MODE = req.query.mode
    res.send(EXE_MODE)
})

app.get("/get_stat", (req, res) => {
    var id = req.query.id
    res.send(light_state[id].toString());
})

app.get("/get_light", (req, res) => {
    var id = req.query.id
    res.send(light_effect[id].toString());
})

app.get("/update_lux_mode", (req, res) => {
    var id = parseInt(req.query.id);
    var mode = parseInt(req.query.mode);

    // 检查 id 是否为有效的数组索引
    if (isNaN(id) || id < 0 || id >= lux_mode.length) {
        return res.status(400).send("Invalid ID");
    }

    // 检查 mode 是否为有效数字
    if (isNaN(mode)) {
        return res.status(400).send("Invalid mode");
    }

    lux_mode[id] = mode;  // 更新数组中的值
    res.send("Lux " + id.toString() + " mode: " + mode.toString());
});

app.get("/update_lux_reset", (req, res) => {
    var id = parseInt(req.query.id);
    var reset = req.query.clear === 'true'; // 将传递的字符串转换为布尔值

    // 检查 id 是否为有效的数组索引
    if (isNaN(id) || id < 0 || id >= NUM_OF_LUX) {
        return res.status(400).send("Invalid ID");
    }

    // reset 已经是一个布尔值了，不需要再检查是否为有效数字
    light_reset[id] = reset;  // 更新数组中的值
    res.send("Lux " + id.toString() + " reset: " + reset);
})
app.get("/update_lux_stop", (req, res) => {
    var id = parseInt(req.query.id);
    var stop = req.query.stop === 'true'; // 将传递的字符串转换为布尔值

    // 检查 id 是否为有效的数组索引
    if (isNaN(id) || id < 0 || id >= NUM_OF_LUX) {
        return res.status(400).send("Invalid ID");
    }

    // reset 已经是一个布尔值了，不需要再检查是否为有效数字
    light_stop[id] = stop;  // 更新数组中的值
    res.send("Lux " + id.toString() + " stop: " + stop);
})

app.post('/fileupload', function (req, res) {
    var uploadedFile = req.files.uploadingFile;
    var tmpPath = uploadedFile.path;
    var targetPath = './' + uploadedFile.name;

    fs.rename(tmpPath, targetPath, function (err) {
        if (err) throw err;
        fs.unlink(tmpPath, function () {

            console.log('File Uploaded to ' + targetPath + ' - ' + uploadedFile.size + ' bytes');
        });
    });
    res.send('file upload is done.');
    res.end();
});

app.post('/fileupload', function (req, res) {
    var form = new formidable.IncomingForm();
    form.uploadDir = "./public"
    form.parse(req, function (err, fields, files) {
        //console.log("Parsing")
        var oldpath = files.file.path;
        var newpath = './public/' + files.file.name;
        fs.rename(oldpath, newpath, function (err) {
            if (err) throw err;
            res.write('File uploaded and moved!');
            res.end();
        });
    });
})

app.get('/gettime', (req, res) => {
    const ID = parseInt(req.query.id);  // 從查詢參數中取得ID
    var now = new Date();
    last_connect_time[ID] = now.getTime();
    res.send(time.toString());
});
app.post('/settime', (req, res) => {
    time = req.body.time;
    //console.log(`Received time: ${time} ms`);
    res.status(200).send('Time updated');
});

app.post('/update_file', (req, res) => {
    const newFile = req.body.file || req.body.path;
    
    // 檢查是否有提供檔案位置
    if (!newFile) {
        return res.status(400).send('Missing file parameter');
    }
    
    // 檢查檔案是否存在
    const filePath = path.join(__dirname, 'public', newFile);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found: ' + filePath);
    }
    
    try {
        // 更新 SONG 變數
        SONG = newFile;
        
        // 重新讀取檔案並更新 EffectMapData 和 EffectMap
        EffectMapData = fs.readFileSync(filePath);
        EffectMap = JSON.parse(EffectMapData);
        
        console.log('File updated to: ' + SONG);
        res.status(200).send('File updated successfully: ' + SONG);
    } catch (err) {
        console.error('Error updating file:', err);
        res.status(500).send('Error updating file: ' + err.message);
    }
});

console.log(`Listening on port:${port} `);
app.listen(port);

