import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { captureException } from '@sentry/vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from 'src/stores/app-store';
import { GameEvents, GameResult, StairGame } from 'src/game/StairGame';
import { TIER_LABEL, detectQuality } from 'src/game/quality';
import { sound } from 'src/game/sound';
import { track } from 'src/utils/track';

export type GameStatus = 'loading' | 'ready' | 'playing' | 'over';

interface SessionOptions {
  landscape: Ref<boolean>;
  tutorialEvents: Pick<GameEvents, 'onCandy' | 'onGhostPass' | 'onPumpkinPass'>;
  onReady: () => void;
}

function trackGameOver(result: GameResult, character: string) {
  track('post_score', { score: result.score, character });
  track('level_end', {
    score: result.score,
    steps: result.steps,
    candies: result.candies,
    reason: result.reason,
    play_time: result.time,
    ghosts_passed: result.ghostsPassed,
    pumpkins_dodged: result.pumpkinsDodged,
    lanterns_out: result.lanternsOut,
    character,
  });
}

export function useStairGameSession(
  stageRef: Ref<HTMLDivElement | undefined>,
  { landscape, tutorialEvents, onReady }: SessionOptions,
) {
  const route = useRoute();
  const router = useRouter();
  const appStore = useAppStore();

  const game = shallowRef<StairGame>();
  const status = ref<GameStatus>('loading');
  const hearts = ref(3);
  const danger = ref(0);
  const fuel = ref(1);
  const pumpkinNear = ref(false);
  const qualityToast = ref('');
  const errorMessage = ref('');
  let toastTimer = 0;
  let resultTimer = 0;
  let disposed = false;

  const character = () => appStore.character ?? 'boy';

  function startRun() {
    game.value?.start();
    track('level_start', { character: character() });
  }

  function syncPause() {
    const paused = document.hidden || landscape.value;
    game.value?.setPaused(paused);
    sound.setMusicPaused(paused);
  }
  watch(landscape, syncPause);

  function goResult() {
    router.replace({ name: 'ResultPage', query: route.query });
  }

  const events: GameEvents = {
    ...tutorialEvents,
    onHearts: (v) => {
      hearts.value = v;
    },
    onDanger: (v) => {
      danger.value = v;
    },
    onFuel: (v) => {
      fuel.value = v;
    },
    onPumpkinNear: (v) => {
      pumpkinNear.value = v;
    },
    onGameOver: (result) => {
      sound.stopMusic();
      appStore.submitResult(result);
      danger.value = 0;
      status.value = 'over';
      resultTimer = window.setTimeout(goResult, 1300);
      trackGameOver(result, character());
    },
    onQualityChange: (s) => {
      qualityToast.value = `偵測到效能不足，已自動降低畫質（${TIER_LABEL[s.tier]}）`;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        qualityToast.value = '';
      }, 2500);
    },
  };

  onMounted(async () => {
    document.addEventListener('visibilitychange', syncPause);

    try {
      if (!appStore.quality) {
        const result = detectQuality();
        appStore.quality = result.settings;
        appStore.webgl2 = result.webgl2;
      }
      const settings = { ...appStore.quality };
      const instance = await StairGame.create(
        stageRef.value as HTMLDivElement,
        settings,
        events,
        character(),
      );
      if (disposed) {
        instance.dispose();
        return;
      }
      game.value = instance;
      if (process.env.DEV || route.query.debug === 'true') {
        (window as unknown as { game: StairGame }).game = instance;
      }
      status.value = 'ready';
      sound.unlock();
      sound.startMusic();
      syncPause();
      onReady();
    } catch (e) {
      console.error(e);
      captureException(e, {
        tags: { stage: 'game-init', webgl2: String(appStore.webgl2) },
        extra: { quality: appStore.quality },
      });
      errorMessage.value = '此裝置無法啟動 3D 繪圖（需要 WebGL2），請更新瀏覽器後再試。';
    }
  });

  onBeforeUnmount(() => {
    disposed = true;
    document.removeEventListener('visibilitychange', syncPause);
    window.clearTimeout(toastTimer);
    window.clearTimeout(resultTimer);
    sound.stopMusic(0.8);
    game.value?.dispose();
  });

  return {
    game,
    status,
    hearts,
    danger,
    fuel,
    pumpkinNear,
    qualityToast,
    errorMessage,
    startRun,
  };
}
