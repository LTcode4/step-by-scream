<template>
  <div class="gesture pointer-events-none relative" :class="type">
    <template v-if="type === 'tap'">
      <span class="ripple" />
      <span class="ripple ripple-2" />
    </template>
    <template v-else>
      <span class="trail" />
      <span class="chevrons font-black">{{ type === 'swipe-left' ? '‹ ‹ ‹' : '› › ›' }}</span>
    </template>
    <PixelArt name="hand" class="hand" />
  </div>
</template>

<script setup lang="ts">
import PixelArt from 'components/PixelArt.vue';

defineProps<{ type: 'tap' | 'swipe-left' | 'swipe-right' }>();
</script>
