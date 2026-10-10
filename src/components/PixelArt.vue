<template>
  <svg
    :viewBox="`0 0 ${art.w} ${art.h}`"
    shape-rendering="crispEdges"
    aria-hidden="true"
    class="pixel-art">
    <g v-for="(part, i) in art.parts" :key="i" :class="part.cls" :fill="COLORS[part.c]">
      <rect v-for="(r, j) in part.r" :key="j" :x="r[0]" :y="r[1]" :width="r[2]" :height="r[3]" />
    </g>
  </svg>
</template>

<script lang="ts">
export type { PixelArtName } from './pixelArts';
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { ARTS, COLORS } from './pixelArts';
import type { PixelArtName } from './pixelArts';

const props = defineProps<{ name: PixelArtName }>();
const art = computed(() => ARTS[props.name]);
</script>
