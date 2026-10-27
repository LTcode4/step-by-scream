<template>
  <div v-if="modelValue" class="tutorial-overlay pointer-events-none absolute inset-0">
    <div
      class="absolute inset-0 z-30 transition-opacity duration-500"
      :class="[spotStyle ? '' : 'bg-black/60', { 'opacity-20': dim }]"
      :style="spotStyle" />

    <span
      v-if="spot"
      class="mark-ring absolute z-[45]"
      :class="{ faint: (markPos?.visibility ?? 1) < 0.3 }"
      :style="{
        left: `${spot.cx - spot.rx}px`,
        top: `${spot.cy - spot.ry}px`,
        width: `${spot.rx * 2}px`,
        height: `${spot.ry * 2}px`,
      }" />

    <div class="absolute inset-x-0 top-0 z-[45] flex items-center justify-end p-4">
      <button
        class="pointer-events-auto border-2 border-white px-3 py-1 text-body font-bold"
        @pointerdown.stop
        @click="finish">
        略過 ›
      </button>
    </div>

    <div
      v-if="centerGesture"
      :key="`g-${step.id}`"
      class="anim-rise absolute left-1/2 top-[42%] z-[45] -translate-x-1/2 -translate-y-1/2">
      <GestureHint :type="centerGesture" />
    </div>

    <span
      v-if="candyPicked"
      class="fuel-pop absolute z-[45] font-mono text-title font-black text-pumpkin">
      +{{ CANDY_FUEL_PERCENT }}%
    </span>

    <template v-if="step.id === 'rules'">
      <span class="hud-ring hud-ring-hearts absolute z-[45]" />
      <span class="hud-ring hud-ring-fuel absolute z-[45]" />
    </template>

    <div v-if="step.id === 'pumpkin' && phase === 'jump'" class="jump-hint absolute z-[45]">
      <GestureHint type="tap" />
    </div>

    <div
      v-if="step.id !== 'done'"
      :key="`t-${step.id}-${phase}`"
      class="anim-rise absolute z-[45]"
      :class="
        step.id === 'rules'
          ? 'rules-text text-left'
          : ['inset-x-6 text-center', step.id === 'score' ? 'top-[14%]' : 'top-[60%]']
      ">
      <p v-if="title" class="text-title font-black tracking-widest">{{ title }}</p>
      <p v-if="text" class="mt-2 text-body leading-relaxed text-white/60">{{ text }}</p>
      <div v-if="step.id === 'score'" class="mt-4 inline-flex flex-col gap-2 text-left">
        <p class="flex items-center gap-3 text-title font-black">
          <PixelArt name="stairs" class="w-8" />每一階<span class="text-pumpkin">+1 分</span>
        </p>
        <p class="flex items-center gap-3 text-title font-black">
          <PixelArt name="candy" class="w-8" />糖果<span class="text-pumpkin">+5 分</span>
        </p>
      </div>
      <p
        v-if="step.id === 'tap' && TAP_TIMES > 1"
        class="mt-3 font-mono text-title font-bold text-pumpkin">
        {{ count }} / {{ TAP_TIMES }}
      </p>
    </div>

    <div class="pointer-events-auto">
      <TutorialDoneDialog :model-value="step.id === 'done'" @start="finish" />
    </div>
  </div>
</template>

<script lang="ts">
export type { TutorialAction } from 'src/utils/tutorial';
</script>

<script setup lang="ts">
import GestureHint from 'components/GestureHint.vue';
import PixelArt from 'components/PixelArt.vue';
import TutorialDoneDialog from 'components/TutorialDoneDialog.vue';
import { CANDY_FUEL, type StairGame } from 'src/game/StairGame';
import { TAP_TIMES, useTutorial } from 'src/utils/tutorial';

const CANDY_FUEL_PERCENT = Math.round(CANDY_FUEL * 100);

const props = defineProps<{ modelValue: boolean; game?: StairGame }>();
const emit = defineEmits<{
  (e: 'finish'): void;
  (e: 'highlight-jump', v: boolean): void;
  (e: 'highlight-fuel', v: boolean): void;
  (e: 'highlight-hearts', v: boolean): void;
}>();

const {
  step,
  phase,
  count,
  markPos,
  centerGesture,
  candyPicked,
  spot,
  spotStyle,
  title,
  text,
  dim,
  finish,
  notify,
  onCandy,
  onGhostPass,
  onPumpkinPass,
  allows,
} = useTutorial(props, emit);

defineExpose({ notify, onCandy, onGhostPass, onPumpkinPass, allows });
</script>
