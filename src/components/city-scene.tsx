'use client';

import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PointsMaterial,
  ShaderMaterial as THREE_ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CityBuilding } from '@/components/city-building';
import { buildEdgeStream, getTypeColor, seededRandom } from '@/lib/cyberspace-structures';
import type { ArchitectureGraph, ArchitectureNode } from '@/types/architecture';

interface CitySceneProps {
  graph: ArchitectureGraph;
  selectedNode: ArchitectureNode | null;
  onSelectNode: (node: ArchitectureNode | null) => void;
  emergePhase?: number;
  isFullScreen?: boolean;
  onBlackwallDeath?: () => void;
}

function useCityRadius(graph: ArchitectureGraph) {
  return useMemo(() => {
    if (graph.nodes.length === 0) return 80;
    let max = 0;
    for (const n of graph.nodes) {
      const renderedSpan = Math.max(n.size[0], n.size[2]) * 1.75;
      const r = Math.sqrt(n.position[0] ** 2 + n.position[2] ** 2) + renderedSpan * 0.5;
      if (r > max) max = r;
    }
    return Math.max(90, Math.ceil(max * 1.28)); // 35% padding around outermost node
  }, [graph.nodes]);
}

export function CityScene({
  graph,
  selectedNode,
  onSelectNode,
  emergePhase = 1,
  isFullScreen = false,
  onBlackwallDeath,
}: CitySceneProps) {
  const cityRadius = useCityRadius(graph);
  const blackwallRadius = cityRadius * 7.2;
  const boundaryRadius = blackwallRadius * 0.92;
  const camZ = cityRadius * 0.24;
  const camY = 0.85;
  const fogNear = cityRadius * 0.035;
  const fogFar = cityRadius * 3.35;
  const lightDist = cityRadius * 1.8;
  const [blackwallProximity, setBlackwallProximity] = useState(0);
  const [blackwallPulse, setBlackwallPulse] = useState(false);
  const [blackwallBreachGlitch, setBlackwallBreachGlitch] = useState(false);
  const [blackwallCriticalGlitch, setBlackwallCriticalGlitch] = useState(false);
  const [blackwallDeathFade, setBlackwallDeathFade] = useState(false);
  const wasDetected = useRef(false);
  const breachTriggeredRef = useRef(false);
  const criticalTriggeredRef = useRef(false);
  const deathTriggeredRef = useRef(false);

  useEffect(() => {
    const detectionThreshold = 0.12;
    const detected = blackwallProximity >= detectionThreshold;

    if (detected && !wasDetected.current) {
      setBlackwallPulse(true);
      const timer = setTimeout(() => setBlackwallPulse(false), 220);
      wasDetected.current = true;
      return () => clearTimeout(timer);
    }

    if (!detected) {
      wasDetected.current = false;
    }
  }, [blackwallProximity]);

  useEffect(() => {
    if (blackwallProximity >= 0.76 && !breachTriggeredRef.current) {
      breachTriggeredRef.current = true;
      setBlackwallBreachGlitch(true);
      const timer = window.setTimeout(() => setBlackwallBreachGlitch(false), 320);
      return () => window.clearTimeout(timer);
    }

    if (blackwallProximity < 0.72) {
      breachTriggeredRef.current = false;
    }
  }, [blackwallProximity]);

  useEffect(() => {
    if (blackwallProximity >= 0.9 && !criticalTriggeredRef.current) {
      criticalTriggeredRef.current = true;
      setBlackwallCriticalGlitch(true);
      const timer = window.setTimeout(() => setBlackwallCriticalGlitch(false), 420);
      return () => window.clearTimeout(timer);
    }

    if (blackwallProximity < 0.86) {
      criticalTriggeredRef.current = false;
    }
  }, [blackwallProximity]);

  useEffect(() => {
    if (!isFullScreen || !onBlackwallDeath) {
      return;
    }

    if (blackwallProximity >= 0.99 && !deathTriggeredRef.current) {
      deathTriggeredRef.current = true;
      setBlackwallDeathFade(true);
      const timer = window.setTimeout(() => {
        onBlackwallDeath();
      }, 1800);
      return () => window.clearTimeout(timer);
    }
  }, [blackwallProximity, isFullScreen, onBlackwallDeath]);

  const containerClass = isFullScreen
    ? 'fixed inset-0 z-50 bg-black'
    : 'panel relative h-[560px] overflow-hidden';

  return (
    <div className={containerClass}>
      <div className='absolute left-4 top-4 z-10 flex flex-wrap gap-2'>
        <span className='data-chip'>Cyberspace View</span>
        <span className='data-chip'>{graph.stats.totalNodes} entities</span>
        <span className='data-chip'>{graph.stats.totalEdges} pathways</span>
      </div>
      {blackwallProximity > 0 && (
        <div className='blackwall-warning'>
          <p className='blackwall-warning-title'>BLACKWALL PROXIMITY</p>
          <p className='blackwall-warning-body'>
            Threat level: {Math.round(blackwallProximity * 100)}%
          </p>
        </div>
      )}
      <div className='absolute bottom-4 left-4 z-10 hidden rounded-2xl border border-cyan-300/15 bg-slate-950/60 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-400 backdrop-blur-lg md:block'>
        <div className='flex items-center gap-3'>
          <span className='text-cyan-200'>WASD</span>
          <span>Traverse</span>
          <span className='text-cyan-200'>Drag</span>
          <span>Look</span>
          <span className='text-cyan-200'>Scroll</span>
          <span>Zoom</span>
        </div>
      </div>
      <Canvas
        camera={{ position: [0, camY, camZ], fov: 74, far: cityRadius * 30 }}
        onPointerMissed={() => onSelectNode(null)}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach='background' args={['#000105']} />
        <fog attach='fog' args={['#000105', fogNear, fogFar]} />

        <ambientLight intensity={0.025} />
        <pointLight
          position={[0, cityRadius * 0.5, 0]}
          intensity={0.42}
          color='#00DCEB'
          distance={lightDist}
        />
        <pointLight
          position={[cityRadius * 0.4, 15, cityRadius * 0.3]}
          intensity={0.08}
          color='#003E52'
          distance={lightDist * 0.75}
        />
        <pointLight
          position={[-cityRadius * 0.3, 20, -cityRadius * 0.25]}
          intensity={0.08}
          color='#001A2E'
          distance={lightDist * 0.75}
        />

        <Stars
          radius={cityRadius * 3.5}
          depth={150}
          count={1800}
          factor={2.2}
          saturation={0.05}
          fade
          speed={0.08}
        />

        <DependencyGalaxy graph={graph} />
        <ExternalSatellites graph={graph} />
        <CyberspaceField graph={graph} cityRadius={cityRadius} />
        <Blackwall cityRadius={cityRadius} wallRadius={blackwallRadius} proximity={blackwallProximity} />
        <RoadNetwork graph={graph} />
        <EdgeStreams graph={graph} />
        <NavigationController
          cityRadius={cityRadius}
          boundaryRadius={boundaryRadius}
          onBlackwallProximity={setBlackwallProximity}
        />

        {graph.nodes.map((node) => (
          <CityBuilding
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onSelect={onSelectNode}
            emergeProgress={emergePhase}
          />
        ))}

        <PostEffects />
      </Canvas>
      <div className='cyberspace-lens' aria-hidden='true' />
      <div className='cyberspace-haze' aria-hidden='true' />
      <div className='cyberspace-noise' aria-hidden='true' />
      <div
        className={`blackwall-glitch-overlay ${blackwallProximity > 0.62 ? 'blackwall-glitch-active' : ''} ${blackwallPulse ? 'blackwall-glitch-hit' : ''} ${blackwallBreachGlitch ? 'blackwall-breach-hit' : ''} ${blackwallCriticalGlitch ? 'blackwall-critical-hit' : ''} ${blackwallDeathFade ? 'blackwall-final-meltdown' : ''}`}
        style={{ opacity: blackwallDeathFade ? 1 : blackwallProximity > 0.62 ? Math.min(1, (blackwallProximity - 0.62) * 2.2) : 0 }}
        aria-hidden='true'
      />
      <div className={`blackwall-death-overlay ${blackwallDeathFade ? 'blackwall-death-active' : ''}`} aria-hidden='true' />
    </div>
  );
}

const TERRAIN_VERTEX_SHADER = `
  uniform float time;
  attribute float size;
  attribute float brightness;
  attribute float redBlend;
  varying float vBrightness;
  varying float vRedBlend;
  void main() {
    vBrightness = brightness;
    vRedBlend   = redBlend;
    vec3 pos = position;
    // Subtle pulse on rim-bright particles only — keeps the floor feeling alive
    float rimPulse = brightness * sin(time * 1.2 + pos.x * 0.04 + pos.z * 0.04) * 0.18;
    pos.y += rimPulse;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (320.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const TERRAIN_FRAGMENT_SHADER = `
  varying float vBrightness;
  varying float vRedBlend;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.25, 0.5, dist);
    // Cyberspace palette: deep navy → electric blue → cyan → near-white
    vec3 dark   = vec3(0.012, 0.035, 0.12);   // deep navy
    vec3 mid    = vec3(0.0,   0.42,  0.88);   // electric blue
    vec3 bright = vec3(0.0,   0.88,  1.0);    // cyan
    vec3 hot    = vec3(0.82,  0.97,  1.0);    // near-white ice
    vec3 cyberColor;
    if (vBrightness < 0.33)      cyberColor = mix(dark,   mid,    vBrightness / 0.33);
    else if (vBrightness < 0.66) cyberColor = mix(mid,    bright, (vBrightness - 0.33) / 0.33);
    else                         cyberColor = mix(bright, hot,    (vBrightness - 0.66) / 0.34);
    // Bleed to dark crimson near Blackwall
    vec3 wallColor = vec3(0.55, 0.01, 0.03);
    vec3 color = mix(cyberColor, wallColor, vRedBlend);
    float a = alpha * (0.18 + vBrightness * 0.72);
    a = mix(a, a * 1.5, vRedBlend);
    gl_FragColor = vec4(color, clamp(a, 0.0, 1.0));
  }
`;

function CyberspaceFloor({ cityRadius, wallRadius }: { cityRadius: number; wallRadius: number }) {
  const {
    terrainPositions,
    terrainSizes,
    terrainBrightness,
    terrainRedBlend,
    linePositions,
    pillarPositions,
    voxelPositions,
    rimPositions,
  } = useMemo(() => {
    const positions: number[] = [];
    const sizes: number[] = [];
    const brightness: number[] = [];
    const redBlendArr: number[] = [];
    const lines: number[] = [];
    const pillars: number[] = [];
    const voxels: number[] = [];
    const rim: number[] = [];

    const gridSize = wallRadius;
    const spacing = Math.max(3.0, wallRadius / 130);
    const baseY = -2; // flat floor at y = -2
    const authRim = cityRadius * 0.72; // auth rim ring radius
    const rimWidth = cityRadius * 0.04; // how wide the glow band is

    const getBrightness = (d: number) => {
      // Base: faint glow everywhere, brighter near center
      const centerGlow = Math.max(0, 1 - d / (cityRadius * 0.5)) * 0.3;
      // Auth rim: sharp glowing ring
      const rimDist = Math.abs(d - authRim);
      const rimGlow = Math.exp(-(rimDist * rimDist) / (2 * rimWidth * rimWidth)) * 0.9;
      return Math.min(1, centerGlow + rimGlow);
    };

    for (let x = -gridSize; x <= gridSize; x += spacing) {
      for (let z = -gridSize; z <= gridSize; z += spacing) {
        const d = Math.sqrt(x * x + z * z);
        const b = getBrightness(d);

        // Red bleed: 0 inside city, ramps to 1 near Blackwall
        const redT = Math.max(0, (d - cityRadius * 1.4) / (wallRadius * 0.82 - cityRadius * 1.4));
        const redB = Math.pow(Math.min(1, redT), 1.8);

        positions.push(x, baseY, z);
        sizes.push(0.06 + b * 0.28);
        brightness.push(b);
        redBlendArr.push(redB);

        // Pillars only on auth rim band
        if (b > 0.6) {
          const pillarH = 2 + b * 6;
          for (let py = baseY + 0.5; py < baseY + pillarH; py += 0.5) {
            pillars.push(x + (Math.random() - 0.5) * 0.3, py, z + (Math.random() - 0.5) * 0.3);
          }
        }

        // Rim scatter particles rising off the auth ring
        const rimDist = Math.abs(d - authRim);
        if (rimDist < rimWidth * 1.5 && Math.random() < 0.35) {
          rim.push(
            x + (Math.random() - 0.5) * 0.6,
            baseY + Math.random() * 10 + 1,
            z + (Math.random() - 0.5) * 0.6
          );
        }
      }
    }

    // Concentric grid rings — evenly spaced, perfectly circular, flat
    const ringStep = Math.max(12, cityRadius * 0.12);
    const ringSegs = Math.min(240, Math.max(120, Math.floor(cityRadius * 1.8)));
    for (let r = ringStep; r <= gridSize * 0.98; r += ringStep) {
      for (let s = 0; s < ringSegs; s++) {
        const a1 = (s / ringSegs) * Math.PI * 2;
        const a2 = ((s + 1) / ringSegs) * Math.PI * 2;
        lines.push(
          Math.cos(a1) * r,
          baseY,
          Math.sin(a1) * r,
          Math.cos(a2) * r,
          baseY,
          Math.sin(a2) * r
        );
      }
    }

    // Radial spoke lines — flat
    const spokeCount = 32;
    const spokeStep = Math.max(4, cityRadius * 0.04);
    for (let s = 0; s < spokeCount; s++) {
      const angle = (s / spokeCount) * Math.PI * 2;
      for (let r = 0; r < gridSize * 0.98; r += spokeStep) {
        lines.push(
          Math.cos(angle) * r,
          baseY,
          Math.sin(angle) * r,
          Math.cos(angle) * (r + spokeStep),
          baseY,
          Math.sin(angle) * (r + spokeStep)
        );
      }
    }

    // Voxel clusters at auth rim intersection points — flat
    const voxelCount = 16;
    for (let v = 0; v < voxelCount; v++) {
      const angle = (v / voxelCount) * Math.PI * 2;
      const cx = Math.cos(angle) * authRim;
      const cz = Math.sin(angle) * authRim;
      for (let vx = 0; vx < 3; vx++) {
        for (let vy = 0; vy < 3; vy++) {
          for (let vz2 = 0; vz2 < 3; vz2++) {
            voxels.push(cx + vx * 0.5 - 0.75, baseY + vy * 0.5, cz + vz2 * 0.5 - 0.75);
          }
        }
      }
    }

    return {
      terrainPositions: new Float32Array(positions),
      terrainSizes: new Float32Array(sizes),
      terrainBrightness: new Float32Array(brightness),
      terrainRedBlend: new Float32Array(redBlendArr),
      linePositions: new Float32Array(lines),
      pillarPositions: new Float32Array(pillars),
      voxelPositions: new Float32Array(voxels),
      rimPositions: new Float32Array(rim),
    };
  }, [cityRadius, wallRadius]);

  const terrainGeom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(terrainPositions, 3));
    g.setAttribute('size', new BufferAttribute(terrainSizes, 1));
    g.setAttribute('brightness', new BufferAttribute(terrainBrightness, 1));
    g.setAttribute('redBlend', new BufferAttribute(terrainRedBlend, 1));
    return g;
  }, [terrainPositions, terrainSizes, terrainBrightness, terrainRedBlend]);

  const lineGeom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(linePositions, 3));
    return g;
  }, [linePositions]);

  const pillarGeom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pillarPositions, 3));
    return g;
  }, [pillarPositions]);

  const voxelGeom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(voxelPositions, 3));
    return g;
  }, [voxelPositions]);

  const rimGeom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(rimPositions, 3));
    return g;
  }, [rimPositions]);

  const lineMat = useRef<any>(null);
  const lineMeshRef = useRef<any>(null);
  const terrainUniforms = useRef({ time: { value: 0 } });
  const originalLinePositions = useMemo(() => new Float32Array(linePositions), [linePositions]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    terrainUniforms.current.time.value = t;

    if (lineMat.current) {
      lineMat.current.opacity = 0.06 + Math.sin(t * 0.5) * 0.03;
    }

    if (lineMeshRef.current) {
      const posAttr = lineMeshRef.current.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      const orig = originalLinePositions;
      for (let i = 0; i < arr.length; i += 3) {
        const x = orig[i];
        const z = orig[i + 2];
        const breathe = Math.sin(x * 0.04 + t * 1.2) * Math.cos(z * 0.04 + t * 0.9) * 0.6;
        arr[i + 1] = orig[i + 1] + breathe;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <points geometry={terrainGeom}>
        <shaderMaterial
          vertexShader={TERRAIN_VERTEX_SHADER}
          fragmentShader={TERRAIN_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={terrainUniforms.current}
        />
      </points>
      <lineSegments geometry={lineGeom} ref={lineMeshRef}>
        <lineBasicMaterial
          ref={lineMat}
          color='#00D4C6'
          transparent
          opacity={0.08}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
      <points geometry={pillarGeom}>
        <pointsMaterial
          size={0.18}
          color='#A8F7FF'
          transparent
          opacity={0.45}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <points geometry={voxelGeom}>
        <pointsMaterial
          size={0.24}
          color='#00F5FF'
          transparent
          opacity={0.55}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <points geometry={rimGeom}>
        <pointsMaterial
          size={0.18}
          color='#00D4C6'
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

function CyberspaceRoof() {
  const data = useMemo(() => {
    const values: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      const y = 60 + Math.random() * 80;
      values.push(x, y, z);
    }
    return new Float32Array(values);
  }, []);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(data, 3));
    return g;
  }, [data]);

  const materialRef = useRef<any>(null);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.opacity = 0.03 + Math.sin(clock.elapsedTime * 0.2) * 0.015;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        size={0.08}
        color='#4B2EFF'
        transparent
        opacity={0.03}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

// ── Blackwall ─────────────────────────────────────────────────────────────────
function Blackwall({
  cityRadius,
  wallRadius,
  proximity,
}: {
  cityRadius: number;
  wallRadius: number;
  proximity: number;
}) {
  const wallHeight = 600; // truly colossal vertical extent
  const wallDepth = wallRadius * 0.18; // thick multi-layer volume

  const strandMatRef = useRef<THREE_ShaderMaterial | null>(null);
  const lightningMatRef = useRef<THREE_ShaderMaterial | null>(null);
  const horizonMatRef = useRef<THREE_ShaderMaterial | null>(null);
  const bleedMatRef = useRef<THREE_ShaderMaterial | null>(null);
  const redLightA = useRef<any>(null);
  const redLightB = useRef<any>(null);
  const { camera } = useThree();
  const smoothedProximityRef = useRef(0);
  const hotspotDirRef = useRef(new Vector2(1, 0));

  const geoms = useMemo(() => {
    const rng = seededRandom(9137);

    // ── 1. Strand columns — 3 depth layers, 800 total ──────────────────────
    const sPos: number[] = [],
      sSeed: number[] = [],
      sBright: number[] = [];
    const layers = [
      { count: 560, rOff: 0, pps: 320, alphaBase: 0.78 },
      { count: 420, rOff: wallDepth * 0.35, pps: 240, alphaBase: 0.52 },
      { count: 280, rOff: wallDepth * 0.72, pps: 180, alphaBase: 0.34 },
      { count: 180, rOff: wallDepth * 1.05, pps: 120, alphaBase: 0.2 },
    ];
    for (const layer of layers) {
      for (let s = 0; s < layer.count; s++) {
        const angle = (s / layer.count) * Math.PI * 2 + rng() * 0.018;
        const r = wallRadius - layer.rOff + (rng() - 0.5) * 8;
        const sx = Math.cos(angle) * r;
        const sz = Math.sin(angle) * r;
        if (rng() < 0.09) continue; // void gap
        for (let p = 0; p < layer.pps; p++) {
          const t = p / layer.pps;
          const y = -40 + t * wallHeight + (rng() - 0.5) * 3;
          sPos.push(sx + (rng() - 0.5) * 2, y, sz + (rng() - 0.5) * 2);
          sSeed.push(rng() + layer.alphaBase * 0.1); // encode layer brightness in seed offset
          const corrupt = rng() < 0.06 ? 1.0 : 0.0;
          sBright.push(layer.alphaBase * (0.5 + t * 0.5) + corrupt * 0.8);
        }
      }
    }
    const sg = new BufferGeometry();
    sg.setAttribute('position', new BufferAttribute(new Float32Array(sPos), 3));
    sg.setAttribute('seed', new BufferAttribute(new Float32Array(sSeed), 1));
    sg.setAttribute('bright', new BufferAttribute(new Float32Array(sBright), 1));

    // ── 2. Lightning veins ─────────────────────────────────────────────────
    const lPos: number[] = [],
      lSeed: number[] = [];
    const veinCount = 32;
    for (let v = 0; v < veinCount; v++) {
      const angle = (v / veinCount) * Math.PI * 2 + rng() * 0.2;
      const r = wallRadius + (rng() - 0.5) * wallDepth * 0.3;
      let y = -30 + rng() * 60;
      let drift = 0;
      const steps = 100 + Math.floor(rng() * 80);
      for (let i = 0; i < steps; i++) {
        drift += (rng() - 0.5) * 2.2;
        drift *= 0.84;
        y += 4 + rng() * 4;
        const ja = angle + (drift + (rng() - 0.5) * 3) * 0.004;
        lPos.push(Math.cos(ja) * r, y, Math.sin(ja) * r);
        lSeed.push(rng());
      }
    }
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(new Float32Array(lPos), 3));
    lg.setAttribute('seed', new BufferAttribute(new Float32Array(lSeed), 1));

    // ── 3. Horizon glow ring — low band along base for far visibility ──────
    const hPos: number[] = [],
      hSeed: number[] = [];
    for (let i = 0; i < 12000; i++) {
      const a = rng() * Math.PI * 2;
      const r = wallRadius + (rng() - 0.5) * wallDepth;
      const y = -40 + rng() * 80; // concentrated near ground level
      hPos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      hSeed.push(rng());
    }
    const hg = new BufferGeometry();
    hg.setAttribute('position', new BufferAttribute(new Float32Array(hPos), 3));
    hg.setAttribute('seed', new BufferAttribute(new Float32Array(hSeed), 1));

    // ── 4. Ground bleed — red flood from wall inward to midway ────────────
    const gPos: number[] = [];
    for (let i = 0; i < 10000; i++) {
      const a = rng() * Math.PI * 2;
      // Concentrated near wall, sparse bleed inward to cityRadius*2
      const t = Math.pow(rng(), 2.2); // bias toward wall edge
      const r2 = cityRadius * 2 + t * (wallRadius - cityRadius * 2);
      gPos.push(
        Math.cos(a) * r2 + (rng() - 0.5) * 18,
        -12 + rng() * 5,
        Math.sin(a) * r2 + (rng() - 0.5) * 18
      );
    }
    const gg = new BufferGeometry();
    gg.setAttribute('position', new BufferAttribute(new Float32Array(gPos), 3));

    return { sg, lg, hg, gg };
  }, [cityRadius, wallRadius, wallDepth]);

  // ── Strand material ────────────────────────────────────────────────────────
  const strandMat = useMemo(() => {
    const m = new THREE_ShaderMaterial({
      uniforms: { time: { value: 0 }, reveal: { value: 0 }, hotspotDir: { value: new Vector2(1, 0) } },
      vertexShader: `
        uniform float time;
        uniform vec2 hotspotDir;
        attribute float seed;
        attribute float bright;
        varying float vAlpha;
        varying float vBright;
        varying float vHot;
        void main() {
          float flicker = 0.72 + 0.28 * sin(time * (1.8 + seed * 6.0) + seed * 44.0);
          float pulse   = step(0.88, sin(time * 0.35 + seed * 18.0)) * 1.2;
          vAlpha  = flicker * (0.55 + bright * 0.45) + pulse;
          vBright = bright;
          vec2 radial = normalize(position.xz);
          float align = dot(radial, hotspotDir);
          vHot = smoothstep(0.78, 0.995, align);
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(1.0, (1.1 + bright * 1.8 + pulse * 2.5) * (380.0 / -mvp.z));
          gl_Position  = projectionMatrix * mvp;
        }
      `,
      fragmentShader: `
        uniform float reveal;
        varying float vAlpha;
        varying float vBright;
        varying float vHot;
        void main() {
          float d    = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.05, 0.5, d);
          vec3  core = vec3(0.95, 0.06, 0.08);
          vec3  mid  = vec3(0.45, 0.01, 0.12);
          vec3  dark = vec3(0.12, 0.0,  0.05);
          vec3  idle = vec3(0.0015, 0.001, 0.0018);
          vec3  col  = vBright > 0.6
            ? mix(mid,  core, (vBright - 0.6) / 0.4)
            : mix(dark, mid,  vBright / 0.6);
          float glow = reveal * vHot;
          vec3 outCol = mix(idle, col, glow);
          float outAlpha = soft * (0.004 + clamp(vAlpha, 0.0, 1.0) * glow);
          gl_FragColor = vec4(outCol, outAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    strandMatRef.current = m;
    return m;
  }, []);

  // ── Lightning material ─────────────────────────────────────────────────────
  const lightningMat = useMemo(() => {
    const m = new THREE_ShaderMaterial({
      uniforms: { time: { value: 0 }, reveal: { value: 0 }, hotspotDir: { value: new Vector2(1, 0) } },
      vertexShader: `
        uniform float time;
        uniform vec2 hotspotDir;
        attribute float seed;
        varying float vAlpha;
        varying float vHot;
        void main() {
          float burst = step(0.75, fract(time * 0.22 + seed * 2.7));
          float wave  = sin(time * 4.0 + seed * 28.0) * 0.5 + 0.5;
          vAlpha = burst * wave + 0.05;
          vec2 radial = normalize(position.xz);
          float align = dot(radial, hotspotDir);
          vHot = smoothstep(0.82, 0.997, align);
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(1.2, (1.5 + burst * 3.5) * (380.0 / -mvp.z));
          gl_Position  = projectionMatrix * mvp;
        }
      `,
      fragmentShader: `
        uniform float reveal;
        varying float vAlpha;
        varying float vHot;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.0, 0.5, d);
          float glow = reveal * vHot;
          vec3 outCol = mix(vec3(0.003, 0.001, 0.001), vec3(1.0, 0.18, 0.18), glow);
          gl_FragColor = vec4(outCol, soft * (0.003 + vAlpha * glow));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    lightningMatRef.current = m;
    return m;
  }, []);

  // ── Horizon glow material ──────────────────────────────────────────────────
  const horizonMat = useMemo(() => {
    const m = new THREE_ShaderMaterial({
      uniforms: { time: { value: 0 }, reveal: { value: 0 }, hotspotDir: { value: new Vector2(1, 0) } },
      vertexShader: `
        uniform float time;
        uniform vec2 hotspotDir;
        attribute float seed;
        varying float vAlpha;
        varying float vHot;
        void main() {
          float pulse = 0.55 + 0.45 * sin(time * 0.55 + seed * 22.0);
          vAlpha = pulse * (0.35 + seed * 0.3);
          vec2 radial = normalize(position.xz);
          float align = dot(radial, hotspotDir);
          vHot = smoothstep(0.68, 0.98, align);
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(2.0, (3.5 + pulse * 5.0) * (400.0 / -mvp.z));
          gl_Position  = projectionMatrix * mvp;
        }
      `,
      fragmentShader: `
        uniform float reveal;
        varying float vAlpha;
        varying float vHot;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.0, 0.5, d);
          // Bright red-orange core — the horizon smear seen from far away
          float glow = reveal * vHot;
          vec3 col = mix(vec3(0.0025, 0.0012, 0.0012), vec3(0.88, 0.08, 0.05), glow);
          gl_FragColor = vec4(col, soft * (0.004 + vAlpha * 0.9 * glow));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    horizonMatRef.current = m;
    return m;
  }, []);

  // ── Ground bleed material ──────────────────────────────────────────────────
  const bleedMat = useMemo(() => {
    const m = new THREE_ShaderMaterial({
      uniforms: { time: { value: 0 }, reveal: { value: 0 }, hotspotDir: { value: new Vector2(1, 0) } },
      vertexShader: `
        uniform vec2 hotspotDir;
        varying float vHot;
        void main() {
          vec2 radial = normalize(position.xz);
          float align = dot(radial, hotspotDir);
          vHot = smoothstep(0.6, 0.95, align);
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(1.0, 2.2 * (300.0 / -mvp.z));
          gl_Position  = projectionMatrix * mvp;
        }
      `,
      fragmentShader: `
        uniform float reveal;
        varying float vHot;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.2, 0.5, d);
          float glow = reveal * vHot;
          vec3 col = mix(vec3(0.002, 0.001, 0.001), vec3(0.55, 0.0, 0.04), glow);
          gl_FragColor = vec4(col, soft * (0.004 + 0.28 * glow));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    bleedMatRef.current = m;
    return m;
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const p = clamp(proximity, 0, 1);
    const alpha = 1 - Math.exp(-delta / 0.2);
    smoothedProximityRef.current += (p - smoothedProximityRef.current) * alpha;
    const smoothP = clamp(smoothedProximityRef.current, 0, 1);
    const reveal = smoothP * smoothP * (3 - 2 * smoothP);

    const radialLen = Math.hypot(camera.position.x, camera.position.z);
    if (radialLen > 1e-6) {
      hotspotDirRef.current.set(camera.position.x / radialLen, camera.position.z / radialLen);
    } else {
      hotspotDirRef.current.set(1, 0);
    }

    if (strandMatRef.current) {
      strandMatRef.current.uniforms.time.value = t;
      strandMatRef.current.uniforms.reveal.value = reveal;
      strandMatRef.current.uniforms.hotspotDir.value.copy(hotspotDirRef.current);
      strandMatRef.current.opacity = 0.9 * reveal;
    }
    if (lightningMatRef.current) {
      lightningMatRef.current.uniforms.time.value = t;
      lightningMatRef.current.uniforms.reveal.value = reveal;
      lightningMatRef.current.uniforms.hotspotDir.value.copy(hotspotDirRef.current);
      lightningMatRef.current.opacity = 0.85 * reveal;
    }
    if (horizonMatRef.current) {
      horizonMatRef.current.uniforms.time.value = t;
      horizonMatRef.current.uniforms.reveal.value = reveal;
      horizonMatRef.current.uniforms.hotspotDir.value.copy(hotspotDirRef.current);
      horizonMatRef.current.opacity = 0.8 * reveal;
    }
    if (bleedMatRef.current) {
      bleedMatRef.current.uniforms.reveal.value = reveal;
      bleedMatRef.current.uniforms.hotspotDir.value.copy(hotspotDirRef.current);
      bleedMatRef.current.opacity = 0.7 * reveal;
    }
    if (redLightA.current) redLightA.current.intensity = 2.8 * reveal;
    if (redLightB.current) redLightB.current.intensity = 2.2 * reveal;
  });

  return (
    <group>
      {/* Far red point light so the wall bleeds light back onto the scene */}
      <pointLight
        ref={redLightA}
        position={[wallRadius, 40, 0]}
        intensity={2.8}
        color='#cc0008'
        distance={wallRadius * 1.4}
        decay={1.2}
      />
      <pointLight
        ref={redLightB}
        position={[-wallRadius * 0.7, 40, wallRadius * 0.7]}
        intensity={2.2}
        color='#aa0010'
        distance={wallRadius * 1.2}
        decay={1.2}
      />
      {/* Horizon glow — seen from city as a red smear on the horizon */}
      <points geometry={geoms.hg} material={horizonMat} />
      {/* Main strand wall */}
      <points geometry={geoms.sg} material={strandMat} />
      {/* Lightning veins */}
      <points geometry={geoms.lg} material={lightningMat} />
      {/* Ground bleed inward */}
      <points geometry={geoms.gg} material={bleedMat} />
    </group>
  );
}

function PostEffects() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.34}
        luminanceSmoothing={0.86}
        intensity={0.58}
        mipmapBlur
        radius={0.62}
      />
    </EffectComposer>
  );
}

function CyberspaceField({ graph, cityRadius }: { graph: ArchitectureGraph; cityRadius: number }) {
  const data = useMemo(() => {
    const values: number[] = [];
    const rng = seededRandom(42);
    const area = cityRadius * 2.1;

    for (let index = 0; index < 8000; index += 1) {
      const x = (rng() - 0.5) * area;
      const y = rng() * 50 - 4;
      const z = (rng() - 0.5) * area;

      let keep = true;
      for (const node of graph.nodes) {
        const dx = x - node.position[0];
        const dz = z - node.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < Math.max(node.size[0], node.size[2]) * 0.85 && y < node.size[1] + 2) {
          keep = false;
          break;
        }
      }

      if (keep) {
        values.push(x, y, z);
      }
    }

    return new Float32Array(values);
  }, [graph.nodes, cityRadius]);

  const materialRef = useRef<any>(null);

  useFrame(({ clock }) => {
    if (!materialRef.current) {
      return;
    }

    const pulse = (Math.sin(clock.elapsedTime * 0.6) + 1) / 2;
    materialRef.current.opacity = 0.06 + pulse * 0.04;
  });

  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(data, 3));
    return geom;
  }, [data]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        size={0.12}
        color='#A8F7FF'
        transparent
        opacity={0.08}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function RoadNetwork({ graph }: { graph: ArchitectureGraph }) {
  const materialRef = useRef<THREE_ShaderMaterial | null>(null);

  const geometry = useMemo(() => {
    const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    const positions: number[] = [];
    const ROAD_Y = 0.08;
    const laneOffsets = [-3.2, -1.6, 0, 1.6, 3.2];

    const addLine = (ax: number, az: number, bx: number, bz: number) => {
      positions.push(ax, ROAD_Y, az, bx, ROAD_Y, bz);
    };

    const addPath = (points: [number, number][]) => {
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, az] = points[i];
        const [bx, bz] = points[i + 1];
        const horiz = Math.abs(bx - ax) >= Math.abs(bz - az);

        for (const off of laneOffsets) {
          addLine(
            ax + (horiz ? 0 : off),
            az + (horiz ? off : 0),
            bx + (horiz ? 0 : off),
            bz + (horiz ? off : 0)
          );
        }

        const length = Math.hypot(bx - ax, bz - az);
        const ticks = Math.max(2, Math.floor(length / 18));
        for (let t = 1; t < ticks; t++) {
          const u = t / ticks;
          const x = ax + (bx - ax) * u;
          const z = az + (bz - az) * u;
          if (horiz) addLine(x, z - 2.4, x, z + 2.4);
          else addLine(x - 2.4, z, x + 2.4, z);
        }
      }
    };

    for (const edge of graph.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const dx = target.position[0] - source.position[0];
      const dz = target.position[2] - source.position[2];
      const len = Math.hypot(dx, dz) || 1;
      const nx = dx / len;
      const nz = dz / len;
      const sourcePad = Math.max(source.size[0], source.size[2]) * 0.95 + 5;
      const targetPad = Math.max(target.size[0], target.size[2]) * 0.95 + 5;
      const sx = source.position[0] + nx * sourcePad;
      const sz = source.position[2] + nz * sourcePad;
      const tx = target.position[0] - nx * targetPad;
      const tz = target.position[2] - nz * targetPad;
      const midX = sx + (tx - sx) * 0.5;

      addPath([
        [sx, sz],
        [midX, sz],
        [midX, tz],
        [tx, tz],
      ]);
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    return geom;
  }, [graph.nodes, graph.edges]);

  const material = useMemo(() => {
    const mat = new THREE_ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        uniform float time;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          float breathe = 0.5 + 0.5 * sin(time * 0.12 + pos.x * 0.035 + pos.z * 0.035);
          float gridPulse = smoothstep(0.96, 1.0, sin(pos.x * 0.18 + pos.z * 0.18 - time * 0.22));
          // Subtle Y-breathing like buildings
          float roadBreathe = sin(time * 0.6 + pos.x * 0.02 + pos.z * 0.02) * 0.06;
          pos.y += roadBreathe;
          vAlpha = 0.08 + breathe * 0.08 + gridPulse * 0.16;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          vec3 col = mix(vec3(0.0, 0.20, 0.24), vec3(0.28, 0.92, 1.0), vAlpha);
          gl_FragColor = vec4(col, clamp(vAlpha, 0.0, 0.28));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.time.value = clock.elapsedTime;
  });

  return <lineSegments geometry={geometry} material={material} />;
}

function EdgeStreams({ graph }: { graph: ArchitectureGraph }) {
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  return (
    <group>
      {graph.edges.map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);

        if (!source || !target) {
          return null;
        }

        const start: [number, number, number] = [source.position[0], 0, source.position[2]];
        const end: [number, number, number] = [target.position[0], 0, target.position[2]];
        const mid: [number, number, number] = [
          (source.position[0] + target.position[0]) / 2,
          0,
          (source.position[2] + target.position[2]) / 2,
        ];

        return (
          <EdgeStream
            key={`${edge.source}-${edge.target}`}
            points={[start, mid, end]}
            weight={edge.weight}
            sourceType={source.type}
            targetType={target.type}
            sourceId={source.id}
            targetId={target.id}
          />
        );
      })}
    </group>
  );
}

function EdgeStream({
  points,
  weight,
  sourceType,
  targetType,
  sourceId,
  targetId,
}: {
  points: [number, number, number][];
  weight: number;
  sourceType: ArchitectureNode['type'];
  targetType: ArchitectureNode['type'];
  sourceId: string;
  targetId: string;
}) {
  const [start, mid, end] = points;
  const edgeKey = useMemo(
    () => `${start[0]}:${start[1]}:${start[2]}:${end[0]}:${end[1]}:${end[2]}`,
    [start, end]
  );

  const { positions, count } = useMemo(
    () => buildEdgeStream(start, mid, end, weight),
    [edgeKey, mid, weight]
  );

  const srcColor = getTypeColor(sourceType, sourceId);
  const tgtColor = getTypeColor(targetType, targetId);

  // Per-particle arc-position (u: 0→1) for gradient + flow animation
  const arcU = useMemo(() => {
    const u = new Float32Array(count);
    for (let i = 0; i < count; i++) u[i] = i / (count - 1);
    return u;
  }, [count, edgeKey]);

  const mat = useMemo(
    () =>
      new THREE_ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          pointSize: { value: 0.22 },
          srcColor: { value: srcColor },
          tgtColor: { value: tgtColor },
          speed: { value: 0.06 + weight * 0.008 },
        },
        vertexShader: `
      uniform float time;
      uniform float pointSize;
      uniform float speed;
      attribute float arcU;
      varying float vAlpha;
      varying float vU;
      varying float vPacket;
      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      void main() {
        vU = arcU;
        vec3 pos = position;
        float seed = hash(float(gl_VertexID));
        // Evaporation cycle — same as building shader
        float evapSpeed = 1.0 + seed * 2.0;
        float cycle = fract(time * evapSpeed * 0.12 + seed * 10.0);
        float rise = cycle * 1.8;
        pos.y += rise;
        float birth = smoothstep(0.0, 0.12, cycle);
        float evapAlpha = birth * (1.0 - smoothstep(0.55, 1.0, cycle));
        float sizeMult = 1.0 - smoothstep(0.45, 1.0, cycle);
        // Signal packet crawling along arcU
        float tPkt = fract(time * speed);
        float dist = abs(arcU - tPkt);
        dist = min(dist, 1.0 - dist);
        float packet = smoothstep(0.05, 0.0, dist) * 0.9;
        // Tail
        float behindPkt = arcU - tPkt;
        float tail = clamp(behindPkt * -1.0, 0.0, 0.08) / 0.08 * 0.5;
        vPacket = packet;
        vAlpha = clamp(evapAlpha * 0.7 + packet + tail, 0.0, 1.0);
        float sz = pointSize * sizeMult * (1.0 + packet * 3.0);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = max(0.5, sz * (300.0 / -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
        fragmentShader: `
      uniform vec3 srcColor;
      uniform vec3 tgtColor;
      varying float vAlpha;
      varying float vU;
      varying float vPacket;
      void main() {
        float r = distance(gl_PointCoord, vec2(0.5));
        if (r > 0.5) discard;
        float soft = 1.0 - smoothstep(0.0, 0.5, r);
        vec3 traceCol = mix(srcColor, tgtColor, vU);
        vec3 col = mix(traceCol, traceCol + 0.2, vPacket * soft);
        gl_FragColor = vec4(col, soft * vAlpha * 0.85);
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [edgeKey, weight]
  );

  useFrame(({ clock }) => {
    if (mat.uniforms) mat.uniforms.time.value = clock.elapsedTime;
  });

  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(positions, 3));
    geom.setAttribute('arcU', new BufferAttribute(arcU, 1));
    return geom;
  }, [positions, arcU]);

  return <points geometry={geometry} material={mat} />;
}

function DependencyGalaxy({ graph }: { graph: ArchitectureGraph }) {
  const orbRef = useRef<any>(null);
  const tendrilRef = useRef<any>(null);
  const satelliteRef = useRef<any>(null);

  const ORB_Y = -62;
  const FLOOR_Y = -14;

  const { orbGeom, tendrilGeom, satelliteGeom, rootGeom } = useMemo(() => {
    const rng = seededRandom(999);
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

    // Central orb — dense sphere of particles
    const orbCount = 4800;
    const orbPos = new Float32Array(orbCount * 3);
    const orbAlpha = new Float32Array(orbCount);
    for (let i = 0; i < orbCount; i++) {
      const phi = Math.acos(2 * rng() - 1);
      const theta = rng() * Math.PI * 2;
      const r = 1.8 + Math.pow(rng(), 2.0) * 6.0;
      orbPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      orbPos[i * 3 + 1] = Math.cos(phi) * r * 0.85;
      orbPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      orbAlpha[i] = rng();
    }
    const oGeom = new BufferGeometry();
    oGeom.setAttribute('position', new BufferAttribute(orbPos, 3));
    oGeom.setAttribute('seed', new BufferAttribute(orbAlpha, 1));

    // Tendrils — arcs from each node position down to the orb
    const tendrilPositions: number[] = [];
    const tendrilSeeds: number[] = [];
    for (const node of graph.nodes) {
      const nx = node.position[0];
      const nz = node.position[2];
      const nodeY = FLOOR_Y;
      const stepsPerTendril = 48;
      const tendrils = 3 + Math.floor(rng() * 3);
      for (let t = 0; t < tendrils; t++) {
        const jx = (rng() - 0.5) * 4;
        const jz = (rng() - 0.5) * 4;
        const seed = rng();
        for (let s = 0; s <= stepsPerTendril; s++) {
          const u = s / stepsPerTendril;
          // Quadratic bezier: node → mid-pull → orb center
          const midX = nx * (1 - u * 0.7);
          const midZ = nz * (1 - u * 0.7);
          const midY = nodeY + (ORB_Y - nodeY) * u + Math.sin(u * Math.PI) * (8 + rng() * 10);
          tendrilPositions.push(
            midX + jx * (1 - u) + (rng() - 0.5) * 0.3,
            midY,
            midZ + jz * (1 - u) + (rng() - 0.5) * 0.3
          );
          tendrilSeeds.push(seed + u);
        }
      }
    }
    const tGeom = new BufferGeometry();
    tGeom.setAttribute('position', new BufferAttribute(new Float32Array(tendrilPositions), 3));
    tGeom.setAttribute('seed', new BufferAttribute(new Float32Array(tendrilSeeds), 1));

    // Satellite halos — each node gets a small halo ring at underground depth
    const satellitePositions: number[] = [];
    const satelliteSeeds: number[] = [];
    for (const node of graph.nodes) {
      const nx = node.position[0];
      const nz = node.position[2];
      const depth = FLOOR_Y - 4 - rng() * 8;
      const radius = 1.8 + (node.dependencyCount || 1) * 0.35;
      const pts = 32 + Math.floor(rng() * 24);
      for (let p = 0; p < pts; p++) {
        const a = (p / pts) * Math.PI * 2;
        satellitePositions.push(
          nx + Math.cos(a) * radius + (rng() - 0.5) * 0.2,
          depth + (rng() - 0.5) * 0.4,
          nz + Math.sin(a) * radius + (rng() - 0.5) * 0.2
        );
        satelliteSeeds.push(rng());
      }
    }
    const sGeom = new BufferGeometry();
    sGeom.setAttribute('position', new BufferAttribute(new Float32Array(satellitePositions), 3));
    sGeom.setAttribute('seed', new BufferAttribute(new Float32Array(satelliteSeeds), 1));

    // Underground cross-connections — root arcs between connected nodes, dipping below floor
    const rootPositions: number[] = [];
    const rootSeeds: number[] = [];
    for (const edge of graph.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      const ax = src.position[0],
        az = src.position[2];
      const bx = tgt.position[0],
        bz = tgt.position[2];
      // Arc depth scales with distance — further apart = dips deeper
      const dist = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
      const dipDepth = FLOOR_Y - 6 - dist * 0.22 - rng() * 8;
      const midX = (ax + bx) / 2 + (rng() - 0.5) * 4;
      const midZ = (az + bz) / 2 + (rng() - 0.5) * 4;
      // Multiple parallel tendrils per edge (1 + weight-based)
      const strands = 1 + Math.floor(edge.weight * 0.5 + rng() * 2);
      const steps = 52;
      for (let strand = 0; strand < strands; strand++) {
        const jx = (rng() - 0.5) * 2.5;
        const jz = (rng() - 0.5) * 2.5;
        const seed = rng();
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const om = 1 - u;
          // Quadratic bezier: src → mid (deep) → tgt
          const px = om * om * ax + 2 * om * u * (midX + jx) + u * u * bx;
          const pz = om * om * az + 2 * om * u * (midZ + jz) + u * u * bz;
          const py = om * om * FLOOR_Y + 2 * om * u * dipDepth + u * u * FLOOR_Y;
          rootPositions.push(px + (rng() - 0.5) * 0.25, py, pz + (rng() - 0.5) * 0.25);
          rootSeeds.push(u + seed * 0.001);
        }
      }
    }
    const rGeom = new BufferGeometry();
    rGeom.setAttribute('position', new BufferAttribute(new Float32Array(rootPositions), 3));
    rGeom.setAttribute('seed', new BufferAttribute(new Float32Array(rootSeeds), 1));

    return { orbGeom: oGeom, tendrilGeom: tGeom, satelliteGeom: sGeom, rootGeom: rGeom };
  }, [graph.nodes, graph.edges]);

  const orbMat = useMemo(
    () =>
      new THREE_ShaderMaterial({
        uniforms: { time: { value: 0 }, pointSize: { value: 0.28 } },
        vertexShader: `
      uniform float time;
      uniform float pointSize;
      attribute float seed;
      varying float vAlpha;
      void main() {
        float pulse = sin(time * 1.4 + seed * 12.0) * 0.5 + 0.5;
        float orbit = sin(time * 0.6 + seed * 20.0) * 0.8;
        vec3 pos = position;
        pos.x += cos(time * 0.4 + seed * 8.0) * orbit * 0.15;
        pos.z += sin(time * 0.4 + seed * 8.0) * orbit * 0.15;
        vAlpha = 0.08 + pulse * 0.1;
        float dist = length(pos);
        float sizeFade = 1.0 - smoothstep(2.0, 9.0, dist);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = max(0.5, pointSize * (1.0 + pulse * 0.4) * sizeFade * (280.0 / -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
        fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float soft = 1.0 - smoothstep(0.1, 0.5, d);
        gl_FragColor = vec4(0.294, 0.180, 1.0, soft * vAlpha); // Mystery #4B2EFF
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const tendrilMat = useMemo(
    () =>
      new THREE_ShaderMaterial({
        uniforms: { time: { value: 0 }, pointSize: { value: 0.32 } },
        vertexShader: `
      uniform float time;
      uniform float pointSize;
      attribute float seed;
      varying float vAlpha;
      varying float vGrad;
      void main() {
        float flow = fract(time * (0.18 + seed * 0.12) + seed * 5.0);
        float birth = smoothstep(0.0, 0.15, flow);
        float fade  = 1.0 - smoothstep(0.6, 1.0, flow);
        vAlpha = birth * fade * (0.55 + seed * 0.35);
        vGrad = seed;
        vec3 pos = position;
        pos.y += flow * 1.2;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = max(0.5, pointSize * (300.0 / -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
        fragmentShader: `
      varying float vAlpha;
      varying float vGrad;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float soft = 1.0 - smoothstep(0.15, 0.5, d);
        vec3 nearColor = vec3(0.710, 0.486, 1.0); // Mystery #B57CFF
        vec3 farColor  = vec3(0.294, 0.180, 1.0); // Mystery #4B2EFF
        vec3 col = mix(nearColor, farColor, vGrad);
        gl_FragColor = vec4(col, soft * vAlpha);
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const rootMat = useMemo(
    () =>
      new THREE_ShaderMaterial({
        uniforms: { time: { value: 0 }, pointSize: { value: 0.3 } },
        vertexShader: `
      uniform float time;
      uniform float pointSize;
      attribute float seed;
      varying float vAlpha;
      varying float vGrad;
      void main() {
        float arcU = fract(seed * 13.7);
        float flowSeed = floor(seed * 13.7) / 13.7;
        float flow = fract(time * (0.14 + flowSeed * 0.1) + flowSeed * 7.0);
        float birth = smoothstep(0.0, 0.12, flow);
        float fade  = 1.0 - smoothstep(0.65, 1.0, flow);
        vAlpha = birth * fade * (0.55 + flowSeed * 0.35);
        vGrad = arcU;
        vec3 pos = position;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = max(0.5, pointSize * (300.0 / -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
        fragmentShader: `
      varying float vAlpha;
      varying float vGrad;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float soft = 1.0 - smoothstep(0.1, 0.5, d);
        vec3 nearColor = vec3(0.541, 0.169, 0.886); // Mystery #8A2BE2
        vec3 farColor  = vec3(0.294, 0.180, 1.0);   // Mystery #4B2EFF
        vec3 col = mix(nearColor, farColor, vGrad);
        gl_FragColor = vec4(col, soft * vAlpha);
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const satelliteMat = useMemo(
    () =>
      new THREE_ShaderMaterial({
        uniforms: { time: { value: 0 }, pointSize: { value: 0.52 } },
        vertexShader: `
      uniform float time;
      uniform float pointSize;
      attribute float seed;
      varying float vAlpha;
      void main() {
        float pulse = sin(time * 1.1 + seed * 15.0) * 0.5 + 0.5;
        vAlpha = 0.55 + pulse * 0.45;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(0.3, pointSize * (1.0 + pulse * 0.5) * (280.0 / -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
        fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float soft = 1.0 - smoothstep(0.1, 0.5, d);
        gl_FragColor = vec4(0.710, 0.486, 1.0, soft * vAlpha); // Mystery #B57CFF
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (orbMat.uniforms) orbMat.uniforms.time.value = t;
    if (tendrilMat.uniforms) tendrilMat.uniforms.time.value = t;
    if (rootMat.uniforms) rootMat.uniforms.time.value = t;
  });

  return (
    <group>
      <group position={[0, ORB_Y, 0]}>
        <points ref={orbRef} geometry={orbGeom} material={orbMat} />
      </group>
      <points ref={tendrilRef} geometry={tendrilGeom} material={tendrilMat} />
      <points geometry={rootGeom} material={rootMat} />
    </group>
  );
}

const EXTERNAL_SERVICES = [
  {
    key: 'aws',
    patterns: ['aws-sdk', '@aws-sdk', 'amazonaws', 'aws-amplify', 'aws-cdk'],
    name: 'AWS',
    color: [1.0, 0.69, 0.0] as [number, number, number],
  }, // External #FFB000
  {
    key: 'gcp',
    patterns: ['@google-cloud', 'googleapis', 'firebase', 'firebase-admin'],
    name: 'Google',
    color: [0.224, 1.0, 0.078] as [number, number, number],
  }, // Deps    #39FF14
  {
    key: 'azure',
    patterns: ['@azure', '@microsoft', 'microsoft-graph'],
    name: 'Azure',
    color: [0.0, 0.961, 1.0] as [number, number, number],
  }, // Comm    #00F5FF
  {
    key: 'stripe',
    patterns: ['stripe'],
    name: 'Stripe',
    color: [0.71, 0.486, 1.0] as [number, number, number],
  }, // Mystery #B57CFF
  {
    key: 'twilio',
    patterns: ['twilio'],
    name: 'Twilio',
    color: [1.0, 0.176, 0.333] as [number, number, number],
  }, // Mystery #FF2D55
  {
    key: 'openai',
    patterns: ['openai', '@openai'],
    name: 'OpenAI',
    color: [0.0, 0.831, 0.776] as [number, number, number],
  }, // Storage #00D4C6
  {
    key: 'vercel',
    patterns: ['@vercel/'],
    name: 'Vercel',
    color: [0.918, 0.984, 1.0] as [number, number, number],
  }, // Infra   #EAFBFF
  {
    key: 'supabase',
    patterns: ['@supabase'],
    name: 'Supabase',
    color: [0.0, 1.0, 0.498] as [number, number, number],
  }, // Deps    #00FF7F
  {
    key: 'sendgrid',
    patterns: ['@sendgrid', 'sendgrid'],
    name: 'SendGrid',
    color: [1.0, 0.467, 1.0] as [number, number, number],
  }, // Comm    #FF77FF
  {
    key: 'pusher',
    patterns: ['pusher'],
    name: 'Pusher',
    color: [1.0, 0.31, 0.847] as [number, number, number],
  }, // Comm    #FF4FD8
];

function detectExternalServices(graph: ArchitectureGraph) {
  const allText = graph.nodes
    .map((n) => [n.label, n.path, n.id, ...(n.files || [])].join(' ').toLowerCase())
    .join(' ');
  return EXTERNAL_SERVICES.filter((svc) =>
    svc.patterns.some((p) => allText.includes(p.toLowerCase()))
  );
}

function ExternalSatellites({ graph }: { graph: ArchitectureGraph }) {
  const services = useMemo(() => detectExternalServices(graph), [graph]);

  if (services.length === 0) return null;

  return (
    <group>
      {services.map((svc, i) => (
        <ExternalSatellite key={svc.key} service={svc} index={i} total={services.length} />
      ))}
    </group>
  );
}

function ExternalSatellite({
  service,
  index,
  total,
}: {
  service: (typeof EXTERNAL_SERVICES)[0];
  index: number;
  total: number;
}) {
  const matRef = useRef<THREE_ShaderMaterial | null>(null);
  const tendrilMatRef = useRef<THREE_ShaderMaterial | null>(null);

  const angle = (index / total) * Math.PI * 2;
  const orbitR = 55 + (index % 3) * 18;
  const satY = 42 + (index % 2) * 14;
  const [r, g, b] = service.color;

  const { portalGeom, tendrilGeom } = useMemo(() => {
    const rng = seededRandom(index * 7 + 31);

    // Portal ring — double concentric rings + inner disc scatter
    const pts: number[] = [];
    const ringCount = 3;
    const ringRadii = [6.0, 4.4, 2.2];
    const ringDensity = [180, 120, 60];
    for (let ri = 0; ri < ringCount; ri++) {
      const rad = ringRadii[ri];
      const count = ringDensity[ri];
      for (let p = 0; p < count; p++) {
        const a = (p / count) * Math.PI * 2;
        const jitter = rng() * 0.25;
        pts.push(Math.cos(a) * (rad + jitter), (rng() - 0.5) * 0.3, Math.sin(a) * (rad + jitter));
      }
    }
    // Inner glow scatter
    for (let p = 0; p < 400; p++) {
      const a = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng()) * 5.0;
      pts.push(Math.cos(a) * rad, (rng() - 0.5) * 0.2, Math.sin(a) * rad);
    }
    const pGeom = new BufferGeometry();
    pGeom.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    const seeds = new Float32Array(pts.length / 3).map(() => rng());
    pGeom.setAttribute('seed', new BufferAttribute(seeds, 1));

    // Tether tendril from orb (y=-62) up to satellite
    const tPos: number[] = [];
    const tSeeds: number[] = [];
    const strands = 4;
    const steps = 64;
    const satWorldX = Math.cos(angle) * orbitR;
    const satWorldZ = Math.sin(angle) * orbitR;
    const ORB_Y = -62;
    for (let strand = 0; strand < strands; strand++) {
      const jx = (rng() - 0.5) * 3;
      const jz = (rng() - 0.5) * 3;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const om = 1 - u;
        const midX = satWorldX * 0.5 + jx;
        const midZ = satWorldZ * 0.5 + jz;
        const midY = ORB_Y * 0.3 + satY * 0.3;
        const px = om * om * 0 + 2 * om * u * midX + u * u * satWorldX;
        const py = om * om * ORB_Y + 2 * om * u * midY + u * u * satY;
        const pz = om * om * 0 + 2 * om * u * midZ + u * u * satWorldZ;
        tPos.push(px + (rng() - 0.5) * 0.3, py, pz + (rng() - 0.5) * 0.3);
        tSeeds.push(u);
      }
    }
    const tGeom = new BufferGeometry();
    tGeom.setAttribute('position', new BufferAttribute(new Float32Array(tPos), 3));
    tGeom.setAttribute('seed', new BufferAttribute(new Float32Array(tSeeds), 1));

    return { portalGeom: pGeom, tendrilGeom: tGeom };
  }, [angle, orbitR, satY, index]);

  const portalMat = useMemo(() => {
    const mat = new THREE_ShaderMaterial({
      uniforms: { time: { value: 0 }, pointSize: { value: 1.8 }, color: { value: [r, g, b] } },
      vertexShader: `
        uniform float time;
        uniform float pointSize;
        attribute float seed;
        varying float vAlpha;
        void main() {
          float pulse = sin(time * 1.8 + seed * 18.0) * 0.5 + 0.5;
          float spin = time * 0.35;
          vec3 pos = position;
          float ca = cos(spin + seed * 0.5), sa = sin(spin + seed * 0.5);
          pos.x = position.x * ca - position.z * sa;
          pos.z = position.x * sa + position.z * ca;
          vAlpha = 0.75 + pulse * 0.25;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = max(1.2, pointSize * (1.0 + pulse * 0.6) * (280.0 / -mvPos.z));
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.1, 0.5, d);
          gl_FragColor = vec4(color, soft * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    matRef.current = mat;
    return mat;
  }, [r, g, b]);

  const tetherMat = useMemo(() => {
    const mat = new THREE_ShaderMaterial({
      uniforms: { time: { value: 0 }, pointSize: { value: 0.55 }, color: { value: [r, g, b] } },
      vertexShader: `
        uniform float time;
        uniform float pointSize;
        attribute float seed;
        varying float vAlpha;
        varying float vU;
        void main() {
          float flow = fract(time * 0.22 + seed * 6.0);
          float birth = smoothstep(0.0, 0.12, flow);
          float fade  = 1.0 - smoothstep(0.7, 1.0, flow);
          vAlpha = birth * fade * (0.75 + seed * 0.25);
          vU = seed;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(0.8, pointSize * (300.0 / -mvPos.z));
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        varying float vU;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.1, 0.5, d);
          vec3 voidCol = vec3(0.08, 0.02, 0.42);
          vec3 col = mix(voidCol, color, vU);
          gl_FragColor = vec4(col, soft * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    tendrilMatRef.current = mat;
    return mat;
  }, [r, g, b]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (matRef.current?.uniforms) matRef.current.uniforms.time.value = t;
    if (tendrilMatRef.current?.uniforms) tendrilMatRef.current.uniforms.time.value = t;
  });

  const satX = Math.cos(angle) * orbitR;
  const satZ = Math.sin(angle) * orbitR;

  return (
    <group>
      <group position={[satX, satY, satZ]}>
        <points geometry={portalGeom} material={portalMat} />
      </group>
      <points geometry={tendrilGeom} material={tetherMat} />
    </group>
  );
}

function NavigationController({
  cityRadius,
  boundaryRadius,
  onBlackwallProximity,
}: {
  cityRadius: number;
  boundaryRadius: number;
  onBlackwallProximity: (value: number) => void;
}) {
  const { camera, gl } = useThree();
  const pressed = useRef<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const lastMouse = useRef<[number, number] | null>(null);
  const lastProximitySent = useRef(-1);
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const hardBoundary = Math.max(10, boundaryRadius - 1.5);

  const enforceBoundary = (position: Vector3) => {
    position.x = clamp(position.x, -hardBoundary, hardBoundary);
    position.z = clamp(position.z, -hardBoundary, hardBoundary);
    position.y = clamp(position.y, -110, 320);

    let radial = Math.hypot(position.x, position.z);
    if (radial > hardBoundary) {
      const s = hardBoundary / radial;
      position.x *= s;
      position.z *= s;
      radial = hardBoundary;
    }

    return radial;
  };

  useEffect(() => {
    camera.position.set(0, 0.85, cityRadius * 0.24);
    camera.rotation.order = 'YXZ';
  }, [camera, cityRadius]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      pressed.current.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressed.current.delete(event.key.toLowerCase());
    };

    const element = gl.domElement;

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }
      setDragging(true);
      lastMouse.current = [event.clientX, event.clientY];
    };

    const handleMouseUp = () => {
      setDragging(false);
      lastMouse.current = null;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragging || !lastMouse.current) {
        return;
      }

      const deltaX = event.clientX - lastMouse.current[0];
      const deltaY = event.clientY - lastMouse.current[1];
      lastMouse.current = [event.clientX, event.clientY];
      yaw.current -= deltaX * 0.004;
      pitch.current -= deltaY * 0.003;
      pitch.current = Math.max(-1.15, Math.min(1.15, pitch.current));
    };

    const handleWheel = (event: WheelEvent) => {
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      const nextPosition = camera.position
        .clone()
        .add(direction.multiplyScalar(event.deltaY * 0.045));
      nextPosition.y = Math.max(-90, Math.min(180, nextPosition.y));
      enforceBoundary(nextPosition);
      camera.position.copy(nextPosition);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [camera, dragging, gl.domElement]);

  useFrame((_, delta) => {
    camera.rotation.set(pitch.current, yaw.current, 0);

    const sprint = pressed.current.has('shift') ? 2.2 : 1.0;
    const moveSpeed = 25.5 * delta * sprint;
    camera.getWorldDirection(forward);
    forward.normalize();
    right.crossVectors(forward, new Vector3(0, 1, 0)).normalize();

    if (pressed.current.has('w')) camera.position.add(forward.clone().multiplyScalar(moveSpeed));
    if (pressed.current.has('s')) camera.position.add(forward.clone().multiplyScalar(-moveSpeed));
    if (pressed.current.has('a')) camera.position.add(right.clone().multiplyScalar(-moveSpeed));
    if (pressed.current.has('d')) camera.position.add(right.clone().multiplyScalar(moveSpeed));
    if (pressed.current.has('q')) camera.position.y = Math.max(-90, camera.position.y - moveSpeed);
    if (pressed.current.has('e')) camera.position.y = Math.min(260, camera.position.y + moveSpeed);

    // Hard boundary + limiter (single source of truth)
    const radial = enforceBoundary(camera.position);

    // Scanner starts at 70% of approach to boundary
    const radialNorm = radial / hardBoundary;
    const revealStartNorm = 0.7;
    const revealEndNorm = 1;
    const proximity = clamp(
      (radialNorm - revealStartNorm) / (revealEndNorm - revealStartNorm),
      0,
      1
    );
    if (Math.abs(proximity - lastProximitySent.current) >= 0.01) {
      lastProximitySent.current = proximity;
      onBlackwallProximity(proximity);
    }
  });

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerpAngle(from: number, to: number, t: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}
