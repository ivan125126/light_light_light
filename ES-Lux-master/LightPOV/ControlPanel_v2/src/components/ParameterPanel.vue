<template>
  <div class="param_panel" v-if="selected">
    <h3>{{ selected.definitionName }}</h3>

    <!-- HSV 六通道 -->
    <HsvChannelGroup label="XH" :channel="selected.params.XH"
      @update:channel="updateChannel('XH', $event)" />
    <HsvChannelGroup label="XS" :channel="selected.params.XS"
      @update:channel="updateChannel('XS', $event)" />
    <HsvChannelGroup label="XV" :channel="selected.params.XV"
      @update:channel="updateChannel('XV', $event)" />
    <HsvChannelGroup label="YH" :channel="selected.params.YH"
      @update:channel="updateChannel('YH', $event)" />
    <HsvChannelGroup label="YS" :channel="selected.params.YS"
      @update:channel="updateChannel('YS', $event)" />
    <HsvChannelGroup label="YV" :channel="selected.params.YV"
      @update:channel="updateChannel('YV', $event)" />

    <!-- 額外參數 -->
    <ExtraParamsGroup
      v-if="definition"
      :schema="definition.extraParamSchema"
      :extra="selected.params.extra"
      @update:extra="updateExtra"
    />
  </div>
  <div class="param_panel empty" v-else>
    <p>點選 Timeline 上的效果 block 以編輯參數</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEffectStore } from '../stores/effectStore'
import HsvChannelGroup from './HsvChannelGroup.vue'
import ExtraParamsGroup from './ExtraParamsGroup.vue'
import type { HsvChannel, ExtraParams } from '../types'

const effectStore = useEffectStore()
const selected   = computed(() => effectStore.selectedInstance)
const definition = computed(() =>
  selected.value ? effectStore.getDefinition(selected.value.definitionName) : undefined
)

function updateChannel(key: 'XH'|'XS'|'XV'|'YH'|'YS'|'YV', value: HsvChannel) {
  if (!selected.value) return
  effectStore.updateInstance(selected.value.id, {
    params: { ...selected.value.params, [key]: value }
  })
}

function updateExtra(value: ExtraParams) {
  if (!selected.value) return
  effectStore.updateInstance(selected.value.id, {
    params: { ...selected.value.params, extra: value }
  })
}
</script>
