<template>
  <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
    <div class="flex flex-col items-start gap-2">
      <div class="relative flex gap-1" :class="{ 'z-40': highlightHearts }">
        <PixelArt
          v-for="i in 3"
          :key="i"
          name="heart"
          class="h-5 w-5"
          :class="{ 'opacity-20': i > hearts }" />
      </div>
      <div
        class="relative flex items-center gap-1.5"
        :class="{ 'fuel-low': fuel < 0.3, 'z-40': highlightFuel }">
        <PixelArt name="lantern" class="h-4 w-3" />
        <div class="h-2.5 w-24 border border-pumpkin p-px">
          <div class="fuel-fill h-full bg-pumpkin" :style="{ width: `${fuel * 100}%` }" />
        </div>
        <span v-if="highlightFuel" class="font-mono text-body font-bold text-pumpkin">
          {{ Math.round(fuel * 100) }}%
        </span>
      </div>
    </div>
    <div class="flex flex-col items-end gap-2">
      <button
        v-if="showTutorial"
        class="pointer-events-auto border border-white/60 bg-black/60 px-2.5 py-1 text-body font-bold"
        aria-label="教學模式"
        @pointerdown.stop
        @click="emit('open-tutorial')">
        教學
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import PixelArt from 'components/PixelArt.vue';

defineProps<{
  hearts: number;
  fuel: number;
  highlightHearts: boolean;
  highlightFuel: boolean;
  showTutorial: boolean;
}>();
const emit = defineEmits<{ (e: 'open-tutorial'): void }>();
</script>
