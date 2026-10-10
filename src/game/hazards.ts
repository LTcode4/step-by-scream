import { Group, Object3D, ShaderMaterial, Vector3 } from 'three';
import {
  PUMPKIN_RADIUS,
  RISE,
  STEP_ANGLE,
  R_OUT,
  WALK_RADIUS,
  createCandyMesh,
  createGhostMesh,
  createPumpkinMesh,
  stepPoint,
  stepTangent,
} from './builders';
import { setDitherOpacity } from './dither';

export type HazardKind = 'ghost' | 'pumpkin' | 'candy';

type Extra = Record<string, number | boolean>;

export interface HazardState {
  active: boolean;
  step: number;
  t: number;
  extra: Extra;
}

const PUMPKIN_HIT_RANGE = 0.35;
const tmp = new Vector3();
const tmp2 = new Vector3();

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export abstract class Hazard {
  abstract readonly kind: HazardKind;

  readonly root = new Group();

  active = false;

  step = 0;

  protected t = 0;

  protected materials: ShaderMaterial[] = [];

  constructor(parent: Object3D) {
    this.root.visible = false;
    parent.add(this.root);
  }

  spawn(step: number, difficulty: number) {
    this.active = true;
    this.step = step;
    this.t = Math.random() * 10;
    this.root.visible = true;
    this.setOpacity(1);
    this.onSpawn(difficulty);
  }

  despawn() {
    this.active = false;
    this.root.visible = false;
  }

  saveState(): HazardState {
    return { active: this.active, step: this.step, t: this.t, extra: this.saveExtra() };
  }

  loadState(state: HazardState) {
    if (!state.active) {
      this.despawn();
      return;
    }
    this.spawn(state.step, 0);
    this.t = state.t;
    this.loadExtra(state.extra);
  }

  // eslint-disable-next-line class-methods-use-this
  protected saveExtra(): Extra {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  protected loadExtra(extra: Extra) {}

  protected setOpacity(v: number) {
    this.materials.forEach((m) => setDitherOpacity(m, v));
  }

  abstract dangerAt(step: number, airborne: boolean): boolean;

  abstract update(dt: number): boolean;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  protected onSpawn(difficulty: number) {}
}

export class Ghost extends Hazard {
  readonly kind = 'ghost';

  private visibleTime = 2;

  private hiddenTime = 3;

  private opacity = 1;

  forced: 'show' | 'hide' | null = null;

  private body: Group;

  get visibility() {
    return this.opacity;
  }

  constructor(parent: Object3D) {
    super(parent);
    const { group, materials } = createGhostMesh();
    this.body = group;
    this.materials = materials;
    this.root.add(group);
  }

  protected onSpawn() {
    this.forced = null;
    this.visibleTime = 2;
    this.hiddenTime = 3;
    stepPoint(this.step, WALK_RADIUS, this.root.position);
    this.body.position.set(0, 0.05, 0);
    this.root.rotation.set(0, 0, 0);
    stepPoint(this.step - 3, R_OUT + 1.2, tmp);
    this.root.lookAt(tmp.x, this.root.position.y, tmp.z);
  }

  setTiming(visible: number, hidden: number) {
    this.visibleTime = visible;
    this.hiddenTime = hidden;
  }

  protected saveExtra() {
    return { visibleTime: this.visibleTime, hiddenTime: this.hiddenTime };
  }

  protected loadExtra(extra: Extra) {
    this.visibleTime = extra.visibleTime as number;
    this.hiddenTime = extra.hiddenTime as number;
  }

  update(dt: number) {
    this.t += dt;
    const v = this.visibleTime;
    const time = this.t % (v + this.hiddenTime);
    if (this.forced) {
      const target = this.forced === 'show' ? 1 : 0;
      this.opacity += (target - this.opacity) * Math.min(1, dt * 8);
      if (Math.abs(target - this.opacity) < 0.01) this.opacity = target;
    } else {
      this.opacity = smooth(0, v / 7, time) * (1 - smooth((v * 6) / 7, v, time));
    }
    this.setOpacity(this.opacity);
    return true;
  }

  dangerAt(step: number) {
    return step === this.step && this.opacity > 0.5;
  }
}

export class Pumpkin extends Hazard {
  readonly kind = 'pumpkin';

  private speed = 2.4;

  private roller: Group;

  playerStep = 0;

  hitPlayer = false;

  settled = false;

  constructor(parent: Object3D) {
    super(parent);
    const { group, roller, materials } = createPumpkinMesh();
    this.roller = roller;
    this.materials = materials;
    this.root.add(group);
  }

  protected onSpawn() {
    this.speed = 2.2;
    this.hitPlayer = false;
    this.settled = false;
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  protected saveExtra() {
    return { speed: this.speed, hitPlayer: this.hitPlayer, settled: this.settled };
  }

  protected loadExtra(extra: Extra) {
    this.speed = extra.speed as number;
    this.hitPlayer = extra.hitPlayer as boolean;
    this.settled = extra.settled as boolean;
  }

  update(dt: number) {
    this.t += dt;
    this.step -= this.speed * dt;
    stepPoint(this.step, WALK_RADIUS, tmp);
    tmp.y = this.step * RISE + PUMPKIN_RADIUS + Math.abs(Math.sin(this.step * Math.PI)) * 0.12;
    this.root.position.copy(tmp);
    stepTangent(this.step, tmp2).negate();
    this.root.lookAt(tmp.add(tmp2));
    const travel = this.speed * dt * WALK_RADIUS * STEP_ANGLE;
    this.roller.rotation.x += travel / PUMPKIN_RADIUS;
    return this.step > this.playerStep - 6;
  }

  dangerAt(step: number, airborne: boolean) {
    return !airborne && Math.abs(this.step - step) < PUMPKIN_HIT_RANGE;
  }
}

export class Candy extends Hazard {
  readonly kind = 'candy';

  private body: Group;

  constructor(parent: Object3D) {
    super(parent);
    const { group, materials } = createCandyMesh();
    this.body = group;
    this.materials = materials;
    this.root.add(group);
  }

  protected onSpawn() {
    stepPoint(this.step, WALK_RADIUS, this.root.position);
  }

  update(dt: number) {
    this.t += dt;
    this.body.position.y = 0.35 + Math.sin(this.t * 3) * 0.05;
    this.body.rotation.y = this.t * 2.2;
    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  dangerAt() {
    return false;
  }
}
