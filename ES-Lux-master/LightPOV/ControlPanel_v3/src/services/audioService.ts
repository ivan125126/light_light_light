/**
 * Web Audio API utilities.
 * Audio playback state (context, buffer, source node) is held at module scope;
 * reactive state (peaks, duration, hasAudio) is delegated to audioStore.
 */

let _audioContext: AudioContext | null = null
let _gainNode: GainNode | null = null
let _sourceNode: AudioBufferSourceNode | null = null
let _audioBuffer: AudioBuffer | null = null
let _currentRate = 1

function getAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}

function getGainNode(): GainNode {
  const ctx = getAudioContext()
  if (!_gainNode) {
    _gainNode = ctx.createGain()
    _gainNode.connect(ctx.destination)
  }
  return _gainNode
}

/** Load an MP3/WAV File into an AudioBuffer. Stops any current playback first. */
export async function loadAudioFile(file: File): Promise<{ buffer: AudioBuffer; duration: number }> {
  stopPlayback()
  const ctx = getAudioContext()
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  _audioBuffer = audioBuffer
  return {
    buffer: audioBuffer,
    duration: Math.round(audioBuffer.duration * 1000),
  }
}

/**
 * Extract normalized peak values for waveform rendering.
 */
export function extractPeaks(buffer: AudioBuffer, numPeaks: number): number[] {
  const channelData = buffer.getChannelData(0)
  const blockSize = Math.floor(channelData.length / numPeaks)
  const peaks: number[] = []

  for (let i = 0; i < numPeaks; i++) {
    let max = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(channelData[start + j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }
  return peaks
}

/** Start playback from offsetMs (in milliseconds) at the given rate */
export function startPlayback(offsetMs: number, rate = _currentRate): void {
  if (!_audioBuffer) return
  stopPlayback()
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  const source = ctx.createBufferSource()
  source.buffer = _audioBuffer
  source.playbackRate.value = rate
  source.connect(getGainNode())
  source.start(0, offsetMs / 1000)
  _sourceNode = source
  _currentRate = rate
}

/** Change playback rate in real-time without restarting */
export function setPlaybackRate(rate: number): void {
  _currentRate = Math.max(0.01, rate)
  if (_sourceNode) {
    _sourceNode.playbackRate.value = _currentRate
  }
}

/** Stop current playback */
export function stopPlayback(): void {
  if (_sourceNode) {
    try { _sourceNode.stop() } catch { /* already stopped */ }
    _sourceNode = null
  }
}

/** Set playback volume (0–1) */
export function setVolume(vol: number): void {
  getGainNode().gain.value = Math.max(0, Math.min(1, vol))
}

/** Get current AudioContext time in milliseconds */
export function getAudioContextTime(): number {
  return _audioContext ? _audioContext.currentTime * 1000 : 0
}
