<template>
  <q-page class="page-game relative h-full overflow-hidden bg-black text-white">
    <div
      ref="stageRef"
      class="absolute inset-0"
      @pointerdown.prevent="onPointerDown"
      @pointermove.prevent="onPointerMove"
      @pointerup.prevent="onPointerUp"
      @pointercancel="onPointerUp" />

    <div
      class="danger-edge pointer-events-none absolute inset-0 transition-opacity"
      :style="{ opacity: danger }" />

    <GameHud
      :hearts="hearts"
      :fuel="fuel"
      :highlight-hearts="highlightHearts"
      :highlight-fuel="highlightFuel"
      :show-tutorial="!tutorialOpen && (status === 'ready' || status === 'playing')"
      @open-tutorial="openTutorial" />

    <div
      v-if="!tutorialOpen && (status === 'loading' || status === 'ready')"
      class="pointer-events-none absolute inset-x-0 top-[15%] flex flex-col items-center text-center">
      <p v-if="status === 'loading'" class="animate-pulse text-body tracking-widest">載入中…</p>
      <template v-else>
        <p class="start-hint text-title font-black tracking-[0.3em]">點擊開始</p>
        <GestureHint type="tap" class="-mt-2 scale-75" />
      </template>
    </div>

    <button
      v-if="status === 'playing' || status === 'ready'"
      class="jump-btn absolute bottom-[6%] left-5 flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-white bg-black/60 text-white active:bg-white active:text-black"
      :class="{ 'jump-pulse': pumpkinNear && tutorialOpen, 'z-40': highlightJump }"
      aria-label="跳躍"
      @pointerdown.stop.prevent="onJump">
      <PixelArt name="jump" class="h-9 w-10" />
    </button>

    <p
      v-if="qualityToast"
      class="pointer-events-none absolute inset-x-0 top-28 text-center text-body text-white/60">
      {{ qualityToast }}
    </p>

    <p v-if="errorMessage" class="absolute inset-x-6 top-1/3 text-center text-body">
      {{ errorMessage }}
    </p>

    <TutorialOverlay
      ref="tutorialRef"
      @highlight-jump="highlightJump = $event"
      @highlight-fuel="highlightFuel = $event"
      @highlight-hearts="highlightHearts = $event"
      :model-value="tutorialOpen"
      :game="game"
      @finish="closeTutorial" />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GameHud from 'components/GameHud.vue';
import GestureHint from 'components/GestureHint.vue';
import PixelArt from 'components/PixelArt.vue';
import TutorialOverlay from 'components/TutorialOverlay.vue';
import type { TutorialAction } from 'components/TutorialOverlay.vue';
import { useAppStore } from 'src/stores/app-store';
import { GameSnapshot } from 'src/game/StairGame';
import { sound } from 'src/game/sound';
import { useLandscapeTouch } from 'src/utils/orientation';
import { useStairGameSession } from 'src/utils/stairGameSession';
import { useSwipe } from 'src/utils/swipe';

const appStore = useAppStore();

const stageRef = ref<HTMLDivElement>();
const tutorialRef = ref<InstanceType<typeof TutorialOverlay>>();
const landscape = useLandscapeTouch();
const tutorialOpen = ref(false);
const highlightJump = ref(false);
const highlightFuel = ref(false);
const highlightHearts = ref(false);
let resumeSnapshot: GameSnapshot | null = null;

const { game, status, hearts, danger, fuel, pumpkinNear, qualityToast, errorMessage, startRun } =
  useStairGameSession(stageRef, {
    landscape,
    tutorialEvents: {
      onCandy: (v) => {
        if (tutorialOpen.value && v > 0) tutorialRef.value?.onCandy();
      },
      onGhostPass: () => {
        if (tutorialOpen.value) tutorialRef.value?.onGhostPass();
      },
      onPumpkinPass: () => {
        if (tutorialOpen.value) tutorialRef.value?.onPumpkinPass();
      },
    },
    onReady: () => {
      // eslint-disable-next-line no-use-before-define
      if (!appStore.tutorialSeen) openTutorial();
    },
  });

function tutorialAllows(action: TutorialAction) {
  sound.unlock();
  return !!tutorialRef.value?.allows(action);
}

function openTutorial() {
  const g = game.value;
  if (!g || tutorialOpen.value) return;
  resumeSnapshot = status.value === 'playing' ? g.snapshot() : null;
  g.startTutorial();
  tutorialOpen.value = true;
}

function closeTutorial() {
  const g = game.value;
  appStore.markTutorialSeen();
  tutorialOpen.value = false;
  if (!g) return;
  g.endTutorial();
  if (resumeSnapshot) g.restore(resumeSnapshot);
  else startRun();
  resumeSnapshot = null;
  status.value = 'playing';
}

function ensurePlaying() {
  sound.unlock();
  if (status.value === 'ready') {
    status.value = 'playing';
    startRun();
  }
  return status.value === 'playing';
}

function act(action: TutorialAction, run: () => void) {
  if (landscape.value) return;
  if (tutorialOpen.value) {
    if (!tutorialAllows(action)) return;
    run();
    tutorialRef.value?.notify(action);
  } else if (ensurePlaying()) run();
}

function onJump() {
  act('jump', () => game.value?.jump());
}

const { onPointerDown, onPointerMove, onPointerUp } = useSwipe({
  onTap: () => act('tap', () => game.value?.climb()),
  onSwipe: (dir) =>
    act(`swipe-${dir}`, () => (dir === 'left' ? game.value?.climb() : game.value?.descend())),
  onSwipeEnd: () => {
    if (tutorialOpen.value) tutorialRef.value?.notify('swipe-end');
  },
});
</script>
