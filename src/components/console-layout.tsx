'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { ArchitectureGraph } from '@/types/architecture';
import { mockArchitectureGraph } from '@/lib/mock-graph';

const suggestedRepos = [
  'https://github.com/vercel/nextjs-subscription-payments',
  'https://github.com/vercel/platforms',
  'https://github.com/vercel/ai-chatbot',
];

interface ConsoleLayoutProps {
  repoUrl: string;
  setRepoUrl: (v: string) => void;
  isLoading: boolean;
  error: string | null;
  graph: ArchitectureGraph;
  handleAnalyze: (url?: string) => void;
  onJackIn: () => void;
}

export function ConsoleLayout({
  repoUrl,
  setRepoUrl,
  isLoading,
  error,
  graph,
  handleAnalyze,
  onJackIn,
}: ConsoleLayoutProps) {
  const [ip, setIp] = useState('detecting...');
  const [temp, setTemp] = useState(42.0);
  const [uptime, setUptime] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<{ type: 'in' | 'out'; text: string; color?: string }[]>([]);
  const [input, setInput] = useState('');

  // Detect public IP
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json())
      .then((d) => setIp(d.ip))
      .catch(() => setIp('127.0.0.1'));
  }, []);

  // Simulate temperature fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setTemp((t) => +(t + (Math.random() - 0.5) * 0.4).toFixed(1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Uptime counter
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Random system logs
  useEffect(() => {
    const templates = [
      () => `[LINK] Stability: ${(Math.random() * 0.4 + 0.6).toFixed(4)}`,
      () => `[LINK] Latency: ${Math.floor(Math.random() * 40 + 10)}ms`,
      () => `[MEM] Heap: ${(Math.random() * 64 + 128).toFixed(1)}MB`,
      () => `[CPU] Load: ${(Math.random() * 30 + 5).toFixed(1)}%`,
      () => `[NET] Packets: ${Math.floor(Math.random() * 9000 + 1000)}`,
      () =>
        `[SEC] Handshake: 0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
      () => `[SYS] Thread ${Math.floor(Math.random() * 16)} active`,
      () => `[DMA] Buffer: ${Math.floor(Math.random() * 256)}KB`,
      () => `[IRQ] Vector: 0x${Math.floor(Math.random() * 255).toString(16).padStart(2, '0')}`,
      () => `[CLK] Cycle: ${Math.floor(Math.random() * 999999999)}`,
      () => `[ICE] Bypass: ${Math.random() > 0.8 ? 'DETECTED' : 'CLEAR'}`,
      () => `[ROUTER] Hop: ${Math.floor(Math.random() * 12 + 1)}`,
    ];

    setLogs(templates.slice(0, 10).map((t) => t()));

    const interval = setInterval(() => {
      const template = templates[Math.floor(Math.random() * templates.length)];
      setLogs((prev) => {
        const next = [...prev, template()];
        if (next.length > 80) next.shift();
        return next;
      });
    }, 350);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs and terminal
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [history]);

  // Boot + help on mount
  useEffect(() => {
    const bootLines: { type: 'out'; text: string; color?: string }[] = [
      { type: 'out', text: '[BOOT] Netrunner OS v2.1.0 — kernel initialized', color: 'text-red-400/40' },
      { type: 'out', text: '[BOOT] Neural link handshake complete', color: 'text-red-400/40' },
      { type: 'out', text: '[BOOT] Architecture parser loaded', color: 'text-red-400/40' },
      { type: 'out', text: '[BOOT] Waiting for target repository...', color: 'text-red-400/40' },
      { type: 'out', text: '', color: '' },
      ...helpLines(),
      { type: 'out', text: '', color: '' },
      { type: 'out', text: 'Suggested targets:', color: 'text-slate-500' },
      ...suggestedRepos.map((s) => ({
        type: 'out' as const,
        text: `  ${s.replace('https://github.com/', '')}`,
        color: 'text-slate-400',
      })),
    ];
    setHistory(bootLines);
  }, []);

  // Append analysis results / errors to terminal history
  useEffect(() => {
    if (error) {
      pushOut(`[ERROR] ${error}`, 'text-rose-400');
    }
  }, [error]);
  useEffect(() => {
    if (!isLoading && graph !== mockArchitectureGraph) {
      pushOut(
        `[OK] Analysis complete — ${graph.stats.totalFiles} files, ${graph.stats.totalNodes} nodes, ${graph.stats.totalEdges} edges`,
        'text-green-400/70'
      );
      pushOut('[INFO] Type `jackin` or `netrn jackin` to enter cyberspace', 'text-amber-400/70');
    }
  }, [graph, isLoading]);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';
  const browser =
    typeof navigator !== 'undefined'
      ? navigator.userAgent.split(' ').pop()?.split('/')[0] ?? 'unknown'
      : 'unknown';
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  const height = typeof window !== 'undefined' ? window.innerHeight : 0;

  const formatUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  function pushOut(text: string, color = 'text-red-200/70') {
    setHistory((h) => [...h, { type: 'out', text, color }]);
  }

  function handleCommand(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory((h) => [...h, { type: 'in', text: trimmed }]);

    const parts = trimmed.split(/\s+/);
    const base = parts[0];

    if (base === 'netrn') {
      const sub = parts[1];
      if (!sub) {
        pushOut('Netrunner OS v2.1.0 — Project Netrunner CLI', 'text-amber-300/80');
        pushOut('', '');
        pushOut(
          'I really want to go to the moon. — Lucy Kushinada',
          'text-amber-300/60 italic'
        );
        pushOut(
          'Lucyna "Lucy" Kushinada is a netrunner from Night City, deuteragonist of',
          'text-red-300/60'
        );
        pushOut(
          'Cyberpunk: Edgerunners. Escaped an Arasaka netrunner team, mentored by Kiwi,',
          'text-red-300/60'
        );
        pushOut(
          'joined Maine\'s crew of edgerunners. David Martinez — the protagonist — fell for',
          'text-red-300/60'
        );
        pushOut(
          'her and became an edgerunner himself. The crew: Maine (leader), Dorio, Pilar,',
          'text-red-300/60'
        );
        pushOut(
          'Rebecca, Kiwi, Falco. By the end, Lucy is the sole surviving member.',
          'text-red-300/60'
        );
        pushOut('David became a Night City legend. She got her moon.', 'text-amber-300/60');
        return;
      }
      if (sub === 'whoami') {
        pushOut('user:           netrunner', 'text-red-200/70');
        pushOut(`ip:             ${ip}`, 'text-red-200/70');
        pushOut(`domain:         ${hostname}`, 'text-red-200/70');
        pushOut(`platform:       ${platform}`, 'text-red-200/70');
        pushOut(`browser:        ${browser}`, 'text-red-200/70');
        pushOut(`resolution:     ${width}x${height}`, 'text-red-200/70');
        pushOut(`temp:           ${temp}°C`, 'text-red-200/70');
        pushOut(`uptime:         ${formatUptime(uptime)}`, 'text-red-200/70');
        pushOut('link:           STABLE', 'text-green-400/70');
        pushOut('clearance:      OPERATIVE', 'text-amber-400/70');
        pushOut('neural-link:    ACTIVE', 'text-green-400/70');
        return;
      }
      if (sub === 'github') {
        pushOut('Opening Project Netrunner repository...', 'text-amber-400/70');
        if (typeof window !== 'undefined') {
          window.open('https://github.com/bhuvan-gs/project-netrunner', '_blank');
        }
        return;
      }
      if (sub === 'master') {
        pushOut('bhuvan-gs', 'text-amber-300/80');
        pushOut('Lead architect. Netrunner. Night City resident.', 'text-red-300/60');
        return;
      }
      if (sub === 'analyze') {
        const url = parts[2];
        if (!url) {
          pushOut('[ERROR] Usage: netrn analyze <github-url>', 'text-rose-400');
          return;
        }
        setRepoUrl(url);
        setTimeout(() => handleAnalyze(url), 0);
        return;
      }
      pushOut(`[ERROR] Unknown command: netrn ${sub}`, 'text-rose-400');
      pushOut("Type 'netrn' for available commands.", 'text-slate-500');
      return;
    }

    if (trimmed.startsWith('https://github.com/')) {
      setRepoUrl(trimmed);
      setTimeout(() => handleAnalyze(trimmed), 0);
      return;
    }

    if (trimmed === 'jackin' || trimmed === 'netrn jackin') {
      onJackIn();
      return;
    }

    if (trimmed === 'clear') {
      setHistory([]);
      return;
    }

    pushOut(`[ERROR] Command not found: ${base}`, 'text-rose-400');
    pushOut("Type 'netrn' for available commands.", 'text-slate-500');
  }

  return (
    <div className='relative z-10 flex h-full bg-[#000105] font-mono text-sm'>
      {/* Main terminal - 80% */}
      <div className='relative flex h-full w-[80%] flex-col'>
        {/* terminal header */}
        <div className='flex items-center gap-3 border-b border-red-500/20 bg-red-950/10 px-5 py-2.5'>
          <div className='flex gap-1.5'>
            <span className='h-2.5 w-2.5 rounded-full bg-red-500/70' />
            <span className='h-2.5 w-2.5 rounded-full bg-amber-500/70' />
            <span className='h-2.5 w-2.5 rounded-full bg-green-500/50' />
          </div>
          <span className='ml-2 text-[10px] uppercase tracking-[0.2em] text-red-400/50'>
            netrunner-console — bash — 80x24
          </span>
          <Link
            href='/'
            className='ml-auto text-[10px] text-slate-500 transition hover:text-red-300'
          >
            [exit]
          </Link>
          <span className='text-[10px] text-red-400/40'>
            {isLoading ? 'PROCESSING...' : 'IDLE'}
          </span>
        </div>

        {/* terminal body */}
        <div
          ref={termRef}
          className='flex flex-1 flex-col gap-1 overflow-y-auto p-6 text-red-300/80'
        >
          {/* command history */}
          {history.map((entry, i) =>
            entry.type === 'in' ? (
              <div key={i} className='flex items-center gap-2'>
                <span className='text-amber-400/80'>netrunner</span>
                <span className='text-slate-600'>@</span>
                <span className='text-red-400/60'>console</span>
                <span className='text-slate-600'>:</span>
                <span className='text-red-400/40'>~</span>
                <span className='text-slate-600'>$</span>
                <span className='ml-1 text-red-100'>{entry.text}</span>
              </div>
            ) : (
              <div key={i} className={`whitespace-pre-wrap text-xs ${entry.color || 'text-red-200/70'}`}>
                {entry.text}
              </div>
            )
          )}

          {/* loading indicator */}
          {isLoading && (
            <>
              <div className='text-xs text-amber-400/70'>[WORK] Cloning repository... parsing file tree...</div>
              <div className='mt-2 h-1 w-48 overflow-hidden rounded bg-red-900/30'>
                <div className='h-full w-1/2 animate-pulse bg-red-500/50' />
              </div>
            </>
          )}

          {/* prompt */}
          <form
            className='flex items-center gap-2'
            onSubmit={(e) => {
              e.preventDefault();
              handleCommand(input);
              setInput('');
            }}
          >
            <span className='text-amber-400/80'>netrunner</span>
            <span className='text-slate-600'>@</span>
            <span className='text-red-400/60'>console</span>
            <span className='text-slate-600'>:</span>
            <span className='text-red-400/40'>~</span>
            <span className='text-slate-600'>$</span>
            <input
              aria-label='Command input'
              className='ml-1 flex-1 bg-transparent text-sm text-red-100 outline-none placeholder:text-red-900/50'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type 'netrn' to begin"
              disabled={isLoading}
              autoFocus
            />
          </form>
        </div>

        {/* scanline overlay */}
        <div className='pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.15)_2px,rgba(0,0,0,0.15)_4px)]' />
      </div>

      {/* Sidebar - 20% */}
      <div className='flex h-full w-[20%] flex-col border-l border-red-500/20 bg-[#05080e]'>
        {/* Top: System Stats */}
        <div className='flex flex-col gap-2 overflow-y-auto border-b border-red-500/10 p-3'>
          <div className='border-b border-red-500/10 pb-1 text-[11px] font-bold uppercase tracking-wider text-red-200/80'>
            System Stats
          </div>
          <StatRow label='IP ADDR' value={ip} />
          <StatRow label='DOMAIN' value={hostname} />
          <StatRow label='PLATFORM' value={platform} />
          <StatRow label='BROWSER' value={browser} />
          <StatRow label='RESOLUTION' value={`${width}x${height}`} />
          <StatRow label='TEMP' value={`${temp}°C`} />
          <StatRow label='UPTIME' value={formatUptime(uptime)} />
          <StatRow label='LINK' value='STABLE' />
          <StatRow label='LATENCY' value={`${Math.floor(Math.random() * 30 + 10)}ms`} />
        </div>

        {/* Bottom: Random Logs */}
        <div className='flex flex-1 flex-col overflow-hidden'>
          <div className='border-b border-red-500/10 p-2 text-[11px] font-bold uppercase tracking-wider text-red-200/80'>
            System Logs
          </div>
          <div
            ref={logRef}
            className='flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-relaxed text-red-400/50'
          >
            {logs.map((log, i) => (
              <div key={i} className='mb-0.5'>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='flex items-center justify-between text-[10px]'>
      <span className='text-red-400/40'>{label}</span>
      <span className='text-red-200/70'>{value}</span>
    </div>
  );
}

function helpLines(): { type: 'out'; text: string; color: string }[] {
  return [
    { type: 'out', text: '╔══════════════════════════════════════════╗', color: 'text-red-500/30' },
    { type: 'out', text: '║         NETRN COMMAND REFERENCE          ║', color: 'text-red-500/30' },
    { type: 'out', text: '╚══════════════════════════════════════════╝', color: 'text-red-500/30' },
    { type: 'out', text: '', color: '' },
    { type: 'out', text: '  netrn                 Show help + lore easter egg', color: 'text-red-200/70' },
    { type: 'out', text: '  netrn help            Show this reference', color: 'text-red-200/70' },
    { type: 'out', text: '  netrn whoami          Display current user stats', color: 'text-red-200/70' },
    { type: 'out', text: '  netrn github          Open Project Netrunner repo', color: 'text-red-200/70' },
    { type: 'out', text: '  netrn master          Show master architect', color: 'text-red-200/70' },
    { type: 'out', text: '  netrn analyze <url>   Analyze a GitHub repository', color: 'text-red-200/70' },
    { type: 'out', text: '  jackin                Enter cyberspace', color: 'text-red-200/70' },
    { type: 'out', text: '  clear                 Clear terminal', color: 'text-red-200/70' },
    { type: 'out', text: '  <github-url>          Direct analyze shortcut', color: 'text-red-200/70' },
  ];
}
