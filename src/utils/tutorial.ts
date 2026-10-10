import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { StairGame } from 'src/game/StairGame';

export type TutorialAction = 'tap' | 'swipe-left' | 'swipe-right' | 'jump' | 'swipe-end';

interface TutorialProps {
  modelValue: boolean;
  game?: StairGame;
}

interface TutorialEmit {
  (e: 'finish'): void;
  (e: 'highlight-jump', v: boolean): void;
  (e: 'highlight-fuel', v: boolean): void;
  (e: 'highlight-hearts', v: boolean): void;
}

export const TAP_TIMES = 1;
const RULES_SCORE_MS = 2000;

const STEPS = [
  { id: 'tap', title: '上爬一階', text: '' },
  { id: 'swipeUp', title: '快速上樓', text: '' },
  { id: 'swipeDown', title: '倒退下樓', text: '' },
  { id: 'candy', title: '', text: '' },
  { id: 'pumpkin', title: '南瓜燈來了', text: '' },
  { id: 'ghost', title: '勿碰', text: '' },
  { id: 'rules', title: '其一為零，遊戲結束', text: '' },
  { id: 'score', title: '計分', text: '' },
  { id: 'done', title: '', text: '' },
] as const;
type StepId = (typeof STEPS)[number]['id'];

export function useTutorial(props: TutorialProps, emit: TutorialEmit) {
  const index = ref(0);
  const count = ref(0);
  const phase = ref<'approach' | 'jump' | 'wait' | 'picked' | 'look' | 'go' | 'passed'>('approach');
  const markPos = ref<{ x: number; y: number; visibility: number } | null>(null);
  const step = computed(() => STEPS[index.value]);

  const centerGesture = computed(() => {
    const map: Partial<Record<StepId, 'tap' | 'swipe-left' | 'swipe-right'>> = {
      tap: 'tap',
      swipeUp: 'swipe-left',
      swipeDown: 'swipe-right',
    };
    if (step.value.id === 'candy') return phase.value === 'go' ? 'swipe-left' : undefined;
    if (step.value.id === 'ghost') return phase.value === 'go' ? 'swipe-left' : undefined;
    return map[step.value.id];
  });

  const candyPicked = computed(() => step.value.id === 'candy' && phase.value === 'picked');
  const ghostPassed = computed(() => step.value.id === 'ghost' && phase.value === 'passed');
  const looking = computed(
    () => (step.value.id === 'ghost' || step.value.id === 'candy') && phase.value === 'look',
  );

  const spot = computed(() => {
    if (!looking.value || !markPos.value) return null;
    const candy = step.value.id === 'candy';
    const { x, y } = markPos.value;
    return candy ? { cx: x, cy: y + 30, rx: 32, ry: 32 } : { cx: x, cy: y + 80, rx: 50, ry: 76 };
  });
  const spotStyle = computed(() => {
    const sp = spot.value;
    if (!sp) return undefined;
    return {
      background: `radial-gradient(${sp.rx}px ${sp.ry}px at ${sp.cx}px ${sp.cy}px, transparent 96%, var(--c-black-60) 100%)`,
    };
  });
  const title = computed(() => {
    if (step.value.id === 'pumpkin' && phase.value === 'jump') return '快按跳';
    if (candyPicked.value) return '';
    if (step.value.id === 'ghost' && phase.value === 'go') return '幽靈消失，快通過';
    if (step.value.id === 'candy' && phase.value === 'go') return '快撿糖果';
    return step.value.title;
  });
  const text = computed(() => step.value.text);
  const dim = computed(() => step.value.id === 'pumpkin' && phase.value === 'approach');
  const highlightJump = computed(() => props.modelValue && step.value.id === 'pumpkin');
  watch(highlightJump, (v) => emit('highlight-jump', v));
  const highlightFuel = computed(
    () => props.modelValue && (step.value.id === 'candy' || step.value.id === 'rules'),
  );
  watch(highlightFuel, (v) => emit('highlight-fuel', v));
  const highlightHearts = computed(() => props.modelValue && step.value.id === 'rules');
  watch(highlightHearts, (v) => emit('highlight-hearts', v));

  let raf = 0;
  let timer = 0;
  let swiped = false;

  function watchPumpkin() {
    cancelAnimationFrame(raf);
    const tick = () => {
      if (step.value.id !== 'pumpkin' || phase.value !== 'approach' || !props.game) return;
      if (props.game.pumpkinDistance() < 0.95) {
        props.game.setTimeScale(0);
        phase.value = 'jump';
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function trackMark(kind: 'ghost' | 'candy') {
    cancelAnimationFrame(raf);
    const start = performance.now();
    const tick = (now: number) => {
      if (step.value.id !== kind || phase.value !== 'look' || !props.game) return;
      markPos.value = props.game.hazardOnScreen(kind);
      if (kind === 'candy' && now - start > 1500) {
        phase.value = 'go';
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function enterStep() {
    const { game } = props;
    if (!game) return;
    count.value = 0;
    swiped = false;
    phase.value = 'approach';
    game.setTimeScale(1);
    if (step.value.id === 'candy') {
      phase.value = 'look';
      game.debugSpawn('candy', 3);
      trackMark('candy');
    }
    if (step.value.id === 'rules' || step.value.id === 'score') {
      window.clearTimeout(timer);
      // eslint-disable-next-line no-use-before-define
      timer = window.setTimeout(next, RULES_SCORE_MS);
    }
    if (step.value.id === 'pumpkin') {
      phase.value = 'approach';
      game.debugSpawn('pumpkin', 6);
      watchPumpkin();
    }
    if (step.value.id === 'ghost') {
      phase.value = 'look';
      game.debugSpawn('ghost', 4);
      game.setGhostsForced('show');
      trackMark('ghost');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        props.game?.setGhostsForced('hide');
        timer = window.setTimeout(() => {
          if (step.value.id === 'ghost' && phase.value === 'look') phase.value = 'go';
        }, 300);
      }, 1200);
    }
  }

  function next() {
    if (index.value < STEPS.length - 1) {
      index.value += 1;
      enterStep();
    }
  }

  function finish() {
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
    if (props.game) props.game.setTimeScale(1);
    emit('finish');
  }

  function notify(action: TutorialAction) {
    const { id } = step.value;
    if (id === 'tap' && action === 'tap') {
      count.value += 1;
      if (count.value >= TAP_TIMES) next();
    } else if (id === 'swipeUp' && action === 'swipe-left') swiped = true;
    else if (id === 'swipeDown' && action === 'swipe-right') swiped = true;
    else if ((id === 'swipeUp' || id === 'swipeDown') && action === 'swipe-end' && swiped) next();
    else if (id === 'pumpkin' && action === 'jump' && phase.value === 'jump') {
      if (props.game) props.game.setTimeScale(1);
      phase.value = 'wait';
    }
  }

  function onCandy() {
    if (step.value.id !== 'candy' || phase.value !== 'go') return;
    phase.value = 'picked';
    window.clearTimeout(timer);
    timer = window.setTimeout(next, 1800);
  }

  function onGhostPass() {
    if (step.value.id !== 'ghost' || phase.value !== 'go') return;
    phase.value = 'passed';
    next();
  }

  function onPumpkinPass() {
    if (step.value.id !== 'pumpkin' || phase.value === 'passed') return;
    phase.value = 'passed';
    window.clearTimeout(timer);
    timer = window.setTimeout(next, 500);
  }

  function allows(action: TutorialAction) {
    const { id } = step.value;
    if (id === 'done' || id === 'rules' || id === 'score' || ghostPassed.value || looking.value)
      return false;
    if (id === 'ghost') return action === 'swipe-left';
    if (id === 'candy' && phase.value === 'go') return action === 'swipe-left';
    if (id === 'pumpkin') return action === 'jump' && phase.value === 'jump';
    if (candyPicked.value) return false;
    return true;
  }

  watch(
    () => props.modelValue,
    (open) => {
      if (!open) return;
      index.value = 0;
      phase.value = 'approach';
      enterStep();
    },
  );

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
  });

  return {
    step,
    phase,
    count,
    markPos,
    centerGesture,
    candyPicked,
    spot,
    spotStyle,
    title,
    text,
    dim,
    finish,
    notify,
    onCandy,
    onGhostPass,
    onPumpkinPass,
    allows,
  };
}
