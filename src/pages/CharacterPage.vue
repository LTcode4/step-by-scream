<template>
  <q-page class="page-character relative h-full overflow-hidden bg-black text-white">
    <div class="dither-dots sky pointer-events-none absolute inset-0" />
    <CobWeb class="pointer-events-none absolute left-0 top-0 w-24" />
    <CobWeb flip class="pointer-events-none absolute right-0 top-0 w-28" />
    <PixelArt name="spider" class="spider anim-blink pointer-events-none absolute w-6" />

    <div class="window pointer-events-none absolute">
      <span class="window-moon" />
      <span class="window-bar-v" />
      <span class="window-bar-h" />
    </div>
    <div
      v-for="b in BATS"
      :key="b.top"
      class="bat pointer-events-none absolute"
      :style="{ top: b.top, width: b.size, animationDuration: b.dur, animationDelay: b.delay }">
      <PixelArt name="bat" class="anim-flap w-full" />
    </div>

    <div class="relative flex h-full flex-col items-center px-6 pb-[8%] pt-[18%]">
      <p class="anim-rise text-body tracking-[0.5em] text-white/60">CHOOSE YOUR HERO</p>
      <h1 class="title anim-rise mt-2 text-title font-black tracking-[0.2em]">選擇角色</h1>

      <div
        class="mt-[14%] flex w-full max-w-[22rem] justify-center gap-4"
        :class="{ 'has-pick': selected }">
        <button
          v-for="(c, i) in CHARACTERS"
          :key="c.id"
          class="card anim-rise relative flex flex-1 flex-col items-center border-2 pb-3 pt-8"
          :class="selected === c.id ? 'card-on border-pumpkin' : 'border-white'"
          :style="{ animationDelay: `${0.15 + i * 0.1}s` }"
          :aria-pressed="selected === c.id"
          @click="choose(c.id)">
          <PixelArt
            v-if="selected === c.id"
            name="pumpkin"
            class="badge anim-glow absolute -top-5 left-1/2 z-10 w-9" />
          <div class="portrait-wrap flex h-40 items-end justify-center">
            <PixelArt :name="c.id" class="portrait anim-blink anim-glow h-full" />
          </div>
          <span class="portrait-shadow mt-1" />
          <span class="mt-2 text-title font-black tracking-widest">{{ c.label }}</span>
        </button>
      </div>
      <div class="mt-auto flex w-full flex-col items-center gap-3">
        <button
          class="go-btn w-60 max-w-full border-2 border-pumpkin bg-pumpkin py-3 text-title font-black tracking-[0.3em] text-black disabled:border-white/60 disabled:bg-black disabled:!text-white/60"
          :disabled="!selected"
          @click="start">
          {{ selected ? '出發' : '請選擇角色' }}
        </button>
        <button class="text-body text-white/60 underline underline-offset-4" @click="goHome">
          ‹ 返回
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CobWeb from 'components/CobWeb.vue';
import PixelArt from 'components/PixelArt.vue';
import type { CharacterKind } from 'src/game/builders';
import { sound } from 'src/game/sound';
import { useAppStore } from 'src/stores/app-store';

const CHARACTERS: { id: CharacterKind; label: string }[] = [
  { id: 'boy', label: '男生' },
  { id: 'girl', label: '女生' },
];

const BATS = [
  { top: '74%', size: '9%', dur: '8s', delay: '-1s' },
  { top: '82%', size: '7%', dur: '11s', delay: '-5s' },
  { top: '78%', size: '6%', dur: '14s', delay: '-9s' },
];

const router = useRouter();
const appStore = useAppStore();
const selected = ref<CharacterKind | null>(appStore.character);

function choose(id: CharacterKind) {
  sound.unlock();
  selected.value = id;
}

function start() {
  if (!selected.value) return;
  appStore.setCharacter(selected.value);
  router.push({ name: 'GamePage', query: router.currentRoute.value.query });
}

function goHome() {
  router.push({ name: 'HomePage', query: router.currentRoute.value.query });
}
</script>
