import * as fabric from 'fabric'
import { useEffectStore } from '../stores/effectStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useSelectionStore } from '../stores/selectionStore'
import { useUndoStore } from '../stores/undoStore'
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

  reposition(): void {
    if (!this.fabricGroup) return
    const timelineStore = useTimelineStore()
    this.fabricGroup.left = timelineStore.msToPixel(this.startTime)
    this._updateDimensionsFromTime()
  }

  setHighlight(selected: boolean): void {
    if (!this.fabricGroup) return
    const bgRect = this.fabricGroup.item(0) as fabric.Rect
    bgRect.set({
      stroke: selected ? '#4a9eff' : '#888',
      strokeWidth: selected ? 2 : 1,
    })
    this._canvas.requestRenderAll()
  }

  private _bindEvents(canvas: fabric.Canvas) {
    const group = this.fabricGroup!
    const timelineStore = useTimelineStore()
    const effectStore = useEffectStore()
    const selectionStore = useSelectionStore()
    const undoStore = useUndoStore()

    let gestureSnapped = false
    // id → pixel offset relative to this block at drag start (for co-moving selected blocks)
    const otherBlockOffsets = new Map<string, number>()

    group.on('mousedown', (opt) => {
      gestureSnapped = false
      const isShift = (opt.e as MouseEvent).shiftKey
      if (isShift) {
        selectionStore.toggle(this.id)
      } else if (!selectionStore.selectedIds.includes(this.id)) {
        // Only reset selection when clicking an unselected block
        selectionStore.setOnly(this.id)
        effectStore.setPreviewDefinition(null)  // 切回多 Lux 模式，清除素材庫預覽
        effectStore.selectInstance(this.id)
      }
      // If block is already selected (plain click on selected) → keep multi-selection intact
    })

    group.on('moving', () => {
      if (!gestureSnapped) {
        undoStore.push()
        gestureSnapped = true
        // Record relative offsets of all other selected blocks
        otherBlockOffsets.clear()
        const myLeft = group.left
        canvas.getObjects().forEach(obj => {
          const lb = (obj as fabric.Group & { logicBlock?: EffectBlock }).logicBlock
          if (!lb || lb.id === this.id) return
          if (selectionStore.selectedIds.includes(lb.id)) {
            otherBlockOffsets.set(lb.id, (obj as fabric.Group).left - myLeft)
          }
        })
      }
      // Pass co-moving IDs so boundaries skip them as obstacles
      const coMovingIds = new Set(otherBlockOffsets.keys())
      const bounds = this._getSafeBoundaries(canvas, coMovingIds)
      const currentWidth = group.getScaledWidth()
      if (group.left < bounds.minX) group.left = bounds.minX
      if (group.left + currentWidth > bounds.maxX) group.left = bounds.maxX - currentWidth

      this.startTime = timelineStore.pixelToMs(group.left)

      // Move all other selected blocks by the same relative offset
      canvas.getObjects().forEach(obj => {
        const lb = (obj as fabric.Group & { logicBlock?: EffectBlock }).logicBlock
        if (!lb || lb.id === this.id) return
        const offset = otherBlockOffsets.get(lb.id)
        if (offset === undefined) return
        const otherGroup = obj as fabric.Group
        otherGroup.left = group.left + offset
        lb.startTime = timelineStore.pixelToMs(otherGroup.left)
        otherGroup.setCoords()
      })
      canvas.requestRenderAll()
    })

    group.on('scaling', () => {
      if (!gestureSnapped) {
        undoStore.push()
        gestureSnapped = true
      }
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
    })

    group.on('modified', () => {
      gestureSnapped = false
      const exists = effectStore.instances.some(i => i.id === this.id)
      if (!exists) return
      effectStore.updateInstance(this.id, {
        startTime: this.startTime,
        duration: this.duration,
      })
      // Persist co-moved blocks
      canvas.getObjects().forEach(obj => {
        const lb = (obj as fabric.Group & { logicBlock?: EffectBlock }).logicBlock
        if (!lb || lb.id === this.id) return
        if (!otherBlockOffsets.has(lb.id)) return
        if (!effectStore.instances.some(i => i.id === lb.id)) return
        effectStore.updateInstance(lb.id, {
          startTime: lb.startTime,
          duration: lb.duration,
        })
      })
      otherBlockOffsets.clear()
    })
  }

  private _getSafeBoundaries(canvas: fabric.Canvas, skipIds: Set<string> = new Set()): { minX: number; maxX: number } {
    const timelineStore = useTimelineStore()
    let minX = -timelineStore.timelineOffset / timelineStore.secondsPerPixel
    let maxX = Infinity
    const activeObj = this.fabricGroup!

    const activeCenter = activeObj.left + activeObj.getScaledWidth() / 2

    canvas.getObjects().forEach(other => {
      if (other === activeObj) return
      const o = other as fabric.Group & { logicBlock?: EffectBlock }
      if (!o.logicBlock) return
      // Skip blocks that are moving together with this one
      if (skipIds.has(o.logicBlock.id)) return

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
