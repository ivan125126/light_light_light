<template>
  <div class="control_panel">
    <!-- 表頭 -->
    <div class="control_table_header">
      <span>ID</span>
      <span>狀態</span>
      <span>當前效果</span>
      <span>對應 Track</span>
    </div>

    <!-- lux 列表 -->
    <div
      v-for="unit in store.units"
      :key="unit.id"
      class="control_row"
    >
      <span>{{ unit.id }}</span>
      <span
        class="state_text"
        :class="unit.connected ? 'connected' : 'disconnected'"
      >{{ unit.connected ? '已連線' : '斷線' }}</span>
      <span class="time_text">{{ currentEffectName(unit) }}</span>
      <select
        class="track_select"
        :value="unit.trackIndex ?? ''"
        @change="onTrackChange(unit.id, $event)"
      >
        <option value="">未對應</option>
        <option
          v-for="(track, i) in timelineStore.tracks"
          :key="track.id"
          :value="i"
        >{{ track.name }}</option>
      </select>
    </div>

    <!-- 無 lux 時的空狀態提示 -->
    <div v-if="store.units.length === 0" class="control_empty">
      尚未新增 lux 單元
    </div>

    <!-- 底部操作列 -->
    <div class="control_actions">
      <button class="control_btn" @click="store.addUnit()">＋ 新增 lux</button>
      <button
        class="control_btn control_btn--danger"
        :disabled="store.units.length === 0"
        @click="store.removeLastUnit()"
      >－ 刪除最後一個</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useHardwareStore } from '../stores/hardwareStore'
import { useTimelineStore } from '../stores/timelineStore'
import { useEffectStore } from '../stores/effectStore'
import type { LuxUnit } from '../types'

const props = defineProps<{ active: boolean }>()
const store = useHardwareStore()
const timelineStore = useTimelineStore()
const effectStore = useEffectStore()

watch(
  () => props.active,
  (val) => {
    if (val) store.startPolling()
    else store.stopPolling()
  },
  { immediate: true }
)

onUnmounted(() => store.stopPolling())

function onTrackChange(unitId: number, event: Event) {
  const val = (event.target as HTMLSelectElement).value
  store.setTrackIndex(unitId, val === '' ? null : Number(val))
}

function currentEffectName(unit: LuxUnit): string {
  if (unit.trackIndex === null) return '--'
  const time = timelineStore.globalTime
  const instance = effectStore.instances.find(
    i => i.trackIndex === unit.trackIndex! &&
         i.startTime <= time &&
         time < i.startTime + i.duration
  )
  return instance?.definitionName ?? '--'
}
</script>

<style scoped>
.control_panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.control_empty {
  padding: 16px 8px;
  color: #666;
  font-size: 13px;
  text-align: center;
}

.control_actions {
  display: flex;
  gap: 8px;
  padding: 10px 6px;
  border-top: 1px solid #333;
  margin-top: auto;
}

.control_btn {
  flex: 1;
  padding: 6px 8px;
  background: #2a3a4a;
  color: #c8dff0;
  border: 1px solid #3a5068;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}

.control_btn:hover:not(:disabled) {
  background: #344e63;
}

.control_btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control_btn--danger {
  background: #3a2020;
  color: #f08080;
  border-color: #5a3030;
}

.control_btn--danger:hover:not(:disabled) {
  background: #4a2828;
}

/* 4 columns: ID | 狀態 | 當前效果 | 對應 Track */
.control_table_header,
.control_row {
  display: grid;
  grid-template-columns: 30px 60px 1fr 1fr;
}

.track_select {
  background: #1e2d3a;
  color: #c8dff0;
  border: 1px solid #3a5068;
  border-radius: 4px;
  font-size: 12px;
  padding: 2px 4px;
  cursor: pointer;
}

.track_select:focus {
  outline: none;
  border-color: #5a8ab0;
}
</style>
