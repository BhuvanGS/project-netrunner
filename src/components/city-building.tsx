'use client';

import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  DoubleSide,
} from 'three';
import {
  buildNodeStructure,
  getTypeColor,
  hashSeed,
  seededRandom,
} from '@/lib/cyberspace-structures';
import type { StrandBundle } from '@/lib/strand-generators';
import type { ArchitectureNode } from '@/types/architecture';

interface CityBuildingProps {
  node: ArchitectureNode;
  isSelected: boolean;
  onSelect: (node: ArchitectureNode) => void;
  emergeProgress?: number;
}

export function CityBuilding({
  node,
  isSelected,
  onSelect,
  emergeProgress = 1,
}: CityBuildingProps) {
  const [hovered, setHovered] = useState(false);
  const structure = useMemo<StrandBundle>(() => buildNodeStructure(node), [node]);

  const px = node.position[0];
  const pz = node.position[2];

  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(structure.positions, 3));
    geom.setAttribute('color', new BufferAttribute(structure.colors, 3));
    geom.setAttribute('strandId', new BufferAttribute(structure.strandIds, 1));
    geom.setAttribute('heightNorm', new BufferAttribute(structure.heightNorms, 1));
    geom.setAttribute('phaseOffset', new BufferAttribute(structure.phaseOffsets, 1));
    geom.setAttribute('borderWeight', new BufferAttribute(structure.borderWeights, 1));
    return geom;
  }, [structure]);

  const lineGeometry = useMemo(() => {
    const w = structure.bounds.width;
    const h = structure.bounds.height;
    const d = structure.bounds.depth;
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    const rng = seededRandom(hashSeed(`${node.id}:linework`));
    const pts: number[] = [];

    const add = (a: [number, number, number], b: [number, number, number]) => {
      pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    };

    const corners: [number, number, number][] = [
      [-hw, -hh, -hd],
      [hw, -hh, -hd],
      [hw, -hh, hd],
      [-hw, -hh, hd],
      [-hw, hh, -hd],
      [hw, hh, -hd],
      [hw, hh, hd],
      [-hw, hh, hd],
    ];
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ].forEach(([a, b]) => add(corners[a], corners[b]));

    const levels = Math.max(8, Math.floor(h / 1.6));
    const segments = 10;
    for (let yIndex = 1; yIndex < levels; yIndex++) {
      const y = -hh + (yIndex / levels) * h;
      const jitter = (rng() - 0.5) * 0.08;
      for (let side = 0; side < 4; side++) {
        for (let s = 0; s < segments; s++) {
          if (rng() < 0.24) continue;
          const t0 = s / segments;
          const t1 = (s + 0.72 + rng() * 0.22) / segments;
          if (side === 0)
            add([-hw + t0 * w, y + jitter, hd], [-hw + Math.min(1, t1) * w, y + jitter, hd]);
          if (side === 1)
            add([-hw + t0 * w, y + jitter, -hd], [-hw + Math.min(1, t1) * w, y + jitter, -hd]);
          if (side === 2)
            add([hw, y + jitter, -hd + t0 * d], [hw, y + jitter, -hd + Math.min(1, t1) * d]);
          if (side === 3)
            add([-hw, y + jitter, -hd + t0 * d], [-hw, y + jitter, -hd + Math.min(1, t1) * d]);
        }
      }
    }

    const verticalCount = Math.max(36, Math.floor((w + d) * 3.2));
    for (let i = 0; i < verticalCount; i++) {
      const side = i % 4;
      const t = rng();
      const y0 = -hh + rng() * h * 0.88;
      const y1 = Math.min(hh, y0 + h * (0.12 + rng() * 0.36));
      if (side === 0) add([-hw + t * w, y0, hd], [-hw + t * w, y1, hd]);
      if (side === 1) add([-hw + t * w, y0, -hd], [-hw + t * w, y1, -hd]);
      if (side === 2) add([hw, y0, -hd + t * d], [hw, y1, -hd + t * d]);
      if (side === 3) add([-hw, y0, -hd + t * d], [-hw, y1, -hd + t * d]);
    }

    const innerCount = Math.max(10, Math.floor(Math.sqrt(w * d) * 2.2));
    for (let i = 0; i < innerCount; i++) {
      const x = (rng() - 0.5) * w * 0.72;
      const z = (rng() - 0.5) * d * 0.72;
      const y0 = -hh + rng() * h * 0.22;
      const y1 = hh - rng() * h * 0.08;
      add([x, y0, z], [x + (rng() - 0.5) * 0.18, y1, z + (rng() - 0.5) * 0.18]);
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    const heightNorms = new Float32Array(pts.length / 3);
    for (let i = 0; i < pts.length / 3; i++) {
      const y = pts[i * 3 + 1];
      heightNorms[i] = (y + hh) / h; // 0 at bottom, 1 at top
    }
    geom.setAttribute('heightNorm', new BufferAttribute(heightNorms, 1));
    return geom;
  }, [structure, node.id]);

  const baseSize = 0.105;

  const material = useMemo(() => {
    const tint = getTypeColor(node.type, node.id);
    const vert = `
      uniform float time;
      uniform float pointSize;
      uniform float emergeProgress;
      attribute vec3 color;
      attribute float heightNorm;
      attribute float phaseOffset;
      attribute float borderWeight;
      attribute float strandId;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vIsOuter;
      varying float vBuilt;

      void main() {
        vec3 pos = position;

        // Top-to-bottom reveal: frontier starts at top (heightNorm=1)
        // and moves down to bottom (heightNorm=0) as emergeProgress goes 0→1
        float frontier = 1.0 - emergeProgress;
        float distFromFrontier = heightNorm - frontier;
        float built = smoothstep(-0.12, 0.0, distFromFrontier);
        vBuilt = built;

        // Existing animation effects
        if (borderWeight > 0.7) {
          float envelope = sin(heightNorm * 3.14159265);
          float waveX = sin(time * 0.4 + phaseOffset) * envelope;
          float waveZ = cos(time * 0.35 + phaseOffset * 1.7) * envelope;
          float amp = 0.035 * (1.0 - heightNorm * 0.2);
          pos.x += waveX * amp;
          pos.z += waveZ * amp;

          float breathe = 1.0 + sin(time * 0.6 + phaseOffset * 0.3) * 0.008;
          pos *= breathe;

          vAlpha = 0.22 + envelope * 0.18;
          vIsOuter = 1.0;
        } else if (borderWeight < 0.3) {
          float drift = sin(time * 0.12 + phaseOffset) * 0.08;
          pos.y += drift;

          float pulse = sin(heightNorm * 10.0 - time * 1.5 + phaseOffset) * 0.5 + 0.5;
          float sway = sin(time * 0.18 + phaseOffset) * 0.008;
          pos.x += sway;
          pos.z += sway;

          vAlpha = 0.10 + pulse * 0.24;
          vIsOuter = 0.0;
        } else {
          vAlpha = 0.16;
          vIsOuter = 0.5;
        }

        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float sizeMult = (vIsOuter > 0.5) ? 0.9 : 0.52;
        float dist = max(-mvPosition.z, 1.5);
        float size = pointSize * sizeMult * (300.0 / dist);
        gl_PointSize = clamp(size, 0.45, 2.6);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const frag = `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vIsOuter;
      varying float vBuilt;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = length(uv);
        if (r > 0.5) discard;
        float soft = 1.0 - smoothstep(0.0, 0.5, r);

        vec3 col = vColor * vBuilt;
        if (vIsOuter > 0.5) {
          col += vec3(0.22, 0.38, 0.42) * soft * soft * 0.18 * vBuilt;
        }

        gl_FragColor = vec4(col, soft * vAlpha * 0.58 * vBuilt);
      }
    `;
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointSize: { value: baseSize },
        tintColor: { value: tint },
        emergeProgress: { value: 1 },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });
  }, [baseSize, node.type, node.id]);

  const lineMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: { time: { value: 0 }, emergeProgress: { value: 1 } },
      vertexShader: `
        uniform float time;
        uniform float emergeProgress;
        attribute float heightNorm;
        varying float vAlpha;
        varying float vPulse;
        varying float vBuilt;

        void main() {
          vec3 pos = position;

          float frontier = 1.0 - emergeProgress;
          float distFromFrontier = heightNorm - frontier;
          float built = smoothstep(-0.12, 0.0, distFromFrontier);
          vBuilt = built;

          float heightPhase = pos.y * 0.42;
          float breathe = 0.55 + 0.45 * sin(time * 0.16 + heightPhase);
          float scanA = smoothstep(0.94, 1.0, sin(pos.y * 0.42 - time * 0.42));
          float scanB = smoothstep(0.975, 1.0, sin(pos.x * 0.22 + pos.z * 0.22 + time * 0.26));
          vPulse = max(scanA, scanB);
          vAlpha = 0.18 + breathe * 0.22 + vPulse * 0.48;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vPulse;
        varying float vBuilt;

        void main() {
          vec3 base = vec3(0.0, 0.56, 0.64);
          vec3 hot = vec3(0.56, 0.98, 1.0);
          vec3 col = mix(base, hot, vPulse) * vBuilt;
          gl_FragColor = vec4(col, clamp(vAlpha * vBuilt, 0.0, 0.72));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });
  }, []);

  const pointsRef = useRef<Points>(null);

  useEffect(() => {
    return () => {
      geometry.dispose();
      lineGeometry.dispose();
      material.dispose();
      lineMaterial.dispose();
    };
  }, [geometry, lineGeometry, material, lineMaterial]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.elapsedTime;
    (material as ShaderMaterial).uniforms.time.value = time;
    lineMaterial.uniforms.time.value = time;
    const pulse = (Math.sin(time * 0.8 + structure.bounds.height * 0.2) + 1) / 2;
    const focusBoost = isSelected ? 0.5 : hovered ? 0.25 : 0;
    (material as ShaderMaterial).uniforms.pointSize.value =
      baseSize + pulse * 0.012 + focusBoost * 0.025;
    (material as ShaderMaterial).uniforms.emergeProgress.value = emergeProgress;
    lineMaterial.uniforms.emergeProgress.value = emergeProgress;
  });

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(node);
  };

  const halfHeight = structure.bounds.height / 2;
  const proxyRadius = Math.max(structure.bounds.width, structure.bounds.depth) * 0.6;
  const proxyHeight = structure.bounds.height * 1.05;
  const wallWidth = structure.bounds.width;
  const wallHeight = structure.bounds.height;
  const wallDepth = structure.bounds.depth;

  return (
    <group position={[px, halfHeight, pz]}>
      <mesh>
        <boxGeometry args={[wallWidth, wallHeight, wallDepth]} />
        <meshBasicMaterial
          color='#01070b'
          transparent
          opacity={0.28 * emergeProgress}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, wallDepth / 2]}>
        <planeGeometry args={[wallWidth, wallHeight, 1, 1]} />
        <meshBasicMaterial
          color='#02232a'
          transparent
          opacity={0.22 * emergeProgress}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -wallDepth / 2]}>
        <planeGeometry args={[wallWidth, wallHeight, 1, 1]} />
        <meshBasicMaterial
          color='#02232a'
          transparent
          opacity={0.22 * emergeProgress}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[wallWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[wallDepth, wallHeight, 1, 1]} />
        <meshBasicMaterial
          color='#02232a'
          transparent
          opacity={0.22 * emergeProgress}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[-wallWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[wallDepth, wallHeight, 1, 1]} />
        <meshBasicMaterial
          color='#02232a'
          transparent
          opacity={0.22 * emergeProgress}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, wallHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[wallWidth, wallDepth, 1, 1]} />
        <meshBasicMaterial
          color='#000203'
          transparent
          opacity={0.94 * emergeProgress}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, -wallHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[wallWidth, wallDepth, 1, 1]} />
        <meshBasicMaterial
          color='#000203'
          transparent
          opacity={0.95 * emergeProgress}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <lineSegments geometry={lineGeometry} material={lineMaterial} />
      <points ref={pointsRef} geometry={geometry} material={material} />

      <mesh
        onClick={handleSelect}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        position={[0, 0, 0]}
      >
        <cylinderGeometry args={[proxyRadius, proxyRadius, proxyHeight, 12, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {isSelected || hovered ? (
        <Html
          position={[0, halfHeight + 1.6, 0]}
          center
          distanceFactor={20}
          zIndexRange={[100, 0]}
          occlude={false}
        >
          <div className='rounded-2xl border border-cyan-300/30 bg-slate-950/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100 shadow-[0_0_24px_rgba(0,231,255,0.32)] backdrop-blur-md'>
            <div>{node.label}</div>
            <div className='mt-1 text-[9px] tracking-[0.28em] text-slate-400'>{node.type}</div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
