'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

// ── Glitch Logo ───────────────────────────────────────────────────────────────
function GlitchLogo() {
  return (
    <div className='glitch-logo-wrap relative mx-auto w-full max-w-5xl select-none'>
      {/* Cyan ghost */}
      <Image
        src='/netrunner-logo.png'
        alt=''
        width={1024}
        height={320}
        priority
        aria-hidden='true'
        className='glitch-layer-cyan pointer-events-none absolute inset-0 w-full object-contain'
        style={{ filter: 'invert(1) sepia(1) saturate(8) hue-rotate(150deg)', opacity: 0.35 }}
      />
      {/* Magenta ghost */}
      <Image
        src='/netrunner-logo.png'
        alt=''
        width={1024}
        height={320}
        priority
        aria-hidden='true'
        className='glitch-layer-magenta pointer-events-none absolute inset-0 w-full object-contain'
        style={{ filter: 'invert(1) sepia(1) saturate(8) hue-rotate(290deg)', opacity: 0.35 }}
      />
      {/* Main transparent logo — blackwall shows through */}
      <Image
        src='/netrunner-logo.png'
        alt='Netrunner'
        width={1024}
        height={320}
        priority
        className='glitch-layer-main relative w-full object-contain'
        style={{
          filter: 'invert(1)',
          opacity: 0.25,
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}

// ── Blackwall animated background canvas ─────────────────────────────────────
function BlackwallBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const STRAND_COUNT = 140;
    const strands = Array.from({ length: STRAND_COUNT }, (_, i) => ({
      x: (i / STRAND_COUNT) * canvas.width + (Math.random() - 0.5) * 60,
      speed: 0.18 + Math.random() * 0.32,
      height: 0.3 + Math.random() * 0.7,
      alpha: 0.08 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      flicker: Math.random() < 0.12,
    }));

    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep void base
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, 'rgba(0,1,5,1)');
      bg.addColorStop(0.55, 'rgba(3,0,6,1)');
      bg.addColorStop(0.82, 'rgba(12,1,2,1)');
      bg.addColorStop(1, 'rgba(28,2,3,1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Horizon crimson glow
      const hg = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height,
        0,
        canvas.width * 0.5,
        canvas.height,
        canvas.width * 0.85
      );
      hg.addColorStop(0, 'rgba(140,4,8,0.55)');
      hg.addColorStop(0.38, 'rgba(80,2,4,0.28)');
      hg.addColorStop(0.7, 'rgba(30,1,2,0.10)');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Vertical data strands
      for (const s of strands) {
        const flick = s.flicker ? (Math.sin(t * 14 + s.phase) > 0.3 ? 1 : 0.1) : 1;
        const pulse = 0.7 + 0.3 * Math.sin(t * s.speed * 3 + s.phase);
        const alpha = s.alpha * flick * pulse;
        const strandH = canvas.height * s.height;
        const y0 = canvas.height - strandH;

        const grad = ctx.createLinearGradient(s.x, y0, s.x, canvas.height);
        grad.addColorStop(0, `rgba(180,6,10,0)`);
        grad.addColorStop(0.3, `rgba(200,8,12,${alpha * 0.4})`);
        grad.addColorStop(0.7, `rgba(220,10,14,${alpha})`);
        grad.addColorStop(1, `rgba(255,20,20,${alpha * 1.3})`);

        ctx.beginPath();
        ctx.moveTo(s.x, y0);
        ctx.lineTo(s.x, canvas.height);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8 + Math.random() * 0.4;
        ctx.stroke();
      }

      // Lightning vein — occasional bright arc
      if (Math.sin(t * 0.7) > 0.88) {
        const lx = Math.random() * canvas.width;
        ctx.beginPath();
        ctx.moveTo(lx, canvas.height);
        let ly = canvas.height;
        for (let seg = 0; seg < 12; seg++) {
          lx + (Math.random() - 0.5) * 30;
          ly -= canvas.height * 0.07;
          ctx.lineTo(lx + (Math.random() - 0.5) * 18, ly);
        }
        ctx.strokeStyle = `rgba(255,60,60,${0.3 + Math.random() * 0.5})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Scanline overlay
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, y, canvas.width, 1);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className='absolute inset-0 h-full w-full' aria-hidden='true' />;
}

// ── Scroll reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  body,
  accent,
  delay,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  accent: string;
  delay: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: delay }}
      className={`panel p-6 transition-all duration-700 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
    >
      <div
        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${accent}`}
      >
        {icon}
      </div>
      <h3 className='mb-2 text-base font-semibold text-white'>{title}</h3>
      <p className='text-sm leading-relaxed text-slate-400'>{body}</p>
    </div>
  );
}

// ── Step ─────────────────────────────────────────────────────────────────────
function Step({
  n,
  title,
  body,
  delay,
}: {
  n: string;
  title: string;
  body: string;
  delay: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: delay }}
      className={`flex gap-5 transition-all duration-700 ${visible ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'}`}
    >
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-sm font-bold text-red-300'>
        {n}
      </div>
      <div>
        <h4 className='mb-1 font-semibold text-white'>{title}</h4>
        <p className='text-sm leading-relaxed text-slate-400'>{body}</p>
      </div>
    </div>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className='relative bg-[#000105]'>
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden'>
        <BlackwallBackground />

        {/* top nav */}
        <nav className='absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-5 lg:px-12'>
          <div className='flex items-center gap-3'>
            <div className='h-5 w-5'>
              <svg viewBox='0 0 24 24' fill='none' className='h-full w-full'>
                <path
                  d='M12 2L2 7l10 5 10-5-10-5z'
                  stroke='#00E7FF'
                  strokeWidth='1.5'
                  strokeLinejoin='round'
                />
                <path
                  d='M2 17l10 5 10-5'
                  stroke='#00E7FF'
                  strokeWidth='1.5'
                  strokeLinejoin='round'
                  strokeOpacity='0.55'
                />
                <path
                  d='M2 12l10 5 10-5'
                  stroke='#00E7FF'
                  strokeWidth='1.5'
                  strokeLinejoin='round'
                  strokeOpacity='0.28'
                />
              </svg>
            </div>
            <span className='font-sans text-xs font-semibold tracking-[0.28em] text-white/80'>
              PROJECT NETRUNNER
            </span>
          </div>
          <Link href='/generate' className='secondary-button text-xs'>
            Access Cyber Console
          </Link>
        </nav>

        {/* hero content */}
        <div className='relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center'>
          {/* GLITCH LOGO */}
          <GlitchLogo />

          {/* CTA row */}
          <div className='mt-28 flex flex-wrap items-center justify-center gap-4'>
            <Link
              href='/generate'
              className='relative inline-flex h-14 min-w-[200px] items-center justify-center overflow-hidden rounded-2xl border border-amber-500/40 px-5 text-sm font-semibold text-amber-100 transition duration-200 hover:border-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300/50'
              style={{
                background: 'linear-gradient(135deg, rgba(255, 160, 40, 0.18), rgba(255, 100, 20, 0.08))',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 24px rgba(255, 140, 30, 0.14)',
              }}
            >
              Access Cyber Console
            </Link>
            <a
              href='https://github.com'
              target='_blank'
              rel='noopener noreferrer'
              className='secondary-button text-sm'
            >
              View on GitHub
            </a>
          </div>

          {/* stat strip */}
          <div className='mt-14 flex flex-wrap items-center justify-center gap-8 border-t border-white/5 pt-10'>
            {(
              [
                ['Any JS/TS Repo', 'Supported'],
                ['First-Person', 'Navigation'],
                ['Live Architecture', 'Graph'],
              ] as [string, string][]
            ).map(([label, sub]) => (
              <div key={label} className='min-w-[100px] text-center'>
                <p className='font-sans text-sm font-bold text-white'>{label}</p>
                <p className='mt-0.5 text-[11px] uppercase tracking-widest text-slate-500'>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* scroll hint */}
        <div className='absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-slate-600'>
          <span className='text-[9px] uppercase tracking-[0.35em]'>Scroll</span>
          <div className='h-8 w-px animate-pulse bg-gradient-to-b from-slate-600 to-transparent' />
        </div>

        {/* bottom fade */}
        <div className='absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#000105] to-transparent' />
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className='relative bg-[#000105] py-24'>
        {/* crimson backdrop */}
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-red-950/10 via-red-950/5 to-transparent' />
        <div className='pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-red-900/15 to-transparent' />
        <div
          className='pointer-events-none absolute inset-0 opacity-10'
          style={{
            backgroundImage:
              'linear-gradient(rgba(220, 30, 30, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 30, 30, 0.12) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
        <div className='relative mx-auto max-w-6xl px-6 lg:px-12'>
          <div className='mb-14 text-center'>
            <p className='hud-title mb-3'>Capabilities</p>
            <h2 className='font-sans text-3xl font-bold text-white md:text-4xl'>
              Architecture as a Living City
            </h2>
          </div>

          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <FeatureCard
              delay='0ms'
              accent='border-red-400/25 bg-red-400/10 text-red-300'
              icon={
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z'
                  />
                </svg>
              }
              title='3D City Rendering'
              body='Every module becomes a building. Particle shaders, adaptive terrain, and volumetric fog create an immersive architectural landscape.'
            />
            <FeatureCard
              delay='80ms'
              accent='border-magenta-400/25 bg-pink-500/10 text-pink-300'
              icon={
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6'
                  />
                </svg>
              }
              title='Architecture Analysis'
              body='Detects routes, auth, middleware, services, APIs, databases, agents and dependencies — automatically, from any JS/TS repo.'
            />
            <FeatureCard
              delay='160ms'
              accent='border-lime-400/25 bg-lime-500/10 text-lime-300'
              icon={
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z'
                  />
                </svg>
              }
              title='External Services'
              body='Stripe, OpenAI, Supabase, AWS, Firebase and more rendered as orbital satellite portals above the city.'
            />
            <FeatureCard
              delay='240ms'
              accent='border-amber-400/25 bg-amber-500/10 text-amber-300'
              icon={
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z'
                  />
                </svg>
              }
              title='First-Person Navigation'
              body='WASD + mouse look. Hold Shift to sprint. Free-fly camera with full 6-degrees-of-freedom across the entire cyberspace.'
            />
            <FeatureCard
              delay='320ms'
              accent='border-violet-400/25 bg-violet-500/10 text-violet-300'
              icon={
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18'
                  />
                </svg>
              }
              title='Neural Link'
              body='Real-time dependency graph with weighted edge analysis. See how every module, service, and route connects across the entire architecture.'
            />
            <FeatureCard
              delay='400ms'
              accent='border-red-400/25 bg-red-500/10 text-red-300'
              icon={
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5'
                  />
                </svg>
              }
              title='Any JS/TS Repo'
              body='Not just Next.js. React, Express, NestJS, monorepos — if it has TypeScript or JavaScript, Netrunner can map it.'
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className='relative overflow-hidden bg-[#000105] py-24'>
        {/* crimson horizon tint */}
        <div className='pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-red-950/20 to-transparent' />

        <div className='relative mx-auto max-w-4xl px-6 lg:px-12'>
          <div className='mb-14 text-center'>
            <p className='hud-title mb-3'>Protocol</p>
            <h2 className='font-sans text-3xl font-bold text-white md:text-4xl'>
              Three Steps to Infiltration
            </h2>
          </div>

          <div className='space-y-10'>
            <Step
              n='01'
              delay='0ms'
              title='Provide a GitHub URL'
              body='Paste any public JavaScript or TypeScript repository URL. Netrunner clones it server-side — no token required.'
            />
            <Step
              n='02'
              delay='100ms'
              title='System Analysis'
              body='The analyzer walks the file tree, classifies every module by architectural role, and constructs a weighted dependency graph.'
            />
            <Step
              n='03'
              delay='200ms'
              title='Enter the Grid'
              body='The graph is projected into a 3D Cyberspace. Navigate in first-person. Inspect any building. Explore the architecture.'
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className='relative overflow-hidden py-24'>
        <div className='pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-amber-950/10 to-transparent' />
        <div className='relative mx-auto max-w-3xl px-6'>
          <div className='panel p-10 text-center md:p-14'>
            {/* corner brackets */}
            <div className='pointer-events-none absolute left-3 top-3 h-6 w-6 border-l border-t border-amber-500/30' />
            <div className='pointer-events-none absolute right-3 top-3 h-6 w-6 border-r border-t border-amber-500/30' />
            <div className='pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b border-l border-amber-500/30' />
            <div className='pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b border-r border-amber-500/30' />

            <p className='mb-3 text-[11px] uppercase tracking-[0.38em] text-amber-200/70'>Ready?</p>
            <h2 className='font-sans mb-4 text-3xl font-bold text-white md:text-4xl'>
              Enter the Grid
            </h2>
            <p className='mx-auto mb-8 max-w-md text-sm leading-relaxed text-slate-400'>
              Your architecture is waiting. Jack in and see your codebase as it was meant to be seen — a living, breathing system.
            </p>
            <Link
              href='/generate'
              className='relative inline-flex h-14 min-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-amber-500/40 px-6 text-sm font-semibold text-amber-100 transition duration-200 hover:border-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300/50'
              style={{
                background: 'linear-gradient(135deg, rgba(255, 160, 40, 0.18), rgba(255, 100, 20, 0.08))',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 24px rgba(255, 140, 30, 0.14)',
              }}
            >
              Access Cyber Console
            </Link>

            {/* tech badges */}
            <div className='mt-8 flex flex-wrap items-center justify-center gap-2'>
              {['React', 'Next.js', 'Express', 'NestJS', 'Monorepos'].map(t => (
                <span
                  key={t}
                  className='inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400'
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className='border-t border-white/5 py-8'>
        <div className='mx-auto flex max-w-6xl items-center justify-between px-6 lg:px-12'>
          <span className='font-sans text-xs tracking-widest text-slate-600'>
            PROJECT NETRUNNER
          </span>
          <span className='text-xs text-slate-700'>Architecture reimagined.</span>
        </div>
      </footer>
    </div>
  );
}
