/** Melody-canvas'tan esinlenerek: Fabric.js için gradient yardımcıları */

const DIRECTION_MAP: Record<string, number> = {
  'to top': 0,
  'to right': 90,
  'to bottom': 180,
  'to left': 270,
  'to top right': 45,
  'to right top': 45,
  'to bottom right': 135,
  'to right bottom': 135,
  'to bottom left': 225,
  'to left bottom': 225,
  'to top left': 315,
  'to left top': 315,
};

export const GRADIENT_PRESETS = [
  'linear-gradient(to right, #d7d2cc 0%, #304352 100%)',
  'linear-gradient(to right, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(to right, #92fe9d 0%, #00c9ff 100%)',
  'linear-gradient(to right, #69EACB 0%, #d883ff 100%)',
  'linear-gradient(to right, #9CECFB 0%, #0052D4 100%)',
  'linear-gradient(to right, #BA5370 0%, #F4E2D8 100%)',
  'linear-gradient(to right, #ffffff 0%, #e5e7eb 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
];

interface ParsedGradient {
  degree: number;
  colorStops: { color: string; offset: number }[];
}

const parseGradient = (css: string): ParsedGradient => {
  let degree = 180;
  const degMatch = css.match(/(\d+)deg/);
  if (degMatch) {
    degree = parseFloat(degMatch[1]);
  } else {
    const dirMatch = css.match(/to\s+[\w\s]+/);
    if (dirMatch && DIRECTION_MAP[dirMatch[0]]) {
      degree = DIRECTION_MAP[dirMatch[0]];
    }
  }
  const stopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*(\d+)%?/g;
  const colorStops: { color: string; offset: number }[] = [];
  let m;
  while ((m = stopRegex.exec(css)) !== null) {
    colorStops.push({ color: m[1], offset: parseInt(m[2] || '0', 10) / 100 });
  }
  if (colorStops.length < 2) {
    colorStops.push({ color: '#ffffff', offset: 0 }, { color: '#000000', offset: 1 });
  }
  return { degree, colorStops };
};

const degreeToCoords = (degree: number, w: number, h: number) => {
  const radians = ((degree - 270) * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  return {
    x1: cx + Math.cos(radians) * len,
    y1: cy + Math.sin(radians) * len,
    x2: cx - Math.cos(radians) * len,
    y2: cy - Math.sin(radians) * len,
  };
};

/** CSS linear-gradient → Fabric Gradient objesi (fabric modülü ile) */
export function createFabricGradient(fabricModule: { Gradient: new (opts: object) => unknown }, cssGradient: string, width: number, height: number) {
  const { degree, colorStops } = parseGradient(cssGradient);
  const coords = degreeToCoords(degree, width, height);
  return new fabricModule.Gradient({
    type: 'linear',
    coords: { x1: coords.x1, y1: coords.y1, x2: coords.x2, y2: coords.y2 },
    colorStops,
  });
}
