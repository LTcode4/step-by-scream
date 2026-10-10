import { BackSide, Color, Material, MeshBasicMaterial, ShaderMaterial, Side, Vector3 } from 'three';

export const CLEAR_COLOR = 0x000000;

export const sceneUniforms = {
  light: { value: new Vector3(0, 1, 0) },
  lightPower: { value: 1 },
  darkY: { value: -100 },
  fogNear: { value: 6.5 },
  fogFar: { value: 12.5 },
  inkDark: { value: new Color(CLEAR_COLOR) },
  inkOrange: { value: new Color(0xff7b1c) },
  inkWhite: { value: new Color(0xffffff) },
  inkGlow: { value: new Color(0xffd36b) },
  inkLeaf: { value: new Color(0x5aaa3c) },
  inkStem: { value: new Color(0x6b3a12) },
};

const VERTEX = `
varying vec3 vWorldPos;
varying vec3 vNormal;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 wp = modelMatrix * p;
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAGMENT_COMMON = `
uniform vec3 light;
uniform float lightPower;
uniform float darkY;
uniform float fogNear;
uniform float fogFar;
uniform vec3 inkDark;
uniform vec3 inkOrange;
uniform vec3 inkWhite;
uniform vec3 inkGlow;
uniform vec3 inkLeaf;
uniform vec3 inkStem;
varying vec3 vWorldPos;
varying vec3 vNormal;

float bayer2(float x, float y) { return x * 2.0 + y * 3.0 - x * y * 4.0; }

float bayerThreshold() {
  vec2 p = floor(gl_FragCoord.xy);
  float x0 = mod(p.x, 2.0);
  float y0 = mod(p.y, 2.0);
  float x1 = mod(floor(p.x / 2.0), 2.0);
  float y1 = mod(floor(p.y / 2.0), 2.0);
  return (bayer2(x0, y0) * 4.0 + bayer2(x1, y1) + 0.5) / 16.0;
}

vec2 lighting(float albedo, float emissive) {
  vec3 n = normalize(vNormal);
  vec3 toLight = light - vWorldPos;
  float dist = length(toLight);
  float lambert = max(dot(n, toLight / dist), 0.0) * 0.6 + 0.4;
  float lantern = lightPower * 1.5 / (dist * dist * 0.45 + 1.0) * lambert;
  float sky = max(dot(n, vec3(0.35, 0.85, 0.4)), 0.0) * 0.07;
  float lit = albedo * (lantern + sky + 0.015) + emissive;
  float near = clamp(lightPower * 1.6 / (dist * dist * 1.4 + 1.0), 0.0, 1.0);
  float warm = albedo * lantern / max(lit, 0.001) * near;
  float fog = 1.0 - smoothstep(fogNear, fogFar, length(vWorldPos - cameraPosition));
  float dark = smoothstep(darkY - 0.5, darkY + 0.9, vWorldPos.y);
  return vec2(clamp(lit * fog * dark, 0.0, 1.0), warm);
}

vec3 shade(vec2 l, float flag, float t) {
  float warmBit = step(1.0 - t, l.y) * step(0.0, flag);
  vec3 ink = mix(inkWhite, inkOrange, max(clamp(flag, 0.0, 1.0), warmBit));
  if (flag > 3.5) ink = inkStem;
  else if (flag > 2.5) ink = inkLeaf;
  else if (flag > 1.5) ink = inkGlow;
  return mix(inkDark, ink, step(t, l.x));
}
`;

const DITHER_FRAGMENT = `
${FRAGMENT_COMMON}
uniform vec3 uParams;
uniform float uOpacity;
void main() {
  float t = bayerThreshold();
  if (uOpacity < t) discard;
  gl_FragColor = vec4(shade(lighting(uParams.x, uParams.y), uParams.z, t), 1.0);
  #include <colorspace_fragment>
}
`;

const WALL_FRAGMENT = `
${FRAGMENT_COMMON}
void main() {
  float t = bayerThreshold();
  float angle = atan(vWorldPos.z, vWorldPos.x);
  float row = floor(vWorldPos.y / 0.34);
  float u = angle * (3.6 / 0.62) + mod(row, 2.0) * 0.5;
  float mortarY = smoothstep(0.0, 0.12, fract(vWorldPos.y / 0.34));
  float mortarX = smoothstep(0.0, 0.08, fract(u));
  float albedo = mortarY * mortarX * 0.5 + 0.03;
  gl_FragColor = vec4(shade(lighting(albedo, 0.0), 0.0, t), 1.0);
  #include <colorspace_fragment>
}
`;

export interface DitherMaterialOptions {
  albedo?: number;
  emissive?: number;
  opacity?: number;
  side?: Side;
  tint?: 'orange' | 'white' | 'glow' | 'leaf' | 'stem';
  warm?: boolean;
}

function flagOf(opts: DitherMaterialOptions) {
  const tints = { orange: 1, glow: 2, leaf: 3, stem: 4, white: 0 };
  if (opts.tint && opts.tint !== 'white') return tints[opts.tint];
  return opts.warm === false ? -1 : 0;
}

export function createDitherMaterial(opts: DitherMaterialOptions = {}): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms: {
      ...sceneUniforms,
      uParams: { value: new Vector3(opts.albedo ?? 0.8, opts.emissive ?? 0, flagOf(opts)) },
      uOpacity: { value: opts.opacity ?? 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: DITHER_FRAGMENT,
  });
  if (opts.side !== undefined) material.side = opts.side;
  return material;
}

export function setDitherOpacity(material: ShaderMaterial, opacity: number) {
  material.uniforms.uOpacity.value = opacity;
}

export function createWallMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...sceneUniforms },
    vertexShader: VERTEX,
    fragmentShader: WALL_FRAGMENT,
    side: BackSide,
  });
}

export function createOutlineMaterial(light = false): Material {
  return new MeshBasicMaterial({ color: light ? 0xffffff : CLEAR_COLOR, side: BackSide });
}
