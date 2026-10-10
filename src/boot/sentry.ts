import * as Sentry from '@sentry/vue';
import { boot } from 'quasar/wrappers';
import { version } from '../../package.json';

const MAX_EVENTS_PER_PAGE = 10;

export default boot(({ app, router }) => {
  const dsn = process.env.QUASAR_SENTRY_DSN;
  if (!dsn) return;
  let sent = 0;
  Sentry.init({
    beforeSend(event) {
      if (sent >= MAX_EVENTS_PER_PAGE) return null;
      sent += 1;
      return event;
    },
    app,
    dsn,
    integrations: [Sentry.browserTracingIntegration({ router })],
    environment: process.env.QUASAR_ENVIRONMENT,
    release: version,
    tracesSampleRate: 0.1,
    tracePropagationTargets: ['localhost', window.location.origin],
  });
});
