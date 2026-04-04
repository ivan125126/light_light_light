import * as fabric from 'fabric'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import type { EffectParams } from '../types'

export class EffectBlock {
  id: string
  name: string
  startTime: number
  duration: number
  fabricGroup: fabric.Group | null
  private _canvas: fabric.Canvas

  constructor(id: string, name: string, canvas: fabric.Canvas) {
    this.id = id
    this.name = name
    this.startTime = 0
    this.duration = 1
    this.fabricGroup = null
    this._canvas = canvas
  }

  get params(): EffectParams {
    return useEffectStore().instances.find(i => i.id === this.id)?.params ?? useEffectStore().instances[0]?.params
  }

  set params(v: EffectParams) {
    useEffectStore().updateInstance(this.id, { params: v })
  }

  render() {
    const timelineStore = useTimelineStore()
    const x = timelineStore.msToPixel(this.startTime)
    const y = this._canvas.getHeight() / 2

    const boxHeight = 36
    const bgRect = new fabric.Rect({
      width: 100, height: boxHeight,
      fill: '#444', stroke: '#888', strokeWidth: 1,
      rx: 4, ry: 4,
      originX: 'center', originY: 'center', strokeUniform: true,
    })

    const textObj = new fabric.FabricText(this.name, {
      fontSize: 12, fill: '#fff',
      originX: 'center', originY: 'center',
    })

    this.fabricGroup = new fabric.Group([bgRect, textObj], {
      left: x, top: y,
      originX: 'left', originY: 'center',
      selectable: true,
      lockMovementY: true, lockScalingY: true, lockRotation: true,
      hasBorders: false, cornerColor: 'white', cornerSize: 8,
      transparentCorners: false, objectCaching: false,
    })

    // Attach logic reference
    ;(this.fabricGroup as fabric.Group & { logicBlock: EffectBlock }).logicBlock = this

    this.fabricGroup.setControlsVisibility({
      mt: false, mb: false, ml: true, mr: true,
      bl: false, br: false, tl: false, tr: false, mtr: false,
    })

    this._updateDimensionsFromTime()
    this._bindEvents(this._canvas)

    this._canvas.add(this.fabricGroup)
    this._canvas.requestRenderAll()
  }

  private _bindEvents(canvas: fabric.Canvas) {
    const group = this.fabricGroup!
    const timelineStore = useTimelineStore()
    const effectStore = useEffectStore()

    group.on('moving', () => {
      const bounds = this._getSafeBoundaries(canvas)
      const currentWidth = group.getScaledWidth()
      if (group.left < bounds.minX) group.left = bounds.minX
      if (group.left + currentWidth > bounds.maxX) group.left = bounds.maxX - currentWidth

      this.startTime = timelineStore.pixelToMs(group.left)
      effectStore.updateInstance(this.id, { startTime: this.startTime })
    })

    group.on('scaling', () => {
      const bounds = this._getSafeBoundaries(canvas)
      const currentWidth = group.getScaledWidth()
      const textObj = group.item(1) as fabric.FabricText

      textObj.set({ scaleX: 1 / group.scaleX, scaleY: 1 / group.scaleY })

      if (group.left < bounds.minX) group.left = bounds.minX
      if (group.left + currentWidth > bounds.maxX) {
        const maxWidth = bounds.maxX - group.left
        group.scaleX = maxWidth / group.width
      }

      this.duration = group.getScaledWidth() * timelineStore.secondsPerPixel * 1000
      this.startTime = timelineStore.pixelToMs(group.left)
      effectStore.updateInstance(this.id, { startTime: this.startTime, duration: this.duration })
    })

    group.on('mousedown', () => {
      effectStore.selectInstance(this.id)
    })
  }

  private _getSafeBoundaries(canvas: fabric.Canvas): { minX: number; maxX: number } {
    const timelineStore = useTimelineStore()
    let minX = -timelineStore.timelineOffset / timelineStore.secondsPerPixel
    let maxX = Infinity
    const activeObj = this.fabricGroup!

    const activeCenter = activeObj.left + activeObj.getScaledWidth() / 2

    canvas.getObjects().forEach(other => {
      if (other === activeObj) return
      const o = other as fabric.Group & { logicBlock?: EffectBlock }
      if (!o.logicBlock) return

      const otherLeft = other.left
      const otherRight = other.left + other.getScaledWidth()
      const otherCenter = otherLeft + other.getScaledWidth() / 2

      if (otherCenter < activeCenter) {
        if (otherRight > minX) minX = otherRight
      }
      if (otherCenter > activeCenter) {
        if (otherLeft < maxX) maxX = otherLeft
      }
    })

    return { minX, maxX }
  }

  private _updateDimensionsFromTime() {
    if (!this.fabricGroup) return
    const timelineStore = useTimelineStore()
    const targetWidthPx = this.duration / 1000 / timelineStore.secondsPerPixel
    this.fabricGroup.scaleX = targetWidthPx / this.fabricGroup.width
    const textObj = this.fabricGroup.item(1) as fabric.FabricText
    if (textObj) {
      textObj.set({ scaleX: 1 / this.fabricGroup.scaleX, scaleY: 1 })
    }
  }
}

export default EffectBlock
