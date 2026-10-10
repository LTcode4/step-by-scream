<template>
  <q-page class="page-404 relative h-full overflow-hidden bg-black text-white">
    <div class="dither-dots sky pointer-events-none absolute inset-0" />
    <CobWeb class="pointer-events-none absolute left-0 top-0 w-24" />
    <CobWeb flip class="pointer-events-none absolute right-0 top-0 w-28" />
    <div
      v-for="b in BATS"
      :key="b.top"
      class="bat pointer-events-none absolute"
      :style="{ top: b.top, width: b.size, animationDuration: b.dur, animationDelay: b.delay }">
      <PixelArt name="bat" class="anim-flap w-full" />
    </div>

    <div class="relative flex h-full flex-col items-center justify-center gap-6 px-6">
      <div class="lost relative">
        <span class="question text-title font-black text-pumpkin">?</span>
        <PixelArt name="ghost" class="anim-blink w-28" />
        <PixelArt name="lantern" class="lantern anim-glow absolute w-7" />
      </div>

      <h1 class="digits flex items-center gap-2 text-display font-black" aria-label="404">
        <span>4</span>
        <PixelArt name="pumpkin" class="pumpkin anim-glow w-16" />
        <span>4</span>
      </h1>

      <p class="text-body text-white/60">迷路了…這一層樓梯不存在</p>

      <router-link
        :to="{ name: 'HomePage' }"
        class="home-btn border-2 border-pumpkin bg-pumpkin px-8 py-2.5 text-title font-black text-black">
        回首頁
      </router-link>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import CobWeb from 'components/CobWeb.vue';
import PixelArt from 'components/PixelArt.vue';

const BATS = [
  { top: '16%', size: '9%', dur: '9s', delay: '-2s' },
  { top: '24%', size: '6%', dur: '13s', delay: '-7s' },
];
</script>
