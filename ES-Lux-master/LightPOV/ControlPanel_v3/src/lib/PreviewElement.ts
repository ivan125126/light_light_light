// Custom HTML element <pre-view>
// Replaces src/js/pre_view.js
// Migrated to TypeScript in Plan 3. Bugs fixed:
//   - Animation no longer freezes: uses `currentFrame % frameCount` instead of hard-reset at 10000
//   - updateHeading() timer early-return removed (was dead code / caused Y-axis issues)
//   - boxes() now uses BigInt for bit masking (was silently wrong for > 31 LEDs)
// Later optimisations:
//   - Pure computation extracted to previewCompute.ts (Worker-safe)
//   - updateDataAsync() offloads frame computation to a Web Worker
//   - loadFrames() lets the Worker result be applied without restarting the animation loop
//   - currentFrame / glowCtx are no longer reset on effect switch (Bug 3: arm continuity)

import type { EffectData } from '../types'
import { computeFrames, MAX_FRAMES } from './previewCompute'
import type { LedData } from './previewCompute'
import { workerPool } from './PreviewWorkerPool'

export class PreviewElement extends HTMLElement {
  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private animationId: number | null = null
  private ledData: LedData = []
  private frameCount = 0
  private currentFrame = 0

  private ledBulbSize = 2
  private innerRadius = 80
  private ledBulbSpacing = 3
  private speed = 60
  private fps = 500
  private _lastFrameTime = 0
  private fadeSpeed = 0.025

  private bgCanvas!: HTMLCanvasElement
  private glowCanvas!: HTMLCanvasElement | OffscreenCanvas
  private glowCtx!: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

  static get observedAttributes() {
    return ['speed', 'led-bulb-size', 'led-bulb-spacing', 'inner-radius']
  }

  connectedCallback() {
    const width  = Number(this.getAttribute('width'))  || 500
    const height = Number(this.getAttribute('height')) || 500
    this.ledBulbSize    = Number(this.getAttribute('led-bulb-size'))     || 2
    this.innerRadius    = Number(this.getAttribute('inner-radius'))      || 80
    this.ledBulbSpacing = Number(this.getAttribute('led-bulb-spacing'))  || 3
    this.speed          = Number(this.getAttribute('speed'))             || 60

    this.canvas = document.createElement('canvas')
    this.canvas.width  = width
    this.canvas.height = height
    this.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!
    this._drawBackground()

    // Cache background for fast per-frame restore
    this.bgCanvas = document.createElement('canvas')
    this.bgCanvas.width  = width
    this.bgCanvas.height = height
    this.bgCanvas.getContext('2d')!.drawImage(this.canvas, 0, 0)

    // Offscreen canvas for bloom compositing
    if (typeof OffscreenCanvas !== 'undefined') {
      this.glowCanvas = new OffscreenCanvas(width, height)
      this.glowCtx = this.glowCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    } else {
      const fb = document.createElement('canvas')
      fb.width = width; fb.height = height
      this.glowCanvas = fb
      this.glowCtx = fb.getContext('2d')!
    }
  }

  disconnectedCallback() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Synchronously compute frames and start/restart the animation loop.
   * Bug 3 fix: currentFrame and glowCtx trail are NOT reset, so the arm
   * continues sweeping from the same angular position after an effect switch.
   */
  updateData(modeData: EffectData): void {
    if (!modeData) return
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.ledData    = computeFrames(modeData)
    this.frameCount = this.ledData.length
    this._startLoop()
  }

  /**
   * Offload frame computation to the Web Worker.
   * The animation continues with the current effect until the Worker responds,
   * at which point it switches seamlessly to the new frames.
   */
  updateDataAsync(modeData: EffectData): void {
    if (!modeData) return
    workerPool.compute(modeData, (frames) => {
      this.loadFrames(frames)
    })
  }

  /**
   * Load pre-computed frames directly (result from Worker or cache).
   * Does NOT reset arm position or clear glow trail.
   */
  loadFrames(ledData: LedData): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.ledData    = ledData
    this.frameCount = ledData.length
    this._startLoop()
  }

  /** Dynamically update display parameters without recreating the element. */
  setParams(params: { circumference?: number; speed?: number; fps?: number; fadeSpeed?: number }): void {
    if (params.circumference !== undefined) this.innerRadius = params.circumference
    if (params.speed        !== undefined) this.speed        = params.speed
    if (params.fps          !== undefined) this.fps          = params.fps
    if (params.fadeSpeed    !== undefined) this.fadeSpeed    = params.fadeSpeed
  }

  private _startLoop(): void {
    const loop = (timestamp: number) => {
      const interval = 1000 / this.fps
      if (timestamp - this._lastFrameTime >= interval) {
        this._drawFrame(this.currentFrame)
        this.currentFrame = (this.currentFrame + 1) % this.frameCount
        this._lastFrameTime = timestamp
      }
      this.animationId = requestAnimationFrame(loop)
    }
    this.animationId = requestAnimationFrame(loop)
  }

  // ---------------------------------------------------------------------------
  //  Canvas helpers
  // ---------------------------------------------------------------------------

  private _drawBackground(): void {
    const { width, height } = this.canvas
    const imageData = this.ctx.getImageData(0, 0, width, height)
    const d = imageData.data
    // Black fill
    for (let i = 0; i < d.length; i += 4) { d[i] = 0; d[i+1] = 0; d[i+2] = 0; d[i+3] = 255 }
    // Grid columns
    for (let x = 0; x < width; x += 20)
      for (let y = 0; y < height; y++) { const idx=(y*width+x)*4; d[idx]=d[idx+1]=d[idx+2]=27 }
    // Grid rows
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y += 20) { const idx=(y*width+x)*4; d[idx]=d[idx+1]=d[idx+2]=27 }
    this.ctx.putImageData(imageData, 0, 0)
  }

  /**
   * Render one animation tick using the accumulative POV trail model:
   *  - The arm sweeps one angular slice per tick, drawing fresh LED data.
   *  - Old content on the glow canvas fades each tick via destination-out,
   *    simulating eye persistence: recently swept areas are bright, older ones dim.
   *  - Two arms are drawn 180° apart.
   */
  private _drawFrame(frameOffset: number): void {
    const { width, height } = this.canvas
    const cx          = width  >> 1
    const cy          = height >> 1
    const showTime    = Math.floor(MAX_FRAMES / this.speed)
    const outerRadius = this.innerRadius + 140
    const halfSlice   = Math.PI / showTime   // angular half-width of one time step

    // Arm angle advances one full rotation per showTime ticks
    const armAngle = (frameOffset % showTime) / showTime * (2 * Math.PI)

    const gc = this.glowCtx

    // ── Fade existing trail ─────────────────────────────────────────────────
    // destination-out reduces the alpha of all existing pixels, making the
    // trail decay toward transparent without leaving opaque black behind.
    // At the start of each new rotation, force clearRect to eliminate the
    // exponential residue that never reaches exact zero.
    const posInRotation = frameOffset % showTime
    if (posInRotation === 0) {
      gc.clearRect(0, 0, width, height)
    } else {
      gc.globalCompositeOperation = 'destination-out'
      gc.fillStyle = `rgba(0,0,0,${this.fadeSpeed})`
      gc.fillRect(0, 0, width, height)
      gc.globalCompositeOperation = 'source-over'
    }

    // ── Draw current arm strip ──────────────────────────────────────────────
    const frameIdx = frameOffset % this.frameCount
    const frame    = this.ledData[frameIdx]

    if (frame) {
      for (let j = 0; j < 32; j++) {
        const pixel = frame[j]
        if (!pixel) continue
        const [r, g, b] = pixel
        if (r + g + b === 0) continue   // skip black LEDs

        const outerR = outerRadius - j * this.ledBulbSpacing
        const innerR = Math.max(0, outerRadius - (j + 1) * this.ledBulbSpacing)

        gc.fillStyle = `rgb(${r},${g},${b})`

        // Arm 1
        gc.beginPath()
        gc.arc(cx, cy, outerR, armAngle - halfSlice, armAngle + halfSlice)
        gc.arc(cx, cy, innerR, armAngle + halfSlice, armAngle - halfSlice, true)
        gc.closePath()
        gc.fill()

        // Arm 2 — 180° offset, same data
        const a2 = armAngle + Math.PI
        gc.beginPath()
        gc.arc(cx, cy, outerR, a2 - halfSlice, a2 + halfSlice)
        gc.arc(cx, cy, innerR, a2 + halfSlice, a2 - halfSlice, true)
        gc.closePath()
        gc.fill()
      }
    }

    // ── Composite onto visible canvas ───────────────────────────────────────
    this.ctx.drawImage(this.bgCanvas, 0, 0)

    // Bloom pass (blurred halo — gives the LED glow appearance)
    this.ctx.save()
    this.ctx.filter = 'blur(6px)'
    this.ctx.globalAlpha = 0.55
    this.ctx.drawImage(this.glowCanvas as CanvasImageSource, 0, 0)
    this.ctx.restore()

    // Crisp core pass
    this.ctx.drawImage(this.glowCanvas as CanvasImageSource, 0, 0)
  }

  // ---------------------------------------------------------------------------
  //  (Computation methods removed — now in previewCompute.ts)
  // ---------------------------------------------------------------------------
}

if (!customElements.get('pre-view')) {
  customElements.define('pre-view', PreviewElement)
}
