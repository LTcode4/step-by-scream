export type QualityTier = 'high' | 'mid' | 'low';

export interface QualitySettings {
  tier: QualityTier;
  pixelSize: number;
  visibleSteps: number;
  decorCount: number;
  dustCount: number;
  fpsCap: number;
}

const PRESETS: Record<QualityTier, Omit<QualitySettings, 'tier'>> = {
  high: { pixelSize: 2, visibleSteps: 48, decorCount: 14, dustCount: 120, fpsCap: 0 },
  mid: { pixelSize: 2.5, visibleSteps: 36, decorCount: 10, dustCount: 40, fpsCap: 0 },
  low: { pixelSize: 3.2, visibleSteps: 26, decorCount: 6, dustCount: 0, fpsCap: 30 },
};

export const TIER_LABEL: Record<QualityTier, string> = {
  high: '高',
  mid: '中',
  low: '低',
};

interface NavigatorExt extends Navigator {
  deviceMemory?: number;
}

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const ok = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export function buildSettings(tier: QualityTier): QualitySettings {
  return { tier, ...PRESETS[tier] };
}

export interface DetectResult {
  settings: QualitySettings;
  webgl2: boolean;
}

export function detectQuality(): DetectResult {
  const nav = navigator as NavigatorExt;
  const webgl2 = hasWebGL2();

  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'high' || forced === 'mid' || forced === 'low') {
    return { settings: buildSettings(forced), webgl2 };
  }

  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);
  const shortSide = Math.min(window.screen.width, window.screen.height) * window.devicePixelRatio;

  let tier: QualityTier = 'mid';
  if ((memory !== undefined && memory <= 2) || cores <= 4 || shortSide < 720) {
    tier = 'low';
  } else if ((!isMobile || cores >= 6) && (memory === undefined || memory >= 4)) {
    tier = 'high';
  }

  return { settings: buildSettings(tier), webgl2 };
}

export function degrade(settings: QualitySettings): boolean {
  if (settings.pixelSize >= 4) return false;
  settings.pixelSize = Math.min(4, settings.pixelSize * 1.25);
  settings.dustCount = 0;
  return true;
}
