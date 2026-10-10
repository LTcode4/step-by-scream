<template>
  <div
    v-if="landscape"
    class="rotate-hint fixed inset-0 z-[100] flex items-center justify-center bg-black">
    <div class="flex flex-col items-center gap-6 text-white">
      <div class="relative h-40 w-40">
        <div class="phone">
          <PixelArt name="pumpkin" class="anim-glow w-[70%]" />
        </div>
      </div>
      <p class="text-title font-black tracking-widest">請轉成直的玩</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PixelArt from 'components/PixelArt.vue';
import { useLandscapeTouch } from 'src/utils/orientation';

const landscape = useLandscapeTouch();
</script>
