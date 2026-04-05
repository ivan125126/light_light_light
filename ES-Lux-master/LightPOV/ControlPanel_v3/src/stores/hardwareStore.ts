import { defineStore } from 'pinia'
import { getLuxStat, getLuxLight } from '../services/hardwareService'
import type { LuxUnit } from '../types'

export const useHardwareStore = defineStore('hardware', {
  state: () => ({
    units: [] as LuxUnit[],
    _pollingId: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    addUnit() {
      const nextId = this.units.length > 0
        ? Math.max(...this.units.map(u => u.id)) + 1
        : 1
      this.units.push({ id: nextId, connected: false, modeName: '--' })
    },

    removeUnit(id: number) {
      this.units = this.units.filter(u => u.id !== id)
    },

    removeLastUnit() {
      if (this.units.length > 0) {
        this.units.pop()
      }
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
      // Snapshot IDs so we can re-look up units after each await
      // (units may be added/removed while requests are in-flight)
      const ids = this.units.map(u => u.id)
      for (const id of ids) {
        const zeroBasedId = id - 1
        const [stat, light] = await Promise.allSettled([
          getLuxStat(zeroBasedId),
          getLuxLight(zeroBasedId),
        ])
        // Re-find the unit after await in case it was removed during the request
        const unit = this.units.find(u => u.id === id)
        if (!unit) continue
        unit.connected = stat.status === 'fulfilled' && (now - stat.value) < 1000
        unit.modeName = (light.status === 'fulfilled' && light.value)
          ? light.value
          : '--'
      }
    },
  },
})
