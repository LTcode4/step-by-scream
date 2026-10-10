import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Material,
  Mesh,
  Object3D,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createDitherMaterial,
  createOutlineMaterial,
  createWallMaterial,
  setDitherOpacity,
} from './dither';

export const STEPS_PER_TURN = 18;
export const STEP_ANGLE = (Math.PI * 2) / STEPS_PER_TURN;
export const RISE = 0.2;
export const R_IN = 1.0;
export const R_OUT = 2.4;
export const WALK_RADIUS = 1.45;
export const WALL_RADIUS = 4.3;
const STEP_THICK = 0.3;

export const stepCenterAngle = (s: number) => (s + 0.5) * STEP_ANGLE;

export function stepPoint(s: number, radius = WALK_RADIUS, target = new Vector3()) {
  const a = stepCenterAngle(s);
  return target.set(Math.cos(a) * radius, s * RISE, -Math.sin(a) * radius);
}

export function stepTangent(s: number, target = new Vector3()) {
  const a = stepCenterAngle(s);
  return target.set(-Math.sin(a), 0, -Math.cos(a));
}

const outlineBlack = createOutlineMaterial(false);
const outlineWhite = createDitherMaterial({ albedo: 0, emissive: 1, side: BackSide });

// eslint-disable-next-line default-param-last
export function addOutline(mesh: Mesh, scale = 1.14, white = false, material?: Material) {
  const hull = new Mesh(mesh.geometry, material ?? (white ? outlineWhite : outlineBlack));
  hull.scale.setScalar(scale);
  mesh.add(hull);
  return mesh;
}

function part(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

export class Staircase {
  readonly group = new Group();

  private steps: InstancedMesh;

  private balusters: InstancedMesh;

  private rails: InstancedMesh;

  private wall: Mesh;

  private dummy = new Object3D();

  private firstStep = Number.NaN;

  constructor(private count: number) {
    const shape = new Shape();
    const a0 = 0;
    const a1 = STEP_ANGLE * 1.02;
    shape.moveTo(Math.cos(a0) * R_IN, Math.sin(a0) * R_IN);
    shape.lineTo(Math.cos(a0) * R_OUT, Math.sin(a0) * R_OUT);
    shape.absarc(0, 0, R_OUT, a0, a1, false);
    shape.lineTo(Math.cos(a1) * R_IN, Math.sin(a1) * R_IN);
    shape.absarc(0, 0, R_IN, a1, a0, true);
    const stepGeo = new ExtrudeGeometry(shape, {
      depth: STEP_THICK,
      bevelEnabled: false,
      curveSegments: 3,
    });
    stepGeo.rotateX(-Math.PI / 2).translate(0, -STEP_THICK, 0);

    this.steps = new InstancedMesh(stepGeo, createDitherMaterial({ albedo: 0.85 }), count);
    this.balusters = new InstancedMesh(
      new CylinderGeometry(0.035, 0.06, 0.8, 5).translate(0, 0.4, 0),
      createDitherMaterial({ albedo: 1, emissive: 0.1 }),
      count,
    );
    this.rails = new InstancedMesh(
      new BoxGeometry(0.09, 0.07, 1).translate(0, 0, 0.5),
      createDitherMaterial({ albedo: 1, emissive: 0.15 }),
      count,
    );
    [this.steps, this.balusters, this.rails].forEach((m) => {
      m.frustumCulled = false;
      this.group.add(m);
    });

    this.wall = new Mesh(
      new CylinderGeometry(WALL_RADIUS, WALL_RADIUS, 30, 36, 1, true),
      createWallMaterial(),
    );
    this.group.add(this.wall);
  }

  layout(first: number) {
    if (first === this.firstStep) return;
    this.firstStep = first;
    const d = this.dummy;
    const railStart = new Vector3();
    const railEnd = new Vector3();
    const railR = R_IN + 0.08;
    for (let i = 0; i < this.count; i += 1) {
      const s = first + i;
      d.position.set(0, s * RISE, 0);
      d.rotation.set(0, s * STEP_ANGLE, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      this.steps.setMatrixAt(i, d.matrix);

      stepPoint(s, railR, d.position);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      this.balusters.setMatrixAt(i, d.matrix);

      stepPoint(s, railR, railStart).y += 0.82;
      stepPoint(s + 1, railR, railEnd).y += 0.82;
      d.position.copy(railStart);
      d.lookAt(railEnd);
      d.scale.set(1, 1, railStart.distanceTo(railEnd));
      d.updateMatrix();
      this.rails.setMatrixAt(i, d.matrix);
    }
    this.steps.instanceMatrix.needsUpdate = true;
    this.balusters.instanceMatrix.needsUpdate = true;
    this.rails.instanceMatrix.needsUpdate = true;
  }

  follow(y: number) {
    this.wall.position.y = y;
  }
}

export interface Character {
  root: Group;
  body: Group;
  legL: Object3D;
  legR: Object3D;
  armL: Object3D;
  armR: Object3D;
  lantern: Object3D;
}

export type CharacterKind = 'boy' | 'girl';

export function createCharacter(kind: CharacterKind = 'boy'): Character {
  const girl = kind === 'girl';
  const skin = createDitherMaterial({ albedo: 1, emissive: 0.55, warm: false });
  const shirt = createDitherMaterial({ albedo: 1, emissive: 0.45, warm: false });
  const dark = createDitherMaterial({ albedo: 0.12, warm: false });
  const shoe = createDitherMaterial({ albedo: 1, emissive: 0.5, warm: false });
  const glow = createDitherMaterial({ albedo: 1, emissive: 1.4, tint: 'orange' });
  const halo = createDitherMaterial({ albedo: 0, emissive: 1.2, opacity: 0.28, tint: 'orange' });

  const root = new Group();
  const body = new Group();
  root.add(body);

  const legGeo = girl
    ? new CapsuleGeometry(0.055, 0.2, 3, 6).translate(0, -0.15, 0)
    : new CapsuleGeometry(0.075, 0.22, 3, 6).translate(0, -0.15, 0);
  const shoeGeo = new BoxGeometry(0.12, 0.07, 0.2).translate(0, -0.33, 0.04);
  const makeLeg = (x: number) => {
    const leg = new Group();
    leg.position.set(x, 0.36, 0);
    leg.add(addOutline(new Mesh(legGeo, girl ? skin : dark), 1.2, !girl));
    leg.add(addOutline(new Mesh(shoeGeo, girl ? dark : shoe), 1.2, girl));
    body.add(leg);
    return leg;
  };
  const legL = makeLeg(-0.09);
  const legR = makeLeg(0.09);

  const torso = addOutline(part(new CapsuleGeometry(0.17, 0.2, 4, 10), shirt, 0, 0.6, 0), 1.1);
  torso.scale.set(girl ? 1 : 1.1, 1, 0.85);
  body.add(torso);
  if (girl) {
    const skirt = addOutline(
      part(new CylinderGeometry(0.15, 0.25, 0.22, 10), dark, 0, 0.43, 0),
      1.08,
      true,
    );
    body.add(skirt);
  }

  body.add(addOutline(part(new SphereGeometry(0.19, 12, 10), skin, 0, 0.97, 0.02), 1.1));
  const hair = addOutline(part(new SphereGeometry(0.2, 10, 8), dark, 0, 1.03, -0.03), 1.08, true);
  hair.scale.set(1.08, 0.82, 1.08);
  body.add(hair);
  if (girl) {
    const longHair = addOutline(
      part(new CapsuleGeometry(0.16, 0.22, 4, 8), dark, 0, 0.84, -0.1),
      1.08,
      true,
    );
    longHair.scale.set(1.15, 1, 0.75);
    body.add(longHair);
    const bowMat = createDitherMaterial({ albedo: 1, emissive: 1, tint: 'orange' });
    const bow = new Group();
    bow.position.set(0.13, 1.17, 0);
    bow.rotation.z = -0.4;
    const loopGeo = new SphereGeometry(0.055, 8, 6);
    [-0.05, 0.05].forEach((x) => {
      const loop = part(loopGeo, bowMat, x, 0, 0);
      loop.scale.set(1.3, 0.9, 0.6);
      bow.add(addOutline(loop, 1.15));
    });
    bow.add(part(new SphereGeometry(0.025, 6, 4), bowMat));
    body.add(bow);
  }

  const pack = girl ? [0.22, 0.28, 0.14] : [0.28, 0.34, 0.18];
  body.add(
    addOutline(
      part(new BoxGeometry(pack[0], pack[1], pack[2]), dark, 0, 0.64, -0.18 - pack[2] / 9),
      1.08,
      true,
    ),
  );
  if (!girl) body.add(part(new BoxGeometry(0.24, 0.1, 0.06), dark, 0, 0.5, -0.31));

  const armGeo = new CapsuleGeometry(0.055, 0.24, 3, 6).translate(0, -0.15, 0);
  const makeArm = (x: number) => {
    const arm = new Group();
    arm.position.set(x, 0.74, 0);
    arm.add(addOutline(new Mesh(armGeo, shirt), 1.2));
    body.add(arm);
    return arm;
  };
  const armL = makeArm(girl ? 0.2 : 0.22);
  const armR = makeArm(girl ? -0.2 : -0.22);
  armL.rotation.set(-1.1, 0, 0.6);
  armR.rotation.set(-0.3, 0, -0.25);

  const lantern = new Group();
  lantern.position.set(0, -0.32, 0);
  lantern.add(addOutline(part(new BoxGeometry(0.07, 0.09, 0.07), glow), 1.3));
  lantern.add(part(new SphereGeometry(0.16, 10, 8), halo));
  armR.add(lantern);

  root.scale.setScalar(0.95);
  return { root, body, legL, legR, armL, armR, lantern };
}

export function createGhostMesh() {
  const g = new Group();
  const pts = [
    [0.3, 0.0],
    [0.26, 0.04],
    [0.25, 0.12],
    [0.23, 0.35],
    [0.2, 0.5],
    [0.12, 0.58],
    [0.0, 0.6],
  ].map(([x, y]) => new Vector2(x, y));
  const bodyMat = createDitherMaterial({ albedo: 1, emissive: 2.2 });
  const body = new Mesh(new LatheGeometry(pts, 14), bodyMat);
  const outlineMat = createDitherMaterial({ albedo: 0, side: BackSide });
  addOutline(body, 1.12, false, outlineMat);
  g.add(body);
  const eyeMat = createDitherMaterial({ albedo: 0, emissive: 0 });
  const eyeGeo = new SphereGeometry(0.055, 8, 6);
  const eyeL = part(eyeGeo, eyeMat, 0.085, 0.4, 0.2);
  const eyeR = part(eyeGeo, eyeMat, -0.085, 0.4, 0.2);
  eyeL.scale.set(1, 1.4, 0.6);
  eyeR.scale.set(1, 1.4, 0.6);
  const mouth = part(new SphereGeometry(0.045, 8, 6), eyeMat, 0, 0.27, 0.22);
  mouth.scale.set(1, 1.3, 0.5);
  g.add(eyeL, eyeR, mouth);
  g.scale.setScalar(1.45);
  return { group: g, materials: [bodyMat, eyeMat, outlineMat] };
}

export const PUMPKIN_RADIUS = 0.25;
export const PUMPKIN_HALF_H = ((PUMPKIN_RADIUS * 2) / 11) * 4.5;

const PUMPKIN_FACE: [number, number][] = [
  [2, 4],
  [3, 4],
  [7, 4],
  [8, 4],
  [2, 5],
  [3, 5],
  [7, 5],
  [8, 5],
  [5, 5],
  [2, 7],
  [3, 7],
  [4, 7],
  [5, 7],
  [6, 7],
  [7, 7],
  [8, 7],
  [3, 8],
  [5, 8],
  [7, 8],
];

export function createPumpkinMesh() {
  const R = PUMPKIN_RADIUS;
  const U = (R * 2) / 11;
  const HALF_H = PUMPKIN_HALF_H;
  const skin = createDitherMaterial({ albedo: 0.9, emissive: 0.5, tint: 'orange' });
  const stem = createDitherMaterial({ albedo: 0.6, emissive: 0.5, tint: 'stem' });
  const leaf = createDitherMaterial({ albedo: 0.6, emissive: 0.6, tint: 'leaf' });
  const glow = createDitherMaterial({ albedo: 1, emissive: 2, tint: 'glow' });

  const pumpkin = new Group();
  const lobeGeo = new SphereGeometry(R * 0.6, 10, 8);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const lobe = part(lobeGeo, skin, Math.cos(a) * R * 0.38, 0, Math.sin(a) * R * 0.38);
    lobe.rotation.y = -a;
    lobe.scale.set(1, HALF_H / (R * 0.6), 0.72);
    pumpkin.add(lobe);
  }
  const hull = new Mesh(new SphereGeometry(R, 12, 8), outlineBlack);
  hull.scale.set(1.08, (HALF_H / R) * 1.08, 1.08);
  pumpkin.add(hull);
  pumpkin.add(part(new BoxGeometry(U, U * 2, U), stem, 0, HALF_H + U * 0.8, 0));
  pumpkin.add(part(new BoxGeometry(U, U * 0.8, U * 0.6), leaf, U, HALF_H + U * 0.5, 0));

  const cells = PUMPKIN_FACE.map(([cx, cy]) => {
    const x = (cx + 0.5 - 5.5) * U;
    const y = (6.5 - (cy + 0.5)) * U;
    const k = 1 - (x / (R * 0.98)) ** 2 - (y / HALF_H) ** 2;
    const z = R * 0.98 * Math.sqrt(Math.max(0.05, k));
    return new BoxGeometry(U, U, U * 0.8).translate(x, y, z);
  });
  pumpkin.add(new Mesh(mergeGeometries(cells), glow));

  const roller = new Group();
  roller.add(pumpkin);
  const g = new Group();
  g.add(roller);
  return { group: g, roller, materials: [skin, stem, leaf, glow] };
}

export function createCandyMesh() {
  const ball = createDitherMaterial({ albedo: 1, emissive: 1.6 });
  const orange = createDitherMaterial({ albedo: 1, emissive: 1.2, tint: 'orange' });
  const g = new Group();
  const body = addOutline(part(new SphereGeometry(0.08, 10, 8), ball), 1.18);
  body.scale.set(1.25, 1, 1);
  g.add(body);
  const stripe = part(new CylinderGeometry(0.083, 0.083, 0.03, 12), orange);
  stripe.rotation.z = Math.PI / 2;
  g.add(stripe);
  const coneGeo = new ConeGeometry(0.06, 0.09, 6);
  const left = part(coneGeo, orange, -0.13, 0, 0);
  const right = part(coneGeo, orange, 0.13, 0, 0);
  left.rotation.z = -Math.PI / 2;
  right.rotation.z = Math.PI / 2;
  g.add(addOutline(left, 1.15), addOutline(right, 1.15));
  g.scale.setScalar(1.3);
  return { group: g, materials: [ball, orange] };
}

export interface Decor {
  obj: Group;
  tick?: (t: number) => void;
}

const WIN_W = 0.7;
const WIN_H = 0.92;

function createTree(x: number, h: number, mat: Material) {
  const tree = new Group();
  const cone = new Mesh(new ConeGeometry(h * 0.3, h, 5), mat);
  cone.position.y = h / 2;
  cone.scale.z = 0.3;
  tree.add(cone);
  tree.position.set(x, -WIN_H / 2, 0.05);
  return tree;
}

function createBat() {
  const mat = createDitherMaterial({ albedo: 0 });
  const bat = new Group();
  bat.add(part(new SphereGeometry(0.022, 6, 4), mat));
  const wingGeo = new BoxGeometry(0.07, 0.03, 0.005);
  const makeWing = (side: 1 | -1) => {
    const pivot = new Group();
    pivot.position.x = side * 0.015;
    pivot.add(part(wingGeo, mat, side * 0.035, 0, 0));
    bat.add(pivot);
    return pivot;
  };
  return { bat, mat, wingL: makeWing(-1), wingR: makeWing(1) };
}

function createCrow(mat: Material) {
  const crow = new Group();
  const body = part(new SphereGeometry(0.05, 8, 6), mat);
  body.scale.set(1.4, 1, 0.6);
  crow.add(body);
  const head = new Group();
  head.position.set(0.06, 0.04, 0);
  head.add(part(new SphereGeometry(0.03, 6, 4), mat));
  const beak = part(new ConeGeometry(0.012, 0.04, 4), mat, 0.035, -0.005, 0);
  beak.rotation.z = -Math.PI / 2;
  head.add(beak);
  crow.add(head);
  const tail = part(new BoxGeometry(0.06, 0.012, 0.01), mat, -0.085, -0.01, 0);
  tail.rotation.z = 0.4;
  crow.add(tail);
  const wing = new Group();
  wing.position.set(0, 0.02, 0.01);
  wing.add(part(new BoxGeometry(0.08, 0.02, 0.005), mat, -0.02, 0, 0));
  crow.add(wing);
  return { crow, head, wing };
}

function createWindow(scene: number): Decor {
  const g = new Group();
  const frame = createDitherMaterial({ albedo: 0.9, emissive: 0.7 });
  const sky = createDitherMaterial({ albedo: 0.05, emissive: 0.55 });
  const moonMat = createDitherMaterial({ albedo: 0.5, emissive: 3 });
  const black = createDitherMaterial({ albedo: 0 });

  g.add(part(new BoxGeometry(WIN_W + 0.22, WIN_H + 0.14, 0.05), frame, 0, 0, 0));
  const archFrame = new CylinderGeometry(0.46, 0.46, 0.05, 14, 1, false, Math.PI / 2, Math.PI);
  g.add(part(archFrame.rotateX(Math.PI / 2), frame, 0, WIN_H / 2, 0));
  g.add(part(new BoxGeometry(WIN_W, WIN_H, 0.06), sky, 0, 0, 0.01));
  const archSky = new CylinderGeometry(
    WIN_W / 2,
    WIN_W / 2,
    0.06,
    14,
    1,
    false,
    Math.PI / 2,
    Math.PI,
  );
  g.add(part(archSky.rotateX(Math.PI / 2), sky, 0, WIN_H / 2, 0.01));
  g.add(part(new BoxGeometry(WIN_W, 0.06, 0.02), black, 0, -WIN_H / 2 + 0.03, 0.05));

  const moonGeo = new CylinderGeometry(1, 1, 0.02, 16).rotateX(Math.PI / 2);
  const addMoon = (x: number, y: number, r: number) => {
    const moon = part(moonGeo, moonMat, x, y, 0.045);
    moon.scale.set(r, r, 1);
    g.add(moon);
  };

  let tick: Decor['tick'];
  if (scene === 0) {
    addMoon(0.14, 0.38, 0.12);
    [
      [-0.28, 0.42],
      [-0.16, 0.6],
      [-0.03, 0.36],
      [0.1, 0.52],
      [0.24, 0.4],
    ].forEach(([x, h]) => g.add(createTree(x, h, black)));
  } else if (scene === 1) {
    addMoon(0, 0.3, 0.2);
    [-0.24, 0.22].forEach((x) => g.add(createTree(x, 0.28, black)));
    const bats = [0, 1, 2].map((i) => {
      const b = createBat();
      b.bat.position.z = 0.07;
      g.add(b.bat);
      return { ...b, speed: 0.12 + i * 0.05, y: 0.05 + i * 0.16, offset: i * 0.7 };
    });
    tick = (t) => {
      bats.forEach((b) => {
        const span = WIN_W - 0.08;
        const u = ((t * b.speed + b.offset) % 1) * span - span / 2;
        b.bat.position.x = u;
        b.bat.position.y = b.y + Math.sin(t * 3 + b.offset * 5) * 0.04;
        const flap = Math.sin(t * 20 + b.offset * 9) * 0.8;
        b.wingL.rotation.z = -flap;
        b.wingR.rotation.z = flap;
        setDitherOpacity(b.mat, Math.min(1, (span / 2 - Math.abs(u)) / 0.08));
      });
    };
  } else {
    addMoon(-0.18, 0.4, 0.09);
    const branch = part(new BoxGeometry(0.55, 0.025, 0.02), black, 0.08, -0.05, 0.05);
    branch.rotation.z = 0.12;
    g.add(branch);
    const twig = part(new BoxGeometry(0.16, 0.018, 0.02), black, 0.2, 0.03, 0.05);
    twig.rotation.z = 0.8;
    g.add(twig);
    g.add(part(new BoxGeometry(0.035, 0.5, 0.02), black, 0.33, -0.2, 0.05));
    const { crow, head, wing } = createCrow(black);
    crow.position.set(-0.02, 0.0, 0.07);
    g.add(crow);
    tick = (t) => {
      const nod = t % 3.2;
      head.rotation.z = nod < 0.35 ? -Math.sin((nod / 0.35) * Math.PI) * 0.6 : 0;
      const flap = t % 5;
      wing.rotation.z = flap < 0.5 ? Math.abs(Math.sin(flap * Math.PI * 4)) * 0.9 : 0;
    };
  }

  g.add(part(new BoxGeometry(0.04, WIN_H + 0.3, 0.03), frame, 0, 0.1, 0.09));
  g.add(part(new BoxGeometry(WIN_W, 0.04, 0.03), frame, 0, 0.12, 0.09));
  g.scale.setScalar(1.5);
  return { obj: g, tick };
}

export function createDecor(variant: number): Decor {
  if (variant <= 2) return createWindow(variant);
  const g = new Group();
  const frame = createDitherMaterial({ albedo: 0.9 });
  const inner = createDitherMaterial({ albedo: 0.2 });
  const flame = createDitherMaterial({ albedo: 1, emissive: 1 });
  if (variant === 3) {
    g.add(part(new BoxGeometry(0.8, 1.5, 0.08), frame, 0, 0, 0));
    g.add(part(new BoxGeometry(0.62, 1.36, 0.1), inner, 0, -0.04, 0.02));
    g.add(part(new SphereGeometry(0.04, 6, 4), flame, 0.2, -0.05, 0.1));
    return { obj: g };
  }
  g.add(part(new BoxGeometry(0.2, 0.05, 0.2), frame, 0, 0, 0.08));
  g.add(part(new CylinderGeometry(0.035, 0.035, 0.22, 6), frame, 0, 0.13, 0.08));
  const fire = part(new SphereGeometry(0.05, 6, 4), flame, 0, 0.28, 0.08);
  g.add(fire);
  const seed = Math.random() * 10;
  return {
    obj: g,
    tick: (t) => {
      fire.scale.set(1, 1.2 + Math.sin(t * 11 + seed) * 0.25, 1);
    },
  };
}

export function createDust(count: number) {
  const mesh = new InstancedMesh(
    new BoxGeometry(0.035, 0.035, 0.035),
    createDitherMaterial({ albedo: 0, emissive: 0.9 }),
    Math.max(count, 1),
  );
  mesh.count = count;
  mesh.frustumCulled = false;
  return mesh;
}
