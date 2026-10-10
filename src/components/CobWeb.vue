<template>
  <svg
    viewBox="0 0 100 100"
    class="cobweb pointer-events-none"
    :class="{ 'cobweb-flip': flip }"
    fill="none"
    stroke="currentColor"
    stroke-width="0.9"
    stroke-linecap="round"
    aria-hidden="true">
    <path :d="WEB" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ flip?: boolean }>();

const SPOKES = [0, 18, 36, 54, 72, 90].map((d) => (d * Math.PI) / 180);
const RINGS = [16, 32, 50, 70, 92];

function point(r: number, a: number) {
  return [r * Math.cos(a), r * Math.sin(a)];
}

const spokes = SPOKES.map((a) => {
  const [x, y] = point(100, a);
  return `M0 0L${x.toFixed(1)} ${y.toFixed(1)}`;
});
const rings = RINGS.map((r) =>
  SPOKES.slice(1)
    .map((a, i) => {
      const [x0, y0] = point(r, SPOKES[i]);
      const [x1, y1] = point(r, a);
      const [cx, cy] = point(r * 0.86, (SPOKES[i] + a) / 2);
      const move = i === 0 ? `M${x0.toFixed(1)} ${y0.toFixed(1)}` : '';
      return `${move}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    })
    .join(''),
);
const WEB = [...spokes, ...rings].join('');
</script>
