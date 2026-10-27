import { boot } from 'quasar/wrappers';

const SCROLL_OFFSET = 120;

const blockNativeGesture = (e: TouchEvent) => {
  if (e.cancelable) e.preventDefault();
};

const keepOffTop = () => {
  if (Math.abs(window.scrollY - SCROLL_OFFSET) > 1) window.scrollTo(0, SCROLL_OFFSET);
};

export default boot(() => {
  document.addEventListener('touchmove', blockNativeGesture, { passive: false });
  window.addEventListener('scroll', keepOffTop, { passive: true });
  window.addEventListener('resize', keepOffTop);
  window.addEventListener('load', keepOffTop);
  requestAnimationFrame(keepOffTop);
});
