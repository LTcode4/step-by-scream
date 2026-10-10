<template>
  <div class="landmark-egg flex flex-col items-center">
    <div class="landmark-scene relative w-full" :class="`landmark-${kind}`">
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
        <line v-bind="art.spire" stroke-width="1" />
        <circle :cx="art.spire.x1" :cy="art.spire.y2" r="1.4" class="landmark-tip" />
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
      您已到達<template v-if="kind === 'burj'">世界第一高建築：</template><br />
      <span class="text-pumpkin">{{ kind === 'burj' ? '杜拜 哈里發塔' : '台北101' }}</span>
      高度
    </p>
  </div>
</template>

<script lang="ts">
export type LandmarkKind = 'taipei101' | 'burj';
export const LANDMARKS: { kind: LandmarkKind; steps: number }[] = [
  { kind: 'burj', steps: 2909 },
  { kind: 'taipei101', steps: 2046 },
];
</script>

<script setup lang="ts">
import { computed } from 'vue';
import CandleLight from 'components/CandleLight.vue';
import CobWeb from 'components/CobWeb.vue';
import PixelArt from 'components/PixelArt.vue';

const props = defineProps<{ kind: LandmarkKind }>();

const BATS = [
  { top: '12%', size: '9%', dur: '6s', delay: '-1s' },
  { top: '30%', size: '6%', dur: '8s', delay: '-4s' },
  { top: '48%', size: '7%', dur: '10s', delay: '-7s' },
];

type Win = [number, number, number];

function taipei101() {
  const body: string[] = ['M14 160V142H46V160Z', 'M17 142L20 114H40L43 142Z'];
  const windows: Win[] = [];
  for (let y = 146; y < 158; y += 5) windows.push([18, y, 4], [28, y, 4], [38, y, 4]);
  for (let y = 120; y < 140; y += 6) windows.push([23, y, 3], [28.5, y, 3], [34, y, 3]);
  for (let i = 0; i < 8; i += 1) {
    const y0 = 114 - i * 10;
    body.push(`M21 ${y0}L39 ${y0}L42 ${y0 - 10}L18 ${y0 - 10}Z`);
    windows.push([22.5, y0 - 6, 3], [28.5, y0 - 6, 3], [34.5, y0 - 6, 3]);
  }
  body.push('M22 34V27H38V34Z', 'M25 27V21H35V27Z', 'M27.5 21V16H32.5V21Z');
  return {
    viewBox: '0 0 60 160',
    body,
    windows,
    spire: { x1: 30, y1: 16, x2: 30, y2: 2 },
    silk: { x1: 42, y1: 64, x2: 46, y2: 92 },
    spiderLeft: 'calc(50% + 2.9rem)',
    spiderTop: '56%',
    roofLeft: 'calc(50% - 1rem)',
    roofTop: '4%',
  };
}

function burj() {
  const left: [number, number, number][] = [
    [22, 220, 196],
    [18, 196, 172],
    [15, 172, 148],
    [12, 148, 124],
    [9.5, 124, 100],
    [7.5, 100, 78],
    [5.5, 78, 58],
    [3.8, 58, 40],
  ];
  const right: [number, number, number][] = [
    [20, 220, 184],
    [16.5, 184, 160],
    [13.5, 160, 136],
    [10.5, 136, 112],
    [8.5, 112, 90],
    [6.5, 90, 68],
    [4.8, 68, 48],
    [3, 48, 36],
  ];
  let d = `M${30 - left[0][0]} 220`;
  left.forEach(([, , top], i) => {
    d += `V${top}`;
    const nextW = left[i + 1]?.[0] ?? 1.6;
    d += `H${30 - nextW}`;
  });
  d += 'L30 14';
  const rev = [...right].reverse();
  d += `L${30 + 1.4} ${rev[0][2]}`;
  rev.forEach(([w, bottom]) => {
    d += `H${30 + w}V${bottom}`;
  });
  d += 'Z';
  const core = 'M30 220V40';
  const windows: Win[] = [];
  left.forEach(([w, bottom, top]) => {
    for (let y = bottom - 6; y > top + 1; y -= 7)
      windows.push([30 - w + 2, y, Math.max(1.5, w - 4)]);
  });
  right.forEach(([w, bottom, top]) => {
    for (let y = bottom - 6; y > top + 1; y -= 7) windows.push([32, y, Math.max(1.5, w - 4)]);
  });
  windows.sort((a, b) => a[1] - b[1]);
  return {
    viewBox: '0 0 60 220',
    body: [d, core],
    windows,
    spire: { x1: 30, y1: 30, x2: 30, y2: 2 },
    silk: { x1: 43.5, y1: 136, x2: 47, y2: 168 },
    spiderLeft: 'calc(50% + 1.9rem)',
    spiderTop: '74%',
    roofLeft: 'calc(50% - 2.3rem)',
    roofTop: '16%',
  };
}

const art = computed(() => (props.kind === 'burj' ? burj() : taipei101()));
</script>
