import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import routes from './routes';

export default route(() => {
  const webHistory =
    process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory;
  const createHistory = process.env.SERVER ? createMemoryHistory : webHistory;

  const Router = createRouter({
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  return Router;
});
