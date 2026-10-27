<template>
  <q-page v-if="result" class="page-result relative h-full overflow-hidden bg-black text-white">
    <div class="dither-dots bg-dots pointer-events-none absolute inset-0" />
    <div class="fog pointer-events-none absolute" />
    <CobWeb class="pointer-events-none absolute left-0 top-0 w-20" />
    <CobWeb flip class="pointer-events-none absolute right-0 top-0 w-24" />
    <div
      v-for="b in BATS"
      :key="b.top"
      class="bat pointer-events-none absolute"
      :style="{ top: b.top, width: b.size, animationDuration: b.dur, animationDelay: b.delay }">
      <PixelArt name="bat" class="anim-flap w-full" />
    </div>

    <div class="relative flex h-full flex-col items-center px-5 pb-[6%] pt-[9%]">
      <div class="anim-rise flex flex-col items-center">
        <div class="relative h-14 w-12">
          <template v-if="result.reason === 'lantern'">
            <PixelArt name="lantern-off" class="h-full w-full" />
            <span
              v-for="i in 3"
              :key="i"
              class="smoke"
              :style="{ animationDelay: `${i * 0.6}s` }" />
          </template>
          <PixelArt v-else name="pumpkin" class="anim-glow anim-float h-full w-full" />
        </div>
        <p class="mt-2 text-title font-black tracking-[0.3em]">{{ headline }}</p>
      </div>

      <div
        class="tomb anim-rise relative mt-4 w-[78%] max-w-[18rem]"
        style="animation-delay: 0.15s">
        <PixelArt name="ghost" class="peek-ghost anim-blink absolute -z-10 w-12" />
        <div class="tomb-inner flex flex-col items-center px-4 pb-4 pt-5">
          <p class="font-creep text-title tracking-[0.3em] text-white/60">R.I.P.</p>
          <p class="score mt-1 font-mono font-bold leading-none">{{ shownScore }}</p>
          <p class="text-body tracking-[0.4em] text-white/60">SCORE</p>
          <p class="rank mt-3 border border-pumpkin px-3 py-0.5 text-body font-bold text-pumpkin">
            {{ rank }}
          </p>
        </div>
        <PixelArt :name="hero" class="hero anim-blink anim-glow absolute bottom-0 h-28" />
        <PixelArt name="pumpkin" class="anim-glow absolute -bottom-1 -left-3 w-8" />
        <div class="absolute -bottom-0.5 -right-3 flex items-end gap-1.5">
          <CandleLight class="relative" :size="0.6" delay="-0.4s" />
          <CandleLight class="relative" :size="0.85" />
        </div>
      </div>
      <div class="ground w-[92%]" />

      <div class="mt-4 flex w-full max-w-[20rem] flex-wrap justify-center gap-2">
        <div
          v-for="(s, i) in stats"
          :key="s.label"
          class="stat anim-rise flex w-[calc((100%-1rem)/3)] flex-col items-center border border-white/60 py-2"
          :style="{ animationDelay: `${0.35 + i * 0.08}s` }">
          <PixelArt :name="s.icon" class="h-4 w-5" />
          <span class="mt-1 font-mono text-title font-bold leading-none">{{ s.value }}</span>
          <span class="mt-1 text-body text-white/60">{{ s.label }}</span>
        </div>
      </div>

      <div class="mt-auto flex w-full max-w-[20rem] gap-3 pt-3">
        <button
          class="btn flex-1 border-2 border-white py-2.5 text-title font-bold"
          @click="goHome">
          回首頁
        </button>
        <button
          class="btn btn-main flex-1 border-2 border-pumpkin bg-pumpkin py-2.5 text-title font-black text-black"
          @click="retry">
          再玩一次
        </button>
      </div>
    </div>

    <DropDialog v-model="showLandmark" closable>
      <div class="flex flex-col items-center px-5 pb-6 pt-8 text-center">
        <LandmarkEgg v-if="landmark" :kind="landmark" />
        <button
          class="btn btn-main mt-5 w-full border-2 border-pumpkin bg-pumpkin py-2.5 text-title font-black text-black"
          @click="showLandmark = false">
          太厲害了
        </button>
      </div>
    </DropDialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CandleLight from 'components/CandleLight.vue';
import CobWeb from 'components/CobWeb.vue';
import DropDialog from 'components/DropDialog.vue';
import LandmarkEgg from 'components/LandmarkEgg.vue';
import { LANDMARKS } from 'components/landmarkArts';
import PixelArt from 'components/PixelArt.vue';
import type { PixelArtName } from 'components/PixelArt.vue';
import { useAppStore } from 'src/stores/app-store';

const router = useRouter();
const appStore = useAppStore();
const result = computed(() => appStore.lastResult);
const hero = computed(() => appStore.character ?? 'boy');
const BATS = [
  { top: '6%', size: '9%', dur: '9s', delay: '-2s' },
  { top: '14%', size: '6%', dur: '13s', delay: '-7s' },
];

if (!appStore.lastResult) router.replace({ name: 'HomePage' });

const headline = computed(() =>
  result.value?.reason === 'lantern' ? '提燈熄滅了…' : '被嚇壞了！',
);

const rank = computed(() => {
  const score = result.value?.score ?? 0;
  if (score >= 300) return '步步驚魂之王';
  if (score >= 180) return '午夜捉鬼達人';
  if (score >= 100) return '勇敢的夜行者';
  if (score >= 40) return '提燈小探險家';
  return '膽小的南瓜頭';
});

function formatTime(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const stats = computed<{ icon: PixelArtName; label: string; value: string | number }[]>(() => {
  const r = result.value;
  if (!r) return [];
  return [
    { icon: 'stairs', label: '爬了幾階', value: r.steps },
    { icon: 'candy', label: '糖果', value: r.candies },
    { icon: 'ghost', label: '通過幽靈', value: r.ghostsPassed },
    { icon: 'pumpkin', label: '閃過南瓜燈', value: r.pumpkinsDodged },
    { icon: 'lantern', label: '遊玩時間', value: formatTime(r.time) },
  ];
});

const landmark = computed(
  () => LANDMARKS.find((l) => (result.value?.steps ?? 0) >= l.steps)?.kind ?? null,
);
const showLandmark = ref(false);

const shownScore = ref(0);
let raf = 0;
let landmarkTimer = 0;
onMounted(() => {
  const target = result.value?.score ?? 0;
  const start = performance.now();
  const duration = Math.min(1600, 400 + target * 6);
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    shownScore.value = Math.round(target * (1 - (1 - t) ** 3));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  if (landmark.value) {
    landmarkTimer = window.setTimeout(() => {
      showLandmark.value = true;
    }, duration + 400);
  }
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.clearTimeout(landmarkTimer);
});

function retry() {
  router.replace({ name: 'GamePage', query: router.currentRoute.value.query });
}

function goHome() {
  router.replace({ name: 'HomePage', query: router.currentRoute.value.query });
}
</script>
