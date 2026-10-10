import { defineStore } from 'pinia';
import type { CharacterKind } from 'src/game/builders';
import type { GameResult } from 'src/game/StairGame';
import type { QualitySettings } from 'src/game/quality';

const TUTORIAL_KEY = 'step-by-scream-tutorial-seen';

function readTutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

interface State {
  quality: QualitySettings | null;
  webgl2: boolean;
  lastResult: GameResult | null;
  tutorialSeen: boolean;
  character: CharacterKind | null;
}

export const useAppStore = defineStore('app', {
  state: (): State => ({
    quality: null,
    webgl2: true,
    lastResult: null,
    tutorialSeen: readTutorialSeen(),
    character: null,
  }),
  actions: {
    setCharacter(character: CharacterKind) {
      this.character = character;
    },
    resetSession() {
      this.character = null;
      this.lastResult = null;
    },
    markTutorialSeen() {
      this.tutorialSeen = true;
      try {
        localStorage.setItem(TUTORIAL_KEY, '1');
        // eslint-disable-next-line no-empty
      } catch {}
    },
    submitResult(result: GameResult) {
      this.lastResult = result;
    },
  },
});
