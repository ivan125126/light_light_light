// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { effectDataToHardwareString, instanceToEffectData, instanceToHardwareString } from '../services/serializer'
import type { EffectData, EffectInstance } from '../types'
import { defaultEffectParams } from '../constants/effectConfig'

// Helper: all-zero channel
const zeroChannel = () => ({ func: 0 as const, range: 0, lower: 0, p1: 0, p2: 0 })

describe('effectDataToHardwareString', () => {

  it('MODES_PLAIN, all zero → M1S0D1000X0,0Y0,0Z0,0U0,0V0,0W0,0P0,0;', () => {
    const data: EffectData = {
      mode: 'MODES_PLAIN',
      start_time: 0,
      duration: 1000,
      XH: zeroChannel(), XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    expect(effectDataToHardwareString(data)).toBe(
      'M1S0D1000X0,0Y0,0Z0,0U0,0V0,0W0,0P0,0;'
    )
  })

  it('MODES_PLAIN, XH=FuncConst value=128 → X65536,32768', () => {
    // XH: func=1, range=0, lower=0, p1=128, p2=0
    // num1 = 1*65536 + 0 + 0 = 65536
    // num2 = 128*256 + 0 = 32768
    const data: EffectData = {
      mode: 'MODES_PLAIN',
      start_time: 0,
      duration: 1000,
      XH: { func: 1, range: 0, lower: 0, p1: 128, p2: 0 },
      XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    expect(effectDataToHardwareString(data)).toBe(
      'M1S0D1000X65536,32768Y0,0Z0,0U0,0V0,0W0,0P0,0;'
    )
  })

  it('MODES_CLEAR has mode enum 0', () => {
    const data: EffectData = {
      mode: 'MODES_CLEAR',
      start_time: 500, duration: 2000,
      XH: zeroChannel(), XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    expect(effectDataToHardwareString(data)).toMatch(/^M0S500D2000/)
  })

  it('Extra params p1=1 p3=128 p4=255 → P256,33023;', () => {
    // pNum1 = p1*256 + p2 = 1*256 + 0 = 256
    // pNum2 = p3*256 + p4 = 128*256 + 255 = 33023
    const data: EffectData = {
      mode: 'MODES_PLAIN', start_time: 0, duration: 0,
      XH: zeroChannel(), XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 1, p2: 0, p3: 128, p4: 255,
    }
    expect(effectDataToHardwareString(data)).toMatch(/P256,33023;$/)
  })

  it('FuncStep (func=5): num1 = 5*65536 = 327680, num2 = 200*256+10 = 51210', () => {
    const data: EffectData = {
      mode: 'MODES_PLAIN', start_time: 0, duration: 0,
      XH: { func: 5, range: 0, lower: 0, p1: 200, p2: 10 },
      XS: zeroChannel(), XV: zeroChannel(),
      YH: zeroChannel(), YS: zeroChannel(), YV: zeroChannel(),
      p1: 0, p2: 0, p3: 0, p4: 0,
    }
    expect(effectDataToHardwareString(data)).toMatch(/^M1S0D0X327680,51210/)
  })
})

describe('instanceToEffectData', () => {

  it('MODES_FAN bladeCount=6, length=150 → p3=128, p4=128', () => {
    // normalizeTo255(6, 0, 12) = round(6/12*255) = round(127.5) = 128
    // normalizeTo255(150, 0, 300) = round(150/300*255) = round(127.5) = 128
    // p1 = normalizeTo255(curvature=0, 0, 100) = 0
    const instance: EffectInstance = {
      id: 'test-1',
      definitionName: '扇形',
      trackIndex: 0,
      startTime: 0,
      duration: 1000,
      params: {
        ...defaultEffectParams(),
        extra: {
          bladeCount: 6, length: 150, curvature: 0,
          boxsize: 0, space: 0, reverse: 0, positionFix: 0,
        },
      },
    }
    const data = instanceToEffectData(instance, 'MODES_FAN')
    expect(data.p1).toBe(0)   // curvature=0
    expect(data.p3).toBe(128) // bladeCount=6
    expect(data.p4).toBe(128) // length=150
  })

  it('MODES_CMAP_DNA reverse=1 → p1=255', () => {
    const instance: EffectInstance = {
      id: 'test-2',
      definitionName: 'DNA',
      trackIndex: 0,
      startTime: 0,
      duration: 1000,
      params: {
        ...defaultEffectParams(),
        extra: {
          bladeCount: 0, length: 0, curvature: 0,
          boxsize: 0, space: 0, reverse: 1, positionFix: 0,
        },
      },
    }
    const data = instanceToEffectData(instance, 'MODES_CMAP_DNA')
    expect(data.p1).toBe(255)
  })
})

describe('instanceToHardwareString', () => {
  it('composes instanceToEffectData and effectDataToHardwareString correctly', () => {
    const instance: EffectInstance = {
      id: 'test-hw',
      definitionName: '純色',
      trackIndex: 0,
      startTime: 100,
      duration: 500,
      params: defaultEffectParams(),
    }
    expect(instanceToHardwareString(instance, 'MODES_PLAIN')).toBe(
      'M1S100D500X0,0Y0,0Z0,0U0,0V0,0W0,0P0,0;'
    )
  })
})
