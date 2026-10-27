<template>
  <div class="landmark-egg flex flex-col items-center">
    <div class="landmark-scene relative w-full" :style="{ height: `${landmark.sceneHeight}rem` }">
      <span class="landmark-moon absolute" />
      <CobWeb class="absolute left-0 top-0 w-14" />
      <svg
        :viewBox="art.viewBox"
        class="landmark-building absolute bottom-0 left-1/2 h-full -translate-x-1/2"
        fill="none"
        stroke="currentColor"
        stroke-width="0.8"
        stroke-linejoin="round"
        aria-hidden="true">
        <template v-if="art.spire">
          <line v-bind="art.spire" stroke-width="1" />
          <circle :cx="art.spire.x1" :cy="art.spire.y2" r="1.4" class="landmark-tip" />
        </template>
        <path v-for="(d, i) in art.body" :key="i" :d="d" class="landmark-body" />
        <rect
          v-for="(w, i) in art.windows"
          :key="`w${i}`"
          :x="w[0]"
          :y="w[1]"
          :width="w[2]"
          height="1.6"
          stroke="none"
          class="landmark-window"
          :style="{ animationDelay: `${1.4 + (art.windows.length - i) * 0.03}s` }" />
        <line v-bind="art.silk" stroke-width="0.4" class="landmark-silk" />
      </svg>
      <PixelArt
        name="spider"
        class="landmark-spider anim-blink absolute w-5"
        :style="{ left: art.spiderLeft, top: art.spiderTop }" />
      <PixelArt
        name="pumpkin"
        class="landmark-roof-pumpkin anim-glow absolute w-8"
        :style="{ left: art.roofLeft, top: art.roofTop }" />
      <PixelArt name="ghost" class="landmark-ghost anim-blink absolute w-10" />
      <div
        v-for="b in BATS"
        :key="b.top"
        class="landmark-bat absolute"
        :style="{ top: b.top, width: b.size, animationDuration: b.dur, animationDelay: b.delay }">
        <PixelArt name="bat" class="anim-flap w-full" />
      </div>
      <PixelArt name="pumpkin" class="anim-glow absolute -bottom-1 left-[8%] w-10" />
      <PixelArt name="pumpkin" class="anim-glow absolute -bottom-1 right-[14%] w-7" />
      <div class="absolute -bottom-0.5 right-[4%]">
        <CandleLight class="relative" :size="0.7" />
      </div>
    </div>
    <span class="landmark-ground w-full" />
    <p class="landmark-text mt-4 text-title font-black leading-snug">
      您已到達{{ landmark.prefix }}<br />
      <span class="text-pumpkin">{{ landmark.name }}</span>
      高度
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CandleLight from 'components/CandleLight.vue';
import CobWeb from 'components/CobWeb.vue';
import PixelArt from 'components/PixelArt.vue';
import { LANDMARKS } from 'components/landmarkArts';
import type { LandmarkKind } from 'components/landmarkArts';

const props = defineProps<{ kind: LandmarkKind }>();

const BATS = [
  { top: '12%', size: '9%', dur: '6s', delay: '-1s' },
  { top: '30%', size: '6%', dur: '8s', delay: '-4s' },
  { top: '48%', size: '7%', dur: '10s', delay: '-7s' },
];

const landmark = computed(
  () => LANDMARKS.find((l) => l.kind === props.kind) ?? LANDMARKS[LANDMARKS.length - 1],
);
const art = computed(() => landmark.value.art());
</script>
