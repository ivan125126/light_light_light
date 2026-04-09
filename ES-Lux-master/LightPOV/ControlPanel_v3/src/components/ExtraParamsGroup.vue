<template>
  <div v-if="schema && extra" class="extra_params">

    <div v-if="schema.bladeCount" class="param_group">
      <label class="param_label">扇葉數量</label>
      <div class="param_input_row">
        <input type="number" class="func_number" min="0" max="12"
          v-model.number="extra.bladeCount" @input="emitUpdate" />
        <input type="range" class="func_range" min="0" max="12"
          v-model.number="extra.bladeCount" @input="emitUpdate" />
      </div>
    </div>

    <div v-if="schema.length" class="param_group">
      <label class="param_label">長度</label>
      <div class="param_input_row">
        <input type="number" class="func_number" min="0" max="300"
          v-model.number="extra.length" @input="emitUpdate" />
        <input type="range" class="func_range" min="0" max="300"
          v-model.number="extra.length" @input="emitUpdate" />
      </div>
    </div>

    <div v-if="schema.curvature" class="param_group">
      <label class="param_label">曲度</label>
      <div class="param_input_row">
        <input type="number" class="func_number" min="0" max="100"
          v-model.number="extra.curvature" @input="emitUpdate" />
        <input type="range" class="func_range" min="0" max="100"
          v-model.number="extra.curvature" @input="emitUpdate" />
      </div>
    </div>

    <div v-if="schema.boxsize" class="param_group">
      <label class="param_label">方塊大小</label>
      <div class="param_input_row">
        <input type="number" class="func_number" min="0" max="255"
          v-model.number="extra.boxsize" @input="emitUpdate" />
        <input type="range" class="func_range" min="0" max="255"
          v-model.number="extra.boxsize" @input="emitUpdate" />
      </div>
    </div>

    <div v-if="schema.space" class="param_group">
      <label class="param_label">間距</label>
      <div class="param_input_row">
        <input type="number" class="func_number" min="0" max="100"
          v-model.number="extra.space" @input="emitUpdate" />
        <input type="range" class="func_range" min="0" max="100"
          v-model.number="extra.space" @input="emitUpdate" />
      </div>
    </div>

    <div v-if="schema.positionFix" class="param_group">
      <label class="param_label">位置</label>
      <div class="param_input_row">
        <input type="number" class="func_number" min="0" max="255"
          v-model.number="extra.positionFix" @input="emitUpdate" />
        <input type="range" class="func_range" min="0" max="255"
          v-model.number="extra.positionFix" @input="emitUpdate" />
      </div>
    </div>

    <div v-if="schema.reverse" class="param_group">
      <label class="param_label">反向</label>
      <div class="param_input_row">
        <input type="checkbox"
          :checked="extra.reverse === 1"
          @change="extra.reverse = ($event.target as HTMLInputElement).checked ? 1 : 0; emitUpdate()"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { ExtraParams, ExtraParamSchema } from '../types'

const props = defineProps<{ schema: ExtraParamSchema; extra: ExtraParams }>()
const emit = defineEmits<{ (e: 'update:extra', v: ExtraParams): void }>()

function emitUpdate() {
  emit('update:extra', { ...props.extra })
}
</script>
