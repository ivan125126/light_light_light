// Manages a single shared Web Worker for off-thread LED frame computation.
// Import this singleton from PreviewElement and call workerPool.compute().

import type { EffectData } from '../types'
import type { LedData } from './previewCompute'

type Callback = (frames: LedData) => void

class PreviewWorkerPool {
  private worker: Worker
  private pending = new Map<string, Callback>()

  constructor() {
    this.worker = new Worker(new URL('./previewWorker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<{ requestId: string; frames: LedData }>) => {
      const { requestId, frames } = e.data
      const cb = this.pending.get(requestId)
      if (cb) {
        this.pending.delete(requestId)
        cb(frames)
      }
    }
    this.worker.onerror = (err) => {
      console.error('PreviewWorkerPool error:', err)
    }
  }

  /** Send modeData to the Worker; cb is called with the computed LedData when ready. */
  compute(modeData: EffectData, cb: Callback): string {
    const requestId = crypto.randomUUID()
    this.pending.set(requestId, cb)
    this.worker.postMessage({ requestId, modeData })
    return requestId
  }

  /** Cancel a pending request (Worker may still run, but cb is dropped). */
  cancel(requestId: string): void {
    this.pending.delete(requestId)
  }
}

export const workerPool = new PreviewWorkerPool()
