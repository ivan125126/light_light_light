import { defineStore } from 'pinia'
import { getLuxStat, checkServerHealth } from '../services/hardwareService'
import type { LuxUnit } from '../types'

export const useHardwareStore = defineStore('hardware', {
  state: () => ({
    units: [] as LuxUnit[],
    liveHardware: false,
    _pollingId: null as ReturnType<typeof setInterval> | null,
    serverOnline: false as boolean,
    _serverPollingId: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    addUnit() {
      const nextId = this.units.length > 0
        ? Math.max(...this.units.map(u => u.id)) + 1
        : 1
      this.units.push({ id: nextId, connected: false, trackIndex: null })
    },

    removeUnit(id: number) {
      this.units = this.units.filter(u => u.id !== id)
    },

    removeLastUnit() {
      if (this.units.length > 0) {
        this.units.pop()
      }
    },

    setTrackIndex(id: number, trackIndex: number | null) {
      const unit = this.units.find(u => u.id === id)
      if (unit) unit.trackIndex = trackIndex
    },

    startPolling() {
      if (this._pollingId) return
      this._refresh()
      this._pollingId = setInterval(() => this._refresh(), 1000)
    },

    stopPolling() {
      if (this._pollingId) {
        clearInterval(this._pollingId)
        this._pollingId = null
      }
    },

    async _refresh() {
      const now = Date.now()
      const ids = this.units.map(u => u.id)
      for (const id of ids) {
        const zeroBasedId = id - 1
        const stat = await getLuxStat(zeroBasedId).catch(() => 0)
        const unit = this.units.find(u => u.id === id)
        if (!unit) continue
        unit.connected = (now - stat) < 1000
      }
    },

    startServerPolling() {
      if (this._serverPollingId) return
      this._checkServer()
      this._serverPollingId = setInterval(() => this._checkServer(), 3000)
    },

    stopServerPolling() {
      if (this._serverPollingId) {
        clearInterval(this._serverPollingId)
        this._serverPollingId = null
      }
    },

    async _checkServer() {
      this.serverOnline = await checkServerHealth()
    },
  },
})
