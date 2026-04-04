<template>
  <div class="hsv_block" v-if="channel">
    <label>{{ label }}</label>
    <select v-model="funcName" @change="onFuncChange">
      <option value="None">None</option>
      <option value="Const">Const</option>
      <option value="Ramp">Ramp</option>
      <option value="Triangle">Triangle</option>
      <option value="Pulse">Pulse</option>
      <option value="Step">Step</option>
    </select>

    <!-- Const -->
    <template v-if="funcName === 'Const'">
      <label>Value</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emitUpdate" />
      <span>{{ channel.p1 }}</span>
    </template>

    <!-- Ramp / Triangle -->
    <template v-if="funcName === 'Ramp' || funcName === 'Triangle'">
      <label>Upper</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emitUpdate" />
      <label>Range</label>
      <input type="range" min="0" max="255" v-model.number="channel.range" @input="emitUpdate" />
      <label>Lower</label>
      <input type="range" min="0" max="255" v-model.number="channel.lower" @input="emitUpdate" />
    </template>

    <!-- Pulse -->
    <template v-if="funcName === 'Pulse'">
      <label>Top</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emitUpdate" />
      <label>Range</label>
      <input type="range" min="0" max="255" v-model.number="channel.range" @input="emitUpdate" />
      <label>Lower</label>
      <input type="range" min="0" max="255" v-model.number="channel.lower" @input="emitUpdate" />
    </template>

    <!-- Step -->
    <template v-if="funcName === 'Step'">
      <label>Height</label>
      <input type="range" min="0" max="255" v-model.number="channel.p1" @input="emitUpdate" />
      <label>Steps</label>
      <input type="range" min="0" max="255" v-model.number="channel.p2" @input="emitUpdate" />
      <label>Range</label>
      <input type="range" min="0" max="255" v-model.number="channel.range" @input="emitUpdate" />
      <label>Lower</label>
      <input type="range" min="0" max="255" v-model.number="channel.lower" @input="emitUpdate" />
    </template>
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
