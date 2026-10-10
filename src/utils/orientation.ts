import { onBeforeUnmount, onMounted, ref } from 'vue';

export const TOUCH_QUERY = '(hover: none) and (pointer: coarse)';

export const LANDSCAPE_TOUCH_QUERY = `${TOUCH_QUERY} and (orientation: landscape)`;

export function useLandscapeTouch() {
  const landscape = ref(false);
  let mql: MediaQueryList | null = null;
  const update = () => {
    landscape.value = !!mql?.matches;
  };
  onMounted(() => {
    mql = window.matchMedia(LANDSCAPE_TOUCH_QUERY);
    update();
    mql.addEventListener('change', update);
  });
  onBeforeUnmount(() => mql?.removeEventListener('change', update));
  return landscape;
}
