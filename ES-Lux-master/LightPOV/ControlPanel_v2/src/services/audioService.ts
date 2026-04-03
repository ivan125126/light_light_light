/**
 * Web Audio API utilities.
 * Stateless — all audio state lives in audioStore.
 */

let _audioContext: AudioContext | null = null
let _sourceNode: AudioBufferSourceNode | null = null
let _audioBuffer: AudioBuffer | null = null

function getAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}

/** Load an MP3/WAV File into an AudioBuffer */
export async function loadAudioFile(file: File): Promise<{ buffer: AudioBuffer; duration: number }> {
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
 * @param buffer  Decoded AudioBuffer
 * @param numPeaks  Number of peaks to extract
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

/** Start playback from offsetMs (in milliseconds) */
export function startPlayback(offsetMs: number): void {
  if (!_audioBuffer) return
  stopPlayback()
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  const source = ctx.createBufferSource()
  source.buffer = _audioBuffer
  source.connect(ctx.destination)
  source.start(0, offsetMs / 1000)
  _sourceNode = source
}

/** Stop current playback */
export function stopPlayback(): void {
  if (_sourceNode) {
    try { _sourceNode.stop() } catch { /* already stopped */ }
    _sourceNode = null
  }
}

/** Get current AudioContext time in milliseconds */
export function getAudioContextTime(): number {
  return _audioContext ? _audioContext.currentTime * 1000 : 0
}
