import {
  Group,
  InstancedMesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  Character,
  CharacterKind,
  Decor,
  RISE,
  Staircase,
  WALL_RADIUS,
  createCharacter,
  createDecor,
  createDust,
  stepCenterAngle,
  stepPoint,
  stepTangent,
} from './builders';
import { CLEAR_COLOR, sceneUniforms } from './dither';
import { Candy, Ghost, Hazard, HazardState, Pumpkin } from './hazards';
import { QualitySettings, degrade } from './quality';
import { sound } from './sound';

export type GameOverReason = 'lantern' | 'hearts';

export interface GameResult {
  score: number;
  steps: number;
  candies: number;
  reason: GameOverReason;
  time: number;
  ghostsPassed: number;
  pumpkinsDodged: number;
  lanternsOut: number;
}

export interface GameEvents {
  onScore?: (score: number) => void;
  onHearts?: (hearts: number) => void;
  onDanger?: (level: number) => void;
  onFuel?: (fuel: number) => void;
  onCandy?: (count: number) => void;
  onPumpkinNear?: (near: boolean) => void;
  onGameOver?: (result: GameResult) => void;
  onQualityChange?: (settings: QualitySettings) => void;
  onGhostPass?: () => void;
  onPumpkinPass?: (dodged: boolean) => void;
}

export interface GameSnapshot {
  step: number;
  hearts: number;
  score: number;
  maxStep: number;
  fuel: number;
  candies: number;
  ghostsPassed: number;
  pumpkinsDodged: number;
  lanternsOut: number;
  nextStaticStep: number;
  nextCandyStep: number;
  pumpkinTimer: number;
  elapsed: number;
  hazards: HazardState[];
}

const MAX_HEARTS = 3;
const HOP_TIME = 0.15;
const INVULN_TIME = 1.8;
const JUMP_TIME = 0.95;
const JUMP_BUFFER_AT = 0.75;
const JUMP_HEIGHT = 1.25;
export const CANDY_FUEL = 0.4;
const CANDY_SCORE = 5;
const GHOST_PASS_STEPS = 1;
const FUEL_REFILL = 0.5;
const LOW_FUEL = 0.3;
const CAM_RADIUS = 3.7;
const CAM_BACK = 0.62;
const CAM_UP = 1.35;
const LOOK_AHEAD = 0.75;
const LOOK_RADIUS = 0.6;
const LOOK_UP = 1.25;
const SAFE_STEPS = 12;

const TIER_AT = [0, 150, 450, 900, 1600, 2600];
const FUEL_DURATION = [25, 25, 24, 23, 22, 15];
const GHOST_GAP: [number, number][] = [
  [30, 36],
  [28, 34],
  [28, 34],
  [24, 30],
  [20, 25],
  [15, 20],
];
const GHOST_VISIBLE = [2.5, 3, 3.5, 4, 5, 6];
const GHOST_HIDDEN = [3.5, 3, 2.8, 2.5, 2.2, 1.8];
const PUMPKIN_GAP: [number, number][] = [
  [12, 15],
  [10, 12],
  [8, 10],
  [6, 8],
  [4, 6],
  [2.5, 4],
];
const PUMPKIN_SPEED = [1.8, 2.1, 2.4, 2.8, 3.2, 4];
const MUSIC_TENSION = [0, 0, 0, 0.5, 0.8, 1];
const CANDY_GAP: [number, number] = [15, 22];

function lerpByStep(values: number[], step: number) {
  for (let i = TIER_AT.length - 1; i > 0; i -= 1) {
    if (step >= TIER_AT[i]) {
      if (i === TIER_AT.length - 1) return values[i];
      const t = (step - TIER_AT[i]) / (TIER_AT[i + 1] - TIER_AT[i]);
      return values[i] + (values[i + 1] - values[i]) * t;
    }
  }
  const t = step / TIER_AT[1];
  return values[0] + (values[1] - values[0]) * t;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

const v1 = new Vector3();
const v2 = new Vector3();

export class StairGame {
  readonly renderer: WebGLRenderer;

  private scene = new Scene();

  private camera = new PerspectiveCamera(60, 1, 0.05, 40);

  private timer = new Timer();

  private stairs: Staircase;

  private hero: Character;

  private hazards: Hazard[] = [];

  private decor: (Decor & { angle: number })[] = [];

  private dust: InstancedMesh;

  private dustPos: Vector3[] = [];

  private dummy = new Object3D();

  private resizeObserver: ResizeObserver;

  private running = false;

  private over = false;

  private paused = false;

  private tutorial = false;

  private timeScale = 1;

  private step = 0;

  private hopFrom = 0;

  private hopT = 1;

  private bump = 0;

  private queued = 0;

  private hearts = MAX_HEARTS;

  private invuln = 0;

  private dark = -100;

  private score = 0;

  private maxStep = 0;

  private fuel = 1;

  private candies = 0;

  private ghostsPassed = 0;

  private pumpkinsDodged = 0;

  private lanternsOut = 0;

  private lowFuelTimer = 0;

  private fuelShown = 100;

  private nextStaticStep = SAFE_STEPS;

  private nextCandyStep = 3;

  private pumpkinTimer = rand(...PUMPKIN_GAP[0]);

  private jumpT = 1;

  private jumpQueued = false;

  private pumpkinNear = false;

  private elapsed = 0;

  private shake = 0;

  private camAngle = 0;

  private camY = 0;

  private lastFrame = 0;

  private perfFrames = 0;

  private perfTime = 0;

  private slowWindows = 0;

  private constructor(
    private container: HTMLElement,
    private settings: QualitySettings,
    private events: GameEvents,
    renderer: WebGLRenderer,
    character: CharacterKind,
  ) {
    this.renderer = renderer;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'pixelated';
    container.appendChild(canvas);

    this.stairs = new Staircase(settings.visibleSteps);
    this.scene.add(this.stairs.group);

    this.hero = createCharacter(character);
    this.scene.add(this.hero.root);

    const hazardRoot = new Group();
    this.scene.add(hazardRoot);
    for (let i = 0; i < 6; i += 1) this.hazards.push(new Ghost(hazardRoot));
    for (let i = 0; i < 3; i += 1) this.hazards.push(new Pumpkin(hazardRoot));
    for (let i = 0; i < 8; i += 1) this.hazards.push(new Candy(hazardRoot));

    for (let i = 0; i < settings.decorCount; i += 1) {
      const decor = createDecor(i % 5);
      this.scene.add(decor.obj);
      this.decor.push({ ...decor, angle: 0 });
    }

    this.dust = createDust(settings.dustCount);
    this.scene.add(this.dust);
    for (let i = 0; i < settings.dustCount; i += 1) this.dustPos.push(new Vector3());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.reset();
  }

  static async create(
    container: HTMLElement,
    settings: QualitySettings,
    events: GameEvents,
    character: CharacterKind = 'boy',
  ) {
    const renderer = new WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: settings.tier === 'low' ? 'low-power' : 'high-performance',
    });
    renderer.setClearColor(CLEAR_COLOR, 1);
    const game = new StairGame(container, settings, events, renderer, character);
    await game.precompile();
    game.renderer.setAnimationLoop((t: number) => game.frame(t));
    return game;
  }

  get quality() {
    return this.settings;
  }

  private async precompile() {
    this.hazards.forEach((h, i) => {
      h.spawn(SAFE_STEPS + 1 + i, 0);
      h.update(0.5);
    });
    this.updateCamera(1);
    await this.renderer.compileAsync(this.scene, this.camera);
    this.hazards.forEach((h) => h.despawn());
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setPixelRatio(1 / this.settings.pixelSize);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.75 ? 58 : 45;
    this.camera.updateProjectionMatrix();
  }

  reset() {
    this.over = false;
    this.step = 0;
    this.hopFrom = 0;
    this.hopT = 1;
    this.bump = 0;
    this.queued = 0;
    this.hearts = MAX_HEARTS;
    this.invuln = 0;
    this.dark = -100;
    this.score = 0;
    this.maxStep = 0;
    sound.setIntensity(0);
    this.fuel = 1;
    this.candies = 0;
    this.ghostsPassed = 0;
    this.pumpkinsDodged = 0;
    this.lanternsOut = 0;
    this.lowFuelTimer = 0;
    this.fuelShown = 100;
    this.nextStaticStep = SAFE_STEPS;
    this.nextCandyStep = 3;
    this.pumpkinTimer = rand(...PUMPKIN_GAP[0]);
    this.jumpT = 1;
    this.jumpQueued = false;
    this.pumpkinNear = false;
    this.events.onPumpkinNear?.(false);
    this.elapsed = 0;
    this.shake = 0;
    this.hazards.forEach((h) => h.despawn());
    this.camAngle = stepCenterAngle(0);
    this.camY = 0;
    this.decor.forEach((d, i) => this.placeDecor(d, -3 + i * (14 / this.decor.length)));
    this.dustPos.forEach((p) => this.placeDust(p, true));
    this.hero.root.visible = true;
    this.events.onScore?.(0);
    this.events.onHearts?.(this.hearts);
    this.events.onFuel?.(1);
    this.events.onCandy?.(0);
    this.events.onDanger?.(0);
  }

  start() {
    this.reset();
    this.running = true;
    this.paused = false;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  startTutorial() {
    this.reset();
    this.tutorial = true;
    this.timeScale = 1;
    this.running = true;
    this.paused = false;
    this.fuel = 0.6;
    this.fuelShown = 60;
    this.events.onFuel?.(0.6);
  }

  setTimeScale(scale: number) {
    this.timeScale = scale;
  }

  endTutorial() {
    this.setGhostsForced(null);
    this.tutorial = false;
    this.timeScale = 1;
  }

  pumpkinDistance() {
    let d = Infinity;
    this.hazards.forEach((h) => {
      if (h.active && h.kind === 'pumpkin' && h.step - this.step > -0.5) {
        d = Math.min(d, h.step - this.step);
      }
    });
    return d;
  }

  hazardOnScreen(kind: 'ghost' | 'candy') {
    const h = this.hazards.find((x) => x.active && x.kind === kind);
    if (!h) return null;
    v1.copy(h.root.position);
    v1.y += kind === 'ghost' ? 1.0 : 0.6;
    v1.project(this.camera);
    return {
      x: ((v1.x + 1) / 2) * this.container.clientWidth,
      y: ((1 - v1.y) / 2) * this.container.clientHeight,
      visibility: h instanceof Ghost ? h.visibility : 1,
    };
  }

  setGhostsForced(mode: 'show' | 'hide' | null) {
    this.hazards.forEach((h) => {
      if (h instanceof Ghost) h.forced = mode;
    });
  }

  snapshot(): GameSnapshot {
    return {
      step: this.step,
      hearts: this.hearts,
      score: this.score,
      maxStep: this.maxStep,
      fuel: this.fuel,
      candies: this.candies,
      ghostsPassed: this.ghostsPassed,
      pumpkinsDodged: this.pumpkinsDodged,
      lanternsOut: this.lanternsOut,
      nextStaticStep: this.nextStaticStep,
      nextCandyStep: this.nextCandyStep,
      pumpkinTimer: this.pumpkinTimer,
      elapsed: this.elapsed,
      hazards: this.hazards.map((h) => h.saveState()),
    };
  }

  restore(s: GameSnapshot) {
    this.reset();
    Object.assign(this, {
      step: s.step,
      hopFrom: s.step,
      hearts: s.hearts,
      score: s.score,
      maxStep: s.maxStep,
      fuel: s.fuel,
      candies: s.candies,
      ghostsPassed: s.ghostsPassed,
      pumpkinsDodged: s.pumpkinsDodged,
      lanternsOut: s.lanternsOut,
      nextStaticStep: s.nextStaticStep,
      nextCandyStep: s.nextCandyStep,
      pumpkinTimer: s.pumpkinTimer,
      elapsed: s.elapsed,
      fuelShown: -1,
    });
    this.hazards.forEach((h, i) => h.loadState(s.hazards[i]));
    sound.setIntensity(lerpByStep(MUSIC_TENSION, this.maxStep));
    this.camAngle = stepCenterAngle(s.step);
    this.camY = s.step * RISE;
    this.decor.forEach((d, i) => this.placeDecor(d, this.camY - 3 + i * (14 / this.decor.length)));
    this.running = true;
    this.paused = false;
    this.events.onScore?.(this.score);
    this.events.onHearts?.(this.hearts);
    this.events.onCandy?.(this.candies);
  }

  climb() {
    this.move(1);
  }

  debugSpawn(kind: string, offset = 4) {
    const h = this.hazards.find((x) => !x.active && x.kind === kind);
    h?.spawn(this.step + offset, 0);
    return !!h;
  }

  descend() {
    this.move(-1);
  }

  private move(dir: 1 | -1) {
    if (!this.running || this.paused) return;
    if (this.hopT < 1) {
      this.queued = Math.max(-2, Math.min(this.queued + dir, 2));
      return;
    }
    this.tryHop(dir);
  }

  jump() {
    if (!this.running || this.paused) return;
    if (this.jumpT < 1) {
      if (this.jumpT > JUMP_BUFFER_AT) this.jumpQueued = true;
      return;
    }
    this.jumpT = 0;
    sound.jump();
  }

  private get airborne() {
    return this.jumpT > 0.04 && this.jumpT < 0.96;
  }

  private tryHop(dir: 1 | -1) {
    const target = this.step + dir;
    if (target < 0) return;
    const blocker =
      this.invuln <= 0 && this.hazards.find((h) => h.active && h.dangerAt(target, this.airborne));
    if (blocker) {
      this.bump = 1;
      this.queued = 0;
      if (!(blocker instanceof Ghost && blocker.justAppeared)) this.damage();
      return;
    }
    this.hopFrom = this.step;
    this.step = target;
    this.hopT = 0;
    this.maxStep = Math.max(this.maxStep, this.step);
    sound.setIntensity(lerpByStep(MUSIC_TENSION, this.maxStep));
    sound.step(this.step);
    this.collectCandy();
    this.updateScore();
  }

  private collectCandy() {
    const candy = this.hazards.find((h) => h.active && h.kind === 'candy' && h.step === this.step);
    if (!candy) return;
    candy.despawn();
    this.candies += 1;
    this.fuel = Math.min(1, this.fuel + CANDY_FUEL);
    sound.candy();
    this.events.onCandy?.(this.candies);
  }

  private updateScore() {
    const score = this.maxStep + this.candies * CANDY_SCORE;
    if (score === this.score) return;
    this.score = score;
    this.events.onScore?.(score);
  }

  private damage() {
    if (this.invuln > 0 || this.tutorial) return;
    this.loseHeart('hearts');
  }

  private loseHeart(reason: GameOverReason) {
    this.hearts -= 1;
    this.invuln = INVULN_TIME;
    this.shake = 0.35;
    sound.hit();
    if (navigator.vibrate) navigator.vibrate(80);
    this.events.onHearts?.(this.hearts);
    if (this.hearts <= 0) this.gameOver(reason);
  }

  private gameOver(reason: GameOverReason) {
    if (!this.running) return;
    this.running = false;
    this.over = true;
    this.shake = 0.5;
    this.dark = this.step - 6;
    if (this.pumpkinNear) {
      this.pumpkinNear = false;
      this.events.onPumpkinNear?.(false);
    }
    sound.gameOver();
    this.events.onGameOver?.({
      score: this.score,
      steps: this.maxStep,
      candies: this.candies,
      reason,
      time: this.elapsed,
      ghostsPassed: this.ghostsPassed,
      pumpkinsDodged: this.pumpkinsDodged,
      lanternsOut: this.lanternsOut,
    });
  }

  private frame(now: number) {
    const cap = this.settings.fpsCap;
    if (cap && now - this.lastFrame < 1000 / cap - 2) return;
    const frameDt = this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60;
    this.lastFrame = now;
    this.monitorPerf(frameDt);

    this.timer.update(now);
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    if (this.running && !this.paused) this.updateGame(dt * this.timeScale);
    else if (this.over) this.dark += dt * 6;

    this.updateVisuals(this.paused ? 0 : dt * this.timeScale);
    this.renderer.render(this.scene, this.camera);
  }

  private tier() {
    let tier = 0;
    TIER_AT.forEach((at, i) => {
      if (this.maxStep >= at) tier = i;
    });
    return tier;
  }

  private updateGame(dt: number) {
    this.elapsed += dt;

    if (this.hopT < 1) {
      this.hopT = Math.min(1, this.hopT + dt / HOP_TIME);
      if (this.hopT >= 1 && this.queued !== 0) {
        const dir = this.queued > 0 ? 1 : -1;
        this.queued -= dir;
        this.tryHop(dir);
      }
    }
    if (this.jumpT < 1) {
      this.jumpT = Math.min(1, this.jumpT + dt / JUMP_TIME);
      if (this.jumpT >= 1 && this.jumpQueued) {
        this.jumpQueued = false;
        this.jump();
      }
    }
    this.bump = Math.max(0, this.bump - dt * 5);
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.elapsed > 2 && !this.tutorial) {
      this.fuel = Math.max(0, this.fuel - dt / FUEL_DURATION[this.tier()]);
    }
    const shown = Math.ceil(this.fuel * 100);
    if (shown !== this.fuelShown) {
      this.fuelShown = shown;
      this.events.onFuel?.(shown / 100);
      this.events.onDanger?.(this.fuel < LOW_FUEL ? 1 - this.fuel / LOW_FUEL : 0);
    }
    if (this.fuel < LOW_FUEL) {
      this.lowFuelTimer -= dt;
      if (this.lowFuelTimer <= 0) {
        this.lowFuelTimer = 1;
        sound.lowFuel();
      }
    } else {
      this.lowFuelTimer = 0;
    }
    if (this.fuel <= 0) {
      this.lanternsOut += 1;
      sound.lanternOut();
      this.loseHeart('lantern');
      if (!this.running) return;
      this.fuel = FUEL_REFILL;
      this.lowFuelTimer = 0;
    }

    if (!this.tutorial) this.spawnHazards(dt);

    const { airborne } = this;
    const pumpkinNear = this.hazards.some(
      (h) => h.active && h.kind === 'pumpkin' && h.step - this.step > 0 && h.step - this.step < 3,
    );
    if (pumpkinNear !== this.pumpkinNear) {
      this.pumpkinNear = pumpkinNear;
      if (pumpkinNear) sound.pumpkinWarn();
      this.events.onPumpkinNear?.(pumpkinNear);
    }
    this.hazards.forEach((h) => {
      if (!h.active) return;
      h.playerStep = this.step;
      const alive = h.update(dt);
      const ghostPassed = h.kind === 'ghost' && this.step >= h.step + GHOST_PASS_STEPS;
      const passed = ghostPassed || (h.kind === 'candy' && this.step - h.step > 6);
      if (ghostPassed) {
        this.ghostsPassed += 1;
        sound.ghost();
        this.events.onGhostPass?.();
      }
      if (h instanceof Pumpkin && !h.settled && h.step < this.step - 0.5) {
        h.settled = true;
        if (!h.hitPlayer) {
          this.pumpkinsDodged += 1;
          sound.dodge();
        }
        this.events.onPumpkinPass?.(!h.hitPlayer);
      }
      if (!alive || passed) {
        h.despawn();
        return;
      }
      if (h.dangerAt(this.step, airborne)) {
        if (h instanceof Pumpkin) h.hitPlayer = true;
        if (this.invuln <= 0) this.damage();
      }
    });
  }

  private spawnHazards(dt: number) {
    const free = (kind: string) => this.hazards.find((h) => !h.active && h.kind === kind);
    const occupied = (s: number) => this.hazards.some((h) => h.active && Math.round(h.step) === s);

    while (this.nextStaticStep < this.step + 16) {
      const s = this.nextStaticStep;
      const h = free('ghost');
      if (h instanceof Ghost && !occupied(s)) {
        h.spawn(s, 0);
        h.setTiming(GHOST_VISIBLE[this.tier()], GHOST_HIDDEN[this.tier()]);
      }
      this.nextStaticStep += randInt(...GHOST_GAP[this.tier()]);
    }

    while (this.nextCandyStep < this.step + 14) {
      const s = this.nextCandyStep;
      const h = free('candy');
      if (h && !occupied(s)) h.spawn(s, 0);
      this.nextCandyStep += randInt(...CANDY_GAP);
    }

    if (this.maxStep > 10) {
      this.pumpkinTimer -= dt;
      if (this.pumpkinTimer <= 0) {
        this.pumpkinTimer = rand(...PUMPKIN_GAP[this.tier()]);
        const h = free('pumpkin');
        if (h instanceof Pumpkin) {
          h.spawn(this.step + 12, 0);
          h.setSpeed(lerpByStep(PUMPKIN_SPEED, this.maxStep));
        }
      }
    }
  }

  private updateVisuals(dt: number) {
    const t = this.timer.getElapsed();
    const ease = 1 - (1 - this.hopT) ** 2;
    const vStep = this.hopFrom + (this.step - this.hopFrom) * ease + this.bump * 0.25;
    const { hero } = this;

    stepPoint(vStep, undefined, hero.root.position);
    hero.root.position.y += Math.sin(this.hopT * Math.PI) * 0.12;
    hero.root.position.y += Math.sin(this.jumpT * Math.PI) * JUMP_HEIGHT;
    stepTangent(vStep, v1).add(hero.root.position);
    hero.root.lookAt(v1);
    const walk = this.hopT < 1 ? Math.sin(this.hopT * Math.PI) : 0;
    const air = Math.sin(this.jumpT * Math.PI);
    hero.legL.rotation.x = -walk * 0.9 - air * 0.8;
    hero.legR.rotation.x = walk * 0.3 + air * 0.4;
    hero.armR.rotation.x = -0.3 + walk * 0.4 - air * 1.2;
    hero.armL.rotation.x = -1.1 - air * 0.8;
    hero.body.rotation.x = 0.12 + walk * 0.12;
    hero.body.position.y = Math.sin(t * 2.5) * 0.01;
    hero.root.visible = this.invuln <= 0 || Math.floor(this.invuln * 12) % 2 === 0;

    hero.lantern.getWorldPosition(v2);
    sceneUniforms.light.value.copy(v2).add(v1.set(0, 0.25, 0));
    const flicker = 0.92 + Math.sin(t * 13) * 0.04 + Math.sin(t * 31) * 0.03;
    sceneUniforms.lightPower.value = flicker * (0.35 + 0.65 * this.fuel);
    sceneUniforms.fogFar.value = 5 + this.fuel * 7.5;
    sceneUniforms.fogNear.value = sceneUniforms.fogFar.value - 5;
    sceneUniforms.darkY.value = this.dark * RISE;

    const first = Math.floor(this.step - this.settings.visibleSteps * 0.3);
    this.stairs.layout(first);
    this.stairs.follow(this.camY);

    this.updateCamera(dt);
    this.updateDecor(t);
    this.updateDust(dt);
  }

  private updateCamera(dt: number) {
    const ease = 1 - (1 - this.hopT) ** 2;
    const vStep = this.hopFrom + (this.step - this.hopFrom) * ease;
    const targetAngle = stepCenterAngle(vStep);
    const k = dt >= 1 ? 1 : 1 - Math.exp(-dt * 5);
    this.camAngle += (targetAngle - this.camAngle) * k;
    const jumpLift = Math.sin(this.jumpT * Math.PI) * JUMP_HEIGHT * 0.5;
    this.camY += (vStep * RISE + jumpLift - this.camY) * k;

    this.shake = Math.max(0, this.shake - dt);
    const sx = (Math.random() - 0.5) * this.shake * 0.3;
    const sy = (Math.random() - 0.5) * this.shake * 0.3;
    const a = this.camAngle - CAM_BACK;
    this.camera.position.set(
      Math.cos(a) * CAM_RADIUS + sx,
      this.camY + CAM_UP + sy,
      -Math.sin(a) * CAM_RADIUS,
    );
    const la = this.camAngle + LOOK_AHEAD;
    this.camera.lookAt(
      Math.cos(la) * LOOK_RADIUS,
      this.camY + LOOK_UP,
      -Math.sin(la) * LOOK_RADIUS,
    );
  }

  // eslint-disable-next-line class-methods-use-this
  private placeDecor(d: { obj: Group; angle: number }, y: number) {
    d.angle = rand(0, Math.PI * 2);
    const r = WALL_RADIUS - 0.08;
    d.obj.position.set(Math.cos(d.angle) * r, y, Math.sin(d.angle) * r);
    d.obj.lookAt(0, y, 0);
  }

  private updateDecor(t: number) {
    const top = this.camY + 11;
    const cam = this.camera.position;
    this.decor.forEach((d) => {
      if (d.obj.position.y < this.camY - 4) this.placeDecor(d, top + rand(0, 2));
      d.obj.visible = d.obj.position.distanceTo(cam) > 2;
      if (d.obj.visible) d.tick?.(t);
    });
  }

  private placeDust(p: Vector3, anywhere = false) {
    const a = rand(0, Math.PI * 2);
    const r = rand(0.4, 3.2);
    const y = this.camY + (anywhere ? rand(-2, 5) : rand(-2, -1));
    p.set(Math.cos(a) * r, y, Math.sin(a) * r);
  }

  private updateDust(dt: number) {
    const n = this.settings.dustCount;
    this.dust.count = n;
    if (!n) return;
    const t = this.timer.getElapsed();
    for (let i = 0; i < n; i += 1) {
      const p = this.dustPos[i];
      p.y += dt * 0.12;
      p.x += Math.sin(t * 0.7 + i) * dt * 0.05;
      if (p.y > this.camY + 5) this.placeDust(p);
      this.dummy.position.copy(p);
      this.dummy.updateMatrix();
      this.dust.setMatrixAt(i, this.dummy.matrix);
    }
    this.dust.instanceMatrix.needsUpdate = true;
  }

  private monitorPerf(dt: number) {
    if (document.hidden || dt > 0.5) return;
    this.perfFrames += 1;
    this.perfTime += dt;
    if (this.perfTime < 2) return;
    const fps = this.perfFrames / this.perfTime;
    this.perfFrames = 0;
    this.perfTime = 0;
    const target = this.settings.fpsCap ? this.settings.fpsCap * 0.8 : 45;
    this.slowWindows = fps < target ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= 2 && degrade(this.settings)) {
      this.slowWindows = 0;
      this.resize();
      this.events.onQualityChange?.(this.settings);
    }
  }

  dispose() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.scene.traverse((obj) => {
      const mesh = obj as unknown as {
        geometry?: { dispose: () => void };
        material?: { dispose: () => void };
      };
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
