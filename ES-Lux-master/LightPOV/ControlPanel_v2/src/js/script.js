// 修正 Fabric.js 對 textBaseline 使用 alphabetical 的 bug
(function () {
    const _set = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'textBaseline').set;
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'textBaseline', {
        set(value) {
            if (value === 'alphabetical') {
                // 強制替換成合法值
                value = 'alphabetic';
            }
            _set.call(this, value);
        }
    });
})();

// DOM elements
const fileInput = document.getElementById('fileInput');
const musicFileLoadBtn = document.getElementById('music_file_load_Btn');
const audio = document.getElementById('audio');
const playToggle = document.getElementById('playToggle');
const stopBtn = document.getElementById('stopBtn');
const timeLabel = document.getElementById('time');

const minInput = document.getElementById('minInput');
const secInput = document.getElementById('secInput');

const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

const timelineCanvasEl = document.getElementById('timelineCanvas');
const assetCanvas1El = document.getElementById('assetCanvas1');
const assetCanvas2El = document.getElementById('assetCanvas2');
const assetCanvas3El = document.getElementById('assetCanvas3');
const assetCanvas4El = document.getElementById('assetCanvas4');
const assetCanvas5El = document.getElementById('assetCanvas5');
const assetCanvas6El = document.getElementById('assetCanvas6');

// asset library
document.querySelectorAll('.Asset_library_header .tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.Asset_library_header .tab')
            .forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        document.querySelectorAll('.Asset_library_content')
            .forEach(c => c.classList.remove('active'));
        document.querySelector(`.Asset_library_content.${target}`).classList.add('active');
    });
});

const EFFECT_CONFIG = {
  "清除": { extras: [] },
  "純色": { extras: [] },
  "方形": { extras: ["boxsize"] },
  "方塊": { extras: ["boxsize", "space"] },
  "DNA":  { extras: ["reverse", "space"] },
  "火焰": { extras: ["space"] },
  "鐮刀": { extras: ["position_fix", "length", "curvature"] },
  "扇形": { extras: ["bladeCount", "length", "curvature"] },
  "Love":  { extras: ["reverse", "space"] },
  "ES":  { extras: ["reverse", "space"] },
  "工科":  { extras: ["reverse", "space"] },
  "PT":  { extras: ["reverse", "space"] },
  "OT":  { extras: ["reverse", "space"] },
  "ESXOPT":  { extras: ["reverse", "space"] },
  "齒輪": { extras: ["space"] }
};

const MODE_EXTRAS = {
  "MODES_CLEAR":      [],
  "MODES_PLAIN":      [],
  "MODES_SQUARE":     ["boxsize"],
  "MODES_SICKLE":     ["position_fix", "length", "curvature"],
  "MODES_FAN":        ["bladeCount", "length", "curvature"],
  "MODES_BOXES":      ["boxsize", "space"],
  "MODES_CMAP_DNA":   ["reverse", "space"],
  "MODES_CMAP_FIRE":  ["space"],
  "MODES_CMAP_LOVE":   ["reverse", "space"],
  "MODES_MAP_ES":   ["reverse", "space"],
  "MODES_MAP_ES_ZH":   ["reverse", "space"],
  "MODES_MAP_ESXOPT":   ["reverse", "space"],
  "MODES_CMAP_BENSON":   ["reverse", "space"],
  "MODES_CMAP_YEN":   ["reverse", "space"],
  "MODES_CMAP_GEAR":  ["space"]
};

const assetItems = document.querySelectorAll('.Asset_item');
const paramEmpty = document.querySelector('.param_empty');
const paramMain  = document.querySelector('.param_main');
const paramBody  = document.querySelector('.param_body--param');
const extraGroups = document.querySelectorAll('.extra_group');
let currentCustomPresetId = null;   // 目前選中的自訂義 preset 的 _id
let currentModeStr = "MODES_PLAIN";
let currentLibraryAssetName = "";

// Reset
function resetAllParams() {
  paramMain.querySelectorAll('input').forEach(inp => {
    if (inp.type === "checkbox" || inp.type === "radio")
      inp.checked = inp.defaultChecked;
    else
      inp.value = inp.defaultValue;
  });



  // Reset HSV function
  paramMain.querySelectorAll('.hsv_block').forEach(block => {
    const sel = block.querySelector('.hsv_func_select');
    const sets = block.querySelectorAll('.hsv_func_params');

    sel.selectedIndex = 0;
    const func = sel.value;

    sets.forEach(s => s.classList.toggle('active', s.dataset.func === func));
  });
}

// 切換參數介面
function switchEffectUI(name) {
  console.log(`[UI切換] 原始名稱: "${name}"`);
    // 更新當前的模式字串 (供後續儲存使用)
    currentModeStr = MODE_MAP[name] || "MODES_PLAIN";

    // 顯示參數面板，隱藏空狀態
    if (paramEmpty) paramEmpty.style.display = 'none';
    if (paramMain) paramMain.classList.remove('hidden');

    // 根據 EFFECT_CONFIG 決定要顯示哪些額外參數 (Extra Groups)
    const cfg = EFFECT_CONFIG[name] || { extras: [] };

      extraGroups.forEach(g => {
          const key = g.dataset.extra;
          g.style.display = cfg.extras.includes(key) ? "block" : "none";
      });

    // 特殊處理：如果是 "清除"，則隱藏面板
    if (name === "清除") {
        paramMain.classList.add('hidden');
    }
}

// 將參數填回面板
function restorePanelParams(params) {
    if (!params) return;

    // 先把所有要處理的 DOM 找出來，並分類
    let selectEls = [];
    let otherEls = [];

    Object.entries(params).forEach(([key, val]) => {
        // 尋找元素
        let els = [];
        const elById = document.getElementById(key);
        if (elById) els.push(elById);
        
        const elsByParam = document.querySelectorAll(`.param_main [data-param="${key}"]`);
        elsByParam.forEach(e => { if (!els.includes(e)) els.push(e); });

        // 分類：下拉選單優先處理
        els.forEach(el => {
            if (el.tagName === 'SELECT') {
                selectEls.push({ el, val });
            } else {
                otherEls.push({ el, val });
            }
        });
    });

    // 先還原下拉選單 (確保面板被打開)
    selectEls.forEach(({ el, val }) => {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 填入數值
    otherEls.forEach(({ el, val }) => {
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}

// 抓取目前面板上所有輸入框的值
function capturePanelParams() {
    const params = {};
    // 選取 input 和 select
    const inputs = document.querySelectorAll('.param_main input, .param_main select');
    
    inputs.forEach(el => {
        // 抓取 ID 或 data-param
        const key = el.id || el.dataset.param;
        if (!key) return;

        // 過濾隱藏的 HSV 參數 (原本的邏輯)
        const parentSet = el.closest('.hsv_func_params');
        if (parentSet && !parentSet.classList.contains('active')) {
            return; 
        }

        // 過濾隱藏的額外參數群組
        // 如果這個 input 屬於某個 extra_group，且該 group 目前被隱藏 (display: none)，就不要存它
        const extraGroup = el.closest('.extra_group');
        if (extraGroup && window.getComputedStyle(extraGroup).display === 'none') {
            return; 
        }

        // 根據類型取值
        if (el.type === 'checkbox' || el.type === 'radio') {
            params[key] = el.checked;
        } 
        else if (el.type === 'number' || el.type === 'range') {
            // 轉成數字
            params[key] = parseFloat(el.value) || 0;
        } 
        else {
            // 處理 select (例如 HSV function) 或其他類型
            params[key] = el.value;
        }
    });
    return params;
}

// 點素材顯示對應參數
assetItems.forEach(item => {
  item.addEventListener('click', () => {
    const name = item.textContent.trim();
    // 記錄目前選中的素材名稱
    currentLibraryAssetName = name; 

    // 取消畫布上的選取
    if (asset_canvas1) {
        asset_canvas1.discardActiveObject();
        asset_canvas1.requestRenderAll();
        currentEditingId = null; // 清空編輯ID，告訴 syncParams 不要存檔
    }
    // UI 切換與重置
    currentModeStr = MODE_MAP[name] || "MODES_PLAIN";
    document.querySelectorAll('.Asset_item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    paramEmpty.style.display = 'none';
    paramMain.classList.remove('hidden');
    
    // 初始化面板
    resetAllParams();
    switchEffectUI(name);
  });
    
  item.setAttribute('draggable', true);
  item.addEventListener('dragstart', (e) => {
    const name = item.textContent.trim();
    // 將素材名稱（如 "方形", "DNA"）儲存到 DataTransfer 物件中
    e.dataTransfer.setData('text/plain', name);
    // 設置一個拖曳圖示（可選，通常瀏覽器會提供預設圖示）
    e.dataTransfer.effectAllowed = 'copy'; 
  });
});

// HSV Function 切換
document.querySelectorAll('.hsv_block').forEach(block => {
  const select    = block.querySelector('.hsv_func_select');
  const paramSets = block.querySelectorAll('.hsv_func_params');

  if (!select) return;

  // func_number <-> func_range 
  paramSets.forEach(set => {
    const numbers = set.querySelectorAll('.func_number');

    numbers.forEach(num => {
      const paramName = num.dataset.param;
      if (!paramName) return;

      const range = set.querySelector(`.func_range[data-param="${paramName}"]`);
      if (!range) return;

      const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

      // number -> range
      num.addEventListener('input', () => {
        const min = Number(num.min ?? 0);
        const max = Number(num.max ?? 255);
        let v = Number(num.value || 0);
        v = clamp(v, min, max);
        num.value = v;
        range.value = v;
      });

      // range -> number
      range.addEventListener('input', () => {
        num.value = range.value;
      });
    });
  });

  // 切換 function（Const / Ramp / Tri / Pulse / Step）
  select.addEventListener('change', () => {
    const func = select.value;

    paramSets.forEach(set => {
      const isActive = set.dataset.func === func;
      set.classList.toggle('active', isActive);

      if (isActive) {
        // 如果正在還原參數 (isRestoring)，就只要切換顯示面板(toggle active)，
        if (typeof isRestoring !== 'undefined' && isRestoring) {
            return; 
        }
        const inputs = set.querySelectorAll('input');

        inputs.forEach(inp => {
          if (inp.type === 'checkbox' || inp.type === 'radio') {
            inp.checked = inp.defaultChecked;
          } else if (inp.defaultValue !== undefined && inp.defaultValue !== '') {
            inp.value = inp.defaultValue;
          } else if (inp.min !== undefined && inp.max !== undefined) {
            inp.value = inp.min || 0;
          }
        });
      }
    });
  });

  select.dispatchEvent(new Event('change'));
});

// 額外參數 數字 <-> 滑桿 同步 

document.querySelectorAll('.extra_group').forEach(group => {
  const numbers = group.querySelectorAll('.param_number');

  numbers.forEach(num => {
    const row = num.closest('.param_input_row');
    if (!row) return;
    const range = row.querySelector('.param_range');
    if (!range) return;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    // number -> range
    num.addEventListener('input', () => {
      const min = Number(num.min ?? 0);
      const max = Number(num.max ?? 255);
      let v = Number(num.value || 0);
      v = clamp(v, min, max);
      num.value = v;
      range.value = v;
    });

    // range -> number
    range.addEventListener('input', () => {
      num.value = range.value;
    });
  });
});

// 切換（參數 / 控制）
document.querySelectorAll('.param_tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;

    document.querySelectorAll('.param_tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.param_body').forEach(b => {
      b.classList.toggle('active', b.classList.contains(`param_body--${mode}`));
    });
  });
});

const MODE_MAP = {
  "清除": "MODES_CLEAR",
  "純色": "MODES_PLAIN",
  "方形": "MODES_SQUARE",
  "鐮刀": "MODES_SICKLE",
  "扇形": "MODES_FAN",
  "方塊": "MODES_BOXES",
  "DNA":  "MODES_CMAP_DNA",
  "火焰": "MODES_CMAP_FIRE",
  "Love": "MODES_CMAP_LOVE",
  "齒輪": "MODES_CMAP_GEAR",
  "ES": "MODES_MAP_ES",
  "工科": "MODES_MAP_ES_ZH",
  "ESXOPT": "MODES_MAP_ESXOPT",
  "OT": "MODES_CMAP_BENSON",
  "PT": "MODES_CMAP_YEN"
};

const FUNC_CODE = {
  "none": 0,
  "const": 1,
  "ramp": 2,
  "tri": 3,
  "pulse": 4,
  "step": 5
};

// mode 字串 -> 中文
const MODE_MAP_INV = {};
for (const [cn, en] of Object.entries(MODE_MAP)) {
  MODE_MAP_INV[en] = cn;
}

function normalizeTo255(value, min, max) {
  const v = Number(value) || 0;
  const lo = Number(min) || 0;
  const hi = Number(max) || 1;
  return Math.round((v - lo) / (hi - lo) * 255);
}

// 0~255 反映射回原本區間 [min, max]
function from255(v255, min, max) {
  const v  = Number(v255) || 0;
  const lo = Number(min) || 0;
  const hi = Number(max) || 1;
  return Math.round(lo + (hi - lo) * (v / 255));
}

function getParamNorm(set, name, def = 0) {
  const inp = set.querySelector(`.func_number[data-param="${name}"]`);
  if (!inp) return def;

  const v   = inp.value;
  const min = inp.min;
  const max = inp.max;

  return normalizeTo255(v, min, max);
}

function collectExtras() {
  const getNum = sel => {
    const inp = document.querySelector(sel);
    return inp ? Number(inp.value || 0) : 0;
  };

  return {
    curvature:   getNum('[data-extra="curvature"] .param_number'),
    length:      getNum('[data-extra="length"] .param_number'),
    bladeCount:  getNum('[data-extra="bladeCount"] .param_number'),
    boxsize:     getNum('[data-extra="boxsize"] .param_number'),
    space:       getNum('[data-extra="space"] .param_number'),
    reverse:     getNum('[data-extra="reverse"] input[type="checkbox"]'),
    positionFix: getNum('[data-extra="position_fix"] .param_number')
  };
}

function packHsvBlock(key) {
  const block = document.querySelector(`.hsv_block[data-key="${key}"]`);
  if (!block) return { func: 0, range: 0, lower: 0, p1: 0, p2: 0 };

  const select   = block.querySelector('.hsv_func_select');
  const funcName = select.value;
  const funcCode = FUNC_CODE[funcName] ?? 0;

  if (funcCode === 0) {
    return { func: 0, range: 0, lower: 0, p1: 0, p2: 0 };
  }

  // 找當前 active function 面板
  const activeSet =
    block.querySelector(`.hsv_func_params[data-func="${funcName}"].active`) ||
    block.querySelector(`.hsv_func_params[data-func="${funcName}"]`);

  const range = getParamNorm(activeSet, `${key}_range`, 0);
  const lower = getParamNorm(activeSet, `${key}_lower`, 0);

  switch (funcCode) {
    case 1: { // Const
      const value255 = getParamNorm(activeSet, `${key}_value`, 0);
      return { func: 1, range: 0, lower: 0, p1: value255, p2: 0 };
    }

    case 2: { // Ramp
      const upper255 = getParamNorm(activeSet, `${key}_upper`, 0);
      return { func: 2, range, lower, p1: upper255, p2: 0 };
    }

    case 3: { // Tri
      const upper255 = getParamNorm(activeSet, `${key}_upper`, 0);
      return { func: 3, range, lower, p1: upper255, p2: 0 };
    }

    case 4: { // Pulse
      const top255 = getParamNorm(activeSet, `${key}_top`, 0);
      return { func: 4, range, lower, p1: top255, p2: 0 };
    }

    case 5: { // Step
      const height255 = getParamNorm(activeSet, `${key}_height`, 0);
      const stepNum255 = getParamNorm(activeSet, `${key}_step`, 0);
      return { func: 5, range, lower, p1: height255, p2: stepNum255 };
    }

    default:
      return { func: 0, range: 0, lower: 0, p1: 0, p2: 0 };
  }
}

function packModePFields(modeStr, extras) {

  let p1 = 0, p2 = 0, p3 = 0, p4 = 0;

  switch (modeStr) {

    case "MODES_CLEAR":
    case "MODES_PLAIN":
      break;

    case "MODES_SQUARE":
      p3 = normalizeTo255(extras.boxsize, 0, 300);
      break;

    case "MODES_SICKLE":
      p1 = normalizeTo255(extras.positionFix, 0, 255);
      p3 = normalizeTo255(extras.curvature, 0, 100);
      p4 = normalizeTo255(extras.length, 0, 300);
      break;

    case "MODES_FAN":
      p1 = normalizeTo255(extras.curvature, 0, 100);
      p3 = normalizeTo255(extras.bladeCount, 0, 12);
      p4 = normalizeTo255(extras.length, 0, 300);
      break;

    case "MODES_BOXES":
      p3 = normalizeTo255(extras.boxsize, 0, 300);
      p4 = normalizeTo255(extras.space, 0, 100);
      break;
    case "MODES_CMAP_FIRE":
    case "MODES_CMAP_GEAR":
      p4 = normalizeTo255(extras.space, 0, 100);
      break;
    case "MODES_CMAP_DNA":
    case "MODES_CMAP_LOVE":
    case "MODES_MAP_ES":
    case "MODES_MAP_ES_ZH":
    case "MODES_MAP_ESXOPT":
    case "MODES_MAP_ES_ZH":
      p1 = extras.reverse >= 1 ? 255 : 0;
      p4 = normalizeTo255(extras.space, 0, 100);
      break;
  }

  return { p1, p2, p3, p4 };
}

function buildSegmentFromUI(startTime, duration) {
  const modeStr = currentModeStr || "MODES_PLAIN";

  // 六組 HSV
  const XH = packHsvBlock("XH");
  const XS = packHsvBlock("XS");
  const XV = packHsvBlock("XV");
  const YH = packHsvBlock("YH");
  const YS = packHsvBlock("YS");
  const YV = packHsvBlock("YV");

  // p1~p4
  const extras = collectExtras();
  const { p1, p2, p3, p4 } = packModePFields(modeStr, extras);

  return {
    mode: modeStr,
    start_time: startTime,
    duration: duration,
    XH, XS, XV,
    YH, YS, YV,
    p1, p2, p3, p4
  };
}

function buildEffectConfigFromUI() {
  const seg = buildSegmentFromUI(0, 0);
  const { start_time, duration, ...effectConfig } = seg;

  return effectConfig;
}

// 轉字串寫法
// const obj = buildEffectConfigFromUI();
// const jsonStr = JSON.stringify(obj, null, 2);

function startServerTimeSync() {
    if (window.timeSyncInterval) return;

    window.timeSyncInterval = setInterval(() => {
        const audio = document.getElementById('audio');
        
        // 如果 audio 元素存在
        if (audio) {
            const currentTimeMs = Math.floor(audio.currentTime * 1000);

            fetch(`/start?time=${currentTimeMs}`, {
                method: 'GET'
            })
        }
    }, 50); 
}

// 頁面載入後自動啟動同步
document.addEventListener('DOMContentLoaded', () => {
    startServerTimeSync();
});

// Audio / waveform state
let audioCtx = null;
let audioBuffer = null;
let peaks = [];
let audioDuration = 0;
let waveformLines = [];

// Fabric timeline state (工程時間系統)
let timescale_canvas = null;
let asset_canvas1 = null; 
let asset_canvas2 = null;
let asset_canvas3 = null;
let asset_canvas4 = null; 
let asset_canvas5 = null;
let asset_canvas6 = null;
let timelineOffset = 0; // seconds at left edge
let secondsPerPixel = 1 / 100; // initial: 1px = 0.01s
const minZoom = 1 / 500;
const maxZoom = 1 / 3;

let waveformObj = null;      // fabric.Image for waveform clip
let waveformImgURL = null;   // blob/dataURL
let clipStartSec = 0;        // clip start time in timeline seconds
let clipWidthPx = 0;         // width on screen in px for the clip (derived)
let globalTime = 0;          // engine time in seconds
let isPlaying = false;
let rafId = null;
let lastRAFTime = null;

let playhead = null;
let globalAssetIdCounter = 1;
let isRestoring = false;
// 記錄目前面板顯示的是哪一個 ID 的資料
let currentEditingId = null;
// 參數資料庫
window.globalEffectData = {};

// Helper utilities
function fmt(t) {
  if (!isFinite(t)) return '00:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Timeline initialization
function initTimelineFabric() {
  timescale_canvas = new fabric.Canvas("timelineCanvas", {
    selection: false,
    renderOnAddRemove: false,
    preserveObjectStacking: true
  });

  // ensure canvas size matches element size
  timescale_canvas.setWidth(timelineCanvasEl.clientWidth);
  timescale_canvas.setHeight(timelineCanvasEl.clientHeight);

  // timeline drag (panning) when clicking empty space
  let isPanning = false;
  let lastPanX = 0;
  // 新增變數：用於判斷是否發生拖曳
  let isDraggingTimeline = false;
  timescale_canvas.on('mouse:down', (e) => {
    // if clicked an object, do nothing (object drag handlers will run)
    if (e.target) return;
    isPanning = true;
    lastPanX = e.pointer.x;
    // 記錄初始位置，並重設拖曳旗標
    initialClickX = e.pointer.x;
    isDraggingTimeline = false;
  });

  timescale_canvas.on('mouse:move', (e) => {
    if (!isPanning) return;
    const dx = e.pointer.x - lastPanX;
    isDraggingTimeline = true;
    lastPanX = e.pointer.x;
    timelineOffset -= dx * secondsPerPixel;
    if (timelineOffset < 0) timelineOffset = 0;
    drawTimeline();
  });

  timescale_canvas.on('mouse:up', (e) => {
    if (!isPanning) return;
    // 檢查是否為點擊 (沒有發生拖曳)
    // 且確保 e.target 為空 (沒有點擊到 waveformObj)
    if (!isDraggingTimeline && !e.target) {
        const p = e.pointer;
        const clickedTime = timelineOffset + p.x * secondsPerPixel;
        seekGlobal(clickedTime,false);
    }
    isPanning = false;
    
  });

  // zoom with wheel - keep center time anchored
  timescale_canvas.on('mouse:wheel', (opt) => {
    const e = opt.e;
    const wheelDelta = e.deltaY;
    const rect = timelineCanvasEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left; // canvas coordinates

    const centerTime = timelineOffset + offsetX * secondsPerPixel;

    if (wheelDelta < 0) secondsPerPixel *= 0.9;
    else secondsPerPixel *= 1.1;

    secondsPerPixel = Math.max(minZoom, Math.min(maxZoom, secondsPerPixel));

    // keep same centerTime
    timelineOffset = centerTime - offsetX * secondsPerPixel;
    if (timelineOffset < 0) timelineOffset = 0;

    drawTimeline();
    e.preventDefault();
    e.stopPropagation();
  });


  // create playhead (visual only)
  playhead = new fabric.Line([0, 0, 0, timescale_canvas.getHeight()], {
    stroke: 'red',
    strokeWidth: 2,
    selectable: false,
    evented: false
  });
  timescale_canvas.add(playhead);

  drawTimeline();
}

// Draw timeline: ticks, labels, waveformObj (if present), playhead
function drawTimeline() {
  if (!timescale_canvas) return;
  const canvas = timescale_canvas;
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  
  canvas.clear();

  // baseline
  const baseY = Math.floor(h * 0.6);
  canvas.add(new fabric.Line([0, 60, w, 60], {
    stroke: '#ffffff', strokeWidth: 2, selectable: false, evented: false
  }));

  // determine tick spacing
  let majorTick = 1;
  if (secondsPerPixel < 1 / 800) majorTick = 0.5;
  if (secondsPerPixel < 1 / 1500) majorTick = 0.2;
  if (secondsPerPixel > 1 / 40) majorTick = 5;
  if (secondsPerPixel > 1 / 20) majorTick = 10;
  if (secondsPerPixel > 1 / 10) majorTick = 30;
  if (secondsPerPixel > 1 / 5) majorTick = 60;

  const startSec = timelineOffset;
  const endSec = timelineOffset + w * secondsPerPixel;
  let firstTick = Math.ceil(startSec / majorTick) * majorTick;

  for (let t = firstTick; t <= endSec; t += majorTick) {
    const x = (t - timelineOffset) / secondsPerPixel;
    canvas.add(new fabric.Line([x, 40, x, 60], {
      stroke: '#ffffff', strokeWidth: 1, selectable: false, evented: false
    }));

    const mm = String(Math.floor(Math.abs(t) / 60)).padStart(2, '0');
    const ss = String(Math.floor(Math.abs(t) % 60)).padStart(2, '0');
    const labelText = (t < 0 ? '-' : '') + `${mm}:${ss}`;

    canvas.add(new fabric.Text(labelText, {
      left: x + 3, top: 6, fill: '#ffffff', fontSize: 12,
      selectable: false, evented: false
    }));
  }

  // add waveform object if exists
  if (waveformObj && audioBuffer) {
    updateWaveformScaleAndPos(); // ensure scale/left are correct for current zoom/offset
    //canvas.add(waveformObj);

      timescale_canvas.add(waveformObj);
      
      // 依序將線段加入畫布
      waveformLines.forEach(line => timescale_canvas.add(line));
  }
  // add playhead on top
  updatePlayheadVisual();
  canvas.add(playhead);
  updateAssetPositions();
  canvas.renderAll();
}

// Create waveform image from peaks and add as Fabric image (clip)
async function createWaveformImageAndAddToTimeline() {
  if (!audioBuffer || !timescale_canvas) return;

  // 解析度設定
  const basePxPerSec = 1000; 
  
  // 設定單張切片的最大寬度
  const CHUNK_WIDTH = 4000; 
  const height = 95;
  const mid = height / 2;

  // 計算總寬度與需要的切片數量
  const totalWidth = Math.floor(audioBuffer.duration * basePxPerSec);
  const totalChunks = Math.ceil(totalWidth / CHUNK_WIDTH);

  const waveformImages = []; // 暫存所有切片物件

  // 迴圈：一段一段畫
  for (let i = 0; i < totalChunks; i++) {
    // 計算這一塊的起始與結束 X
    const startX = i * CHUNK_WIDTH;
    const currentChunkWidth = Math.min(CHUNK_WIDTH, totalWidth - startX);

    // 建立小畫布
    const cv = document.createElement('canvas');
    cv.width = currentChunkWidth;
    cv.height = height;
    const c = cv.getContext('2d');

    // 填背景
    c.fillStyle = "#0d1117";
    c.fillRect(0, 0, currentChunkWidth, height);

    // 畫波形線條
    c.strokeStyle = "#4fb3d6";
    c.lineWidth = 1;
    c.beginPath();

    // 計算這一塊對應到的 peaks 索引範圍
    const peaksPerPixel = peaks.length / totalWidth;
    
    for (let x = 0; x < currentChunkWidth; x++) {
      // 全域 x 座標 = startX + 局部 x
      const globalX = startX + x;
      const idx = Math.floor(globalX * peaksPerPixel);
      
      const p = peaks[idx] || 0;
      const y = p * (height / 2);
      c.moveTo(x + 0.5, mid - y);
      c.lineTo(x + 0.5, mid + y);
    }
    c.stroke();

    // 轉成 Fabric Image
    const imgURL = cv.toDataURL();
    
    const promise = new Promise(resolve => {
        fabric.Image.fromURL(imgURL, (img) => {
            // 設定每一張小圖的位置
            img.set({
                left: startX, // 這一張圖在群組內的相對位置
                top: 0,
                originX: 'left',
                originY: 'top' 
            });
            resolve(img);
        });
    });
    waveformImages.push(await promise);
  }

  // 移除舊的物件
  if (waveformObj) {
    timescale_canvas.remove(waveformObj);
    waveformObj = null;
  }

  // 將所有切片組合成一個 Group
  waveformObj = new fabric.Group(waveformImages, {
    left: 0,
    top: 110,
    originY: 'center',
    selectable: true,
    hasControls: false,
    hasBorders: false,
    hoverCursor: 'grab',
    objectCaching: false,
    subTargetCheck: false
  });

  // 綁定拖曳事件
  waveformObj.on('moving', () => {
    waveformObj.top = 110;

    let newClipStart = timelineOffset + waveformObj.left * secondsPerPixel;

    if (newClipStart < 0) {
        newClipStart = 0;
        waveformObj.left = (0 - timelineOffset) / secondsPerPixel;
    }

    clipStartSec = newClipStart;

    ensureAudioSyncToGlobal(true);
    updateTimeUI();
    
    // 同步框線位置
    const currentGroupWidth = waveformObj.width * waveformObj.scaleX;

    waveformLines.forEach((line, index) => {
        if (index === 1) { // 右框線
            line.left = waveformObj.left + currentGroupWidth;
        } else {
            line.left = waveformObj.left;
        }
        line.setCoords();
    });
    timescale_canvas.requestRenderAll();
  });

  // 初始化縮放與位置
  updateWaveformScaleAndPos();
  
  // 重建框線
  createWaveformLines(waveformObj);

  timescale_canvas.add(waveformObj);
  timescale_canvas.requestRenderAll();
}

// 框線建立
function createWaveformLines(targetObj) {
    // 先移除舊線
    if (window.waveformLines && window.waveformLines.length) {
        window.waveformLines.forEach(l => timescale_canvas.remove(l));
    }
    window.waveformLines = [];

    const strokeOpts = {
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
      evented: false
    };
    
    // Group 的高度
    const h = targetObj.height;
    const w = targetObj.width;
    const topY = 110 - h / 2;
    const bottomY = 110 + h / 2;

    const leftLine = new fabric.Line([0, topY, 0, bottomY], strokeOpts);
    leftLine.set({ originY: 'center', top: 110 });

    const rightLine = new fabric.Line([w, topY, w, bottomY], strokeOpts);
    rightLine.set({ originY: 'center', top: 110 });

    const bottomLine = new fabric.Line([0, 0, w, 0], strokeOpts);
    bottomLine.set({ originY: 'center', top: bottomY });

    window.waveformLines.push(leftLine, rightLine, bottomLine);
    window.waveformLines.forEach(line => timescale_canvas.add(line));
}

// Update waveform scale based on secondsPerPixel and clipStartSec -> position left
function updateWaveformScaleAndPos() {
  if (!waveformObj || !audioBuffer || !timescale_canvas) return;

  const totalSec = audioBuffer.duration;
  audioDuration = totalSec;

  // compute width in px for the clip on the timeline (totalSec / secondsPerPixel)
  const totalWidthPx = totalSec / secondsPerPixel;
  const naturalW = waveformObj.width || 1;
  waveformObj.scaleX = totalWidthPx / naturalW;
  waveformObj.scaleY = 1;

  clipWidthPx = totalWidthPx;

  // left position = (clipStartSec - timelineOffset)/secondsPerPixel
  waveformObj.left = (clipStartSec - timelineOffset) / secondsPerPixel;
// 同步線段的位置與縮放
  waveformLines.forEach((line, index) => {
      line.left = waveformObj.left;
      
      // 底部線段 (index=2) 繼承縮放
      if (index === 2) {
          line.scaleX = waveformObj.scaleX; 
      }
      else if (index === 1) { // 新增：針對右框線
          // 右框線的位置 = 波形圖起始位置 + 拉伸後的總寬度
          line.left = waveformObj.left + clipWidthPx;
          line.scaleX = 1; // 保持固定厚度 
      }
      else {
          // 左右框線保持自然寬度
          line.scaleX = 1; 
      }
      
  });
 // clipStartSec 不可小於 0
if (clipStartSec < 0) clipStartSec = 0;

  // ensure left within reasonable bounds
  const canvasW = timescale_canvas.getWidth();
  if (waveformObj.left < -clipWidthPx) waveformObj.left = -clipWidthPx;
  if (waveformObj.left > canvasW) waveformObj.left = canvasW;
}

// Global play control (engine) - RAF tick advances globalTime
function playGlobal() {
  if (!audioBuffer) return;
  if (!isPlaying) {
    isPlaying = true;
    lastRAFTime = performance.now();
    rafTick(lastRAFTime);
    playToggle.textContent = "⏸ 暫停";
  }
}
function pauseGlobal() {
  isPlaying = false;
  playToggle.textContent = "▶ 播放";
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  // pause audio as well
  if (!audio.paused) audio.pause();
}

function rafTick(now) {
  rafId = requestAnimationFrame(rafTick);
  if (!lastRAFTime) lastRAFTime = now || performance.now();
  const delta = ((now || performance.now()) - lastRAFTime) / 1000;
  lastRAFTime = now || performance.now();

  if (isPlaying) {
    globalTime += delta;
    if (globalTime < 0) globalTime = 0;

    // sync audio to engine: only when in clip range
    ensureAudioSyncToGlobal();
    updateTimeUI();
    updatePlayheadVisual();

    // we render once per frame when playing
    timescale_canvas.requestRenderAll();
  }
}

// Ensure audio playback is synced to globalTime and clip range (DAW logic)
// immediate=true when called during dragging for immediate seek/play
function ensureAudioSyncToGlobal(immediate = false) {
  if (!audioBuffer) return;
  const clipEnd = clipStartSec + audioBuffer.duration;
  const inClip = globalTime >= clipStartSec && globalTime < clipEnd;

  if (inClip) {
    const targetAudioTime = globalTime - clipStartSec;
    const diff = Math.abs((audio.currentTime || 0) - targetAudioTime);

    // Need to seek/play?
    if (audio.paused || diff > 0.08 || immediate) {
      audio.currentTime = Math.min(Math.max(0, targetAudioTime), audioBuffer.duration - 0.001);
      if (isPlaying) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        audio.play().catch(()=>{});
      }
    }
  } else {
    // outside clip -> pause audio
    if (!audio.paused) audio.pause();
  }
}

// Update playhead visual position
function updatePlayheadVisual() {
  if (!playhead || !timescale_canvas) return;
  const x = (globalTime - timelineOffset) / secondsPerPixel;
  playhead.set({ x1: x, x2: x, y1: 0, y2: timescale_canvas.getHeight() });
}

// Seek globalTime (click on timeline or jump input)
function seekGlobal(t,center = true) {
  // 1. 設定新的全域時間
  globalTime = Math.max(0, Math.min(t, 999999)); // cap very large values
  
  // 2. 計算讓 globalTime 位於畫布中央的新 timelineOffset
  if (center && timescale_canvas) {
    const canvasWidth = timescale_canvas.getWidth();
    // 讓 globalTime 位於畫布寬度的一半位置
    const offsetToCenter = canvasWidth * secondsPerPixel / 2; 
    
    // 計算新的 offset
    let newOffset = globalTime - offsetToCenter;
    
    // 確保 timelineOffset 不為負值
    timelineOffset = Math.max(0, newOffset);
  }

  // 3. 執行同步和重繪
  ensureAudioSyncToGlobal();
  updateTimeUI();
  drawTimeline();
}

// Time input jump handler
function jumpToTimeFromInputs() {
  const minutes = parseInt(minInput.value, 10) || 0;
  const seconds = parseInt(secInput.value, 10) || 0;
  if (seconds > 59) {
    alert('秒數不可大於59');
    return;
  }
  const total = minutes * 60 + seconds;
  if (audioBuffer && total > (audioBuffer.duration + 100000)) {
    // arbitrary large check; allow seeking outside for timeline though
    alert('輸入時間超出合理範圍');
    return;
  }
  seekGlobal(total);
  // 清空輸入欄
  minInput.value = '';
  secInput.value = '';
}

minInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    secInput.focus();
  }
});
secInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    jumpToTimeFromInputs();
  }
});

// Compute peaks (same algorithm as before)
function computePeaks(buffer, count = 2000) {
  const channelData = buffer.getChannelData(0);
  const samples = channelData.length;
  const block = Math.floor(samples / count) || 1;
  const peaks = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const start = i * block;
    const end = Math.min(start + block, samples);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(channelData[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  return peaks;
}

// File load and decode
musicFileLoadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  const url = URL.createObjectURL(file);
  audio.src = url;
  audio.load();

  const buf = await file.arrayBuffer();
  try {
    audioBuffer = await audioCtx.decodeAudioData(buf.slice(0));
  } catch (err) {
    audioBuffer = await new Promise((res, rej) => audioCtx.decodeAudioData(buf, res, rej));
  }

  audioDuration = audioBuffer.duration;
  peaks = computePeaks(audioBuffer, Math.max(1024, Math.floor(audioBuffer.duration * 100)));

  // reset clip start to 0 and engine time to 0
  clipStartSec = 0;
  globalTime = 0;

  // create waveform image & add to timeline
  await createWaveformImageAndAddToTimeline();

  playToggle.disabled = false;
  stopBtn.disabled = false;
  updateTimeUI();
  drawTimeline();
});

// Play / Pause / Stop handlers
playToggle.addEventListener('click', async () => {
  if (!audioBuffer) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  if (!isPlaying) {
    playGlobal();
  } else {
    pauseGlobal();
  }
});

stopBtn.addEventListener('click', () => {
  pauseGlobal();
  globalTime = 0;
  ensureAudioSyncToGlobal();
  updateTimeUI();
  drawTimeline();
});

// Volume control
volumeSlider.addEventListener('input', () => {
  const vol = volumeSlider.value / 100;
  audio.volume = vol;
  volumeValue.textContent = `${volumeSlider.value}%`;
});

// Window resize: resize fabric canvas and redraw
window.addEventListener('resize', () => {
  if (!timescale_canvas) return;
  timescale_canvas.setWidth(timelineCanvasEl.clientWidth);
  timescale_canvas.setHeight(timelineCanvasEl.clientHeight);
  if (asset_canvas1) {
      asset_canvas1.setWidth(assetCanvas1El.clientWidth);
      asset_canvas1.setHeight(assetCanvas1El.clientHeight);
      asset_canvas1.requestRenderAll();
  }

  if (asset_canvas2 && assetCanvas2El) {
      asset_canvas2.setWidth(assetCanvas2El.clientWidth);
      asset_canvas2.setHeight(assetCanvas2El.clientHeight);
      asset_canvas2.requestRenderAll();
  }
  if (asset_canvas3 && assetCanvas3El) {
      asset_canvas3.setWidth(assetCanvas3El.clientWidth);
      asset_canvas3.setHeight(assetCanvas3El.clientHeight);
      asset_canvas3.requestRenderAll();
  }
  if (asset_canvas4 && assetCanvas4El) {
      asset_canvas4.setWidth(assetCanvas4El.clientWidth);
      asset_canvas4.setHeight(assetCanvas4El.clientHeight);
      asset_canvas4.requestRenderAll();
  }
  if (asset_canvas5 && assetCanvas5El) {
      asset_canvas5.setWidth(assetCanvas5El.clientWidth);
      asset_canvas5.setHeight(assetCanvas5El.clientHeight);
      asset_canvas5.requestRenderAll();
  }
  if (asset_canvas6 && assetCanvas6El) {
      asset_canvas6.setWidth(assetCanvas6El.clientWidth);
      asset_canvas6.setHeight(assetCanvas6El.clientHeight);
      asset_canvas6.requestRenderAll();
  }
  drawTimeline();
});

// Update time label UI
function updateTimeUI() {
  timeLabel.textContent = `當前時間:${fmt(globalTime)}`;
  volumeValue.textContent = `${Math.round(audio.volume * 100)}%`;
}

//重置效果方塊外框
function resetAllStrokes(canvas) {
  if(!canvas) return;
  canvas.getObjects().forEach(obj => {
    // 確保它是 Group 且內部有背景方塊 (item(0))
    if (obj.type === 'group' && obj.item(0)) {
      obj.item(0).set({
        stroke: '#ffffff', // 預設白色
        strokeWidth: 1     // 預設細線
      });
    }
  });
  canvas.requestRenderAll();
}
//載入參數
function loadAssetParams(e) {
  let activeObj = e.target;
  if (!activeObj && e.selected && e.selected.length > 0) {
      activeObj = e.selected[0];
  }
  if (!activeObj || !activeObj.logicBlock){
  return;
  } 
  // 從 Fabric 物件中取出我們的 Class 實例
  const block = activeObj.logicBlock;
  console.log(`[選取 ID:${block.id}] 目前資料庫內容:`, JSON.parse(JSON.stringify(globalEffectData)))
  // 印出整個物件結構，展開來檢查
  console.dir(block);
  const allCanvases = [asset_canvas1, asset_canvas2, asset_canvas3, asset_canvas4, asset_canvas5, asset_canvas6];
  
  allCanvases.forEach(cvs => {
      // 如果這個畫布存在，且不是目前操作的畫布，就取消選取
      if (cvs && cvs !== activeObj.canvas) {
          cvs.discardActiveObject();
          cvs.requestRenderAll(); 
      }
  });
  // 重置所有顏色
  allCanvases.forEach(cvs => resetAllStrokes(cvs));

  // 將當前物件設為藍色
  if (activeObj.item(0)) {
    activeObj.item(0).set({
    stroke: '#00aaff',
    strokeWidth: 2     
    });
  }
  // 上鎖 + 記錄 ID
  isRestoring = true;
  currentEditingId = block.id;
  // 切換 UI
  switchEffectUI(block.name);
  // 清空面板
  resetAllParams();
  // 填入參數
  if (block.params) {
    restorePanelParams(block.params);
  }
  // 解鎖
  setTimeout(() => {
    isRestoring = false;
    // 載入完成後，立刻更新預覽器
    const previewComponent = document.getElementById('live_preview');
    if (previewComponent && typeof previewComponent.updateData === 'function') {
        const previewData = buildSegmentFromUI(0, 1000); 
        previewComponent.updateData(previewData);
    }
  }, 10);
  activeObj.canvas.requestRenderAll();
  }


// 存檔同步函式
function syncParamsToActiveObject(e) {
  // 檢查鎖
  if (typeof isRestoring !== 'undefined' && isRestoring) return;
  if (!currentEditingId) return;

  // 抓取面板上的最新參數
  const currentParams = capturePanelParams();

  // 直接寫入全域資料庫 (不依賴 activeObject，確保任何時候都存得到)
  if(window.globalEffectData[currentEditingId]) {
      Object.assign(window.globalEffectData[currentEditingId], currentParams);
      console.log(`[參數存檔] ID:${currentEditingId} 更新成功`, currentParams);
  }
  // 更新即時預覽器 (Live Preview) ★
  const previewComponent = document.getElementById('live_preview');
  if (previewComponent && typeof previewComponent.updateData === 'function') {
      // 藉由您原有的 buildSegmentFromUI 函式，把目前的 UI 參數打包成 preview 需要的 JSON 格式
      const previewData = buildSegmentFromUI(0, 1000); 
      previewComponent.updateData(previewData);
  }

  // 去所有畫布尋找這個方塊，更新它內部的暫存與畫面 (即時預覽)
  const canvases = [asset_canvas1, asset_canvas2, asset_canvas3, asset_canvas4, asset_canvas5, asset_canvas6];
  let needRender = false;

  canvases.forEach(canvas => {
      if (!canvas) return;
      canvas.getObjects().forEach(obj => {
          if (obj.logicBlock && obj.logicBlock.id === currentEditingId) {
              //obj.logicBlock.params = currentParams; 
              needRender = true;
          }
      });
      // 只要這張畫布有更新，就重繪
      if (needRender) {
          canvas.requestRenderAll();
          needRender = false;
      }
  });
}

// 全域綁定面板 Input 事件 (確保參數修改能存回方塊)
if (paramMain) {
    // 先移除舊的避免重複
    paramMain.removeEventListener('input', syncParamsToActiveObject);
    paramMain.removeEventListener('change', syncParamsToActiveObject);
    
    // 綁定
    paramMain.addEventListener('input', syncParamsToActiveObject);
    // 修改參數確認後存檔
    paramMain.addEventListener('change', (e) => {
        syncParamsToActiveObject(e); // 先確保數值寫入
        // 呼叫歷史紀錄存檔
        setTimeout(() => {
            if (typeof isRestoring !== 'undefined' && !isRestoring) {
                HistoryManager.saveState();
            }
        }, 10);
    });
}

// 初始化 Asset Canvas1 的 Fabric 畫布
function initAsset1Fabric() {
  if (!assetCanvas1El) {
    console.error('找不到 #assetCanvas1');
    return;
  }
  // 初始化畫布
  assetCanvas1El.width = assetCanvas1El.clientWidth;
  assetCanvas1El.height = assetCanvas1El.clientHeight;

  asset_canvas1 = new fabric.Canvas("assetCanvas1", {
    selection: true,
    renderOnAddRemove: true
  });
  
  asset_canvas1.setWidth(assetCanvas1El.clientWidth);
  asset_canvas1.setHeight(assetCanvas1El.clientHeight);

  // 處理拖曳放下
  const canvasContainer = asset_canvas1.wrapperEl;

  canvasContainer.addEventListener('dragover', (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'copy';
  });

  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!asset_canvas1) return;

    const pointer = asset_canvas1.getPointer(e);
    const assetName = e.dataTransfer.getData('text/plain');

    createAssetOnCanvas(assetName, pointer.x, pointer.y);
  });
  // 事件監聽整合區

  // 選取方塊時：讀取參數
  asset_canvas1.on('selection:created', loadAssetParams);
  asset_canvas1.on('selection:updated', loadAssetParams);
  
  // 取消選取時：隱藏面板 + 全部變回白色
  asset_canvas1.on('selection:cleared', () => {
     resetAllStrokes(asset_canvas1); 
     // 兩個畫布都沒有選取物件時，才隱藏面板，避免切換畫布時，瞬間閃爍或隱藏
     setTimeout(() => {
         // 檢查畫布現在是否真的都沒有選取物件
         const c1 = asset_canvas1 && asset_canvas1.getActiveObject();
         const c2 = asset_canvas2 && asset_canvas2.getActiveObject();
         const c3 = asset_canvas3 && asset_canvas3.getActiveObject();
         const c4 = asset_canvas4 && asset_canvas4.getActiveObject();
         const c5 = asset_canvas5 && asset_canvas5.getActiveObject();
         const c6 = asset_canvas6 && asset_canvas6.getActiveObject();
         // 只有當沒有選取物件時，才隱藏面板
         if (!c1 && !c2 && !c3 && !c4 && !c5 && !c6) {
             currentEditingId = null;
             if (paramEmpty) paramEmpty.style.display = 'block'; 
             if (paramMain) paramMain.classList.add('hidden');
         }
     }, 10);
  });
  bindFocusEvent(asset_canvas1);
  // 移動/縮放完成後存檔
  asset_canvas1.on('object:modified', () => {
      HistoryManager.saveState();
  });
  asset_canvas1.requestRenderAll();
}

// 初始化 Asset2 Canvas 的 Fabric 畫布
function initAsset2Fabric() {
  if (!assetCanvas2El) return;
  
  assetCanvas2El.width = assetCanvas2El.clientWidth;
  assetCanvas2El.height = assetCanvas2El.clientHeight;

  asset_canvas2 = new fabric.Canvas("assetCanvas2", {
    selection: true,
    renderOnAddRemove: true
  });
  
  asset_canvas2.setWidth(assetCanvas2El.clientWidth);
  asset_canvas2.setHeight(assetCanvas2El.clientHeight);

  // 處理拖曳放下 (Drop)
  const canvasContainer = asset_canvas2.wrapperEl;
  canvasContainer.addEventListener('dragover', (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'copy';
  });

  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!asset_canvas2) return;
    const pointer = asset_canvas2.getPointer(e);
    const assetName = e.dataTransfer.getData('text/plain');
    // 傳入 asset_canvas2 作為目標
    createAssetOnCanvas(assetName, pointer.x, pointer.y, asset_canvas2);
  });

  // 事件監聽：選取時載入參數
  asset_canvas2.on('selection:created', loadAssetParams);
  asset_canvas2.on('selection:updated', loadAssetParams);
  
  asset_canvas2.on('selection:cleared', () => {
     resetAllStrokes(asset_canvas2);
     // 檢查 Canvas 1 是否有選取，避免誤關面板
     setTimeout(() => {
         const c1 = asset_canvas1 && asset_canvas1.getActiveObject();
         const c2 = asset_canvas2 && asset_canvas2.getActiveObject();
         const c3 = asset_canvas3 && asset_canvas3.getActiveObject();
         const c4 = asset_canvas4 && asset_canvas4.getActiveObject();
         const c5 = asset_canvas5 && asset_canvas5.getActiveObject();
         const c6 = asset_canvas6 && asset_canvas6.getActiveObject();

         if (!c1 && !c2 && !c3 && !c4 && !c5 && !c6) {
             currentEditingId = null;
             if(paramEmpty) paramEmpty.style.display = 'block'; 
             if(paramMain) paramMain.classList.add('hidden');
         }
    }, 10);
  });
  bindFocusEvent(asset_canvas2);
  // 移動/縮放完成後存檔
  asset_canvas2.on('object:modified', () => {
      HistoryManager.saveState();
  });
  asset_canvas2.requestRenderAll();
}

function initAsset3Fabric() {
  if (!assetCanvas3El) return;
  
  assetCanvas3El.width = assetCanvas3El.clientWidth;
  assetCanvas3El.height = assetCanvas3El.clientHeight;

  asset_canvas3 = new fabric.Canvas("assetCanvas3", {
    selection: true,
    renderOnAddRemove: true
  });
  
  asset_canvas3.setWidth(assetCanvas3El.clientWidth);
  asset_canvas3.setHeight(assetCanvas3El.clientHeight);

  // 拖曳放下 (Drop)
  const canvasContainer = asset_canvas3.wrapperEl;
  canvasContainer.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!asset_canvas3) return;
    const pointer = asset_canvas3.getPointer(e);
    const assetName = e.dataTransfer.getData('text/plain');
    createAssetOnCanvas(assetName, pointer.x, pointer.y, asset_canvas3);
  });

  // --- 事件監聽 ---
  asset_canvas3.on('selection:created', loadAssetParams);
  asset_canvas3.on('selection:updated', loadAssetParams);
  
  asset_canvas3.on('selection:cleared', () => {
    resetAllStrokes(asset_canvas3);
    // 檢查所有畫布
    const c1 = asset_canvas1 && asset_canvas1.getActiveObject();
    const c2 = asset_canvas2 && asset_canvas2.getActiveObject();
    const c3 = asset_canvas3 && asset_canvas3.getActiveObject();
    const c4 = asset_canvas4 && asset_canvas4.getActiveObject();
    const c5 = asset_canvas5 && asset_canvas5.getActiveObject();
    const c6 = asset_canvas6 && asset_canvas6.getActiveObject();
    setTimeout(() => {
      if (!c1 && !c2 && !c3 && !c4 && !c5 && !c6) {
        currentEditingId = null;
        if(paramEmpty) paramEmpty.style.display = 'block'; 
        if(paramMain) paramMain.classList.add('hidden');
      }
    }, 20);
  });
  bindFocusEvent(asset_canvas3); 
  // 移動/縮放完成後存檔
  asset_canvas3.on('object:modified', () => {
      HistoryManager.saveState();
  });  
  asset_canvas3.requestRenderAll();
}

function initAsset4Fabric() {
  if (!assetCanvas4El) return;
  
  assetCanvas4El.width = assetCanvas4El.clientWidth;
  assetCanvas4El.height = assetCanvas4El.clientHeight;

  asset_canvas4 = new fabric.Canvas("assetCanvas4", {
    selection: true,
    renderOnAddRemove: true
  });
  
  asset_canvas4.setWidth(assetCanvas4El.clientWidth);
  asset_canvas4.setHeight(assetCanvas4El.clientHeight);

  // 拖曳放下 (Drop)
  const canvasContainer = asset_canvas4.wrapperEl;
  canvasContainer.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!asset_canvas4) return;
    const pointer = asset_canvas4.getPointer(e);
    const assetName = e.dataTransfer.getData('text/plain');
    createAssetOnCanvas(assetName, pointer.x, pointer.y, asset_canvas4);
  });

  // --- 事件監聽 ---
  asset_canvas4.on('selection:created', loadAssetParams);
  asset_canvas4.on('selection:updated', loadAssetParams);
  
  asset_canvas4.on('selection:cleared', () => {
    resetAllStrokes(asset_canvas4);
    // 檢查所有畫布
    const c1 = asset_canvas1 && asset_canvas1.getActiveObject();
    const c2 = asset_canvas2 && asset_canvas2.getActiveObject();
    const c3 = asset_canvas3 && asset_canvas3.getActiveObject();
    const c4 = asset_canvas4 && asset_canvas4.getActiveObject();
    const c5 = asset_canvas5 && asset_canvas5.getActiveObject();
    const c6 = asset_canvas6 && asset_canvas6.getActiveObject();
    setTimeout(() => {
      if (!c1 && !c2 && !c3 && !c4 && !c5 && !c6) {
        currentEditingId = null;
        if(paramEmpty) paramEmpty.style.display = 'block'; 
        if(paramMain) paramMain.classList.add('hidden');
      }
    }, 20);
  });
  bindFocusEvent(asset_canvas4);  
  // 移動/縮放完成後存檔
  asset_canvas4.on('object:modified', () => {
      HistoryManager.saveState();
  }); 
  asset_canvas4.requestRenderAll();
}
function initAsset5Fabric() {
  if (!assetCanvas5El) return;
  
  assetCanvas5El.width = assetCanvas5El.clientWidth;
  assetCanvas5El.height = assetCanvas5El.clientHeight;

  asset_canvas5 = new fabric.Canvas("assetCanvas5", {
    selection: true,
    renderOnAddRemove: true
  });
  
  asset_canvas5.setWidth(assetCanvas5El.clientWidth);
  asset_canvas5.setHeight(assetCanvas5El.clientHeight);

  // 拖曳放下 (Drop)
  const canvasContainer = asset_canvas5.wrapperEl;
  canvasContainer.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!asset_canvas5) return;
    const pointer = asset_canvas5.getPointer(e);
    const assetName = e.dataTransfer.getData('text/plain');
    createAssetOnCanvas(assetName, pointer.x, pointer.y, asset_canvas5);
  });

  // --- 事件監聽 ---
  asset_canvas5.on('selection:created', loadAssetParams);
  asset_canvas5.on('selection:updated', loadAssetParams);
  
  asset_canvas5.on('selection:cleared', () => {
    resetAllStrokes(asset_canvas5);
    // 檢查所有畫布
    const c1 = asset_canvas1 && asset_canvas1.getActiveObject();
    const c2 = asset_canvas2 && asset_canvas2.getActiveObject();
    const c3 = asset_canvas3 && asset_canvas3.getActiveObject();
    const c4 = asset_canvas4 && asset_canvas4.getActiveObject();
    const c5 = asset_canvas5 && asset_canvas5.getActiveObject();
    const c6 = asset_canvas6 && asset_canvas6.getActiveObject();
    setTimeout(() => {
      if (!c1 && !c2 && !c3 && !c4 && !c5 && !c6) {
        currentEditingId = null;
        if(paramEmpty) paramEmpty.style.display = 'block'; 
        if(paramMain) paramMain.classList.add('hidden');
      }
    }, 20);
  });
  bindFocusEvent(asset_canvas5); 
  // 移動/縮放完成後存檔
  asset_canvas5.on('object:modified', () => {
      HistoryManager.saveState();
  });  
  asset_canvas5.requestRenderAll();
}
function initAsset6Fabric() {
  if (!assetCanvas6El) return;
  
  assetCanvas6El.width = assetCanvas6El.clientWidth;
  assetCanvas6El.height = assetCanvas6El.clientHeight;

  asset_canvas6 = new fabric.Canvas("assetCanvas6", {
    selection: true,
    renderOnAddRemove: true
  });
  
  asset_canvas6.setWidth(assetCanvas5El.clientWidth);
  asset_canvas6.setHeight(assetCanvas5El.clientHeight);

  // 拖曳放下 (Drop)
  const canvasContainer = asset_canvas6.wrapperEl;
  canvasContainer.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!asset_canvas6) return;
    const pointer = asset_canvas6.getPointer(e);
    const assetName = e.dataTransfer.getData('text/plain');
    createAssetOnCanvas(assetName, pointer.x, pointer.y, asset_canvas6);
  });

  // --- 事件監聽 ---
  asset_canvas6.on('selection:created', loadAssetParams);
  asset_canvas6.on('selection:updated', loadAssetParams);
  
  asset_canvas6.on('selection:cleared', () => {
    resetAllStrokes(asset_canvas5);
    // 檢查所有畫布
    const c1 = asset_canvas1 && asset_canvas1.getActiveObject();
    const c2 = asset_canvas2 && asset_canvas2.getActiveObject();
    const c3 = asset_canvas3 && asset_canvas3.getActiveObject();
    const c4 = asset_canvas4 && asset_canvas4.getActiveObject();
    const c5 = asset_canvas5 && asset_canvas5.getActiveObject();
    const c6 = asset_canvas6 && asset_canvas6.getActiveObject();
    setTimeout(() => {
      if (!c1 && !c2 && !c3 && !c4 && !c5 && !c6) {
        currentEditingId = null;
        if(paramEmpty) paramEmpty.style.display = 'block'; 
        if(paramMain) paramMain.classList.add('hidden');
      }
    }, 20);
  });
  bindFocusEvent(asset_canvas6);
  // 移動/縮放完成後存檔
  asset_canvas6.on('object:modified', () => {
      HistoryManager.saveState();
  });   
  asset_canvas6.requestRenderAll();
}
// 根據時間軸的 Offset 和 Zoom 更新素材位置
function updateAssetPositions() {
  // 同時更新畫布
  const targetCanvas = [asset_canvas1, asset_canvas2, asset_canvas3, asset_canvas4, asset_canvas5, asset_canvas6]
  targetCanvas.forEach(canvas => {
    if (!canvas) return;
    canvas.getObjects().forEach(obj => {
      // 如果是正在操作的物件，就跳過不更新它的位置
      if (obj.isMoving) return;
      // 檢查有沒有 logicBlock 
      if (obj.logicBlock) {
        const block = obj.logicBlock;
        if (block.startTime !== undefined) {   
          // 計算新的 X 座標
          const newLeft = (block.startTime - timelineOffset) / secondsPerPixel;
          obj.left = newLeft;
          // 更新寬度 (縮放)
          if (block.duration !== undefined && obj.width > 0) {
              const targetWidthPx = block.duration / secondsPerPixel;
              
              obj.scaleX = targetWidthPx / obj.width;

              // 修正文字變形
              const textObj = obj.item(1); 
              if (textObj) {
                  textObj.set({
                      scaleX: 1 / obj.scaleX,
                      scaleY: 1 
                  });
              }
          }
          obj.setCoords(); 
        }
      }
    })
    canvas.requestRenderAll();
  });

  
}

function createAssetOnCanvas(assetName, x, y, targetCanvas) {
    // 如果沒傳目標，預設為 canvas1
    targetCanvas = targetCanvas || asset_canvas1;
    if (!targetCanvas) return;
    // 產生 ID
    const currentId = globalAssetIdCounter++;

    // 準備參數
    let finalParams = {};

    // 在這裡先判斷是哪一層
    let currentLayer = 1;
    if (targetCanvas === asset_canvas2) currentLayer = 2;
    if (targetCanvas === asset_canvas3) currentLayer = 3;
    if (targetCanvas === asset_canvas4) currentLayer = 4;
    if (targetCanvas === asset_canvas5) currentLayer = 5;
    if (targetCanvas === asset_canvas6) currentLayer = 6;

    // 如果拖曳進來的素材等於目前面板顯示的素材就直接抓取面板上的數值，不要 reset
    if (assetName.trim() === currentLibraryAssetName) {
        console.log("使用面板目前的設定建立方塊");
        finalParams = capturePanelParams();
    } 
    else {
        // 如果不一樣，就進行切換並重置
        console.log("切換素材，使用預設值");
        // 為了安全，還是要切換UI
        isRestoring = true;
        switchEffectUI(assetName);
        resetAllParams();
        finalParams = capturePanelParams();
        isRestoring = false;
    }
    // 先將資料寫入全域資料庫
    globalEffectData[currentId] = {
      ...finalParams,
      id: currentId,         
      name: assetName.trim(),
      layer: currentLayer  
    }; 
    console.log(`[資料庫] 已新增 ID:${currentId} 的數據`, globalEffectData[currentId]);

    // 2. 建立方塊 (現在不需要傳入 defaultParams 了，因為已經存到資料庫了)
    const newBlock = new EffectBlock(currentId, assetName.trim());

    // 渲染 (傳入 canvas 與 x, y)
    // 注意：原本的 y 是在函式內算，現在可以傳入函式參數的 y，或是維持內部計算
    // 如果想要精準控制在 assetCanvas1 的中間，可以這樣寫：
    const centerY = targetCanvas.getHeight() / 2;
    const group = newBlock.render(targetCanvas, x, centerY);

    // 選取它
    targetCanvas.setActiveObject(group);
    targetCanvas.fire('selection:created', { target: group, selected: [group] });
    targetCanvas.requestRenderAll();

    console.log(`已建立 Block Class ID: ${newBlock.id}`);
    // 新增方塊後存檔
    HistoryManager.saveState();
}
// 用來隨時記錄滑鼠在螢幕上的位置
let globalMousePos = { x: 0, y: 0 };

// 監聽滑鼠移動，隨時更新座標
window.addEventListener('mousemove', (e) => {
    globalMousePos.x = e.clientX;
    globalMousePos.y = e.clientY;
});
window.addEventListener('keydown', (e) => {
  // 檢查按鍵是否為 Delete
  if (e.key === 'Delete') {    
    // 安全檢查：如果使用者正在輸入框 (input) 或文字區域打字，忽略刪除指令
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }
      // 檢查畫布
      const targetCanvas = [asset_canvas1, asset_canvas2, asset_canvas3, asset_canvas4, asset_canvas5, asset_canvas6]
      targetCanvas.forEach(canvas => {
        if(!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
          // 清除目前的選取框，避免刪除後殘留藍色框線
          canvas.discardActiveObject();
          // 遍歷並移除所有選取的物件
          activeObjects.forEach((obj) => {
            // 刪除效果方塊對應的資料
            if (obj.logicBlock) {
              delete globalEffectData[obj.logicBlock.id];
            }
            canvas.remove(obj);
          });
          // 清空面板與 ID 紀錄
          currentEditingId = null;
          resetAllStrokes(); 
          if (paramEmpty) paramEmpty.style.display = 'block'; 
          if (paramMain) paramMain.classList.add('hidden');
          canvas.requestRenderAll();
          // 刪除方塊後存檔
          HistoryManager.saveState();
        }
      });
  }
  // 檢查是否按下了 Ctrl (Mac 是 Command)
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    // 複製 (Ctrl + C)
    if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (!lastFocusedCanvas) return;

        // 取得目前選取的物件
        const activeObj = lastFocusedCanvas.getActiveObject();

        // 確保選到的是效果方塊
        if (activeObj && activeObj.logicBlock) {
            const sourceBlock = activeObj.logicBlock;

            // 複製資料 (使用 JSON 方法進行深拷貝，切斷引用關係)
            appClipboard = {
                name: sourceBlock.name,
                duration: sourceBlock.duration,
                // 複製全域參數資料
                params: JSON.parse(JSON.stringify(sourceBlock.params || {}))
            };
            
            console.log('已複製方塊:', appClipboard.name);
        }
    }

    // 貼上 (Ctrl + V)
    if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        // 檢查剪貼簿有沒有東西
        if (!appClipboard) return;
        
        let targetCanvas = null;
        let pasteX = 0;
        
        // 檢查滑鼠現在是不是懸停在某個軌道上
        const canvasIds = ['assetCanvas1', 'assetCanvas2', 'assetCanvas3', 'assetCanvas4', 'assetCanvas5', 'assetCanvas6'];
        
        for (let id of canvasIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            
            const rect = el.getBoundingClientRect();
            
            // 碰撞檢測：滑鼠是否在這個軌道範圍內
            if (globalMousePos.x >= rect.left && globalMousePos.x <= rect.right &&
                globalMousePos.y >= rect.top && globalMousePos.y <= rect.bottom) {
                
                // 找到滑鼠指著的軌道就使用之前寫的 helper 取得畫布實例
                targetCanvas = window.getCanvasInstanceById ? window.getCanvasInstanceById(id) : null;
                
                if (targetCanvas) {
                    // 計算相對座標 
                    pasteX = globalMousePos.x - rect.left;
                }
                break; // 找到就停止迴圈
            }
        }

        // 如果滑鼠沒指著任何軌道，就貼在最後點選的軌道
        if (!targetCanvas) {
            targetCanvas = lastFocusedCanvas;
            // 如果連最後焦點都沒有，就貼在軌道 1 
            if (!targetCanvas && typeof asset_canvas1 !== 'undefined') targetCanvas = asset_canvas1;
            
            // 位置設為目前的播放頭位置 (Timeline Offset)
            if (typeof window.timelineOffset === 'number') {
                // 將時間轉為 X 座標
                pasteX = 0; 
            }
        }

        if (!targetCanvas) return;

        // 產生新 ID 與方塊
        const newId = generateUniqueId();
        const newBlock = new EffectBlock(newId, appClipboard.name);
        
        newBlock.duration = appClipboard.duration;
        newBlock.params = appClipboard.params;

        // 渲染
        const finalX = Math.max(0, pasteX); 
        const centerY = targetCanvas.getHeight() / 2;

        newBlock.render(targetCanvas, finalX, centerY);

        // 視覺選取
        if (newBlock.fabricGroup) {
            targetCanvas.setActiveObject(newBlock.fabricGroup);
            newBlock.fabricGroup.fire('scaling');
        }
        
        targetCanvas.requestRenderAll();
        console.log(`已貼上方塊 ${newId} 於 X:${Math.floor(finalX)}`);
        // 貼上方塊後存檔
        HistoryManager.saveState();
    }

    // Undo (Ctrl + Z)
    if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); // 阻止瀏覽器預設的復原
        // 如果目前焦點還在輸入框內，強制失去焦點以觸發最後一次的參數存檔
        if (document.activeElement && 
           (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) {
            document.activeElement.blur(); 
        }
        setTimeout(() => {
            HistoryManager.undo();
        }, 20);
    }

    // Redo (Ctrl + Y  或  Ctrl + Shift + Z)
    if (isCmdOrCtrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        HistoryManager.redo();
    }

    // Undo (Ctrl + Z)
    if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); // 阻止瀏覽器預設的復原
        HistoryManager.undo();
    }

    // Redo (Ctrl + Y  或  Ctrl + Shift + Z)
    if (isCmdOrCtrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        HistoryManager.redo();
    }
});
// Initialization
function initAll() {
  // UI defaults
  playToggle.disabled = true;
  stopBtn.disabled = true;
  volumeValue.textContent = `${Math.round((volumeSlider.value || 100))}%`;

  // timeline init
  if (!timelineCanvasEl) {
    console.error('找不到 #timelineCanvas');
    return;
  }
  timelineCanvasEl.width = timelineCanvasEl.clientWidth;
  timelineCanvasEl.height = timelineCanvasEl.clientHeight;

  initTimelineFabric();
  initAsset1Fabric();
  //initAsset2Fabric();
  // set initial audio volume
  audio.volume = (volumeSlider.value || 100) / 100;

  updateTimeUI();
}

// start
initAll();

// 自定義加入
const btnAddCustom = document.querySelector('.btn_add_custom');
const btnUpdateCustom = document.querySelector('.btn_update_custom');
const btnDeleteCustom = document.querySelector('.btn_delete_custom');

function setCustomButtonsEnabled(enabled) {
  if (btnUpdateCustom) btnUpdateCustom.disabled = !enabled;
  if (btnDeleteCustom) btnDeleteCustom.disabled = !enabled;
}

function genPresetId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'preset_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

const CUSTOM_PRESET_KEY = "luxCustomPresets_v1";

function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESET_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    // 如果舊資料沒有 _id，就幫它補一個，避免衝突
    let changed = false;
    arr.forEach(p => {
      if (!p._id) {
        p._id = genPresetId();
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(CUSTOM_PRESET_KEY, JSON.stringify(arr));
    }
    return arr;
  } catch (e) {
    console.error("loadCustomPresets error", e);
    return [];
  }
}

function saveCustomPresets(list) {
  try {
    localStorage.setItem(CUSTOM_PRESET_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("saveCustomPresets error", e);
  }
}

// 還原到UI
function ensureParamPanelVisible() {
  // 切到「參數」這頁 tab
  const tabs = document.querySelectorAll('.param_tab');
  const bodies = document.querySelectorAll('.param_body');
  const paramTab = document.querySelector('.param_tab[data-target="params"]') || tabs[0];
  const paramBody = document.querySelector('.param_body[data-pane="params"]') || bodies[0];

  if (tabs.length && paramTab) {
    tabs.forEach(t => t.classList.remove('active'));
    paramTab.classList.add('active');
  }
  if (bodies.length && paramBody) {
    bodies.forEach(b => b.classList.remove('active'));
    paramBody.classList.add('active');
  }

  // 把「請從左側選擇一個素材」藏起來，顯示真正的內容
  const empty = document.querySelector('.param_empty');
  const main = document.querySelector('.param_main');
  if (empty) empty.style.display = 'none';
  if (main) main.classList.remove('hidden');
}

function setParamFrom255(setElem, paramName, value255) {
  if (!setElem) return;
  const num = setElem.querySelector(`.func_number[data-param="${paramName}"]`);
  if (!num) return;

  const min = num.min;
  const max = num.max;
  const uiVal = from255(value255, min, max);
  num.value = uiVal;

  const range = setElem.querySelector(`.func_range[data-param="${paramName}"]`);
  if (range) {
    range.value = uiVal;
  }
}

function fillHsvBlockFromConfig(key, cfgBlock) {
  const block = document.querySelector(`.hsv_block[data-key="${key}"]`);
  if (!block || !cfgBlock) return;

  const select = block.querySelector('.hsv_func_select');
  if (!select) return;

  let funcName = "none";
  for (const [name, code] of Object.entries(FUNC_CODE)) {
    if (code === cfgBlock.func) {
      funcName = name;
      break;
    }
  }

  select.value = funcName;

  select.dispatchEvent(new Event('change'));

  // 找當前這個 function 的 set
  const set = block.querySelector(`.hsv_func_params[data-func="${funcName}"]`);
  if (!set) return;

  // 還原 range / lower
  setParamFrom255(set, `${key}_range`, cfgBlock.range);
  setParamFrom255(set, `${key}_lower`, cfgBlock.lower);

  // 還原各 func 的 p1/p2
  switch (cfgBlock.func) {
    case 1: // Const: p1 = value
      setParamFrom255(set, `${key}_value`, cfgBlock.p1);
      break;
    case 2: // Ramp: p1 = upper
    case 3: // Tri:  p1 = upper
      setParamFrom255(set, `${key}_upper`, cfgBlock.p1);
      break;
    case 4: // Pulse: p1 = top
      setParamFrom255(set, `${key}_top`, cfgBlock.p1);
      break;
    case 5: // Step: p1 = height, p2 = step
      setParamFrom255(set, `${key}_height`, cfgBlock.p1);
      setParamFrom255(set, `${key}_step`,   cfgBlock.p2);
      break;
  }
}

function setExtraNumber(extraName, value255, min, max) {
  const group = document.querySelector(`[data-extra="${extraName}"]`);
  if (!group) return;

  const num = group.querySelector('.param_number');
  if (!num) return;

  const uiVal = from255(value255, min, max);
  num.value = uiVal;

  const range = group.querySelector('.param_range');
  if (range) {
    range.value = uiVal;
  }
}

function applyExtrasFromPFields(modeStr, p1, p2, p3, p4) {
  switch (modeStr) {
    case "MODES_SQUARE":
      setExtraNumber("boxsize", p3, 0, 300);
      break;

    case "MODES_SICKLE":
      setExtraNumber("position_fix", p1, 0, 255);
      setExtraNumber("curvature",    p3, 0, 100);
      setExtraNumber("length",       p4, 0, 300);
      break;

    case "MODES_FAN":
      setExtraNumber("curvature",   p1, 0, 100);
      setExtraNumber("bladeCount",  p3, 0, 12);
      setExtraNumber("length",      p4, 0, 300);
      break;

    case "MODES_BOXES":
      setExtraNumber("boxsize", p3, 0, 300);
      setExtraNumber("space",   p4, 0, 100);
      break;

    case "MODES_CMAP_DNA":
    case "MODES_CMAP_LOVE":
    case "MODES_MAP_ES":
    case "MODES_MAP_ES_ZH":
    case "MODES_MAP_ESXOPT":
    case "MODES_MAP_ES_ZH": {
      setExtraNumber("reverse", p1, 0, 1);
      setExtraNumber("space", p4, 0, 100);
      break;
    }

    case "MODES_CMAP_FIRE":
    case "MODES_CMAP_GEAR":
      setExtraNumber("space", p4, 0, 100);
      break;
  }
}

function applyPresetToUI(preset) {
  if (!preset) return;

  const modeStr = preset.mode || "MODES_PLAIN";
  currentModeStr = modeStr;   

  const cnName  = MODE_MAP_INV[modeStr] || "純色";
  window.currentEffectName = cnName; 

  ensureParamPanelVisible();

  const extras = MODE_EXTRAS[modeStr] || [];
  extraGroups.forEach(g => {
    const key = g.dataset.extra;
    g.style.display = extras.includes(key) ? "block" : "none";
  });

  if (modeStr === "MODES_CLEAR") {
    paramMain.classList.add('hidden');
  } else {
    paramMain.classList.remove('hidden');
  }

  fillHsvBlockFromConfig("XH", preset.XH);
  fillHsvBlockFromConfig("XS", preset.XS);
  fillHsvBlockFromConfig("XV", preset.XV);
  fillHsvBlockFromConfig("YH", preset.YH);
  fillHsvBlockFromConfig("YS", preset.YS);
  fillHsvBlockFromConfig("YV", preset.YV);

  applyExtrasFromPFields(modeStr, preset.p1, preset.p2, preset.p3, preset.p4);
}
// 建立小方塊
function createCustomAssetElement(preset) {
  const div = document.createElement('div');
  div.className = 'Asset_item Asset_item--custom';
  div.dataset.customId = preset._id;
  div.setAttribute('draggable', true);
  const modeLabel = (preset.mode || "").replace(/^MODES_/, "");
  div.textContent = `[自訂] ${modeLabel}`;

  div.addEventListener('click', () => {
    document.querySelectorAll('.Asset_item').forEach(it => it.classList.remove('active'));
    div.classList.add('active');

    // 記錄目前選中的自訂義
    currentCustomPresetId = preset._id;
    setCustomButtonsEnabled(true);

    applyPresetToUI(preset);
  });

  return div;
}

function reloadCustomPresetsUI() {
  const container = document.querySelector('.Asset_library_content.custom');
  if (!container) return;

  const list = loadCustomPresets();
  container.innerHTML = "";

  list.forEach(preset => {
    const item = createCustomAssetElement(preset);
    container.appendChild(item);

    // 如果這顆就是 currentCustomPresetId，就讓它保持亮
    if (preset._id === currentCustomPresetId) {
      item.classList.add('active');
    }
  });

  // 如果沒有任何自訂義，就把按鈕關閉
  if (!list.length) {
    currentCustomPresetId = null;
    setCustomButtonsEnabled(false);
  }
}


// 綁定按鈕
function addCurrentToCustomLibrary() {
  const cfg = buildEffectConfigFromUI(); 
  const preset = {
    _id: genPresetId(),
    ...cfg
  };

  const list = loadCustomPresets();
  list.push(preset);
  saveCustomPresets(list);

  // 新增完，視為選中這個 preset
  currentCustomPresetId = preset._id;
  setCustomButtonsEnabled(true);
  reloadCustomPresetsUI();
}

// 綁定新增按鈕
if (btnAddCustom) {
  btnAddCustom.addEventListener('click', addCurrentToCustomLibrary);
}

// 刪除與修改自定義
function updateCurrentCustomPreset() {
  if (!currentCustomPresetId) return; 

  const list = loadCustomPresets();
  const idx = list.findIndex(p => p._id === currentCustomPresetId);
  if (idx === -1) return;

  // 讀現在 UI 的設定
  const cfg = buildEffectConfigFromUI();

  // 保留原本 _id，其他用新的設定覆蓋
  list[idx] = { _id: currentCustomPresetId, ...cfg };
  saveCustomPresets(list);

  reloadCustomPresetsUI();
}

// 綁定按鈕
if (btnUpdateCustom) {
  btnUpdateCustom.addEventListener('click', updateCurrentCustomPreset);
}

function deleteCurrentCustomPreset() {
  if (!currentCustomPresetId) return;

  let list = loadCustomPresets();
  const idx = list.findIndex(p => p._id === currentCustomPresetId);
  if (idx === -1) return;

  list.splice(idx, 1);
  saveCustomPresets(list);

  currentCustomPresetId = null;
  setCustomButtonsEnabled(false);
  reloadCustomPresetsUI();

  resetAllParams();
  paramMain.classList.add('hidden');
  paramEmpty.style.display = 'block';
}

if (btnDeleteCustom) {
  btnDeleteCustom.addEventListener('click', deleteCurrentCustomPreset);
}

//  JSON 匯出功能 (Export to JSON)

function generateProjectJson() {
  // 匯出時偵測到有第n層的資料，就自動push進canvases
  const canvases = [asset_canvas1];
  if (asset_canvas2) canvases.push(asset_canvas2);
  if (asset_canvas3) canvases.push(asset_canvas3);
  if (asset_canvas4) canvases.push(asset_canvas4);
  if (asset_canvas5) canvases.push(asset_canvas5);
  if (asset_canvas6) canvases.push(asset_canvas6);
  // 掃描畫布來更新 globalEffectData 的幾何資訊
  const targetCanvases = [asset_canvas1, asset_canvas2, asset_canvas3, asset_canvas4, asset_canvas5, asset_canvas6];
  targetCanvases.forEach((canvas, index) => {
    if(!canvas) return;
    const currentLayer = index + 1; // canvas1 => layer 1, canvas2 => layer 2
    canvas.getObjects().forEach(obj => {
      if (obj.logicBlock && obj.logicBlock.id) {
        // 計算 startTime/duration
        const id = obj.logicBlock.id;
        // 計算目前的正確時間 (防止負值)
        let currentStartTime = timelineOffset + obj.left * secondsPerPixel;
        if (currentStartTime < 0) currentStartTime = 0;
        // 計算目前的正確長度
        // 寬度 * 縮放比例 * 每像素秒數
        let currentDuration = (obj.width * obj.scaleX) * secondsPerPixel;
        // 順便更新它在哪一層 (Layer)
        if(window.globalEffectData[id]) {
          window.globalEffectData[id].layer = currentLayer;
          window.globalEffectData[id].startTime = currentStartTime;
          window.globalEffectData[id].duration = currentDuration;
        }
      }
    });
  });
  // 取出所有方塊數據並轉為陣列
  const allBlocks = Object.values(window.globalEffectData || {});

  // 根據 startTime 排序 (由早到晚)
  const layer1Blocks = allBlocks.filter(b => b.layer === 1).sort((a, b) => a.startTime - b.startTime);
  const layer2Blocks = allBlocks.filter(b => b.layer === 2).sort((a, b) => a.startTime - b.startTime);
  const layer3Blocks = allBlocks.filter(b => b.layer === 3).sort((a, b) => a.startTime - b.startTime);
  const layer4Blocks = allBlocks.filter(b => b.layer === 4).sort((a, b) => a.startTime - b.startTime);
  const layer5Blocks = allBlocks.filter(b => b.layer === 5).sort((a, b) => a.startTime - b.startTime);
  const layer6Blocks = allBlocks.filter(b => b.layer === 6).sort((a, b) => a.startTime - b.startTime);
  // 轉換格式
  const exportData = (block) => {
    // 宣告變數並給予預設值
    let modeStr = "MODES_CLEAR";
    // 從 MODE_MAP 找中文名稱對應的 Key
    if (block.name) {
      modeStr = MODE_MAP[block.name];
    }
    console.log(`[處理中] ID:${block.id || '?'} | 原始名字: "${block.name}" `);
    // 時間轉換 (秒 -> 毫秒)
    const startTimeMs = Math.round((block.startTime || 0) * 1000);
    const durationMs = Math.round((block.duration || 0) * 1000);

    // HSV 打包 helper
    const packHsv = (prefix) => {
      const funcStr = block[`${prefix}_func`] || "none";
      const funcCode = FUNC_CODE[funcStr] || 0;
      // 判斷最大值
      const isHue = prefix.includes('H'); 
      const maxVal = isHue ? 359 : 100;
      // 讀取數值 (如果沒有該欄位則預設 0)
      const originalRange = block[`${prefix}_range`] || 0;
      const originalLower = block[`${prefix}_lower`] || 0;
      if (prefix.startsWith('Y')) {
          // 如果是 Y 軸，直接儲存原始數值
          range = Number(originalRange);
      } else {
          // 如果是 X 軸，維持原本的 0-255 正規化
          range = normalizeTo255(originalRange, 0, maxVal);
      }
      const lower = normalizeTo255(originalLower, 0, maxVal);
      let p1 = 0, p2 = 0;

      // 根據 Function 決定 p1, p2 來源
      // 邏輯參照原本的 packHsvBlock
      if (funcCode === 1) { // Const
        const originalValue  = block[`${prefix}_value`] || 0;
        p1 = normalizeTo255(originalValue, 0, maxVal);
      }
       else if (funcCode === 2 || funcCode === 3) { // Ramp, Tri
        const originalUpper = block[`${prefix}_upper`] || 0;
        p1 = normalizeTo255(originalUpper, 0, maxVal);
      }
       else if (funcCode === 4) { // Pulse
        const originalTop = block[`${prefix}_top`] || 0;
        p1 = normalizeTo255(originalTop, 0, maxVal);
        } 
      else if (funcCode === 5) { // Step
        const originalHeight = block[`${prefix}_height`] || 0;
        p1 = normalizeTo255(originalHeight, 0, maxVal);
        p2 = block[`${prefix}_step`] || 0;
        }
      return { func: funcCode, range, lower, p1, p2 };
        };

        // P1-P4 額外參數打包 helper
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        
        // 讀取原始數值 (raw values)
        const bladeCount = block.bladeCount || 0;
        const length     = block.length || 0;
        const curvature  = block.curvature || 0;
        const boxsize    = block.boxsize || 0;
        const space      = block.space || 0;
        const positionFix= block.position_fix || 0;
        const reverse    = block.reverse || 0;

        // 根據模式填入 p1~p4
        switch (modeStr) {
            case "MODES_SQUARE":
                p3 = boxsize;
                break;
            case "MODES_SICKLE":
                p1 = positionFix;
                p3 = curvature;
                p4 = length;
                break;
            case "MODES_FAN":
                p1 = curvature;
                p3 = bladeCount;
                p4 = length;
                break;
            case "MODES_BOXES":
                p3 = boxsize;
                p4 = space;
                break;
            case "MODES_CMAP_DNA":
            case "MODES_CMAP_LOVE":
            case "MODES_MAP_ES":
            case "MODES_MAP_ES_ZH":
            case "MODES_MAP_ESXOPT":
            case "MODES_MAP_ES_ZH":
                p1 = reverse >= 1 ? 255 : 0;
                p4 = space;
                break;
            case "MODES_CMAP_FIRE":
            case "MODES_CMAP_GEAR":
                p4 = space;
                break;
        }

        // 回傳符合目標格式的物件
        return {
            mode: modeStr,
            start_time: startTimeMs,
            duration: durationMs,
            XH: packHsv("XH"),
            XS: packHsv("XS"),
            XV: packHsv("XV"),
            YH: packHsv("YH"),
            YS: packHsv("YS"),
            YV: packHsv("YV"),
            p1, p2, p3, p4
        };
    };
    // 先產生完整的 6 軌資料列表
    const fullList = [
        layer1Blocks.map(exportData),
        layer2Blocks.map(exportData),
        layer3Blocks.map(exportData),
        layer4Blocks.map(exportData),
        layer5Blocks.map(exportData),
        layer6Blocks.map(exportData),
    ];

    // 去除空陣列
    // 從陣列最後面開始檢查，如果是空的就移除 (pop)，直到遇到有資料的軌道為止
    // 這樣做可以保留中間的空軌 (例如: [[軌1], [], [軌3]]) 以維持索引正確
    while (fullList.length > 0 && fullList[fullList.length - 1].length === 0) {
        fullList.pop();
    }

    return fullList;
}

// 綁定按鈕事件
let currentJsonName = null;
const btnExport = document.getElementById('btn_export_json');

if (btnExport) {
    // 這裡加上 async 因為 showSaveFilePicker 是非同步的
    btnExport.addEventListener('click', async () => {
        
        // 生成資料
        const data = generateProjectJson();
        const jsonStr = JSON.stringify(data, null, 2); // 美化縮排

        // 嘗試使用現代 API (跳出「另存新檔」視窗)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'effect_project.json', // 預設檔名
                    types: [{
                        description: 'JSON Project File',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                
                // 使用者選好位置後，寫入檔案
                const writable = await handle.createWritable();
                await writable.write(jsonStr);
                await writable.close();
                
                console.log(`[匯出成功] 檔案已儲存`);

                const savedName = handle.name; // handle 會包含使用者實際取的檔名
                await syncFileToServer(savedName);

                return; // 成功後直接結束
            } catch (err) {
                // 如果使用者按「取消」就不做任何事
                if (err.name === 'AbortError') return;
                console.warn("SaveFilePicker 失敗或不支援，改用舊方法下載", err);
            }
        }

        // 如果 API 不支援，則詢問檔名並下載
        const userFilename = prompt("請輸入檔案名稱 (無需副檔名):", "effect_project");
        if (!userFilename) return; // 使用者按取消

        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `${userFilename}.json`; // 使用輸入的檔名
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`[匯出成功] 下載至預設資料夾`);

        await syncFileToServer(fullFileName);
    });
}
// JSON 匯入功能 (Import from JSON)

// HSV 參數解包器 (將 JSON 結構轉回平面參數)
function unpackHsvToParams(prefix, hsvData) {
    if (!hsvData) return {};
    const params = {};
    
    // 反查 Function 代碼
    const FUNC_CODE_INV = {
        0: "none", 1: "const", 2: "ramp", 3: "tri", 4: "pulse", 5: "step"
    };
    const funcName = FUNC_CODE_INV[hsvData.func] || "none";
    
    params[`${prefix}_func`] = funcName;

    // 定義正確的最大值：
    const isHue = prefix.endsWith('H'); 
    const maxVal = isHue ? 359 : 100;
    // 輔助函式：從 255 反推
    const f = (v255, max) => from255(v255, 0, max);

    if (prefix.startsWith('Y')) {
        // 如果是 Y 軸，直接使用 JSON 裡的數值，不經過轉換
        params[`${prefix}_range`] = hsvData.range || 0;
    } else {
        // 如果是 X 軸，使用 f() 從 0-255 反推回原始區間
        params[`${prefix}_range`] = f(hsvData.range, maxVal) || 0;
    }
    params[`${prefix}_lower`] = f(hsvData.lower, maxVal) || 0;
    
    // 根據 Function 還原特定欄位
    const p1 = hsvData.p1 || 0;
    const p2 = hsvData.p2 || 0;

    switch (hsvData.func) {
        case 1: // Const (p1=value)
            params[`${prefix}_value`] = f(p1, maxVal);
            break;
        case 2: // Ramp (p1=upper)
        case 3: // Tri
            params[`${prefix}_upper`] = f(p1, maxVal);
            break;
        case 4: // Pulse (p1=top)
            params[`${prefix}_top`] = f(p1, maxVal);
            break;
        case 5: // Step (p1=height, p2=step)
            params[`${prefix}_height`] = f(p1, maxVal);
            params[`${prefix}_step`] = p2;
            break;
    }
    return params;
}

// 額外參數解包器 (將 p1~p4 轉回 bladeCount, length...)
function unpackExtrasToParams(modeStr, p1, p2, p3, p4) {
    const params = {};
    switch (modeStr) {
        case "MODES_SQUARE":
            params.boxsize = p3;
            break;
        case "MODES_SICKLE":
            params.position_fix = p1;
            params.curvature    = p3;
            params.length       = p4;
            break;
        case "MODES_FAN":
            params.curvature  = p1;
            params.bladeCount = p3;
            params.length     = p4;
            break;
        case "MODES_BOXES":
            params.boxsize = p3;
            params.space   = p4;
            break;
        case "MODES_CMAP_DNA":
        case "MODES_CMAP_LOVE":
        case "MODES_MAP_ES":
        case "MODES_MAP_ES_ZH":
        case "MODES_MAP_ESXOPT":
        case "MODES_MAP_ES_ZH":
            params.reverse = (p1 >= 128)? 1:0; // Boolean
            params.space   = p4;
            break;
        case "MODES_CMAP_FIRE":
        case "MODES_CMAP_GEAR":
            params.space = p4;
            break;
    }
    return params;
}

// 主要匯入函式
function importProjectFromJson(jsonArray) {
    if (!Array.isArray(jsonArray)) {
        alert("格式錯誤：JSON 必須是陣列");
        return;
    }

    // 刪除所有方塊
    
    if(asset_canvas1) asset_canvas1.clear();
    if(asset_canvas2) asset_canvas2.clear();
    if(asset_canvas3) asset_canvas3.clear();
    if(asset_canvas4) asset_canvas4.clear();
    if(asset_canvas5) asset_canvas5.clear();
    if(asset_canvas6) asset_canvas6.clear();
    // 重設全域變數
    window.globalEffectData = {};
    currentEditingId = null;
        
    // 隱藏參數面板
    if (paramEmpty) paramEmpty.style.display = 'block'; 
    if (paramMain) paramMain.classList.add('hidden');

    // 取得 DOM 元素
    const t2c = document.getElementById('track2Container');
    const btn2 = document.getElementById('btnAddTrack2');
    const t3c = document.getElementById('track3Container');
    const btn3 = document.getElementById('btnAddTrack3');
    const t4c = document.getElementById('track4Container');
    const btn4 = document.getElementById('btnAddTrack4');
    const t5c = document.getElementById('track5Container');
    const btn5 = document.getElementById('btnAddTrack5');
    const t6c = document.getElementById('track6Container');
    const btn6 = document.getElementById('btnAddTrack6');
    // 自動處理 軌道 2 (有資料開，沒資料關)
    const layer2Data = jsonArray[1];
    const hasLayer2 = layer2Data && layer2Data.length > 0;
    if (hasLayer2) {
        // 開啟模式 
        if (t2c) t2c.style.display = 'block';     // 顯示畫布容器
        if (btn2) btn2.style.display = 'none';    // 隱藏「新增軌道2」按鈕

        // 因為軌道 2 開了，所以「新增軌道 3」的按鈕預設要出現 (除非軌道 3 也開了，下面會判斷)
        if (btn3) btn3.style.display = 'block';
        if (btn4) btn4.style.display = 'none';    // 隱藏「新增軌道4」按鈕
        if (!asset_canvas2) {
            console.log("自動開啟軌道 2...");
            initAsset2Fabric(); 
        } else {
            // 如果畫布本來就開著，清空它準備放新資料
            asset_canvas2.clear(); 
        }
    } 
    else {
        // 關閉模式
        // 匯入的檔沒有軌道 2，所以把介面收起來
        if (t2c) t2c.style.display = 'none';      // 隱藏畫布容器
        if (btn2) btn2.style.display = 'block';   // 顯示「新增軌道2」按鈕
        
        // 既然軌道 2 都沒了，軌道 3 的按鈕當然也要藏起來
        if (btn3) btn3.style.display = 'none';
        if (btn4) btn4.style.display = 'none';    // 隱藏「新增軌道4」按鈕
        // 雖然隱藏了，但建議把內容清空，以免下次打開還有舊資料
        if (asset_canvas2) asset_canvas2.clear();
    }

    // 自動處理 軌道 3 (有資料開，沒資料關)
    const layer3Data = jsonArray[2];
    const hasLayer3 = layer3Data && layer3Data.length > 0;

    if (hasLayer3) {
        // 開啟模式
        if (t3c) t3c.style.display = 'block';     // 顯示畫布容器
        if (btn3) btn3.style.display = 'none';    // 隱藏「新增軌道3」按鈕 (因為已經開了)
        if (btn4) btn4.style.display = 'block';    

        if (!asset_canvas3) {
            console.log("自動開啟軌道 3...");
            initAsset3Fabric(); 
        } else {
            asset_canvas3.clear();
        }
    } else {
        // 關閉模式
        // 匯入的檔沒有軌道 3，把介面收起來
        if (t3c) t3c.style.display = 'none';      // 隱藏畫布容器
        
        // 這裡要判斷按鈕顯示狀態：
        // 如果軌道 2 是開的 (hasLayer2 為 true)，那「新增軌道 3」按鈕應該要顯示出來讓使用者按
        // 如果軌道 2 也是關的，那這個按鈕就繼續隱藏
        if (btn3) {
            btn3.style.display = hasLayer2 ? 'block' : 'none';
        }
        if (btn4) btn4.style.display = 'none';    // 隱藏「新增軌道4」按鈕

        if (asset_canvas3) asset_canvas3.clear();
    }

    // 自動處理 軌道 4 (有資料開，沒資料關)
    const layer4Data = jsonArray[3];
    const hasLayer4 = layer4Data && layer4Data.length > 0;

    if (hasLayer4) {
        // 開啟模式
        if (t4c) t4c.style.display = 'block';     // 顯示畫布容器
        if (btn4) btn4.style.display = 'none';    // 隱藏「新增軌道4」按鈕
        if (btn5) btn5.style.display = 'block';
        if (!asset_canvas4) {
            console.log("自動開啟軌道 4...");
            initAsset4Fabric(); 
        } else {
            asset_canvas4.clear();
        }
    } else {
        // 關閉模式
        // 匯入的檔沒有軌道 4，把介面收起來
        if (t4c) t4c.style.display = 'none';      // 隱藏畫布容器
        
        // 這裡要判斷按鈕顯示狀態：
        // 如果軌道 3 是開的 (hasLayer3 為 true)，那「新增軌道 4」按鈕應該要顯示出來讓使用者按
        // 如果軌道 3 也是關的，那這個按鈕就繼續隱藏
        if (btn4) {
            btn4.style.display = hasLayer3 ? 'block' : 'none';
        }

        if (asset_canvas4) asset_canvas4.clear();
    }

    // 自動處理 軌道 5 (有資料開，沒資料關)
    const layer5Data = jsonArray[4];
    const hasLayer5 = layer5Data && layer5Data.length > 0;

    if (hasLayer5) {
        // 開啟模式
        if (t5c) t5c.style.display = 'block';     // 顯示畫布容器
        if (btn5) btn5.style.display = 'none';    // 隱藏「新增軌道5」按鈕
        if (btn6) btn6.style.display = 'block';

        if (!asset_canvas5) {
            console.log("自動開啟軌道 5...");
            initAsset5Fabric(); 
        } else {
            asset_canvas5.clear();
        }
    } else {
        // 關閉模式
        // 匯入的檔沒有軌道 4，把介面收起來
        if (t5c) t5c.style.display = 'none';      // 隱藏畫布容器
        
        // 這裡要判斷按鈕顯示狀態：
        // 如果軌道 4 是開的 (hasLayer4 為 true)，那「新增軌道 5」按鈕應該要顯示出來讓使用者按
        // 如果軌道 4 也是關的，那這個按鈕就繼續隱藏
        if (btn5) {
            btn5.style.display = hasLayer4 ? 'block' : 'none';
        }

        if (asset_canvas5) asset_canvas5.clear();
    }

    // 自動處理 軌道 6 (有資料開，沒資料關)
    const layer6Data = jsonArray[5];
    const hasLayer6 = layer6Data && layer6Data.length > 0;

    if (hasLayer6) {
        // 開啟模式
        if (t6c) t6c.style.display = 'block';     // 顯示畫布容器
        if (btn6) btn6.style.display = 'none';    // 隱藏「新增軌道6」按鈕

        if (!asset_canvas6) {
            console.log("自動開啟軌道 6...");
            initAsset6Fabric(); 
        } else {
            asset_canvas6.clear();
        }
    } else {
        // 關閉模式
        // 匯入的檔沒有軌道 5，把介面收起來
        if (t6c) t6c.style.display = 'none';      // 隱藏畫布容器
        
        // 這裡要判斷按鈕顯示狀態：
        // 如果軌道 5 是開的 (hasLayer5 為 true)，那「新增軌道 6」按鈕應該要顯示出來讓使用者按
        // 如果軌道 5 也是關的，那這個按鈕就繼續隱藏
        if (btn6) {
            btn6.style.display = hasLayer5 ? 'block' : 'none';
        }

        if (asset_canvas6) asset_canvas6.clear();
    }

    // 定義單個軌道的還原函式
    const restoreTrack = (trackData, targetCanvas, layerId) => {
        if (!trackData || !targetCanvas) return;

        trackData.forEach(blockData => {
            const modeStr = blockData.mode || "MODES_PLAIN";
            const assetName = MODE_MAP_INV[modeStr] || "純色";
            const currentId = globalAssetIdCounter++;
            
            const startTimeSec = (blockData.start_time || 0) / 1000;
            const durationSec  = (blockData.duration || 0) / 1000;

            let restoredParams = {};
            
            // 解包 HSV
            ["XH", "XS", "XV", "YH", "YS", "YV"].forEach(key => {
                Object.assign(restoredParams, unpackHsvToParams(key, blockData[key]));
            });
            // 解包 Extras
            Object.assign(restoredParams, unpackExtrasToParams(modeStr, blockData.p1, blockData.p2, blockData.p3, blockData.p4));

            // 寫入資料庫 (強制指定 layer)
            window.globalEffectData[currentId] = {
                ...restoredParams,
                id: currentId,
                name: assetName,
                startTime: startTimeSec,
                duration: durationSec,
                layer: layerId 
            };
            // 建立並渲染方塊
            const newBlock = new EffectBlock(currentId, assetName);
            //newBlock.params = restoredParams;
            newBlock.startTime = startTimeSec;
            newBlock.duration = durationSec;

            const targetX = (startTimeSec - timelineOffset) / secondsPerPixel;
            const centerY = targetCanvas.getHeight() / 2;
            const group = newBlock.render(targetCanvas, targetX, centerY);

            newBlock.updateDimensionsFromTime(); // 確保長度正確
            group.setCoords();
        });
        
        targetCanvas.requestRenderAll();
    };
    // 4. 執行還原：索引0 -> 畫布1，索引1 -> 畫布2
    if (jsonArray[0]) restoreTrack(jsonArray[0], asset_canvas1, 1);
    if (jsonArray[1]) restoreTrack(jsonArray[1], asset_canvas2, 2);
    if (jsonArray[2]) restoreTrack(jsonArray[2], asset_canvas3, 3);
    if (jsonArray[3]) restoreTrack(jsonArray[3], asset_canvas4, 4);
    if (jsonArray[4]) restoreTrack(jsonArray[4], asset_canvas5, 5);
    if (jsonArray[5]) restoreTrack(jsonArray[5], asset_canvas6, 6);
    console.log(`[匯入成功] 已還原軌道資料`);
    
}

// 綁定匯入按鈕事件
const btnImport = document.getElementById('btn_import_json');
const fileInputImport = document.getElementById('import_file_input');

if (btnImport && fileInputImport) {
    // 點擊按鈕觸發 input
    btnImport.addEventListener('click', () => {
        fileInputImport.value = ''; // 清空以允許重複選同一檔
        fileInputImport.click();
    });

    // 檔案選擇後處理
    fileInputImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const rawData = JSON.parse(evt.target.result);
                let finalData = [];

                // 檢查是否為陣列
                if (Array.isArray(rawData)) {
                    
                    // 偵測是否為 2D 陣列 (檢查第一個元素是不是也是陣列)
                    if (rawData.length > 0 && Array.isArray(rawData[0])) {
                        
                        importProjectFromJson(rawData);
                    } 
                    // 否則就是標準的 1D 陣列
                    else {
                        finalData = rawData;
                        importProjectFromJson([rawData, []]);
                    }
                    
                    syncFileToServer(fileName);
                } else {
                    // 如果根本不是陣列 (例如是單純的 Object)
                    alert("匯入失敗：JSON 格式不符 (根節點必須是 Array)");
                    console.error("收到錯誤格式:", rawData);
                }

            } catch (err) {
                console.error("JSON 解析失敗", err);
                alert("匯入失敗：檔案格式錯誤或損毀");
            }
        };
        reader.readAsText(file);
    });
}

async function syncFileToServer(fileName) {
    console.log(`準備通知 Server 切換為新匯出的檔案: ${fileName}`);

    try {
        const res = await fetch('/update_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: fileName })
        });

        if (res.ok) {
            console.log("Server 同步成功！");
            if (typeof currentJsonName !== 'undefined') {
                currentJsonName = fileName;
            }
        } else {
            const text = await res.text();
            console.warn("Server 收到檔名但回報錯誤 (可能是檔案尚未存入 Server 資料夾):", text);
        }
    } catch (err) {
        console.error("無法傳送檔名給 Server:", err);
    }
}


// 控制面板邏輯

const NUM_LUX_DEVICES = 5; // 燈具數量
const row2Container = document.querySelector('.row2');
const controlListContainer = document.getElementById('control_list_container');
let controlPollingInterval = null;

// 1. 監聽 Tab 切換 (包含版面變形)
document.querySelectorAll('.param_tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        
        // UI Tab 切換
        document.querySelectorAll('.param_tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.param_body').forEach(b => {
            b.classList.toggle('active', b.classList.contains(`param_body--${mode}`));
        });

        // 版面變形與資料輪詢
        if (mode === 'control') {
            row2Container.classList.add('mode-control'); // 觸發 CSS 變形
            startControlPolling(); // 開始跟 Server 要資料
        } else {
            row2Container.classList.remove('mode-control'); // 還原
            stopControlPolling(); // 停止要資料
        }
    });
});

// 2. 初始化列表 UI
function initControlPanelUI() {
    const container = document.getElementById('control_list_container');
    if (!container) return;
    
    container.innerHTML = '';

    for (let i = 0; i < NUM_LUX_DEVICES; i++) {
        const row = document.createElement('div');
        row.className = 'control_row';
        row.innerHTML = `
            <div class="col-id">${i + 1}</div>
            
            <div class="col-state"><span class="state_text disconnected" id="state_${i + 1}">斷線</span></div>
            <div class="col-time"><span class="time_text" id="time_${i + 1}">--</span></div>
            
            <div class="col-mode">
                <select class="mode_select" onchange="updateLuxMode(${i}, this.value)">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </div>
            
            <div class="col-rst">
                <input type="checkbox" class="rst_check" onchange="triggerReset(${i}, this)">
            </div>
        `;
        container.appendChild(row);
    }
}


// 3. 呼叫 Server API

const ENUM_MODES = [
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
    "MODES_MAP_ESXOPT",
    "MODES_CMAP_BENSON",
    "MODES_CMAP_YEN"
]

function getModeName(index) {
    const i = parseInt(index);
    if (i >= 0 && i < ENUM_MODES.length) {
        return ENUM_MODES[i].substring(6); 
    }
    return "Unknown";
}

// 輪詢狀態 (/get_stat)
async function updateControlStatus() {
    const now = Date.now();

    for (let i = 0; i < NUM_LUX_DEVICES; i++) {

        const stateEl = document.getElementById(`state_${i+1}`);
        const statusEl = document.getElementById(`time_${i+1}`); 

        if (!stateEl || !statusEl) continue;

        try {
            const statRes = await fetch("/get_stat?id=" + i);
            if (statRes.ok) {
                const data = await statRes.text();
                const lastTime = parseInt(data);

                if (now - lastTime < 1000) {
                    stateEl.textContent = "已連線";
                    stateEl.className = "state_text connected";
                } else {
                    stateEl.textContent = "斷線";
                    stateEl.className = "state_text disconnected";
                }
            }
        } catch (e) {
            console.error(e);
        }
        try {
            const lightRes = await fetch("/get_light?id=" + i);
            if (lightRes.ok) {
                const data = await lightRes.text(); 
                
                const modeName = getModeName(data);
                
                statusEl.textContent = modeName;

                if (modeName === "Unknown") {
                    statusEl.style.color = "#555";
                } else {
                    statusEl.style.color = "#ffcc00"; // 亮黃色
                    statusEl.style.fontWeight = "bold";
                }
            }
        } catch (e) {
            console.error(e);
        }

        /*
        // 同步模式
        const modeSelect = document.querySelector(`.control_row[data-id="${i}"] .mode_select`);
        if (modeSelect) {
            fetch(`/update_lux_mode?id=${i}&mode=${modeSelect.value}`).catch(()=>{});
        }

        // 同步 Reset (注意：這可能會讓 checkbox 一直被送出)
        const rstCheck = document.querySelector(`.control_row[data-id="${i}"] .rst_check`);
        if (rstCheck) {
            fetch(`/update_lux_reset?id=${i}&clear=${rstCheck.checked}`).catch(()=>{});
        }
        */
    }
}

// 更新模式 (/update_lux_mode)
window.updateLuxMode = function(id, modeVal) {
    fetch(`/update_lux_mode?id=${id}&mode=${modeVal}`)
        .then(res => res.text())
        .then(txt => console.log("Mode update:", txt))
        .catch(err => console.error(err));
};

// 更新重置 (/update_lux_reset)
window.triggerReset = function(id, checkbox) {
    const isChecked = checkbox.checked;
    fetch(`/update_lux_reset?id=${id}&clear=${isChecked}`)
        .then(res => res.text())
        .then(txt => console.log("Reset update:", txt))
        .catch(err => console.error(err));
};

// 4. 啟動器
function startControlPolling() {
    if (controlPollingInterval) return;
    updateControlStatus();
    controlPollingInterval = setInterval(updateControlStatus, 1000);
}

function stopControlPolling() {
    if (controlPollingInterval) {
        clearInterval(controlPollingInterval);
        controlPollingInterval = null;
    }
}

// 初始化 UI
initControlPanelUI();
//新增效果畫布按鈕
const btnAddTrack2 = document.getElementById('btnAddTrack2');
const track2Container = document.getElementById('track2Container');
const btnAddTrack3 = document.getElementById('btnAddTrack3');
const track3Container = document.getElementById('track3Container');
const btnAddTrack4 = document.getElementById('btnAddTrack4');
const track4Container = document.getElementById('track4Container');
const btnAddTrack5 = document.getElementById('btnAddTrack5');
const track5Container = document.getElementById('track5Container');
const btnAddTrack6 = document.getElementById('btnAddTrack6');
const track6Container = document.getElementById('track6Container');
if (btnAddTrack2 && track2Container) {
    btnAddTrack2.addEventListener('click', () => {
      //  顯示容器 (先顯示，讓瀏覽器算出寬度)
      track2Container.style.display = 'block';
        
      // 隱藏按鈕 (避免重複按)
      btnAddTrack2.style.display = 'none';
      // 當軌道 2 開啟後，顯示「新增軌道 3」按鈕
        if (btnAddTrack3) btnAddTrack3.style.display = 'block';
      // 檢查是否已經初始化過，沒有才執行
      if (!asset_canvas2) {
        setTimeout(() => {
            initAsset2Fabric();
            console.log("軌道 2 已啟用");
        }, 10);
      }
    });
}

// 新增軌道 3 的點擊事件
if (btnAddTrack3 && track3Container) {
    btnAddTrack3.addEventListener('click', () => {
        track3Container.style.display = 'block';
        btnAddTrack3.style.display = 'none';
        // 當軌道 3 開啟後，顯示「新增軌道 4」按鈕
        if (btnAddTrack4) btnAddTrack4.style.display = 'block';
        if (!asset_canvas3) {
            setTimeout(() => {
                initAsset3Fabric();
                console.log("軌道 3 已啟用");
            }, 10);
        }
    });
}
// 新增軌道 4 的點擊事件
if (btnAddTrack4 && track4Container) {
    btnAddTrack4.addEventListener('click', () => {
        track4Container.style.display = 'block';
        btnAddTrack4.style.display = 'none';
        // 當軌道 4 開啟後，顯示「新增軌道 5」按鈕
        if (btnAddTrack5) btnAddTrack5.style.display = 'block';
        if (!asset_canvas4) {
            setTimeout(() => {
                initAsset4Fabric();
                console.log("軌道 4 已啟用");
            }, 10);
        }
    });
}
// 新增軌道 5 的點擊事件
if (btnAddTrack5 && track5Container) {
    btnAddTrack5.addEventListener('click', () => {
        track5Container.style.display = 'block';
        btnAddTrack5.style.display = 'none';
        // 當軌道 5 開啟後，顯示「新增軌道 6」按鈕
        if (btnAddTrack6) btnAddTrack6.style.display = 'block';
        if (!asset_canvas5) {
            setTimeout(() => {
                initAsset5Fabric();
                console.log("軌道 5 已啟用");
            }, 10);
        }
    });
}
// 新增軌道 6 的點擊事件
if (btnAddTrack6 && track6Container) {
    btnAddTrack6.addEventListener('click', () => {
        track6Container.style.display = 'block';
        btnAddTrack6.style.display = 'none';
        if (!asset_canvas6) {
            setTimeout(() => {
                initAsset6Fabric();
                console.log("軌道 6 已啟用");
            }, 10);
        }
    });
}

// 全域拖曳自動捲動功能
let isDraggingGlobal = false;
let autoScrollVy = 0;       // 垂直捲動速度
let autoScrollRafId = null; // AnimationFrame ID

// 定義捲動迴圈
function globalDragScrollLoop() {
    if (!isDraggingGlobal) {
        cancelAnimationFrame(autoScrollRafId);
        return;
    }

    // 如果有速度，就捲動視窗
    if (autoScrollVy !== 0) {
        window.scrollBy(0, autoScrollVy);
    }

    autoScrollRafId = requestAnimationFrame(globalDragScrollLoop);
}

// 監聽：當素材開始被拖曳時
document.addEventListener('dragstart', (e) => {
    // 確認是素材被拖曳
    if (e.target.classList && e.target.classList.contains('Asset_item')) {
        isDraggingGlobal = true;
        autoScrollVy = 0;
        globalDragScrollLoop(); // 啟動迴圈
    }
});

// 監聽：拖曳結束時 (無論成功或取消)
document.addEventListener('dragend', () => {
    isDraggingGlobal = false;
    autoScrollVy = 0;
    cancelAnimationFrame(autoScrollRafId);
});

// 監聽：拖曳過程中計算滑鼠位置
window.addEventListener('dragover', (e) => {
    if (!isDraggingGlobal) return;
    
    // 必須阻止預設行為，否則某些瀏覽器不會觸發連續座標更新
    e.preventDefault();

    const y = e.clientY;           // 滑鼠在視窗內的 Y 座標
    const h = window.innerHeight;  // 視窗高度
    const threshold = 100;         // 距離邊緣多少像素開始捲動 (100px)
    const maxSpeed = 15;           // 最大捲動速度

    // 判斷是否接近底部
    if (y > h - threshold) {
        // 越接近邊緣，速度越快
        const intensity = (y - (h - threshold)) / threshold;
        autoScrollVy = maxSpeed * intensity;
    } 
    // 判斷是否接近頂部
    else if (y < threshold) {
        const intensity = (threshold - y) / threshold;
        autoScrollVy = -maxSpeed * intensity;
    } 
    // 在中間區域
    else {
        autoScrollVy = 0;
    }
});

// 監聽：Drop 事件 (作為雙重保險，停止捲動)
window.addEventListener('drop', () => {
    isDraggingGlobal = false;
    autoScrollVy = 0;
    cancelAnimationFrame(autoScrollRafId);
});

// 建立全域查找表，讓 EffectBlock 能找到目標軌道
window.getCanvasInstanceById = function(domId) {
    switch(domId) {
        case 'assetCanvas1': return (typeof asset_canvas1 !== 'undefined') ? asset_canvas1 : null;
        case 'assetCanvas2': return (typeof asset_canvas2 !== 'undefined') ? asset_canvas2 : null;
        case 'assetCanvas3': return (typeof asset_canvas3 !== 'undefined') ? asset_canvas3 : null;
        case 'assetCanvas4': return (typeof asset_canvas4 !== 'undefined') ? asset_canvas4 : null;
        case 'assetCanvas5': return (typeof asset_canvas5 !== 'undefined') ? asset_canvas5 : null;
        case 'assetCanvas6': return (typeof asset_canvas6 !== 'undefined') ? asset_canvas6 : null;
        default: return null;
    }
};

//  用來暫存複製的資料 (剪貼簿)
let appClipboard = null;

// 記錄最後點擊的畫布 (預設為軌道1)
let lastFocusedCanvas = null;

// 簡單的 ID 產生器 (產生隨機字串)
function generateUniqueId() {
    return 'effect_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// 幫所有存在的軌道畫布綁定「焦點偵測」
function bindFocusEvent(canvasInstance) {
    if (!canvasInstance) return;
    
    canvasInstance.on('mouse:down', () => {
        lastFocusedCanvas = canvasInstance;  
    });
}
// undo/redo 功能

const HistoryManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 20, // 限制步數，避免記憶體爆掉
    isLocked: false, // 防止在還原時觸發自動存檔

    // 儲存當前狀態 (在動作發生後呼叫)
    saveState: function() {
        if (this.isLocked) return;

        // 取得目前專案的完整 JSON
        const currentState = JSON.stringify(generateProjectJson());

        // 如果目前的狀態跟上一次存的一樣，就不要重複存 (避免沒動也存)
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === currentState) {
            return;
        }

        // 存入 Undo Stack
        this.undoStack.push(currentState);

        // 超過限制就移除最舊的
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        // 只要有新動作，Redo Stack 就要清空
        this.redoStack = [];
        
        console.log(`[History] State Saved. Undo: ${this.undoStack.length}, Redo: ${this.redoStack.length}`);
    },

    // 執行 Undo (Ctrl+Z)
    undo: function() {
        if (this.undoStack.length <= 1) { // 至少要留一個初始狀態
            console.log("No more undo steps.");
            return;
        }

        this.isLocked = true; // 上鎖，避免還原過程又觸發 saveState

        // 把「現在」的狀態丟進 Redo Stack (這樣等等才能 Redo 回來)
        const currentState = this.undoStack.pop(); 
        this.redoStack.push(currentState);

        // 讀取 Undo Stack 裡面的「上一步」
        const prevStateStr = this.undoStack[this.undoStack.length - 1];
        const prevState = JSON.parse(prevStateStr);

        // 載入該狀態
        importProjectFromJson(prevState);

        console.log(`[History] Undo Performed.`);
        
        // 解鎖
        setTimeout(() => { this.isLocked = false; }, 100);
    },

    // 執行 Redo (Ctrl+Y 或 Ctrl+Shift+Z)
    redo: function() {
        if (this.redoStack.length === 0) {
            console.log("No more redo steps.");
            return;
        }

        this.isLocked = true;

        // 從 Redo Stack 取出下一步
        const nextStateStr = this.redoStack.pop();
        
        // 把這個狀態推回 Undo Stack
        this.undoStack.push(nextStateStr);

        // 載入
        const nextState = JSON.parse(nextStateStr);
        importProjectFromJson(nextState);

        console.log(`[History] Redo Performed.`);

        setTimeout(() => { this.isLocked = false; }, 100);
    }
};

// 初始化：網頁載入完成後，先存一個「初始狀態」
document.addEventListener('DOMContentLoaded', () => {
    // 延遲一點點確保 initAll 跑完
    setTimeout(() => {
        HistoryManager.saveState();
    }, 1000);
});