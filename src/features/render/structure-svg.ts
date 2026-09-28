import type { StructureType } from '@/features/garden';
import { ellipse, mix } from './plant-svg';

/**
 * Small vector illustrations of everything the gardener builds. Each is drawn around a
 * base point on the ground; `u` is one garden unit in pixels at that depth.
 */

export interface StructureView {
  x: number;
  y: number;
  u: number;
  haze?: { color: string; amount: number };
  /** Channel structures: y of the water surface (or the bed when dry). */
  waterY?: number;
  /** Birdhouse: the height of its tree in units. */
  treeHeight?: number;
  animated?: boolean;
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

export function structureSvg(type: StructureType, v: StructureView): string {
  const c = (color: string) => (v.haze ? mix(color, v.haze.color, v.haze.amount) : color);
  const { x, y, u } = v;
  const rect = (rx: number, ry: number, w: number, h: number, fill: string, r = 0) =>
    `<rect x="${f(rx)}" y="${f(ry)}" width="${f(w)}" height="${f(h)}"${r ? ` rx="${f(r)}"` : ''} fill="${c(fill)}"/>`;
  switch (type) {
    case 'stone':
      return [
        `<path d="${ellipse(x, y - u * 0.18, u * 0.46, u * 0.28, 0)}" fill="${c('#9a9a8e')}"/>`,
        `<path d="M${f(x - u * 0.4)} ${f(y - u * 0.24)}Q${f(x)} ${f(y - u * 0.62)} ${f(x + u * 0.36)} ${f(y - u * 0.3)}Q${f(x)} ${f(y - u * 0.36)} ${f(x - u * 0.4)} ${f(y - u * 0.24)}Z" fill="${c('#6f9a4a')}"/>`,
      ].join('');
    case 'bench': {
      const w = u * 1.6;
      return [
        rect(x - w / 2 + u * 0.1, y - u * 0.55, u * 0.12, u * 0.55, '#5a4432'),
        rect(x + w / 2 - u * 0.22, y - u * 0.55, u * 0.12, u * 0.55, '#5a4432'),
        rect(x - w / 2, y - u * 0.62, w, u * 0.14, '#9c6b3f', 1),
        rect(x - w / 2 + u * 0.05, y - u * 1.1, w - u * 0.1, u * 0.12, '#9c6b3f', 1),
        rect(x - w / 2 + u * 0.05, y - u * 0.9, w - u * 0.1, u * 0.1, '#8a5e37', 1),
        rect(x - w / 2 + u * 0.1, y - u * 1.1, u * 0.1, u * 0.5, '#5a4432'),
        rect(x + w / 2 - u * 0.2, y - u * 1.1, u * 0.1, u * 0.5, '#5a4432'),
      ].join('');
    }
    case 'birdhouse': {
      const top = y - (v.treeHeight ?? 4) * u * 0.42;
      const w = u * 0.55;
      return [
        rect(x - w / 2, top, w, u * 0.62, '#c98a4b', 1),
        `<path d="M${f(x - w * 0.72)} ${f(top + 1)}L${f(x)} ${f(top - u * 0.42)}L${f(x + w * 0.72)} ${f(top + 1)}Z" fill="${c('#b5412f')}"/>`,
        `<circle cx="${f(x)}" cy="${f(top + u * 0.26)}" r="${f(u * 0.1)}" fill="${c('#3a2a1e')}"/>`,
        rect(x - u * 0.12, top + u * 0.42, u * 0.24, u * 0.05, '#6a4a34'),
      ].join('');
    }
    case 'beehive': {
      const w = u * 0.9;
      const bees = v.animated
        ? `<g class="bz">${[0, 1, 2].map((i) => `<circle cx="${f(x - u * 0.5 + i * u * 0.5)}" cy="${f(y - u * (1.5 + (i % 2) * 0.3))}" r="1.3" fill="#3a2a1e"/>`).join('')}</g>`
        : '';
      return [
        rect(x - w / 2, y - u * 0.35, w, u * 0.35, '#e8c77a', 1),
        rect(x - w / 2, y - u * 0.72, w, u * 0.35, '#f0d48c', 1),
        rect(x - w / 2, y - u * 1.08, w, u * 0.35, '#e8c77a', 1),
        `<path d="M${f(x - w * 0.62)} ${f(y - u * 1.06)}L${f(x)} ${f(y - u * 1.36)}L${f(x + w * 0.62)} ${f(y - u * 1.06)}Z" fill="${c('#7a5a3e')}"/>`,
        rect(x - u * 0.14, y - u * 0.14, u * 0.28, u * 0.08, '#3a2a1e'),
        bees,
      ].join('');
    }
    case 'lantern': {
      const glow = v.animated ? ' class="fl"' : '';
      return [
        rect(x - u * 0.05, y - u * 1.6, u * 0.1, u * 1.6, '#3b3a36'),
        rect(x - u * 0.2, y - u * 1.95, u * 0.4, u * 0.38, '#3b3a36', 1),
        `<circle${glow} cx="${f(x)}" cy="${f(y - u * 1.76)}" r="${f(u * 0.45)}" fill="#ffd36e" fill-opacity=".35"/>`,
        rect(x - u * 0.13, y - u * 1.9, u * 0.26, u * 0.26, '#ffd36e', 1),
      ].join('');
    }
    case 'shed': {
      const w = u * 2.8;
      const h = u * 1.9;
      return [
        rect(x - w / 2, y - h, w, h, '#9a7250'),
        ...[0.25, 0.5, 0.75].map((t) => rect(x - w / 2 + w * t, y - h, 1, h, '#7c5a3e')),
        `<path d="M${f(x - w * 0.6)} ${f(y - h + 2)}L${f(x)} ${f(y - h - u * 0.9)}L${f(x + w * 0.6)} ${f(y - h + 2)}Z" fill="${c('#5e6b52')}"/>`,
        rect(x - u * 0.35, y - u * 1.2, u * 0.7, u * 1.2, '#6a4a34', 1),
        rect(x + w * 0.22, y - h * 0.72, u * 0.5, u * 0.45, '#cfe6ef', 1),
        `<circle cx="${f(x + u * 0.22)}" cy="${f(y - u * 0.6)}" r="1.2" fill="${c('#e0c070')}"/>`,
      ].join('');
    }
    case 'barrel':
      return [
        rect(x - u * 0.36, y - u * 0.95, u * 0.72, u * 0.95, '#8a5e37', u * 0.14),
        rect(x - u * 0.38, y - u * 0.78, u * 0.76, u * 0.08, '#4a4a46'),
        rect(x - u * 0.38, y - u * 0.3, u * 0.76, u * 0.08, '#4a4a46'),
        `<path d="${ellipse(x, y - u * 0.95, u * 0.34, u * 0.08, 0)}" fill="${c('#5d9cc4')}"/>`,
      ].join('');
    case 'sundial':
      return [
        rect(x - u * 0.22, y - u * 0.9, u * 0.44, u * 0.9, '#cfc6b4', 1),
        `<path d="${ellipse(x, y - u * 0.92, u * 0.42, u * 0.12, 0)}" fill="${c('#b9ae98')}"/>`,
        `<path d="M${f(x - u * 0.05)} ${f(y - u * 0.95)}L${f(x + u * 0.22)} ${f(y - u * 1.25)}L${f(x + u * 0.25)} ${f(y - u * 0.95)}Z" fill="${c('#8a6a3e')}"/>`,
      ].join('');
    case 'scarecrow':
      return [
        rect(x - u * 0.06, y - u * 2.3, u * 0.12, u * 2.3, '#6a4a34'),
        rect(x - u * 0.8, y - u * 1.75, u * 1.6, u * 0.1, '#6a4a34'),
        `<path d="M${f(x - u * 0.55)} ${f(y - u * 1.8)}L${f(x + u * 0.55)} ${f(y - u * 1.8)}L${f(x + u * 0.38)} ${f(y - u * 0.9)}L${f(x - u * 0.38)} ${f(y - u * 0.9)}Z" fill="${c('#b5412f')}"/>`,
        `<circle cx="${f(x)}" cy="${f(y - u * 2.08)}" r="${f(u * 0.26)}" fill="${c('#e8c77a')}"/>`,
        `<path d="M${f(x - u * 0.5)} ${f(y - u * 2.22)}L${f(x + u * 0.5)} ${f(y - u * 2.22)}L${f(x + u * 0.22)} ${f(y - u * 2.62)}L${f(x - u * 0.22)} ${f(y - u * 2.62)}Z" fill="${c('#5a4432')}"/>`,
      ].join('');
    case 'snowman':
      return [
        `<circle cx="${f(x)}" cy="${f(y - u * 0.42)}" r="${f(u * 0.46)}" fill="#fbfdff"/>`,
        `<circle cx="${f(x)}" cy="${f(y - u * 1.08)}" r="${f(u * 0.34)}" fill="#fbfdff"/>`,
        `<circle cx="${f(x)}" cy="${f(y - u * 1.56)}" r="${f(u * 0.24)}" fill="#fbfdff"/>`,
        `<path d="M${f(x + u * 0.1)} ${f(y - u * 1.56)}l${f(u * 0.34)} ${f(u * 0.06)}l${f(-u * 0.34)} ${f(u * 0.06)}Z" fill="#ec8a2e"/>`,
        rect(x - u * 0.24, y - u * 1.9, u * 0.48, u * 0.1, '#2a2a2a'),
        rect(x - u * 0.16, y - u * 2.18, u * 0.32, u * 0.3, '#2a2a2a'),
        `<circle cx="${f(x)}" cy="${f(y - u * 1.02)}" r="1.2" fill="#2a2a2a"/><circle cx="${f(x)}" cy="${f(y - u * 0.82)}" r="1.2" fill="#2a2a2a"/>`,
      ].join('');
    case 'boat':
      return [
        `<path d="M${f(x - u * 0.55)} ${f(y - u * 0.2)}L${f(x + u * 0.55)} ${f(y - u * 0.2)}L${f(x + u * 0.36)} ${f(y)}L${f(x - u * 0.36)} ${f(y)}Z" fill="#fbfbf6"/>`,
        `<path d="M${f(x - u * 0.2)} ${f(y - u * 0.2)}L${f(x + u * 0.05)} ${f(y - u * 0.78)}L${f(x + u * 0.3)} ${f(y - u * 0.2)}Z" fill="#eeeee6"/>`,
        `<path d="M${f(x - u * 0.55)} ${f(y - u * 0.2)}L${f(x + u * 0.55)} ${f(y - u * 0.2)}" stroke="#c9c9bd" stroke-width="1"/>`,
      ].join('');
    case 'stepping': {
      const top = v.waterY ?? y;
      return [-2, -1, 0, 1, 2]
        .map(
          (i) =>
            `<path d="${ellipse(x + i * u * 0.95, top - u * 0.05, u * 0.34, u * 0.14, 0)}" fill="${c(i % 2 ? '#a3a39a' : '#8f8f86')}"/>`,
        )
        .join('');
    }
    case 'bridge': {
      const w = u * 5.4;
      const deck = (v.waterY ?? y) - u * 0.7;
      return [
        `<path d="M${f(x - w / 2)} ${f(deck + u * 0.35)}Q${f(x)} ${f(deck - u * 0.8)} ${f(x + w / 2)} ${f(deck + u * 0.35)}" stroke="${c('#7a5a3e')}" stroke-width="${f(u * 0.3)}" fill="none"/>`,
        `<path d="M${f(x - w / 2)} ${f(deck - u * 0.35)}Q${f(x)} ${f(deck - u * 1.55)} ${f(x + w / 2)} ${f(deck - u * 0.35)}" stroke="${c('#5a4432')}" stroke-width="${f(u * 0.1)}" fill="none"/>`,
        ...[-0.4, -0.2, 0, 0.2, 0.4].map((t) => {
          const px = x + t * w;
          const arc = deck + u * 0.35 - (1 - (t * 2) ** 2) * u * 0.58;
          return `<path d="M${f(px)} ${f(arc)}L${f(px)} ${f(arc - u * 0.72)}" stroke="${c('#5a4432')}" stroke-width="${f(u * 0.08)}"/>`;
        }),
      ].join('');
    }
  }
}
