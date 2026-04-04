<template>
  <div class="timeline_panel">
    <!-- 播放控制 -->
    <div class="playback_controls">
      <button @click="togglePlay">{{ timelineStore.isPlaying ? '暫停' : '播放' }}</button>
      <button @click="stop">停止</button>
      <input type="file" accept="audio/*" @change="loadAudio" />
      <span>{{ formatTime(timelineStore.globalTime) }}</span>
    </div>

    <!-- 時間刻度軸 -->
    <canvas ref="timescaleCanvasRef" class="timescale_canvas" :width="canvasWidth" height="30"></canvas>

    <!-- 6 軌 -->
    <div
      ref="tracksContainerRef"
      class="tracks_container"
      @wheel.prevent="onWheel"
    >
      <TrackCanvas v-for="i in 6" :key="i" :trackIndex="i - 1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import TrackCanvas from './TrackCanvas.vue'
import { useTimelineStore } from '../stores/timelineStore'
import { useAudioStore } from '../stores/audioStore'
import { loadAudioFile, extractPeaks, startPlayback, stopPlayback } from '../services/audioService'
import { startHardwareSync, stopHardwareSync, startWithoutAudio } from '../services/hardwareService'

const timelineStore = useTimelineStore()
const audioStore = useAudioStore()
const timescaleCanvasRef = ref<HTMLCanvasElement | null>(null)
const tracksContainerRef = ref<HTMLElement | null>(null)
const canvasWidth = ref(1200)

let animationFrameId: number | null = null
let playStartWallTime = 0
let playStartGlobalTime = 0

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}

function togglePlay() {
  if (timelineStore.isPlaying) {
    pause()
  } else {
    play()
  }
}

function play() {
  playStartWallTime = performance.now()
  playStartGlobalTime = timelineStore.globalTime
  if (audioStore.hasAudio) {
    startPlayback(timelineStore.globalTime)
  } else {
    startWithoutAudio()  // 無音樂也能啟動硬體
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

function tick() {
  if (!timelineStore.isPlaying) return
  const elapsed = performance.now() - playStartWallTime
  timelineStore.setTime(playStartGlobalTime + elapsed)
  drawTimescale()
  animationFrameId = requestAnimationFrame(tick)
}

async function loadAudio(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const { buffer, duration } = await loadAudioFile(file)
  const peaks = extractPeaks(buffer, canvasWidth.value)
  audioStore.setAudio(duration, peaks, file.name)
  timelineStore.setTotalDuration(duration)
  drawTimescale()
}

function onWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    const factor = event.deltaY > 0 ? 1.1 : 0.9
    timelineStore.zoom(factor, event.offsetX)
  } else {
    timelineStore.setOffset(timelineStore.timelineOffset + event.deltaX * 0.5)
  }
  drawTimescale()
}

function drawTimescale() {
  const canvas = timescaleCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#444'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const { secondsPerPixel, timelineOffset } = timelineStore
  ctx.fillStyle = '#aaa'
  ctx.font = '10px monospace'

  const startSec = timelineOffset * secondsPerPixel
  const endSec = (timelineOffset + canvas.width) * secondsPerPixel
  const tickInterval = Math.max(0.5, Math.ceil((endSec - startSec) / 20))

  for (let s = Math.ceil(startSec / tickInterval) * tickInterval; s < endSec; s += tickInterval) {
    const x = s / secondsPerPixel - timelineOffset
    ctx.strokeStyle = '#666'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 30)
    ctx.stroke()
    ctx.fillText(`${s.toFixed(1)}s`, x + 2, 20)
  }

  // Draw waveform
  if (audioStore.peaks.length > 0) {
    ctx.fillStyle = '#4a9eff44'
    const peaks = audioStore.peaks
    for (let i = 0; i < canvas.width; i++) {
      const peakIdx = Math.floor((i + timelineOffset) / canvas.width * peaks.length)
      const peak = peaks[peakIdx] ?? 0
      const h = peak * 28
      ctx.fillRect(i, (28 - h) / 2, 1, h)
    }
  }

  // Draw playhead
  const playheadX = timelineStore.playheadPixel
  if (playheadX >= 0 && playheadX <= canvas.width) {
    ctx.strokeStyle = '#ff4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, 30)
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

onMounted(() => {
  drawTimescale()
})

watch(() => timelineStore.secondsPerPixel, drawTimescale)
watch(() => timelineStore.timelineOffset, drawTimescale)
</script>
