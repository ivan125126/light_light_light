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
const assetCanvas2El = document.getElementById('assetCanvas1');
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
};

const assetItems = document.querySelectorAll('.Asset_item');
const paramEmpty = document.querySelector('.param_empty');
const paramMain  = document.querySelector('.param_main');
const paramBody  = document.querySelector('.param_body--param');
const extraGroups = document.querySelectorAll('.extra_group');

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

// 點素材 顯示對應參數
assetItems.forEach(item => {
  item.addEventListener('click', () => {
    const name = item.textContent.trim();
    
    assetItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    paramEmpty.style.display = 'none';
    paramMain.classList.remove('hidden');
    paramBody.scrollTop = 0;

    resetAllParams();

    const cfg = EFFECT_CONFIG[name] || { extras: [] };

    extraGroups.forEach(g => {
      const key = g.dataset.extra;
      g.style.display = cfg.extras.includes(key) ? "block" : "none";
    });

    if (name === "清除") {
      paramMain.classList.add('hidden');
    }
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
};

const FUNC_CODE = {
  "none": 0,
  "const": 1,
  "ramp": 2,
  "tri": 3,
  "pulse": 4,
  "step": 5
};

function to255(value, min, max) {
  const v = Math.min(max, Math.max(min, Number(value) || 0));
  return Math.round((v - min) / (max - min) * 255);
}

function sendToSettime(jsonPath) {
  const currentPlaybackTime = 0; 

  fetch('/settime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: jsonPath,
      current_time: currentPlaybackTime
    })
  })
}

// Audio / waveform state
let audioCtx = null;
let audioBuffer = null;
let peaks = [];
let audioDuration = 0;
let waveformLines = [];

// Fabric timeline state (工程時間系統)
let timescale_canvas = null;
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
// 🌟 新增變數：用於判斷是否發生拖曳
  let isDraggingTimeline = false;
  //let initialClickX = 0; // 記錄 mouse:down 時的 X 座標
  //const DRAG_THRESHOLD = 5; // 判斷是否為拖曳的像素門檻
  timescale_canvas.on('mouse:down', (e) => {
    // if clicked an object, do nothing (object drag handlers will run)
    if (e.target) return;
    isPanning = true;
    lastPanX = e.pointer.x;
    // 🌟 記錄初始位置，並重設拖曳旗標
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
    // 🌟 關鍵修正：計算移動距離
    //const movedDistance = Math.abs(e.pointer.x - initialClickX);
    // 🌟 關鍵修正：檢查是否為點擊 (沒有發生拖曳)
    // 且確保 e.target 為空 (沒有點擊到 waveformObj)
    if (!isDraggingTimeline && !e.target) {
        const p = e.pointer;
        const clickedTime = timelineOffset + p.x * secondsPerPixel;
        seekGlobal(clickedTime);
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
    canvas.add(waveformObj);

      timescale_canvas.add(waveformObj);
      
      // 依序將線段加入畫布
      waveformLines.forEach(line => timescale_canvas.add(line));
  }
  // add playhead on top
  updatePlayheadVisual();
  canvas.add(playhead);

  canvas.requestRenderAll();
}

// Create waveform image from peaks and add as Fabric image (clip)
async function createWaveformImageAndAddToTimeline() {
  if (!audioBuffer || !timescale_canvas) return;

  // create a large base image width (e.g., px per second base)
  const basePxPerSec = 200; // tune: larger = more detailed waveform image
  const baseWidth = Math.max(2000, Math.floor(audioBuffer.duration * basePxPerSec));
  const height = 95;

  const cv = document.createElement('canvas');
  cv.width = baseWidth;
  cv.height = height;
  const c = cv.getContext('2d');

  // background
  c.fillStyle = "#0d1117";
  c.fillRect(0, 0, baseWidth, height);

  // draw peaks
  const mid = height / 2;
  c.strokeStyle = "#4fb3d6";
  c.lineWidth = 1;
  c.beginPath();

  for (let x = 0; x < baseWidth; x++) {
    const idx = Math.floor(x * (peaks.length / baseWidth));
    const p = peaks[idx] || 0;
    const y = p * (height / 2);
    c.moveTo(x + 0.5, mid - y);
    c.lineTo(x + 0.5, mid + y);
  }
  c.stroke();

  // convert to dataURL
  waveformImgURL = cv.toDataURL();

  // remove old waveformObj
  if (waveformObj) {
    timescale_canvas.remove(waveformObj);
    waveformObj = null;
  }

  return new Promise((resolve) => {
    fabric.Image.fromURL(waveformImgURL, (img) => {
      waveformObj = img;
      waveformObj.set({
        left: 0,
        top: 110,
        originY: 'center',
        selectable: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: 'grab'
      });


      // make sure user can only drag horizontally
    waveformObj.on('moving', () => {
    waveformObj.top = 110;

    // 計算 clipStartSec（尚未 clamp）
    let newClipStart = timelineOffset + waveformObj.left * secondsPerPixel;

    // ❗ 若小於 0 → 強制回到 0
    if (newClipStart < 0) {
        newClipStart = 0;
        waveformObj.left = (0 - timelineOffset) / secondsPerPixel;
    }

    clipStartSec = newClipStart;

    ensureAudioSyncToGlobal(true);
    updateTimeUI();
    // 🎯 修正點 3: 同步三條線段的位置 (只需同步 left)
    waveformLines.forEach((line,index) => {
        if (index === 1) { // 🌟 右側框線 (index=1)
            // 右框線位置 = 波形圖起始位置 + 拉伸後的寬度
            line.left = waveformObj.left + clipWidthPx;
        } else {
            // 左側 (index=0) 和底部 (index=2) 框線
            line.left = waveformObj.left;
        }
        line.setCoords();
    });
    timescale_canvas.requestRenderAll();
});


      // initial scale & position
      updateWaveformScaleAndPos();
      // 🎯 修正點 2-2: 在此處創建三條線段 (左、右、底)
    waveformLines = []; // 清空舊的線段
    const strokeOpts = {
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
      evented: false
    };
    const topY = 110 - img.height / 2; // top 屬性是 110
    const bottomY = 110 + img.height / 2;
    const height = img.height;
    const width = img.width;

    // 1. 左側框線: 
    const leftLine = new fabric.Line([0, topY, 0, bottomY], strokeOpts);
    leftLine.set({ originY: 'center', top: 110 });

    // 2. 右側框線:
    const rightLine = new fabric.Line([width, topY, width, bottomY], strokeOpts);
    rightLine.set({ originY: 'center', top: 110 });

    // 3. 底部框線: (使用相對座標 [0, 0] 到 [width, 0], 然後用 top 定位在 bottomY)
    const bottomLine = new fabric.Line([0, 0, width, 0], strokeOpts);
    bottomLine.set({ originY: 'center', top: bottomY });


    waveformLines.push(leftLine, rightLine, bottomLine);
    
    // 依序將線段加入畫布
    waveformLines.forEach(line => timescale_canvas.add(line));
      timescale_canvas.add(waveformObj);
      timescale_canvas.requestRenderAll();
      resolve();
    });
  });
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
// 🎯 同步線段的位置與縮放
  waveformLines.forEach((line, index) => {
      line.left = waveformObj.left;
      
      // 底部線段 (index=2) 繼承縮放
      if (index === 2) {
          line.scaleX = waveformObj.scaleX; 
      }
      else if (index === 1) { // 🌟 新增：針對右框線
          // 右框線的位置 = 波形圖起始位置 + 拉伸後的總寬度
          line.left = waveformObj.left + clipWidthPx;
          line.scaleX = 1; // 保持固定厚度 
      }
      else {
          // 左右框線保持自然寬度
          line.scaleX = 1; 
      }
      
  });
 // ❗ clipStartSec 不可小於 0
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
function seekGlobal(t) {
  globalTime = Math.max(0, Math.min(t, 999999)); // cap very large values
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
  drawTimeline();
});

// Update time label UI/
function updateTimeUI() {
  timeLabel.textContent = `${fmt(globalTime)} `;
  volumeValue.textContent = `${Math.round(audio.volume * 100)}%`;
}

// 初始化 Asset1 Canvas 的 Fabric 畫布
function initAsset1Fabric() {
  if (!assetCanvas1El) {
    console.error('找不到 #assetCanvas');
    return;
  }
  
  // 確保畫布尺寸匹配元素尺寸（這裡使用 HTML 中設定的寬高 1200x400）
  assetCanvasEl.width = assetCanvasEl.clientWidth;
  assetCanvasEl.height = assetCanvasEl.clientHeight;

  asset_canvas = new fabric.Canvas("assetCanvas", {
    selection: true, // 允許選取畫布上的素材
    renderOnAddRemove: true,
    backgroundColor: '#333333' // 設定一個背景色以便區分
  });
  
  // 設置初始尺寸 (使用 HTML 中定義的 1200x400 作為基準)
  asset_canvas.setWidth(assetCanvasEl.clientWidth);
  asset_canvas.setHeight(assetCanvasEl.clientHeight);
  asset_canvas.requestRenderAll();
}

// 初始化 Asset1 Canvas 的 Fabric 畫布
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
  asset_canvas2.on('selection:created', (e) => {
      // 選取畫布2時，取消畫布1的選取
      if(asset_canvas1) {
          asset_canvas1.discardActiveObject();
          asset_canvas1.requestRenderAll();
      }
      loadAssetParams(e); // 呼叫原本的載入函式 (需修改 loadAssetParams 支援通用性，見下文)
  });
  asset_canvas2.on('selection:updated', loadAssetParams);
  
  asset_canvas2.on('selection:cleared', () => {
     resetAllStrokes(asset_canvas2);
     currentEditingId = null;
     if(paramEmpty) paramEmpty.style.display = 'block'; 
     if(paramMain) paramMain.classList.add('hidden');
  });
}

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
  initAssetFabric();
  // set initial audio volume
  audio.volume = volumeSlider.value / 100;

  updateTimeUI();
}

// start
initAll();

