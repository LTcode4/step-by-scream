import { RouteRecordRaw } from 'vue-router';
import { useAppStore } from 'src/stores/app-store';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'HomePage',
        component: () => import('pages/HomePage.vue'),
      },
      {
        path: 'character',
        name: 'CharacterPage',
        component: () => import('pages/CharacterPage.vue'),
      },
      {
        path: 'game',
        name: 'GamePage',
        component: () => import('pages/GamePage.vue'),
        beforeEnter: (to) => {
          if (useAppStore().character) return true;
          return { name: 'CharacterPage', query: to.query };
        },
      },
      {
        path: 'result',
        name: 'ResultPage',
        component: () => import('pages/ResultPage.vue'),
      },
      {
        path: ':catchAll(.*)*',
        name: 'NotFound',
        component: () => import('pages/ErrorNotFound.vue'),
      },
    ],
  },
];

export default routes;
