import { createGtm } from '@gtm-support/vue-gtm';
import { boot } from 'quasar/wrappers';

export default boot(({ app, router }) => {
  const gtmId = process.env.QUASAR_GTM_ID;
  if (!gtmId) return;
  const gtm = createGtm({
    id: gtmId,
    enabled: true,
    debug: !!process.env.DEV,
    vueRouter: router,
    trackOnNextTick: false,
  });
  app.use(gtm);
});
