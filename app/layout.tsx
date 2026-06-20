import type { Metadata } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { cn } from '@/lib/utils';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Project Netrunner',
  description: 'Transform GitHub repositories into navigable 3D cyberpunk cities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang='en' className={cn('font-sans', inter.variable)}>
      <body
        className={`${inter.variable} ${orbitron.variable} bg-abyss text-slate-100 antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
