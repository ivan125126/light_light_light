// Web Worker entry point for LED frame computation.
// Receives EffectData, returns LedData — no DOM access required.

import type { EffectData } from '../types'
import { computeFrames } from './previewCompute'

self.onmessage = (e: MessageEvent<{ requestId: string; modeData: EffectData }>) => {
  const { requestId, modeData } = e.data
  const frames = computeFrames(modeData)
  self.postMessage({ requestId, frames })
}
