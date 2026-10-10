const SWIPE_STEP = 36;

interface SwipeHandlers {
  onTap: () => void;
  onSwipe: (dir: 'left' | 'right') => void;
  onSwipeEnd: () => void;
}

export function useSwipe({ onTap, onSwipe, onSwipeEnd }: SwipeHandlers) {
  let pointerId = -1;
  let startX = 0;
  let lastX = 0;
  let swiped = false;

  function onPointerDown(e: PointerEvent) {
    pointerId = e.pointerId;
    startX = e.clientX;
    lastX = e.clientX;
    swiped = false;
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    if (Math.abs(dx) < SWIPE_STEP) return;
    swiped = true;
    lastX += Math.sign(dx) * SWIPE_STEP;
    onSwipe(dx < 0 ? 'left' : 'right');
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    if (e.type === 'pointerup' && !swiped && Math.abs(e.clientX - startX) < 12) onTap();
    if (swiped) onSwipeEnd();
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
