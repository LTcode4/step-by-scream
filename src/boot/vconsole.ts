import { boot } from 'quasar/wrappers';

const VCONSOLE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/vConsole/3.15.1/vconsole.min.js';

export default boot(() => {
  const isDevelopmentOrStaging = ['development', 'staging'].includes(
    process.env.QUASAR_ENVIRONMENT as string,
  );
  const urlParams = new URLSearchParams(window.location.search);
  const enableVConsole = urlParams.get('debug') === 'true';
  if (isDevelopmentOrStaging && enableVConsole) {
    const script = document.createElement('script');
    script.src = VCONSOLE_CDN;
    script.onload = () => {
      const { VConsole } = window as unknown as { VConsole: new () => unknown };
      const vConsole = new VConsole();
      console.log('VConsole has been enabled', vConsole);
    };
    document.head.appendChild(script);
  }
});
