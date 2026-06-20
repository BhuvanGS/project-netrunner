export interface StrandBundle {
  positions: Float32Array;
  strandIds: Float32Array;
  heightNorms: Float32Array;
  phaseOffsets: Float32Array;
  borderWeights: Float32Array;
  colors: Float32Array;
  count: number;
  strandCount: number;
  primaryColor: [number, number, number];
  bounds: { width: number; height: number; depth: number };
}

export function seededRandom(seed: number) {
  let state = (seed || 1) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pickColor(
  rng: () => number,
  base: readonly [number, number, number]
): [number, number, number] {
  const roll = rng();
  if (roll < 0.008) return [0.62, 0.95, 1.0];
  return [base[0], base[1], base[2]];
}

// ── All buildings = hollow rectangular blocks ───────────────────────────────
// 4 walls (outer bright + inner dim) + dark top/bottom caps.
// Outer wall = bright cyan, standing wave.
// Inner wall = dim teal, slow data flow + traveling pulse.
// Top/Bottom = very dark horizontal grids (black roof & floor).
export function generateBlockStrands(
  rng: () => number,
  w: number,
  h: number,
  d: number,
  count: number,
  primary: readonly [number, number, number]
): StrandBundle {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const INSET = 0.22;

  // Wall surfaces: each with (width, centerX, centerZ, uX, uZ, outer?)
  type Face = { len: number; cx: number; cz: number; ux: number; uz: number; outer: boolean };
  const faces: Face[] = [
    { len: d, cx: hw, cz: 0, ux: 0, uz: hd, outer: true },
    { len: d, cx: hw - INSET, cz: 0, ux: 0, uz: hd - INSET, outer: false },
    { len: d, cx: -hw, cz: 0, ux: 0, uz: hd, outer: true },
    { len: d, cx: -hw + INSET, cz: 0, ux: 0, uz: hd - INSET, outer: false },
    { len: w, cx: 0, cz: hd, ux: hw, uz: 0, outer: true },
    { len: w, cx: 0, cz: hd - INSET, ux: hw - INSET, uz: 0, outer: false },
    { len: w, cx: 0, cz: -hd, ux: hw, uz: 0, outer: true },
    { len: w, cx: 0, cz: -hd + INSET, ux: hw - INSET, uz: 0, outer: false },
  ];

  // Strands per wall = proportional to wall length, dense enough to read as sheets.
  const wallStrands = faces.map((f) => Math.max(22, Math.floor(f.len * 3.8)));
  const totalWallStrands = wallStrands.reduce((a, b) => a + b, 0);

  // Dark caps should read as planes, but not steal vertical wall density.
  const capCols = Math.max(8, Math.floor(w / 0.75));
  const capRows = Math.max(8, Math.floor(d / 0.75));
  const capStrands = capCols * capRows;
  const totalStrands = totalWallStrands + capStrands * 2; // top + bottom

  const pointsPerStrand = Math.max(40, Math.floor(count / totalStrands));

  const positions = new Float32Array(count * 3);
  const strandIds = new Float32Array(count);
  const heightNorms = new Float32Array(count);
  const phaseOffsets = new Float32Array(count);
  const borderWeights = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const outerBase: [number, number, number] = [0.0, 0.58, 0.66];
  const innerBase: [number, number, number] = [0.0, 0.34, 0.44];
  const capBase: [number, number, number] = [0.004, 0.014, 0.02];

  let idx = 0;
  let sid = 0;

  // ── Walls ──────────────────────────────────────────────────────────────────
  for (let fi = 0; fi < faces.length && idx < count; fi++) {
    const f = faces[fi];
    const nStrands = wallStrands[fi];
    const baseCol = f.outer ? outerBase : innerBase;

    for (let s = 0; s < nStrands && idx < count; s++) {
      const t = (s + 0.5) / nStrands;
      const sx = f.cx + (t - 0.5) * 2 * f.ux;
      const sz = f.cz + (t - 0.5) * 2 * f.uz;
      const phase = rng() * Math.PI * 2;

      for (let p = 0; p < pointsPerStrand && idx < count; p++) {
        const yNorm = p / (pointsPerStrand - 1);
        const y = -hh + yNorm * h;
        const jx = (rng() - 0.5) * 0.03;
        const jz = (rng() - 0.5) * 0.03;

        positions[idx * 3] = sx + jx;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = sz + jz;
        strandIds[idx] = sid;
        heightNorms[idx] = yNorm;
        phaseOffsets[idx] = phase;
        borderWeights[idx] = f.outer ? 1.0 : 0.0;

        const [cr, cg, cb] = pickColor(rng, baseCol);
        colors[idx * 3] = cr;
        colors[idx * 3 + 1] = cg;
        colors[idx * 3 + 2] = cb;
        idx++;
      }
      sid++;
    }
  }

  // ── Top & Bottom caps ────────────────────────────────────────────────────
  for (const yCap of [hh, -hh]) {
    for (let r = 0; r < capRows && idx < count; r++) {
      for (let c = 0; c < capCols && idx < count; c++) {
        const tx = -hw + (c / (capCols - 1 || 1)) * w;
        const tz = -hd + (r / (capRows - 1 || 1)) * d;
        const phase = rng() * Math.PI * 2;

        // Slight droop at edges for organic feel
        const edgeDist = Math.max(Math.abs(tx) / hw, Math.abs(tz) / hd);
        const y = yCap - (edgeDist > 0.85 ? 0.08 : 0);

        // Each cap point is its own 1-point "strand"
        positions[idx * 3] = tx + (rng() - 0.5) * 0.04;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = tz + (rng() - 0.5) * 0.04;
        strandIds[idx] = sid;
        heightNorms[idx] = yCap > 0 ? 1.0 : 0.0;
        phaseOffsets[idx] = phase;
        borderWeights[idx] = 0.5;

        const [cr, cg, cb] = pickColor(rng, capBase);
        colors[idx * 3] = cr;
        colors[idx * 3 + 1] = cg;
        colors[idx * 3 + 2] = cb;
        idx++;
        sid++;
      }
    }
  }

  return {
    positions: positions.subarray(0, idx * 3),
    strandIds: strandIds.subarray(0, idx),
    heightNorms: heightNorms.subarray(0, idx),
    phaseOffsets: phaseOffsets.subarray(0, idx),
    borderWeights: borderWeights.subarray(0, idx),
    colors: colors.subarray(0, idx * 3),
    count: idx,
    strandCount: sid,
    primaryColor: [primary[0], primary[1], primary[2]],
    bounds: { width: w, height: h, depth: d },
  };
}
