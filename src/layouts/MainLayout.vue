<template>
  <q-layout>
    <div class="app-shell">
      <q-page-container ref="stageRef" class="app-container">
        <router-view v-slot="{ Component }">
          <transition
            appear
            enter-active-class="animated fadeIn slow"
            leave-active-class="animated fadeOut slow"
            mode="out-in">
            <component v-if="isLoaded" :is="Component" class="w-full flex-grow" />
            <div v-else>
              <div class="fixed-center">
                <q-spinner color="orange" size="100px" />
              </div>
            </div>
          </transition>
        </router-view>
      </q-page-container>
    </div>
    <RotateHint />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted } from 'vue';
import { QSpinner, useQuasar } from 'quasar';
import { captureException } from '@sentry/vue';
import { Preloader } from 'src/utils/preloader';
import RotateHint from 'components/RotateHint.vue';
import { LANDSCAPE_TOUCH_QUERY } from 'src/utils/orientation';

const isLoaded = ref(false);
const $q = useQuasar();

const BASE_W = 375;
const BASE_H = 667;
const stageRef = ref<{ $el: HTMLElement }>();
let stageObserver: ResizeObserver | null = null;

function fitRootFont(el: HTMLElement) {
  if (window.matchMedia(LANDSCAPE_TOUCH_QUERY).matches) {
    document.documentElement.style.fontSize = '16px';
    return;
  }
  const scale = Math.min(el.clientWidth / BASE_W, el.clientHeight / BASE_H);
  const clamped = Math.min(1.25, Math.max(0.45, scale));
  document.documentElement.style.fontSize = `${(16 * clamped).toFixed(2)}px`;
}

onMounted(() => {
  const el = stageRef.value?.$el;
  if (!el) return;
  fitRootFont(el);
  stageObserver = new ResizeObserver(() => fitRootFont(el));
  stageObserver.observe(el);
});
onBeforeUnmount(() => stageObserver?.disconnect());

onMounted(async () => {
  const preloader = new Preloader();
  await preloader.loadAll().catch((e: Error) => {
    captureException(e, { tags: { stage: 'preload' } });
    $q.notify({
      message: '網頁有新的內容，重新整理取得新版本',
      timeout: 0,
      position: 'top',
      actions: [
        {
          label: '重新整理',
          color: 'white',
          handler: () => {
            window.location.reload();
          },
        },
      ],
    });
  });
  isLoaded.value = true;
});
</script>
