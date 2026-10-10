<template>
  <q-page class="page-home relative h-full overflow-hidden bg-black text-white">
    <div class="dither-dots sky pointer-events-none absolute inset-0" />
    <div class="moon pointer-events-none absolute" />
    <div class="fog fog-a pointer-events-none absolute" />
    <div class="fog fog-b pointer-events-none absolute" />

    <div
      v-for="b in BATS"
      :key="b.top"
      class="bat pointer-events-none absolute"
      :style="{ top: b.top, width: b.size, animationDuration: b.dur, animationDelay: b.delay }">
      <PixelArt name="bat" class="anim-flap w-full" />
    </div>

    <div class="stairs pointer-events-none absolute inset-x-0 bottom-0 flex items-end">
      <div
        v-for="(h, i) in STEPS"
        :key="i"
        class="step relative flex-1"
        :style="{ height: `${h}%` }">
        <CandleLight
          v-if="CANDLES[i]"
          class="absolute bottom-full left-1/2 -translate-x-1/2"
          :size="CANDLES[i].size"
          :delay="CANDLES[i].delay" />
      </div>
    </div>

    <div class="peek pointer-events-none absolute">
      <PixelArt name="ghost" class="anim-blink w-full" />
    </div>
    <div class="hang pointer-events-none absolute flex flex-col items-center">
      <span class="rope w-0.5 bg-white/60" />
      <PixelArt name="pumpkin" class="pumpkin-glow anim-glow w-full" />
    </div>

    <div class="relative flex h-full flex-col items-center justify-between px-6 pb-[8%] pt-[38%]">
      <div class="flex flex-col items-center">
        <p class="anim-rise text-body tracking-[0.5em] text-white/60">HALLOWEEN NIGHT</p>
        <h1 class="title mt-3 flex font-black leading-none" aria-label="步步驚魂">
          <span
            v-for="(ch, i) in TITLE"
            :key="i"
            class="title-char relative"
            :style="{ animationDelay: `${i * 0.37}s` }">
            {{ ch }}
            <span
              class="drip"
              :style="{
                left: `${DRIPS[i].x}em`,
                top: `${DRIPS[i].y}em`,
                '--delay': `${DRIPS[i].delay}s`,
              }">
              <i class="drop" />
            </span>
          </span>
        </h1>
        <p class="subtitle font-creep mt-9 text-pumpkin">Step by Scream</p>
        <p v-if="unsupported" class="mt-4 text-body text-pumpkin">
          此瀏覽器不支援 WebGL2，請更新系統或改用其他瀏覽器
        </p>
        <p v-else class="tagline mt-4 text-body tracking-widest text-white/60">
          提著燈，一步一步往上爬…
        </p>
      </div>

      <div class="flex w-full flex-col items-center gap-3">
        <button
          class="start-btn w-60 max-w-full border-2 border-pumpkin bg-pumpkin py-3 text-title font-black tracking-[0.3em] text-black disabled:opacity-60"
          :disabled="unsupported"
          @click="startGame">
          開始遊戲
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import CandleLight from 'components/CandleLight.vue';
import PixelArt from 'components/PixelArt.vue';
import { useAppStore } from 'src/stores/app-store';
import { detectQuality } from 'src/game/quality';
import { sound } from 'src/game/sound';

const TITLE = ['步', '步', '驚', '魂'];
const DRIPS = [
  { x: 0.913, y: 0.495, delay: 0 },
  { x: 0.913, y: 0.495, delay: 1.7 },
  { x: 0.42, y: 0.86, delay: 0.8 },
  { x: 0.81, y: 1.015, delay: 2.6 },
];
const STEPS = [14, 24, 34, 44, 56, 68, 82, 96];
const CANDLES: Record<number, { size: number; delay: string }> = {
  0: { size: 0.75, delay: '-0.7s' },
  6: { size: 1, delay: '0s' },
};
const BATS = [
  { top: '13%', size: '10%', dur: '9s', delay: '0s' },
  { top: '22%', size: '7%', dur: '12s', delay: '-4s' },
  { top: '8%', size: '6%', dur: '15s', delay: '-9s' },
];

const router = useRouter();
const appStore = useAppStore();

if (!appStore.quality) {
  const result = detectQuality();
  appStore.quality = result.settings;
  appStore.webgl2 = result.webgl2;
}
const unsupported = computed(() => !appStore.webgl2);

function startGame() {
  sound.unlock();
  appStore.resetSession();
  router.push({ name: 'CharacterPage', query: router.currentRoute.value.query });
}
</script>
