<template>
  <div class="hsv_block" v-if="channel">
    <!-- 通道名稱 + function 選擇 -->
    <div class="param_group_title">{{ label }}</div>
    <select class="hsv_func_select" v-model="funcName" @change="onFuncChange">
      <option value="None">None</option>
      <option value="Const">Const</option>
      <option value="Ramp">Ramp</option>
      <option value="Triangle">Triangle</option>
      <option value="Pulse">Pulse</option>
      <option value="Step">Step</option>
    </select>

    <!-- Const -->
    <div v-if="funcName === 'Const'" class="hsv_func_params active">
      <div class="param_field compact">
        <label>Value {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
        </div>
      </div>
    </div>

    <!-- Ramp / Triangle -->
    <div v-if="funcName === 'Ramp' || funcName === 'Triangle'" class="hsv_func_params active">
      <div class="param_field compact">
        <label>Upper {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
        </div>
      </div>
      <div class="param_field compact">
        <label>Range {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.range" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.range" @input="emitUpdate" />
        </div>
      </div>
      <div class="param_field compact">
        <label>Lower {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.lower" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.lower" @input="emitUpdate" />
        </div>
      </div>
    </div>

    <!-- Pulse -->
    <div v-if="funcName === 'Pulse'" class="hsv_func_params active">
      <div class="param_field compact">
        <label>Top {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
        </div>
      </div>
      <div class="param_field compact">
        <label>Range {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.range" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.range" @input="emitUpdate" />
        </div>
      </div>
      <div class="param_field compact">
        <label>Lower {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.lower" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.lower" @input="emitUpdate" />
        </div>
      </div>
    </div>

    <!-- Step -->
    <div v-if="funcName === 'Step'" class="hsv_func_params active">
      <div class="param_field compact">
        <label>Height {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.p1" @input="emitUpdate" />
        </div>
      </div>
      <div class="param_field compact">
        <label>Steps</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" max="255"
            v-model.number="channel.p2" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" max="255"
            v-model.number="channel.p2" @input="emitUpdate" />
        </div>
      </div>
      <div class="param_field compact">
        <label>Range {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.range" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.range" @input="emitUpdate" />
        </div>
      </div>
      <div class="param_field compact">
        <label>Lower {{ unit }}</label>
        <div class="param_input_row">
          <input type="number" class="func_number" min="0" :max="maxVal"
            v-model.number="channel.lower" @input="emitUpdate" />
          <input type="range" class="func_range" min="0" :max="maxVal"
            v-model.number="channel.lower" @input="emitUpdate" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { HsvChannel } from '../types'

const FUNC_CODES: Record<string, 0|1|2|3|4|5> = {
  None: 0, Const: 1, Ramp: 2, Triangle: 3, Pulse: 4, Step: 5
}
const FUNC_NAMES = ['None', 'Const', 'Ramp', 'Triangle', 'Pulse', 'Step']

const props = defineProps<{ label: string; channel: HsvChannel }>()
const emit = defineEmits<{ (e: 'update:channel', v: HsvChannel): void }>()

// 從 label 判斷單位（僅顯示用，內部值一律 0–255）
const unit = props.label.includes('°') ? '°' : props.label.includes('%') ? '%' : ''
const maxVal = 255

const funcName = ref(FUNC_NAMES[props.channel.func] ?? 'None')

watch(() => props.channel.func, (f) => {
  funcName.value = FUNC_NAMES[f] ?? 'None'
})

function onFuncChange() {
  props.channel.func = FUNC_CODES[funcName.value] ?? 0
  emitUpdate()
}

function emitUpdate() {
  emit('update:channel', { ...props.channel })
}
</script>
