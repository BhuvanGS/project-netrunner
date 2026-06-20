'use client';

import { useEffect, useRef, useState } from 'react';
import { CityScene } from '@/components/city-scene';
import { InspectionPanel } from '@/components/inspection-panel';
import { ConsoleLayout } from '@/components/console-layout';
import { mockArchitectureGraph } from '@/lib/mock-graph';
import type { ArchitectureGraph, ArchitectureNode } from '@/types/architecture';

export function NetrunnerConsole() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/vercel/nextjs-subscription-payments');
  const [graph, setGraph] = useState<ArchitectureGraph>(mockArchitectureGraph);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(
    mockArchitectureGraph.nodes[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'console' | 'boot' | 'cyberspace'>('console');
  const [emergePhase, setEmergePhase] = useState(0);
  const [bootFading, setBootFading] = useState(false);
  const [glitchPhase, setGlitchPhase] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [cyberspaceRunId, setCyberspaceRunId] = useState(0);
  const emergeRaf = useRef<number | null>(null);
  const bootGlitchTimer = useRef<number | null>(null);
  const bootFadeTimer = useRef<number | null>(null);
  const bootToCyberspaceTimer = useRef<number | null>(null);

  const clearBootTimers = () => {
    if (emergeRaf.current) {
      cancelAnimationFrame(emergeRaf.current);
      emergeRaf.current = null;
    }
    if (bootGlitchTimer.current !== null) {
      window.clearTimeout(bootGlitchTimer.current);
      bootGlitchTimer.current = null;
    }
    if (bootFadeTimer.current !== null) {
      window.clearTimeout(bootFadeTimer.current);
      bootFadeTimer.current = null;
    }
    if (bootToCyberspaceTimer.current !== null) {
      window.clearTimeout(bootToCyberspaceTimer.current);
      bootToCyberspaceTimer.current = null;
    }
  };

  const startBoot = () => {
    clearBootTimers();
    setShowWarning(false);
    setViewMode('boot');
    setEmergePhase(0);
    setBootFading(false);
    setGlitchPhase(false);

    // After boot text streams, trigger massive glitch flash then crossfade
    bootGlitchTimer.current = window.setTimeout(() => {
      setGlitchPhase(true);
      bootFadeTimer.current = window.setTimeout(() => {
        setGlitchPhase(false);
        setBootFading(true);
        let start: number | null = null;
        const duration = 12000;
        const tick = (now: number) => {
          if (start === null) start = now;
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setEmergePhase(ease);
          if (t < 1) {
            emergeRaf.current = requestAnimationFrame(tick);
          }
        };
        emergeRaf.current = requestAnimationFrame(tick);
      }, 500);
    }, 3500);

    // After boot fade completes, remove overlay
    bootToCyberspaceTimer.current = window.setTimeout(() => {
      setViewMode('cyberspace');
    }, 6700);
  };

  const handleBlackwallDeath = () => {
    setCyberspaceRunId((v) => v + 1);
    setSelectedNode(graph.nodes[0] ?? null);
    startBoot();
  };

  useEffect(() => {
    return () => {
      clearBootTimers();
    };
  }, []);

  async function handleAnalyze(url?: string) {
    setIsLoading(true);
    setError(null);
    const targetUrl = url || repoUrl;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: targetUrl }),
      });

      const data = (await response.json()) as ArchitectureGraph | { error: string };

      if (!response.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'Failed to analyze repository.');
      }

      setGraph(data);
      setSelectedNode(data.nodes[0] ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unexpected failure during analysis.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  const isConsole = viewMode === 'console';
  const isBoot = viewMode === 'boot';

  return (
    <main className='relative h-full overflow-hidden'>
      <div className='absolute inset-0 grid-backdrop opacity-40' />
      {isConsole && (
        <ConsoleLayout
          repoUrl={repoUrl}
          setRepoUrl={setRepoUrl}
          isLoading={isLoading}
          error={error}
          graph={graph}
          handleAnalyze={handleAnalyze}
          onJackIn={() => setShowWarning(true)}
        />
      )}

      {isBoot && <CyberBootSequence fading={bootFading} glitch={glitchPhase} />}

      {(viewMode === 'boot' || viewMode === 'cyberspace') && (
        <CityScene
          key={`cyberspace-run-${cyberspaceRunId}`}
          graph={graph}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          emergePhase={emergePhase}
          isFullScreen
          onBlackwallDeath={handleBlackwallDeath}
        />
      )}

      {showWarning && (
        <div className='warning-overlay'>
          <div className='warning-panel'>
            <h2 className='warning-title'>NEURAL LINK WARNING</h2>
            <p className='warning-body'>
              Cyberspace infiltration protocols activated. High-frequency datastreams,
              rapid chromatic inversion, and stroboscopic blackwall fragments will
              flood the neural interface. These visual assaults may trigger optical
              seizures in individuals with photosensitive epilepsy.
            </p>
            <p className='warning-body mt-2'>
              If your cortex is compromised, abort now. Otherwise — jack in at your own risk.
            </p>
            <div className='mt-5 flex gap-3'>
              <button className='warning-confirm' onClick={startBoot}>
                Accept Risk — Jack In
              </button>
              <button className='warning-cancel' onClick={() => setShowWarning(false)}>
                Abort
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function BootColumn({
  lines,
  className,
  delay = 0,
  speed = 15,
}: {
  lines: string[];
  className: string;
  delay?: number;
  speed?: number;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        if (cancelled) return;
        count++;
        setVisibleCount(count);
        if (count >= lines.length) clearInterval(interval);
      }, speed);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lines.length, delay, speed]);

  return (
    <div className={className}>
      {lines.slice(0, visibleCount).map((line, i) => (
        <div key={i} className='boot-col-line'>
          {line}
        </div>
      ))}
    </div>
  );
}

// Deterministic content (SSR-safe)
const COL1_CODES = (() => {
  const vals: string[] = [];
  const prefixes = ['0V', '2V', 'HS', 'NX', 'CY', 'BW', 'NR', 'DL', 'SR', 'ZK'];
  for (let i = 0; i < 120; i++) {
    const p = prefixes[i % prefixes.length];
    const n = (i * 2341 + 891) % 9999;
    vals.push(`${p}${String(n).padStart(2, '0')}`);
  }
  return vals;
})();

const COL2_LOGS = (() => {
  const lines: string[] = [];
  lines.push(
    'SYSTEM DIAGNOSTIC REPORT',
    '======================',
    '',
    'Subject: Neural Link Interface',
    'Status: ACTIVE',
    'Integrity: 94.7%',
    '',
    'Neural pathways mapping...',
    'Synaptic bridge established.',
    'Cortical stack reading: OK',
    'Motor cortex: synchronized',
    'Visual cortex: calibrated',
    '',
    'ICE layer analysis:',
    '  Layer 1: bypassed',
    '  Layer 2: bypassed',
    '  Layer 3: ANOMALY DETECTED',
    '  Layer 4: bypassed',
    '  Layer 5: awaiting...',
    '',
    'Memory allocation:',
    '  Short-term: 2.4GB / 4GB',
    '  Long-term: 18.7GB / 32GB',
    '  Cache: 97% fragmented',
    '',
    'Data stream status:',
    '  Inbound: 847 Mbps',
    '  Outbound: 12 Mbps',
    '  Latency: 3.2ms',
    '',
    'Blackwall handshake...',
    '  AUTH_KEY: 0x7F3A2B9C',
    '  SESSION_ID: NX-44021',
    '  STATUS: UNSTABLE',
    '',
    'WARNING: cortical interface',
    'showing signs of strain.',
    'Recommend reducing baud',
    'rate by 15%.',
    '',
    'Proceeding with cyberspace',
    'entry sequence...'
  );
  return lines;
})();

const COL3_HEX = (() => {
  const lines: string[] = [];
  for (let i = 0; i < 60; i++) {
    const addr = (0x7ff3a000 + i * 32).toString(16).toUpperCase();
    let bytes = '';
    for (let j = 0; j < 8; j++) {
      const b = ((i * 97 + j * 43) % 256).toString(16).toUpperCase().padStart(2, '0');
      bytes += b + ' ';
    }
    lines.push(`0x${addr}  ${bytes}`);
  }
  return lines;
})();

const COL4_DATA = (() => {
  const lines: string[] = [];
  lines.push(
    'NETRUNNER PROTOCOL v2.1',
    '-----------------------',
    '',
    'Repository scan results:',
    '  Files: 14,208',
    '  Modules: 2,341',
    '  Functions: 8,774',
    '  Classes: 1,221',
    '',
    'Dependency graph:',
    '  Nodes: 87,532',
    '  Edges: 182,134',
    '  Depth: 47 levels',
    '',
    'Complexity analysis:',
    '  Average: 23.4',
    '  Peak: 87.3',
    '  Module: auth.service',
    '',
    'Architecture layers:',
    '  Presentation: 12%',
    '  Business: 34%',
    '  Data: 28%',
    '  Infrastructure: 26%',
    '',
    'Security posture:',
    '  Vulnerabilities: 3',
    '  Critical: 0',
    '  High: 1',
    '  Medium: 2',
    '',
    'Cyberspace geometry:',
    '  Buildings: 144',
    '  Vertices: 12.4M',
    '  Triangles: 8.7M',
    '',
    'Rendering pipeline:',
    '  Bloom: enabled',
    '  Fog: enabled',
    '  SSAO: disabled',
    '  VSync: off',
    '',
    'Routing table:',
    '  Gateway: 192.168.1.1',
    '  Subnet: 255.255.255.0',
    '  DNS: 8.8.8.8',
    '  Hop count: 12',
    '',
    'Encryption keys:',
    '  AES-256: 0x9F3A...B2C1',
    '  RSA-4096: 0x7E2D...A4F9',
    '  ECDH: generated',
    '',
    'Process table:',
    '  PID 001: neural-link [RUN]',
    '  PID 002: ice-bypass [RUN]',
    '  PID 003: packet-filter [RUN]',
    '  PID 004: geom-stream [RUN]',
    '  PID 005: render-loop [RUN]',
    '',
    'Thermal status:',
    '  CPU: 67.3C',
    '  GPU: 54.1C',
    '  Stack: 42.8C',
    '',
    'Sync status: 99.4%',
    'Buffer health: STABLE',
    '',
    'Status: READY'
  );
  return lines;
})();

const COL5_STATUS = (() => {
  const lines: string[] = [];
  const codes = [
    '28B',
    '54A55',
    '0V2',
    '1881D',
    '2V1416',
    'HS10',
    'NX44',
    'BW07',
    'DL99',
    'SR12',
    'ZK01',
    'CY78',
    'NR99',
    '0V3',
    '2V15',
    'HS11',
    'NX45',
    'BW08',
    'DL00',
    'SR13',
    'ZK02',
    'CY79',
    'NR00',
    '0V4',
    '2V16',
    'HS12',
    'NX46',
    'BW09',
    'DL01',
    'SR14',
  ];
  for (let i = 0; i < 100; i++) {
    lines.push(codes[i % codes.length]);
  }
  return lines;
})();

const BANNER = '  NETRUNNER SYSTEM INTERFACE  v3.7.2  ';
const TERMINAL_HEADER = '[KERNEL::LOGGER] /dev/neural-link :: SESSION_BOOT';
const TERMINAL_PROMPT = 'root@nightcity:/opt/netrunner# ./jack-in --trace --unsafe-blackwall';

function CyberBootSequence({ fading, glitch }: { fading?: boolean; glitch?: boolean }) {
  const [showBanner, setShowBanner] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowBanner(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`cyber-boot-overlay ${fading ? 'boot-fading' : ''} ${glitch ? 'boot-glitch' : ''}`}>
      {showBanner && (
        <div className='boot-banner'>
          <span className='boot-banner-text'>{BANNER}</span>
        </div>
      )}

      <div className='boot-terminal-shell'>
        <div className='boot-terminal-header'>
          <span className='boot-terminal-dot boot-terminal-dot-red' />
          <span className='boot-terminal-dot boot-terminal-dot-amber' />
          <span className='boot-terminal-dot boot-terminal-dot-cyan' />
          <span className='boot-terminal-title'>{TERMINAL_HEADER}</span>
        </div>
        <div className='boot-terminal-prompt'>
          {TERMINAL_PROMPT}
          <span className='boot-cursor' aria-hidden='true'>
            █
          </span>
        </div>
      </div>

      <BootColumn lines={COL1_CODES} className='boot-col boot-col-1' delay={0} speed={35} />
      <BootColumn lines={COL2_LOGS} className='boot-col boot-col-2' delay={80} speed={22} />
      <BootColumn lines={COL3_HEX} className='boot-col boot-col-3' delay={150} speed={6} />
      <BootColumn lines={COL4_DATA} className='boot-col boot-col-4' delay={100} speed={40} />
      <BootColumn lines={COL5_STATUS} className='boot-col boot-col-5' delay={50} speed={14} />
    </div>
  );
}
