export type LandmarkKind =
  | 'burj'
  | 'skytree'
  | 'taipei101'
  | 'eiffel'
  | 'pyramid'
  | 'liberty'
  | 'pisa';

type Win = [number, number, number];
type Point = [number, number];

export interface LandmarkArt {
  viewBox: string;
  body: string[];
  windows: Win[];
  spire?: { x1: number; y1: number; x2: number; y2: number };
  silk: { x1: number; y1: number; x2: number; y2: number };
  spiderLeft: string;
  spiderTop: string;
  roofLeft: string;
  roofTop: string;
}

export interface Landmark {
  kind: LandmarkKind;
  steps: number;
  name: string;
  prefix?: string;
  sceneHeight: number;
  art: () => LandmarkArt;
}

const VIEW_W = 60;
const SPIDER_HALF = 0.625;
const ROOF_HALF = 1;
const ROOF_H = 2;

function anchors(scene: number, viewH: number, silkEnd: Point, roof: Point, viewW = VIEW_W) {
  const rem = (x: number) => (((x - viewW / 2) * scene) / viewH).toFixed(2);
  const pct = (y: number) => ((y / viewH) * 100).toFixed(1);
  return {
    viewBox: `0 0 ${viewW} ${viewH}`,
    spiderLeft: `calc(50% + ${rem(silkEnd[0])}rem - ${SPIDER_HALF}rem)`,
    spiderTop: `calc(${pct(silkEnd[1])}% - 0.1rem)`,
    roofLeft: `calc(50% + ${rem(roof[0])}rem - ${ROOF_HALF}rem)`,
    roofTop: `calc(${pct(roof[1])}% - ${ROOF_H}rem)`,
  };
}

const byHeight = (windows: Win[]) => windows.sort((a, b) => a[1] - b[1]);

function taipei101() {
  const body: string[] = ['M14 160V142H46V160Z', 'M17 142L20 114H40L43 142Z'];
  const windows: Win[] = [];
  for (let y = 146; y < 158; y += 5) windows.push([18, y, 4], [28, y, 4], [38, y, 4]);
  for (let y = 120; y < 140; y += 6) windows.push([23, y, 3], [28.5, y, 3], [34, y, 3]);
  for (let i = 0; i < 8; i += 1) {
    const y0 = 114 - i * 10;
    body.push(`M21 ${y0}L39 ${y0}L42 ${y0 - 10}L18 ${y0 - 10}Z`);
    windows.push([22.5, y0 - 6, 3], [28.5, y0 - 6, 3], [34.5, y0 - 6, 3]);
  }
  body.push('M22 34V27H38V34Z', 'M25 27V21H35V27Z', 'M27.5 21V16H32.5V21Z');
  return {
    viewBox: '0 0 60 160',
    body,
    windows,
    spire: { x1: 30, y1: 16, x2: 30, y2: 2 },
    silk: { x1: 42, y1: 64, x2: 46, y2: 92 },
    spiderLeft: 'calc(50% + 2.9rem)',
    spiderTop: '56%',
    roofLeft: 'calc(50% - 1rem)',
    roofTop: '4%',
  };
}

function burj() {
  const left: [number, number, number][] = [
    [22, 220, 196],
    [18, 196, 172],
    [15, 172, 148],
    [12, 148, 124],
    [9.5, 124, 100],
    [7.5, 100, 78],
    [5.5, 78, 58],
    [3.8, 58, 40],
  ];
  const right: [number, number, number][] = [
    [20, 220, 184],
    [16.5, 184, 160],
    [13.5, 160, 136],
    [10.5, 136, 112],
    [8.5, 112, 90],
    [6.5, 90, 68],
    [4.8, 68, 48],
    [3, 48, 36],
  ];
  let d = `M${30 - left[0][0]} 220`;
  left.forEach(([, , top], i) => {
    d += `V${top}`;
    const nextW = left[i + 1]?.[0] ?? 1.6;
    d += `H${30 - nextW}`;
  });
  d += 'L30 14';
  const rev = [...right].reverse();
  d += `L${30 + 1.4} ${rev[0][2]}`;
  rev.forEach(([w, bottom]) => {
    d += `H${30 + w}V${bottom}`;
  });
  d += 'Z';
  const core = 'M30 220V40';
  const windows: Win[] = [];
  left.forEach(([w, bottom, top]) => {
    for (let y = bottom - 6; y > top + 1; y -= 7)
      windows.push([30 - w + 2, y, Math.max(1.5, w - 4)]);
  });
  right.forEach(([w, bottom, top]) => {
    for (let y = bottom - 6; y > top + 1; y -= 7) windows.push([32, y, Math.max(1.5, w - 4)]);
  });
  windows.sort((a, b) => a[1] - b[1]);
  return {
    viewBox: '0 0 60 220',
    body: [d, core],
    windows,
    spire: { x1: 30, y1: 30, x2: 30, y2: 2 },
    silk: { x1: 43.5, y1: 136, x2: 47, y2: 168 },
    spiderLeft: 'calc(50% + 1.9rem)',
    spiderTop: '74%',
    roofLeft: 'calc(50% - 2.3rem)',
    roofTop: '16%',
  };
}

function pisa(scene: number): LandmarkArt {
  const H = 120;
  const lean = (x: number, y: number) => +(x + (H - y) * 0.09).toFixed(2);
  const box = (l: number, r: number, b: number, t: number) =>
    `M${lean(l, b)} ${b}L${lean(r, b)} ${b}L${lean(r, t)} ${t}L${lean(l, t)} ${t}Z`;
  const body = [box(18, 42, 120, 100), box(17, 43, 101, 99.5)];
  const windows: Win[] = [21.5, 28.5, 35.5].map((x) => [lean(x, 108), 108, 3]);
  for (let b = 99.5; b > 40; b -= 10) {
    body.push(box(18, 42, b, b - 9), box(17, 43, b - 9, b - 10));
    [19.5, 25, 30.5, 36].forEach((x) => windows.push([lean(x, b - 5), b - 5, 3]));
  }
  body.push(box(21, 39, 39.5, 30), box(20, 40, 30, 29));
  [23, 28.5, 34].forEach((x) => windows.push([lean(x, 34), 34, 3]));
  const silk: Point = [lean(42, 66), 66];
  const silkEnd: Point = [silk[0] + 3, 80];
  return {
    ...anchors(scene, H, silkEnd, [lean(30, 29), 29]),
    body,
    windows: byHeight(windows),
    silk: { x1: silk[0], y1: silk[1], x2: silkEnd[0], y2: silkEnd[1] },
  };
}

function liberty(scene: number): LandmarkArt {
  const H = 140;
  const body = [
    'M8 140V134L14 132H46L52 134V140Z',
    'M18 132V100H42V132Z',
    'M16 100V96H44V100Z',
    'M22 66L20 74H25L26 66Z',
    'M22 96L24 70L26 56H34L36 70L38 96Z',
    'M33 58L38 40H40L36 58Z',
    'M37 40H42L41 36H38Z',
    'M27 56V50H33V56Z',
    'M26 50L23 46M28 49L27 44M30 49V43M32 49L33 44M34 50L37 46',
  ];
  const windows: Win[] = [
    [27.2, 51.5, 1.2],
    [29.4, 51.5, 1.2],
    [31.6, 51.5, 1.2],
    [38.4, 38, 2.2],
  ];
  [106, 114, 122].forEach((y) => [21, 28.5, 36].forEach((x) => windows.push([x, y, 3])));
  return {
    ...anchors(scene, H, [46, 118], [22, 96]),
    body,
    windows: byHeight(windows),
    spire: { x1: 39.5, y1: 36, x2: 39.5, y2: 31 },
    silk: { x1: 42, y1: 104, x2: 46, y2: 118 },
  };
}

function pyramid(scene: number): LandmarkArt {
  const H = 120;
  const apex: Point = [72, 48];
  const edgeX = (y: number, side: -1 | 1) =>
    +(apex[0] + (side * ((y - apex[1]) * 44)) / 72).toFixed(2);
  const body = [
    'M4 120L24 92L44 120Z',
    `M28 120L${apex[0]} ${apex[1]}L116 120Z`,
    `M${apex[0]} ${apex[1]}L84 120`,
  ];
  for (let y = 56; y < 120; y += 6.4) {
    body.push(`M${edgeX(y, -1)} ${y}H${edgeX(y, 1)}`);
  }
  const windows: Win[] = [
    [66, 98],
    [52, 110],
    [90, 110],
    [78, 78],
    [60, 84],
    [70, 64],
  ].map(([x, y]) => [x, y, 3]);
  const silk: Point = [edgeX(80, 1), 80];
  const silkEnd: Point = [silk[0] + 18, 90];
  return {
    ...anchors(scene, H, silkEnd, apex, H),
    body,
    windows: byHeight(windows),
    silk: { x1: silk[0], y1: silk[1], x2: silkEnd[0], y2: silkEnd[1] },
  };
}

function eiffel(scene: number): LandmarkArt {
  const H = 170;
  const body = [
    'M6 170Q12 150 16 132H44Q48 150 54 170H40Q36 152 30 150Q24 152 20 170Z',
    'M14 132V127H46V132Z',
    'M17 127Q21 108 24 92H36Q39 108 43 127Z',
    'M19 120L41 120M21 106H39',
    'M22 92V88H38V92Z',
    'M24.5 88Q28 50 28.8 30H31.2Q32 50 35.5 88Z',
    'M26.5 70H33.5M27.5 50H32.5',
    'M28 30V25H32V30Z',
  ];
  const windows: Win[] = [[28.7, 27, 2.6]];
  [16, 22, 28, 34, 40].forEach((x) => windows.push([x, 129, 3]));
  [24, 29, 34].forEach((x) => windows.push([x, 89.5, 2]));
  return {
    ...anchors(scene, H, [49, 146], [21, 127]),
    body,
    windows: byHeight(windows),
    spire: { x1: 30, y1: 25, x2: 30, y2: 10 },
    silk: { x1: 46, y1: 130, x2: 49, y2: 146 },
  };
}

function skytree(scene: number): LandmarkArt {
  const H = 230;
  const edge = (y: number, side: -1 | 1) => +(30 + side * (10 - ((230 - y) * 6) / 110)).toFixed(2);
  const body = [
    'M20 230L26 120L27.5 74H32.5L34 120L40 230Z',
    'M22 110V100L24 97H36L38 100V110Z',
    'M25 74V68H35V74Z',
    'M27.5 68L28.5 53H31.5L32.5 68Z',
  ];
  for (let y = 225; y > 140; y -= 20) {
    body.push(
      `M${edge(y, -1)} ${y}L${edge(y - 20, 1)} ${y - 20}M${edge(y, 1)} ${y}L${edge(y - 20, -1)} ${y - 20}`,
    );
  }
  const windows: Win[] = [];
  [101, 105].forEach((y) => [24, 28.5, 33].forEach((x) => windows.push([x, y, 3])));
  windows.push([27, 70, 2.4], [30.6, 70, 2.4]);
  return {
    ...anchors(scene, H, [42, 126], [30, 97]),
    body,
    windows: byHeight(windows),
    spire: { x1: 30, y1: 53, x2: 30, y2: 6 },
    silk: { x1: 38, y1: 108, x2: 42, y2: 126 },
  };
}

export const LANDMARKS: Landmark[] = [
  {
    kind: 'burj',
    steps: 2909,
    name: '杜拜 哈里發塔',
    prefix: '世界第一高建築：',
    sceneHeight: 17,
    art: burj,
  },
  { kind: 'skytree', steps: 2523, name: '東京晴空塔', sceneHeight: 17, art: () => skytree(17) },
  { kind: 'taipei101', steps: 2046, name: '台北101', sceneHeight: 15, art: taipei101 },
  { kind: 'eiffel', steps: 1665, name: '巴黎 艾菲爾鐵塔', sceneHeight: 15, art: () => eiffel(15) },
  { kind: 'pyramid', steps: 560, name: '埃及 胡夫金字塔', sceneHeight: 12, art: () => pyramid(12) },
  { kind: 'liberty', steps: 377, name: '紐約 自由女神像', sceneHeight: 13, art: () => liberty(13) },
  { kind: 'pisa', steps: 294, name: '義大利 比薩斜塔', sceneHeight: 12, art: () => pisa(12) },
];
