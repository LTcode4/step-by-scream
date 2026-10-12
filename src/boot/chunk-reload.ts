import { boot } from 'quasar/wrappers';

const RELOAD_KEY = 'chunk-reload-at';
const RELOAD_COOLDOWN_MS = 10_000;
const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'is not a valid JavaScript MIME type',
];

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

const reloadedRecently = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    return Date.now() - last < RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
};

const markReload = () => {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
};

export default boot(({ router }) => {
  router.onError((error, to) => {
    if (!isChunkLoadError(error) || reloadedRecently()) return;
    markReload();
    window.location.assign(to.fullPath);
  });
});
