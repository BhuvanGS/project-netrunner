import type { ArchitectureNode } from '@/types/architecture';

type LayoutNode = Omit<ArchitectureNode, 'position'>;

interface TargetPoint {
  x: number;
  z: number;
}

// ── Ring config ───────────────────────────────────────────────────────────────
// Wider spacing + fewer nodes per ring = more open, organic layout
const RING_INNER_RADIUS = 56;
const RING_STEP = 58;
const NODE_SPACING = 44; // min arc-length per node

function ringCapacity(ring: number): number {
  if (ring === 0) return 1;
  const circumference = 2 * Math.PI * (RING_INNER_RADIUS + (ring - 1) * RING_STEP);
  return Math.max(ring * 4, Math.floor(circumference / NODE_SPACING));
}

// Multiple independent noise octaves for organic irregularity
function noise2(seed: number, octave: number): number {
  const v = Math.sin(seed * 127.1 + octave * 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1; // -1..1
}

// Per-node radial distortion: pulls node in/out by up to 45% of ring radius
function radialDistortion(hash: number, ring: number): number {
  const n1 = noise2(hash, 1);
  const n2 = noise2(hash, 2) * 0.5;
  const n3 = noise2(hash, 3) * 0.25;
  return (n1 + n2 + n3) * 0.32 * (RING_INNER_RADIUS + (ring - 1) * RING_STEP);
}

// Per-node angular shear: displaces angle by up to ±0.55 radians
function angularShear(hash: number): number {
  return noise2(hash, 7) * 0.42 + noise2(hash, 13) * 0.18;
}

export function layoutArchitectureNodes(nodes: LayoutNode[]): ArchitectureNode[] {
  if (nodes.length === 0) return [];

  // Sort highest score first — rank 0 goes to dead center
  const ordered = [...nodes].sort((a, b) => {
    const d = calculateNodeScore(b) - calculateNodeScore(a);
    return d !== 0 ? d : a.label.localeCompare(b.label);
  });

  // Assign each node to a ring by filling from center outward
  const ringOf: number[] = new Array(ordered.length).fill(0);
  const posInRing: number[] = new Array(ordered.length).fill(0);
  let ring = 0;
  let slotsFilled = 0;
  let cap = ringCapacity(ring);

  for (let i = 0; i < ordered.length; i++) {
    if (slotsFilled >= cap) {
      ring++;
      slotsFilled = 0;
      cap = ringCapacity(ring);
    }
    ringOf[i] = ring;
    posInRing[i] = slotsFilled;
    slotsFilled++;
  }

  // Build initial target positions with heavy organic distortion
  const targets: TargetPoint[] = ordered.map((node, i) => {
    const r = ringOf[i];
    if (r === 0) return { x: 0, z: 0 };

    const baseRadius = RING_INNER_RADIUS + (r - 1) * RING_STEP;
    const cap2 = ringCapacity(r);
    const angleStep = (Math.PI * 2) / cap2;

    // Each ring rotated by irrational multiple — no spoke alignment
    const ringOffset = (r * 1.2360679) % (Math.PI * 2);
    const hash = hashString(node.id);
    const hash2 = hashString(node.id + node.type);

    // Base angle + big angular shear per node
    const angle = posInRing[i] * angleStep + ringOffset + angularShear(hash);

    // Radius = base ± per-node distortion (some nodes pulled way in or out)
    const rDistort = radialDistortion(hash2, r);
    // Also randomly bump ~15% of nodes out one extra ring for stragglers
    const straggler = noise2(hash, 17) > 0.82 ? RING_STEP * 0.55 : 0;
    const radius = Math.max(baseRadius * 0.4, baseRadius + rDistort + straggler);

    // Shear the whole point slightly off-axis (x/z cross-contamination)
    const shearX = noise2(hash, 5) * 6;
    const shearZ = noise2(hash2, 9) * 6;

    return {
      x: Math.cos(angle) * radius + shearX,
      z: Math.sin(angle) * radius + shearZ,
    };
  });

  const relaxed = relaxTargets(ordered, targets);

  return ordered.map((node, index) => ({
    ...node,
    position: [relaxed[index].x, 0, relaxed[index].z],
  }));
}

function relaxTargets(nodes: LayoutNode[], targets: TargetPoint[]): TargetPoint[] {
  const positions = targets.map((target) => ({ ...target }));
  const isCenter = targets.map((t) => t.x === 0 && t.z === 0);

  for (let iteration = 0; iteration < 80; iteration += 1) {
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = positions[j].x - positions[i].x;
        const dz = positions[j].z - positions[i].z;
        const distance = Math.hypot(dx, dz) || 0.0001;
        const minDistance = getSeparation(nodes[i], nodes[j]);

        if (distance >= minDistance) continue;

        const overlap = (minDistance - distance) / 2;
        const nx = dx / distance;
        const nz = dz / distance;

        if (!isCenter[i]) {
          positions[i].x -= nx * overlap;
          positions[i].z -= nz * overlap;
        }
        if (!isCenter[j]) {
          positions[j].x += nx * overlap;
          positions[j].z += nz * overlap;
        }
      }
    }

    // Weak pull back — let distortion breathe, only prevent extreme drift
    for (let index = 0; index < positions.length; index += 1) {
      if (isCenter[index]) {
        positions[index].x = 0;
        positions[index].z = 0;
      } else {
        positions[index].x += (targets[index].x - positions[index].x) * 0.08;
        positions[index].z += (targets[index].z - positions[index].z) * 0.08;
      }
    }
  }

  return positions;
}

function getSeparation(left: LayoutNode, right: LayoutNode) {
  const leftSpan = Math.max(left.size[0], left.size[2]);
  const rightSpan = Math.max(right.size[0], right.size[2]);
  return (leftSpan + rightSpan) * 0.96 + 24; // wider gaps
}

function calculateNodeScore(node: LayoutNode) {
  const mass = node.size[0] * 0.3 + node.size[1] * 0.7 + node.size[2] * 0.3;
  return (
    node.dependencyCount * 1.5 +
    node.fileCount * 1.1 +
    node.routeCount * 2.8 +
    node.queryCount * 1.8 +
    mass
  );
}

function polar(radius: number, angle: number): TargetPoint {
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}

function jitter(seed: number, magnitude: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  const normalized = value - Math.floor(value);
  return (normalized - 0.5) * 2 * magnitude;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}
