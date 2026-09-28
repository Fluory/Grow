import type { Metadata, Viewport } from 'next';
import { Figtree, Instrument_Serif, JetBrains_Mono, Silkscreen } from 'next/font/google';
import { ViewTransition } from 'react';
import { SiteFooter, SiteHeader } from '@/features/chrome';
import { SceneRoot } from '@/features/scene';
import { getLatest, getStats, SITE, siteUrl } from '@/features/world-data';
import { SmoothScroll } from '@/shared/motion';
import './globals.css';

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' });
const silkscreen = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-silkscreen',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const latest = getLatest();
  const stats = getStats();
  return {
    metadataBase: siteUrl(),
    title: { default: `${SITE.name} – a garden that grows with the weather`, template: `%s · ${SITE.name}` },
    description: SITE.description,
    applicationName: SITE.name,
    authors: [{ name: 'Florian Hein', url: 'https://github.com/Fluory' }],
    keywords: [
      'L-system',
      'generative art',
      'weather',
      'Heilbronn',
      'GitHub',
      'Claude',
      'routine',
      'one commit a day',
      'open source',
      'garden',
    ],
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title: `${SITE.name} · Day ${latest.day}: ${latest.title}`,
      description: `${latest.lore} – ${stats.living} living plants, ${stats.rainTotal.toFixed(0)} mm of rain so far.`,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: '/' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e6f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1510' },
  ],
  colorScheme: 'light dark',
};

const THEME_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('grow-theme');var n=t?t==='night':window.matchMedia('(prefers-color-scheme: dark)').matches;d.dataset.theme=n?'night':'day';}catch(e){d.dataset.theme='day';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const latest = getLatest();
  return (
    <html
      lang="en"
      data-theme="day"
      className={`${instrument.variable} ${figtree.variable} ${silkscreen.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SceneRoot />
        <SmoothScroll>
          <SiteHeader day={latest.day} repo={SITE.repo} />
          <ViewTransition default="page">
            <main id="main" style={{ position: 'relative', zIndex: 1 }}>
              {children}
            </main>
          </ViewTransition>
          <SiteFooter day={latest.day} repo={SITE.repo} siblings={SITE.siblings} />
        </SmoothScroll>
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
