import type { ArchitectureNode, ArchitectureType } from '@/types/architecture';
import type { StrandBundle } from './strand-generators';
import { generateBlockStrands, seededRandom, hashSeed } from './strand-generators';

// ── Palette ──────────────────────────────────────────────────────────────────
const INFRA_LIGHT = [0.918, 0.984, 1.0] as const;
const INFRA_COOL = [0.851, 0.894, 0.961] as const;
const COMM_PINK = [1.0, 0.31, 0.847] as const;
const COMM_VIOLET = [1.0, 0.467, 1.0] as const;
const COMM_CYAN = [0.0, 0.961, 1.0] as const;
const STORE_ICE = [0.659, 0.969, 1.0] as const;
const STORE_TEAL = [0.0, 0.831, 0.776] as const;
const DEP_GREEN = [0.224, 1.0, 0.078] as const;
const DEP_MINT = [0.0, 1.0, 0.498] as const;
const DEP_LIME = [0.749, 1.0, 0.0] as const;
const EXT_AMBER = [1.0, 0.69, 0.0] as const;
const EXT_ORANGE = [1.0, 0.478, 0.0] as const;
const EXT_GOLD = [1.0, 0.843, 0.0] as const;
const MYS_INDIGO = [0.294, 0.18, 1.0] as const;
const MYS_VIOLET = [0.541, 0.169, 0.886] as const;
const MYS_LAVENDER = [0.71, 0.486, 1.0] as const;
const MYS_CRIMSON = [1.0, 0.176, 0.333] as const;
const WHITE = [0.95, 0.99, 1.0] as const;

const PALETTE_POOL = [
  INFRA_LIGHT,
  INFRA_COOL,
  COMM_PINK,
  COMM_VIOLET,
  COMM_CYAN,
  STORE_ICE,
  STORE_TEAL,
  DEP_GREEN,
  DEP_MINT,
  DEP_LIME,
  EXT_AMBER,
  EXT_ORANGE,
  EXT_GOLD,
  MYS_INDIGO,
  MYS_VIOLET,
  MYS_LAVENDER,
  MYS_CRIMSON,
] as const;

const TYPE_BIAS: Record<ArchitectureType, number> = {
  database: 2,
  authentication: 0,
  api: 2,
  service: 4,
  middleware: 7,
  logger: 9,
  utility: 7,
  agent: 10,
  component: 13,
};

function nodeColor(type: ArchitectureType, nodeSeed: number): readonly [number, number, number] {
  const bias = TYPE_BIAS[type] ?? 0;
  const spread = Math.floor((nodeSeed >>> 4) % 7);
  const idx = (bias + spread) % PALETTE_POOL.length;
  return PALETTE_POOL[idx];
}

function pickColor(
  rng: () => number,
  primary: readonly [number, number, number]
): [number, number, number] {
  const roll = rng();
  if (roll < 0.03) return [WHITE[0], WHITE[1], WHITE[2]];
  if (roll < 0.06) return [MYS_CRIMSON[0], MYS_CRIMSON[1], MYS_CRIMSON[2]];
  if (roll < 0.09) return [EXT_GOLD[0], EXT_GOLD[1], EXT_GOLD[2]];
  if (roll < 0.11) return [COMM_CYAN[0], COMM_CYAN[1], COMM_CYAN[2]];
  return [primary[0], primary[1], primary[2]];
}

function densityFor(node: ArchitectureNode) {
  const base = 4200 + node.fileCount * 520 + node.dependencyCount * 260 + node.routeCount * 160;
  const multiplier =
    node.type === 'database'
      ? 1.6
      : node.type === 'agent'
        ? 2.2
        : node.type === 'middleware'
          ? 1.6
          : node.type === 'utility'
            ? 0.55
            : 1;
  return Math.max(2800, Math.min(26000, Math.floor(base * multiplier)));
}

export function buildNodeStructure(node: ArchitectureNode): StrandBundle {
  const seed = hashSeed(node.id);
  const rng = seededRandom(seed);
  const SCALE = 1.75;
  const [w, h, d] = node.size;
  const width = Math.max(3, w) * SCALE;
  const height = Math.max(5, h) * SCALE;
  const depth = Math.max(3, d) * SCALE;
  const count = densityFor(node);
  const primary = nodeColor(node.type, hashSeed(node.id));
  return generateBlockStrands(rng, width, height, depth, count, primary);
}

function terrainHeightForStream(_x: number, _z: number): number {
  return -2;
}

export function buildEdgeStream(
  start: [number, number, number],
  _mid: [number, number, number],
  end: [number, number, number],
  weight: number
) {
  const FLOOR_OFFSET = 0.4;
  const LANE_GAP = 0.22;
  const DOT_COUNT = 18;
  const PAD_COUNT = 24;

  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const midX = start[0] + dx * 0.5;
  const midZ = start[2];
  const mid2X = start[0] + dx * 0.5;
  const mid2Z = end[2];

  const waypoints: [number, number][] = [
    [start[0], start[2]],
    [midX, midZ],
    [mid2X, mid2Z],
    [end[0], end[2]],
  ];

  const segments: { ax: number; az: number; bx: number; bz: number; len: number }[] = [];
  let totalLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [ax, az] = waypoints[i];
    const [bx, bz] = waypoints[i + 1];
    const len = Math.abs(bx - ax) + Math.abs(bz - az) + 0.001;
    segments.push({ ax, az, bx, bz, len });
    totalLen += len;
  }

  const baseCount = Math.max(320, Math.floor(420 + weight * 80));
  const junctionCount = (waypoints.length - 2) * DOT_COUNT;
  const padCount = 2 * PAD_COUNT;
  const count = baseCount + junctionCount + padCount;
  const positions = new Float32Array(count * 3);
  let idx = 0;

  function emitSegment(ax: number, az: number, bx: number, bz: number, nPts: number) {
    const isHoriz = Math.abs(bx - ax) >= Math.abs(bz - az);
    for (let i = 0; i < nPts && idx < count; i++) {
      const t = i / (nPts - 1 || 1);
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const y = terrainHeightForStream(x, z) + FLOOR_OFFSET;
      const lane = ((i % 3) - 1) * LANE_GAP;
      positions[idx * 3] = x + (isHoriz ? 0 : lane);
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z + (isHoriz ? lane : 0);
      idx++;
    }
  }

  function emitJunction(x: number, z: number, nPts: number) {
    const y = terrainHeightForStream(x, z) + FLOOR_OFFSET;
    for (let i = 0; i < nPts && idx < count; i++) {
      const a = (i / nPts) * Math.PI * 2;
      const r = 0.3 + (i % 4) * 0.18;
      positions[idx * 3] = x + Math.cos(a) * r;
      positions[idx * 3 + 1] = y + (i % 2) * 0.08;
      positions[idx * 3 + 2] = z + Math.sin(a) * r;
      idx++;
    }
  }

  for (const seg of segments) {
    const nPts = Math.max(4, Math.round((baseCount * seg.len) / totalLen));
    emitSegment(seg.ax, seg.az, seg.bx, seg.bz, nPts);
  }

  for (let i = 1; i < waypoints.length - 1; i++) {
    emitJunction(waypoints[i][0], waypoints[i][1], DOT_COUNT);
  }

  emitJunction(start[0], start[2], PAD_COUNT);
  emitJunction(end[0], end[2], PAD_COUNT);

  return { positions, count };
}

export function getTypeColor(type: ArchitectureType, nodeId?: string): [number, number, number] {
  const color = nodeColor(type, nodeId ? hashSeed(nodeId) : TYPE_BIAS[type] * 1337);
  return [color[0], color[1], color[2]];
}

export { seededRandom, hashSeed } from './strand-generators';
