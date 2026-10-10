<template>
  <DropDialog :model-value="modelValue">
    <CobWeb class="absolute left-0 top-0 w-16" />
    <CobWeb flip class="absolute right-0 top-0 w-20" />
    <PixelArt name="spider" class="spider-climb anim-blink absolute w-6" />
    <PixelArt name="spider" class="spider-web anim-blink absolute w-5" />
    <PixelArt
      name="pumpkin"
      class="final-pumpkin anim-glow pointer-events-none absolute left-1/2 w-36" />
    <div class="absolute -bottom-0.5 right-3 flex items-end gap-2">
      <CandleLight class="relative" :size="0.7" delay="-0.5s" />
      <CandleLight class="relative" :size="0.95" />
    </div>
    <div class="flex flex-col items-center px-6 pb-8 pt-[4.5rem] text-center">
      <p class="text-title font-black tracking-widest">準備好了嗎</p>
      <button
        class="mt-5 w-full border-2 border-pumpkin bg-pumpkin py-2.5 text-title font-black text-black"
        @click="emit('start')">
        開始遊戲
      </button>
    </div>
  </DropDialog>
</template>

<script setup lang="ts">
import DropDialog from 'components/DropDialog.vue';
import CandleLight from 'components/CandleLight.vue';
import CobWeb from 'components/CobWeb.vue';
import PixelArt from 'components/PixelArt.vue';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'start'): void }>();
</script>
