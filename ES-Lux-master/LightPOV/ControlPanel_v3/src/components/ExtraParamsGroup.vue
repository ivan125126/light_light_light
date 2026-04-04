<template>
  <div class="extra_params" v-if="schema && extra">
    <template v-if="schema.bladeCount">
      <label>Blade Count</label>
      <input type="number" min="0" max="12" v-model.number="extra.bladeCount" @input="emitUpdate" />
    </template>
    <template v-if="schema.length">
      <label>Length</label>
      <input type="range" min="0" max="300" v-model.number="extra.length" @input="emitUpdate" />
      <span>{{ extra.length }}</span>
    </template>
    <template v-if="schema.curvature">
      <label>Curvature</label>
      <input type="range" min="0" max="100" v-model.number="extra.curvature" @input="emitUpdate" />
    </template>
    <template v-if="schema.boxsize">
      <label>Box Size</label>
      <input type="range" min="0" max="300" v-model.number="extra.boxsize" @input="emitUpdate" />
    </template>
    <template v-if="schema.space">
      <label>Space</label>
      <input type="range" min="0" max="100" v-model.number="extra.space" @input="emitUpdate" />
    </template>
    <template v-if="schema.reverse">
      <label>Reverse</label>
      <input type="checkbox" :checked="extra.reverse === 1"
        @change="extra.reverse = ($event.target as HTMLInputElement).checked ? 1 : 0; emitUpdate()" />
    </template>
    <template v-if="schema.positionFix">
      <label>Position Fix</label>
      <input type="range" min="0" max="255" v-model.number="extra.positionFix" @input="emitUpdate" />
    </template>
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
