<template>
  <div class="candle" :style="{ '--size': size, animationDelay: delay }">
    <span class="candle-glow" />
    <span class="candle-flame" />
    <span class="candle-wick" />
    <span class="candle-body" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number; delay?: string }>(), { size: 1, delay: '0s' });
</script>
