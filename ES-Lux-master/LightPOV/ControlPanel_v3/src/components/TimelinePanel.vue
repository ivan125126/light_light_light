<template>
  <div class="timeline_panel">
    <!-- 播放控制列 -->
    <div class="playback_controls">
      <!-- 音樂載入 -->
      <label class="load-audio-btn">
        選擇音檔
        <input type="file" accept="audio/*" hidden @change="loadAudio" />
      </label>

      <!-- 當前時間 -->
      <span class="time-display">當前時間:{{ formatTimeMmSs(timelineStore.globalTime) }}</span>

      <!-- 跳至時間（mm : ss + Enter） -->
      <span class="jump-label">跳至時間:</span>
      <input
        v-model.number="jumpMin"
        class="jump-input"
        type="number" min="0" placeholder="mm"
        @keydown.enter="secInputRef?.focus()"
      />
      <span class="jump-colon">:</span>
      <input
        ref="secInputRef"
        v-model.number="jumpSec"
        class="jump-input"
        type="number" min="0" max="59" placeholder="ss"
        @keydown.enter="jumpToTime"
      />

      <!-- 音量 -->
      <span class="volume-icon">🔊 音量：</span>
      <input
        class="volume-slider"
        type="range" min="0" max="100" :value="Math.round(audioStore.volume * 100)"
        @input="onVolumeInput"
      />
      <span class="volume-value">{{ Math.round(audioStore.volume * 100) }}%</span>

      <!-- 音檔名稱 -->
      <span v-if="audioStore.hasAudio" class="audio-name">{{ audioStore.fileName }}</span>

      <!-- 新增 / 刪除軌道 -->
      <div class="track-actions">
        <button @click="timelineStore.addTrack()">+ 新增軌道</button>
        <button
          :disabled="timelineStore.tracks.length <= 1"
          @click="openDeleteDialog"
        >− 刪除軌道</button>
      </div>
    </div>

    <!-- 時間刻度行（左：播放控制 | 右：時間刻度canvas） -->
    <div class="timeline-row">
      <div class="timeline-ctrl">
        <button @click="togglePlay">{{ timelineStore.isPlaying ? '⏸' : '▶' }}</button>
        <button @click="stop">⏹</button>
      </div>
      <div class="timescale-wrapper">
        <canvas
          ref="timescaleCanvasRef"
          class="timescale_canvas"
          :width="canvasWidth"
          :height="TIMESCALE_HEIGHT"
          @mousedown="onTimescaleMouseDown"
          @wheel.prevent="onWheel"
        ></canvas>
      </div>
    </div>

    <!-- 動態軌道 -->
    <div
      ref="tracksContainerRef"
      class="tracks_container"
      @wheel.prevent="onWheel"
    >
      <div
        class="track-row"
        v-for="(track, index) in timelineStore.tracks"
        :key="track.id"
      >
        <div class="track-label">
          <span
            v-if="editingTrackId !== track.id"
            @click="startEdit(track.id)"
          >{{ track.name }}</span>
          <input
            v-else
            class="track-name-input"
            :value="editingName"
            @input="editingName = ($event.target as HTMLInputElement).value"
            @blur="finishEdit(track.id)"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
            @keydown.esc="cancelEdit"
            autofocus
          />
        </div>
        <TrackCanvas :trackIndex="index" />
      </div>
    </div>

    <!-- 刪除軌道 Dialog -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click.self="showDeleteDialog = false">
      <div class="dialog-box">
        <div class="dialog-title">刪除軌道</div>
        <div class="track-delete-list">
          <div
            v-for="track in timelineStore.tracks"
            :key="track.id"
            class="track-delete-item"
            :class="{ selected: deleteTargetId === track.id }"
            @click="deleteTargetId = track.id"
          >{{ track.name }}</div>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn--cancel" @click="showDeleteDialog = false">取消</button>
          <button
            class="dialog-btn dialog-btn--confirm"
            :disabled="!deleteTargetId"
            @click="confirmDelete"
          >刪除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import TrackCanvas from './TrackCanvas.vue'
import { useTimelineStore } from '../stores/timelineStore'
import { useAudioStore } from '../stores/audioStore'
import { useEffectStore } from '../stores/effectStore'
import { loadAudioFile, extractPeaks, startPlayback, stopPlayback, setVolume } from '../services/audioService'
import { startHardwareSync, stopHardwareSync, startWithoutAudio } from '../services/hardwareService'
import { useSelectionStore } from '../stores/selectionStore'
import { useUndoStore } from '../stores/undoStore'

const TIMESCALE_HEIGHT = 120

const timelineStore = useTimelineStore()
const audioStore = useAudioStore()
const effectStore = useEffectStore()
const selectionStore = useSelectionStore()
const undoStore = useUndoStore()
const timescaleCanvasRef = ref<HTMLCanvasElement | null>(null)
const tracksContainerRef = ref<HTMLElement | null>(null)
const secInputRef = ref<HTMLInputElement | null>(null)
const canvasWidth = ref(1200)

// 跳至時間 inputs
const jumpMin = ref<number | null>(null)
const jumpSec = ref<number | null>(null)

let animationFrameId: number | null = null
let playStartWallTime = 0
let playStartGlobalTime = 0

// 拖曳 pan 狀態
let isDragging = false
let dragStartX = 0
let dragStartOffset = 0

// ── 時間格式 ──────────────────────────────────────────────
function formatTimeMmSs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ── 播放控制 ──────────────────────────────────────────────
function togglePlay() {
  timelineStore.isPlaying ? pause() : play()
}

function play() {
  playStartWallTime = performance.now()
  playStartGlobalTime = timelineStore.globalTime
  if (audioStore.hasAudio) {
    startPlayback(timelineStore.globalTime)
  } else {
    startWithoutAudio()
  }
  startHardwareSync(() => timelineStore.globalTime)
  timelineStore.setPlaying(true)
  tick()
}

function pause() {
  timelineStore.setPlaying(false)
  stopPlayback()
  stopHardwareSync()
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function stop() {
  pause()
  timelineStore.setTime(0)
  drawTimescale()
}

// ── 跳至時間 ──────────────────────────────────────────────
function jumpToTime() {
  const min = jumpMin.value ?? 0
  const sec = jumpSec.value ?? 0
  if (sec > 59) return
  const ms = (min * 60 + sec) * 1000
  timelineStore.setTime(ms)
  if (timelineStore.isPlaying) {
    // 重新從新位置開始播放
    if (audioStore.hasAudio) {
      stopPlayback()
      startPlayback(ms)
    }
    playStartWallTime = performance.now()
    playStartGlobalTime = ms
  }
  drawTimescale()
}

// ── 音量 ──────────────────────────────────────────────────
function onVolumeInput(event: Event) {
  const val = Number((event.target as HTMLInputElement).value) / 100
  audioStore.setVolume(val)
  setVolume(val)
}

function tick() {
  if (!timelineStore.isPlaying) return
  const elapsed = performance.now() - playStartWallTime
  timelineStore.setTime(playStartGlobalTime + elapsed)
  drawTimescale()
  animationFrameId = requestAnimationFrame(tick)
}

// ── 音樂載入 ──────────────────────────────────────────────
async function loadAudio(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const { buffer, duration } = await loadAudioFile(file)
  // 用 200 samples/sec 取樣，縮放後仍有足夠解析度
  const numPeaks = Math.max(4000, Math.ceil(buffer.duration * 200))
  const peaks = extractPeaks(buffer, numPeaks)
  audioStore.setAudio(duration, peaks, file.name)
  timelineStore.setTotalDuration(duration)
  drawTimescale()
}

// ── 滾輪：上下 = zoom，左右 = pan ─────────────────────────
function onWheel(event: WheelEvent) {
  if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
    // 縱向滾動 → zoom（向上縮小 secondsPerPixel = 放大尺度）
    const factor = event.deltaY > 0 ? 1.15 : 0.87
    const anchorX = event.offsetX
    timelineStore.zoom(factor, anchorX)
  } else {
    // 橫向滾動 → pan
    timelineStore.setOffset(timelineStore.timelineOffset + event.deltaX)
  }
  drawTimescale()
}

// ── 拖曳時間刻度軸 pan ────────────────────────────────────
function onTimescaleMouseDown(event: MouseEvent) {
  isDragging = true
  dragStartX = event.clientX
  dragStartOffset = timelineStore.timelineOffset
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging) return
  const dx = event.clientX - dragStartX
  timelineStore.setOffset(dragStartOffset - dx)
  drawTimescale()
}

function onMouseUp() {
  isDragging = false
}

// ── 繪製時間刻度軸 ────────────────────────────────────────
function drawTimescale() {
  const canvas = timescaleCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  const { secondsPerPixel, timelineOffset } = timelineStore

  // 版面常數（對照 v2 的 160px 等比縮放至 120px）
  const baselineY = 45           // 基準線 y 位置
  const tickTop   = 28           // 刻度線上緣
  const labelY    = 22           // mm:ss 標籤基線
  const waveCenter = Math.floor(baselineY + (h - baselineY) / 2)  // ~82
  const waveHalfH  = Math.floor((h - baselineY - 6) / 2)          // ~35

  // 背景
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, w, h)

  // 波形（對稱式，對照 v2 的 strokeStyle = '#4fb3d6'）
  if (audioStore.peaks.length > 0) {
    const peaks = audioStore.peaks
    const audioDurSec = audioStore.duration / 1000

    ctx.strokeStyle = '#4fb3d6'
    ctx.lineWidth = 1
    ctx.beginPath()

    for (let i = 0; i < w; i++) {
      const timeSec = (i + timelineOffset) * secondsPerPixel
      if (timeSec < 0 || timeSec > audioDurSec) continue
      const peakIdx = Math.floor(timeSec / audioDurSec * peaks.length)
      const peak = peaks[Math.min(peakIdx, peaks.length - 1)] ?? 0
      const y = peak * waveHalfH
      ctx.moveTo(i + 0.5, waveCenter - y)
      ctx.lineTo(i + 0.5, waveCenter + y)
    }
    ctx.stroke()
  }

  // 基準線
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, baselineY)
  ctx.lineTo(w, baselineY)
  ctx.stroke()
  ctx.lineWidth = 1

  // 刻度間隔（對照 v2 邏輯）
  let majorTick = 1
  if (secondsPerPixel < 1 / 800)  majorTick = 0.5
  if (secondsPerPixel < 1 / 1500) majorTick = 0.2
  if (secondsPerPixel > 1 / 40)   majorTick = 5
  if (secondsPerPixel > 1 / 20)   majorTick = 10
  if (secondsPerPixel > 1 / 10)   majorTick = 30
  if (secondsPerPixel > 1 / 5)    majorTick = 60

  const startSec  = timelineOffset * secondsPerPixel
  const endSec    = startSec + w * secondsPerPixel
  const firstTick = Math.ceil(startSec / majorTick) * majorTick

  ctx.fillStyle = '#ffffff'
  ctx.font = '11px monospace'

  for (let t = firstTick; t <= endSec; t = Math.round((t + majorTick) * 1000) / 1000) {
    const x = Math.floor(t / secondsPerPixel - timelineOffset)

    // 刻度線
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(x, tickTop)
    ctx.lineTo(x, baselineY)
    ctx.stroke()

    // mm:ss 標籤
    const mm = String(Math.floor(t / 60)).padStart(2, '0')
    const ss = String(Math.floor(t % 60)).padStart(2, '0')
    ctx.fillText(`${mm}:${ss}`, x + 3, labelY)
  }

  // 播放頭（紅線貫穿全高）
  const playheadX = timelineStore.playheadPixel
  if (playheadX >= 0 && playheadX <= w) {
    ctx.strokeStyle = '#ff4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, h)
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

// ── 生命週期 ──────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
  const isMeta = e.metaKey || e.ctrlKey

  // Cmd+Z — undo
  if (isMeta && e.key === 'z' && !e.shiftKey) {
    if (isEditable) return
    e.preventDefault()
    undoStore.undo()
    return
  }

  // Cmd+X — cut
  if (isMeta && e.key === 'x') {
    if (isEditable) return
    e.preventDefault()
    const ids = [...selectionStore.selectedIds]   // snapshot before mutations
    if (ids.length === 0) return
    const instances = effectStore.instances.filter(i => ids.includes(i.id))
    selectionStore.setCopy(instances)
    undoStore.push()
    ids.forEach(id => effectStore.removeInstance(id))
    selectionStore.clear()
    effectStore.selectInstance(null)
    return
  }

  // Cmd+C — copy
  if (isMeta && e.key === 'c') {
    if (isEditable) return
    e.preventDefault()
    const ids = [...selectionStore.selectedIds]   // snapshot
    if (ids.length === 0) return
    const instances = effectStore.instances.filter(i => ids.includes(i.id))
    selectionStore.setCopy(instances)
    return
  }

  // Cmd+V — paste at playhead
  if (isMeta && e.key === 'v') {
    if (isEditable) return
    e.preventDefault()
    const { clipboard, clipboardAnchorTime } = selectionStore
    if (!clipboard || clipboard.length === 0) return
    undoStore.push()
    const playhead = timelineStore.globalTime
    const newIds: string[] = []
    for (const entry of clipboard) {
      const newStartTime = playhead + (entry.startTime - clipboardAnchorTime)
      const newId = effectStore.addInstance(
        entry.definitionName,
        newStartTime,
        entry.duration,
        entry.trackIndex
      )
      effectStore.updateInstance(newId, { params: JSON.parse(JSON.stringify(entry.params)) })
      newIds.push(newId)
    }
    selectionStore.setMany(newIds)
    if (newIds.length === 1) effectStore.selectInstance(newIds[0])
    return
  }

  // Backspace — delete selected (multi or single)
  if (e.key === 'Backspace') {
    if (isEditable) return
    e.preventDefault()
    const multiIds = [...selectionStore.selectedIds]   // snapshot before mutations
    if (multiIds.length > 0) {
      undoStore.push()
      multiIds.forEach(id => effectStore.removeInstance(id))
      selectionStore.clear()
      effectStore.selectInstance(null)
    } else {
      const id = effectStore.selectedInstanceId
      if (id) {
        undoStore.push()
        effectStore.removeInstance(id)
      }
    }
    return
  }

  // Escape — clear selection
  if (e.key === 'Escape') {
    selectionStore.clear()
  }
}

onMounted(async () => {
  const canvas = timescaleCanvasRef.value
  if (canvas) canvasWidth.value = canvas.parentElement?.clientWidth ?? 1200
  await nextTick()   // 等 Vue 把 :width 更新到 DOM 後再畫，避免 canvas 被重置清空
  drawTimescale()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('keydown', onKeyDown)
})

watch(() => timelineStore.secondsPerPixel, drawTimescale)
watch(() => timelineStore.timelineOffset, drawTimescale)

// ── inline 編輯軌道名稱 ──────────────────────────────────
const editingTrackId = ref<string | null>(null)
const editingName = ref('')
let cancellingEdit = false

function startEdit(id: string) {
  const track = timelineStore.tracks.find(t => t.id === id)
  if (!track) return
  editingTrackId.value = id
  editingName.value = track.name
}

function finishEdit(id: string) {
  if (cancellingEdit) {
    cancellingEdit = false
    return
  }
  const name = editingName.value.trim()
  if (name) timelineStore.renameTrack(id, name)
  editingTrackId.value = null
}

function cancelEdit() {
  cancellingEdit = true
  editingTrackId.value = null
}

// ── 刪除軌道 Dialog ──────────────────────────────────────
const showDeleteDialog = ref(false)
const deleteTargetId = ref<string | null>(null)

function openDeleteDialog() {
  deleteTargetId.value = null
  showDeleteDialog.value = true
}

function confirmDelete() {
  const id = deleteTargetId.value
  if (!id) return
  const idx = timelineStore.tracks.findIndex(t => t.id === id)
  if (idx === -1) return
  const toRemove = effectStore.instances
    .filter(i => i.trackIndex === idx)
    .map(i => i.id)
  const toReindex = effectStore.instances
    .filter(i => i.trackIndex > idx)
    .map(i => ({ id: i.id, newIndex: i.trackIndex - 1 }))
  toRemove.forEach(instanceId => effectStore.removeInstance(instanceId))
  toReindex.forEach(({ id: iid, newIndex }) => effectStore.updateInstance(iid, { trackIndex: newIndex }))
  timelineStore.removeTrack(id)
  showDeleteDialog.value = false
  deleteTargetId.value = null
}
</script>
