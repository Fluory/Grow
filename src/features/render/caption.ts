import { describeWeather, formatDate } from '@/features/garden';
import { GLYPH_HEIGHT, rasterText, textWidth, wrapText } from './font';
import { CAPTION_HEIGHT, f, PAD, SCENE_HEIGHT, SVG_WIDTH, type GardenPicture } from './layout';
import { CAPTION, CONDITION_COLOR } from './palette';

/** The caption bar under the picture: day, date, weather, title and a 30-day weather strip. */

export function textPath(text: string): string {
  const runs: [number, number, number][] = [];
  const pixels: [number, number][] = [];
  rasterText(text, (x, y) => pixels.push([x, y]));
  pixels.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, y] of pixels) {
    const last = runs[runs.length - 1];
    if (last && last[1] === y && last[0] + last[2] === x) last[2]++;
    else runs.push([x, y, 1]);
  }
  return runs.map(([x, y, w]) => `M${x} ${y}h${w}v1h-${w}z`).join('');
}

export function captionLayer(p: GardenPicture): string {
  const e = p.entry;
  const w = p.garden.weather;
  const top = SCENE_HEIGHT;
  const small = 3;
  const big = 4;
  const accent = w ? CONDITION_COLOR[w.condition] : CAPTION.accent;
  const left = `${p.name} · DAY ${e.day} · ${formatDate(e.date)}`;
  const fullRight = w
    ? `${describeWeather(w)} · ${Math.round(w.tmax)}°/${Math.round(w.tmin)}°${w.fallback ? ' (REPEATED)' : ''}`
    : 'HEILBRONN · 49.14 N 9.21 E';
  // never let the two halves of the first line collide
  const fits = (text: string) => (textWidth(left) + textWidth(text)) * small + 32 <= SVG_WIDTH - PAD * 2;
  const shortRight = w ? describeWeather(w) : 'HEILBRONN';
  const right = fits(fullRight) ? fullRight : fits(shortRight) ? shortRight : '';
  const strip = p.recent.slice(-30);
  const stripWidth = strip.length * 6;
  const room = SVG_WIDTH - PAD * 2 - stripWidth - 24;
  const titleScale = textWidth(e.title) * big <= room ? big : small;
  const title = wrapText(e.title, Math.floor(room / titleScale), 1)[0] ?? '';
  const line1 = top + 22;
  const line2 = top + 50;
  const bars: string[] = [];
  const baseY = line2 + GLYPH_HEIGHT * big;
  strip.forEach((day, i) => {
    const x = SVG_WIDTH - PAD - stripWidth + i * 6;
    if (!day) return;
    const color = CONDITION_COLOR[day.condition];
    const h =
      day.condition === 'rain' || day.condition === 'storm'
        ? 4 + Math.min(24, day.rain * 1.6)
        : day.condition === 'cloudy'
          ? 3
          : 6;
    bars.push(`<rect x="${x}" y="${f(baseY - h)}" width="4" height="${f(h)}" fill="${color}"/>`);
  });
  return [
    `<rect x="0" y="${top}" width="${SVG_WIDTH}" height="${CAPTION_HEIGHT}" fill="${CAPTION.bg}"/>`,
    `<rect x="0" y="${top}" width="${SVG_WIDTH}" height="4" fill="${accent}"/>`,
    `<path transform="translate(${PAD} ${line1}) scale(${small})" fill="${CAPTION.dim}" d="${textPath(left)}"/>`,
    `<path transform="translate(${SVG_WIDTH - PAD - textWidth(right) * small} ${line1}) scale(${small})" fill="${CAPTION.dim}" d="${textPath(right)}"/>`,
    `<path transform="translate(${PAD} ${line2 + (titleScale === big ? 0 : 4)}) scale(${titleScale})" fill="${CAPTION.text}" d="${textPath(title)}"/>`,
    bars.join(''),
  ].join('');
}
