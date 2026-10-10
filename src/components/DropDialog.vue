<template>
  <Transition name="dlg-fade">
    <div
      v-if="modelValue"
      class="absolute inset-0 z-40 bg-black/60"
      @pointerdown.stop
      @click="closable && close()" />
  </Transition>
  <Transition name="dlg-drop">
    <div
      v-if="modelValue"
      class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-5">
      <div
        class="dlg-panel pointer-events-auto relative w-full max-w-[22rem] border-2 border-white bg-black text-white"
        role="dialog"
        aria-modal="true"
        @pointerdown.stop>
        <span class="dlg-rope left-6" />
        <span class="dlg-rope right-6" />
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: boolean; closable?: boolean }>(), {
  closable: false,
});
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

function close() {
  if (props.closable) emit('update:modelValue', false);
}
</script>
