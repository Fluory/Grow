import {
  CHANNEL,
  CONDITION_INFO,
  createRng,
  describeWeather,
  formatDate,
  groundHeight,
  growth,
  hashString,
  replay,
  seasonOf,
  SPECIES,
  waterEdges,
  waterHeight,
  WIDTH,
  type DayEntry,
  type Garden,
  type Plant,
  type Structure,
  type Weather,
  type World,
} from '@/features/garden';
import { GLYPH_HEIGHT, rasterText, textWidth, wrapText } from './font';
import { CAPTION, CONDITION_COLOR, meadowFor, SAND, skyFor, SNOW, SOIL, WATER } from './palette';
import { ellipse, mix, plantSvg } from './plant-svg';
import { structureSvg } from './structure-svg';

/**
 * The README picture (`world/garden.svg`): a side view of the garden as a diorama – sky and
 * weather, the Heilbronn hills, three rows of plants, the stream, and a cross-section of the
 * soil with roots and bulbs. Pure string building, deterministic, animated with CSS only.
 */

export const SVG_WIDTH = 1024;
export const UNIT = 16;
export const SCENE_HEIGHT = 470;
export const CAPTION_HEIGHT = 96;
const Y0 = 366;
const BAND = 26;
const ROW_T = [-0.65, 0, 0.65] as const;
const ROW_SCALE = [0.84, 0.92, 1] as const;
const ROW_HAZE = [0.2, 0.08, 0] as const;
const PAD = 28;

export interface GardenPicture {
  name: string;
  garden: Garden;
  entry: DayEntry;
  /** Weather of up to the last 30 recorded days, oldest first. */
  recent: (Weather | undefined)[];
  /** 0–1: how green the grass is (rain days of the last three weeks). */
  lush: number;
}

export interface GardenSvgOptions {
  animated?: boolean;
  caption?: boolean;
  /** Mark the element created on this day. */
  highlight?: boolean;
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] ?? c);

/** Screen y of the ground at column position x (units) and depth t (−1 back … 1 front). */
export function groundY(x: number, t: number): number {
  return Y0 + t * BAND - groundHeight(x) * UNIT;
}

function waterLine(level: number, t: number): number | null {
  const h = waterHeight(level);
  return h === null ? null : Y0 + t * BAND - h * UNIT;
}

/** Screen position and unit size of a cell. */
export function cellView(x: number, row: number): { x: number; y: number; unit: number } {
  const t = ROW_T[row] ?? 0;
  return { x: (x + 0.5) * UNIT, y: groundY(x + 0.5, t), unit: UNIT * (ROW_SCALE[row] ?? 1) };
}

function textPath(text: string): string {
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

function profile(t: number, from = 0, to = WIDTH, step = 0.5): [number, number][] {
  const points: [number, number][] = [];
  for (let x = from; x <= to + 1e-6; x += step) points.push([x * UNIT, groundY(x, t)]);
  return points;
}

const poly = (points: [number, number][]) => `M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;

// ---- layers --------------------------------------------------------------------------

function skyLayer(p: GardenPicture, animated: boolean): string {
  const season = seasonOf(p.garden.date);
  const sky = skyFor(p.garden.weather?.condition, season);
  const rng = createRng(hashString(`sky:${p.garden.date}`));
  const out = [
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset="1" stop-color="${sky.bottom}"/></linearGradient>` +
      `<radialGradient id="sun"><stop offset="0" stop-color="${sky.sun ?? '#fff'}" stop-opacity=".9"/><stop offset="1" stop-color="${sky.sun ?? '#fff'}" stop-opacity="0"/></radialGradient></defs>`,
    `<rect width="${SVG_WIDTH}" height="${SCENE_HEIGHT}" fill="url(#sky)"/>`,
  ];
  if (sky.sun) {
    out.push(
      `<circle cx="850" cy="92" r="92" fill="url(#sun)"/>`,
      `<circle cx="850" cy="92" r="30" fill="${sky.sun}"/>`,
    );
  }
  const clouds: string[] = [];
  const count = Math.round(sky.clouds * 8);
  for (let i = 0; i < count; i++) {
    const cx = ((i + 0.5) / count) * SVG_WIDTH + (rng() - 0.5) * 90;
    const cy = 40 + rng() * 120 * (1 - sky.clouds * 0.5);
    const w = 60 + rng() * 70 + sky.clouds * 50;
    const blobs: string[] = [];
    for (let b = 0; b < 5; b++) {
      const bx = cx + (b - 2) * w * 0.22 + (rng() - 0.5) * 10;
      const r = w * (0.2 + (b === 2 ? 0.14 : 0) + rng() * 0.08);
      blobs.push(`<circle cx="${f(bx)}" cy="${f(cy - r * 0.35)}" r="${f(r)}"/>`);
    }
    clouds.push(
      `<g fill="${sky.cloudShade}">${blobs.join('')}</g><path d="${ellipse(cx, cy, w * 0.62, w * 0.16, 0)}" fill="${sky.cloudShade}"/>`,
      `<g fill="${sky.cloud}" transform="translate(-3 -4)">${blobs.join('')}</g>`,
    );
  }
  if (clouds.length > 0) out.push(`<g${animated ? ' class="cl"' : ''}>${clouds.join('')}</g>`);

  // the vineyard hills around Heilbronn
  const far: [number, number][] = [[0, 300]];
  const near: [number, number][] = [[0, 330]];
  for (let x = 0; x <= SVG_WIDTH; x += 32) {
    far.push([x, 262 + Math.sin(x / 170 + 1.3) * 16 + Math.sin(x / 61) * 4]);
    near.push([x, 300 + Math.sin(x / 120 + 4.1) * 14 + Math.sin(x / 47) * 3]);
  }
  far.push([SVG_WIDTH, 340], [0, 340]);
  near.push([SVG_WIDTH, 360], [0, 360]);
  out.push(`<path d="${poly(far)}" fill="${sky.hills[0]}"/>`, `<path d="${poly(near)}" fill="${sky.hills[1]}"/>`);
  const rows: string[] = [];
  for (let r = 1; r <= 4; r++) {
    const line = near.slice(1, -2).map(([x, y]) => `${f(x)} ${f(y + r * 7)}`);
    rows.push(`M${line.join('L')}`);
  }
  out.push(
    `<path d="${rows.join('')}" stroke="${mix(sky.hills[1], '#3f5a34', 0.3)}" stroke-width="1.4" stroke-dasharray="2 5" fill="none"/>`,
  );
  if (p.garden.nature.snow > 0) {
    out.push(`<path d="${poly(near)}" fill="${SNOW}" fill-opacity="${0.25 + p.garden.nature.snow * 0.15}"/>`);
  }
  return out.join('');
}

function groundLayer(p: GardenPicture): string {
  const g = p.garden;
  const season = seasonOf(g.date);
  const meadow = meadowFor(season, p.lush);
  const out: string[] = [];
  const back = profile(-1);
  const front = profile(1);
  out.push(`<path d="${poly([...back, ...[...front].reverse()])}" fill="${meadow.top}"/>`);

  // grass texture – denser after rain
  const rng = createRng(hashString(`grass:${g.date}`));
  const blades: string[] = [];
  const count = Math.round(140 + p.lush * 220);
  for (let i = 0; i < count; i++) {
    const x = rng() * WIDTH;
    if (Math.abs(x - CHANNEL.center) < CHANNEL.halfWidth) continue;
    const t = rng() * 2 - 1;
    const y = groundY(x, t);
    const h = (2 + rng() * 3.5) * (0.6 + p.lush * 0.6);
    blades.push(`M${f(x * UNIT)} ${f(y)}l${f((rng() - 0.5) * 3)} ${f(-h)}`);
  }
  out.push(`<path d="${blades.join('')}" stroke="${meadow.blade}" stroke-width="1.2" stroke-linecap="round"/>`);

  // sand in the channel, then water or ice
  const c0 = CHANNEL.center - CHANNEL.halfWidth + 0.3;
  const c1 = CHANNEL.center + CHANNEL.halfWidth - 0.3;
  out.push(
    `<path d="${poly([...profile(-1, c0, c1, 0.25), ...profile(1, c0, c1, 0.25).reverse()])}" fill="${SAND.dry}"/>`,
  );
  // the east bank faces away from the light
  const east0 = CHANNEL.center + 0.2;
  out.push(
    `<path d="${poly([...profile(-1, east0, c1, 0.25), ...profile(1, east0, c1, 0.25).reverse()])}" fill="#6b4a2a" fill-opacity=".16"/>`,
  );
  const edges = waterEdges(g.nature.water);
  const wb = waterLine(g.nature.water, -1);
  const wf = waterLine(g.nature.water, 1);
  if (edges && wb !== null && wf !== null) {
    const [l, r] = edges;
    const color = g.nature.ice ? WATER.ice : WATER.surface;
    out.push(
      `<path d="M${f(l * UNIT)} ${f(wb)}L${f(r * UNIT)} ${f(wb)}L${f(r * UNIT)} ${f(wf)}L${f(l * UNIT)} ${f(wf)}Z" fill="${color}"/>`,
    );
    if (g.nature.ice) {
      const cracks: string[] = [];
      for (let i = 0; i < 5; i++) {
        const x = l + ((r - l) * (i + 0.5)) / 5;
        cracks.push(`M${f(x * UNIT)} ${f(wb + 6)}l${f(6 - i * 3)} ${f(14)}l${f(-4)} ${f(12)}`);
      }
      out.push(`<path d="${cracks.join('')}" stroke="${WATER.iceLine}" stroke-width="1" fill="none"/>`);
    } else {
      const shine: string[] = [];
      for (let i = 0; i < 4; i++) {
        const y = wb + ((wf - wb) * (i + 0.6)) / 4;
        const x = l + 0.4 + ((r - l - 1.2) * ((i * 37) % 10)) / 10;
        shine.push(`M${f(x * UNIT)} ${f(y)}h${f(Math.min(22, (r - l) * UNIT * 0.3))}`);
      }
      out.push(
        `<path class="sh" d="${shine.join('')}" stroke="${WATER.shine}" stroke-width="1.6" stroke-linecap="round"/>`,
      );
    }
  }
  if (g.nature.snow > 0) {
    out.push(
      `<path d="${poly([...back, ...[...front].reverse()])}" fill="${SNOW}" fill-opacity="${f(0.45 + g.nature.snow * 0.17)}"/>`,
    );
  }
  return out.join('');
}

/** The front face: a cross-section of the soil with roots, bulbs, stones and the stream. */
function soilLayer(p: GardenPicture): string {
  const g = p.garden;
  const edge = profile(1, 0, WIDTH, 0.25);
  const down = (dy: number) => edge.map(([x, y]) => [x, y + dy] as [number, number]);
  const bottom: [number, number][] = [
    [SVG_WIDTH, SCENE_HEIGHT],
    [0, SCENE_HEIGHT],
  ];
  const out = [
    `<path d="${poly([...edge, ...bottom])}" fill="${SOIL.deep}"/>`,
    `<path d="${poly([...edge, ...down(52).reverse()])}" fill="${SOIL.mid}"/>`,
    `<path d="${poly([...edge, ...down(16).reverse()])}" fill="${SOIL.top}"/>`,
  ];
  const meadow = meadowFor(seasonOf(g.date), p.lush);
  out.push(
    `<path d="M${edge.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" stroke="${g.nature.snow > 0 ? SNOW : meadow.front}" stroke-width="4" fill="none"/>`,
  );

  const rng = createRng(0x51);
  const stones: string[] = [];
  for (let i = 0; i < 26; i++) {
    const x = rng() * SVG_WIDTH;
    const y = groundY(x / UNIT, 1) + 30 + rng() * 70;
    if (y > SCENE_HEIGHT - 4) continue;
    stones.push(ellipse(x, y, 4 + rng() * 9, 3 + rng() * 5, (rng() - 0.5) * 0.6));
  }
  out.push(`<path d="${stones.join('')}" fill="${SOIL.stone}" fill-opacity=".55"/>`);

  // roots grow with the plant
  const roots: string[] = [];
  for (const plant of g.plants) {
    if (plant.species === 'waterlily') continue;
    const info = SPECIES[plant.species];
    const x = (plant.x + 0.5) * UNIT;
    const y = groundY(plant.x + 0.5, 1) + 2;
    const r = createRng(hashString(`root:${plant.id}`));
    const size = growth(plant);
    const reach = info.kind === 'tree' ? 26 + 70 * size : info.kind === 'shrub' ? 10 + 22 * size : 6 + 10 * size;
    const n = info.kind === 'tree' ? 7 : 3;
    for (let i = 0; i < n; i++) {
      let px = x + (r() - 0.5) * 4;
      let py = y;
      let angle = Math.PI / 2 + (r() - 0.5) * 1.9;
      const parts = [`M${f(px)} ${f(py)}`];
      for (let s = 0; s < 3; s++) {
        const len = (reach / 3) * (0.7 + r() * 0.5);
        px += Math.cos(angle) * len;
        py += Math.sin(angle) * len * 0.8;
        parts.push(`L${f(px)} ${f(Math.min(py, SCENE_HEIGHT - 3))}`);
        angle += (r() - 0.5) * 0.7;
      }
      roots.push(parts.join(''));
    }
  }
  if (roots.length > 0)
    out.push(
      `<path d="${roots.join('')}" stroke="${SOIL.root}" stroke-opacity=".55" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    );

  const bulbs = g.plants
    .filter((pl) => pl.species === 'tulip')
    .map((pl) => {
      const x = (pl.x + 0.5) * UNIT + (pl.row - 1) * 3;
      const y = groundY(pl.x + 0.5, 1) + 13 + pl.row * 3;
      return `<path d="M${f(x)} ${f(y - 7)}Q${f(x + 6)} ${f(y)} ${f(x)} ${f(y + 3)}Q${f(x - 6)} ${f(y)} ${f(x)} ${f(y - 7)}Z" fill="${SOIL.bulb}"/>`;
    });
  out.push(...bulbs);

  if (g.weather?.condition === 'rain') {
    const r = createRng(hashString(`worm:${g.date}`));
    for (let i = 0; i < 2; i++) {
      const x = 40 + r() * (SVG_WIDTH - 80);
      if (Math.abs(x / UNIT - CHANNEL.center) < CHANNEL.halfWidth + 1) continue;
      const y = groundY(x / UNIT, 1) + 10 + r() * 8;
      out.push(
        `<path d="M${f(x)} ${f(y)}q4 -4 8 0t8 0t8 0" stroke="${SOIL.worm}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      );
    }
  }

  // the stream in cross-section
  const edges = waterEdges(g.nature.water);
  const wf = waterLine(g.nature.water, 1);
  if (edges && wf !== null) {
    const [l, r] = edges;
    const bed = profile(1, l, r, 0.1);
    out.push(
      `<path d="${poly([[l * UNIT, wf], ...bed.slice(1, -1), [r * UNIT, wf]])}" fill="${g.nature.ice ? WATER.ice : WATER.deep}" fill-opacity="${g.nature.ice ? 0.95 : 0.9}"/>`,
    );
    out.push(
      `<path d="M${f(l * UNIT)} ${f(wf)}H${f(r * UNIT)}" stroke="${g.nature.ice ? WATER.iceLine : WATER.shine}" stroke-width="2"/>`,
    );
  }
  return out.join('');
}

function elementTop(el: Plant | Structure): number {
  if ('species' in el) return Math.max(0.8, SPECIES[el.species].height * growth(el));
  return el.type === 'shed' ? 2.8 : el.type === 'scarecrow' ? 2.6 : el.type === 'lantern' ? 2 : 1.4;
}

function rowsLayer(p: GardenPicture, animated: boolean): { svg: string; mark: string } {
  const g = p.garden;
  const date = g.date;
  const sky = skyFor(g.weather?.condition, seasonOf(date));
  const stormy = g.weather?.condition === 'storm';
  let mark = '';
  const parts: string[] = [];
  for (let row = 0; row < 3; row++) {
    const haze = (ROW_HAZE[row] ?? 0) > 0 ? { color: sky.bottom, amount: ROW_HAZE[row] ?? 0 } : undefined;
    const items: { x: number; svg: string }[] = [];
    for (const plant of g.plants.filter((pl) => pl.row === row)) {
      const view = cellView(plant.x, plant.row);
      if (plant.species === 'waterlily') {
        const wy = waterLine(g.nature.water, ROW_T[row] ?? 0);
        if (wy !== null && wy < view.y) view.y = wy;
      }
      const svg = plantSvg(plant, date, { ...view, snow: g.nature.snow > 0, haze });
      if (!svg) continue;
      const sway =
        animated && plant.status === 'growing' && plant.species !== 'waterlily' && plant.species !== 'mushroom';
      const cls = `sw${SPECIES[plant.species].kind === 'tree' ? '' : ' sf'} d${hashString(plant.id) % 4}`;
      items.push({
        x: plant.x,
        svg: sway ? `<g class="${cls}" style="transform-origin:${f(view.x)}px ${f(view.y)}px">${svg}</g>` : svg,
      });
    }
    for (const s of g.structures.filter((st) => st.row === row)) {
      const view = cellView(s.x, s.row);
      const tree = s.on ? g.plants.find((pl) => pl.id === s.on) : undefined;
      const wy = waterLine(g.nature.water, ROW_T[row] ?? 0);
      const svg = structureSvg(s.type, {
        x: view.x,
        y: view.y,
        u: view.unit,
        haze,
        animated,
        waterY:
          s.type === 'stepping' || s.type === 'bridge' ? (wy ?? groundY(CHANNEL.center, ROW_T[row] ?? 0)) : undefined,
        treeHeight: tree ? SPECIES[tree.species].height * growth(tree) : undefined,
      });
      items.push({ x: s.x, svg });
    }
    items.sort((a, b) => a.x - b.x);
    parts.push(...items.map((i) => i.svg));
  }

  const target = p.entry.target;
  const el = target
    ? (g.plants.find((pl) => pl.id === target) ?? g.structures.find((s) => s.id === target))
    : undefined;
  if (el && (p.entry.action === 'plant' || p.entry.action === 'build')) {
    const view = cellView(el.x, el.row);
    const top = view.y - elementTop(el) * view.unit - 14;
    mark = `<g${animated ? ' class="mk"' : ''}><path d="M${f(view.x - 7)} ${f(top - 11)}L${f(view.x + 7)} ${f(top - 11)}L${f(view.x)} ${f(top)}Z" fill="${CAPTION.accent}" stroke="${CAPTION.bg}" stroke-width="1.5" stroke-linejoin="round"/></g>`;
  }
  return { svg: `<g${stormy && animated ? ' class="storm"' : ''}>${parts.join('')}</g>`, mark };
}

function weatherLayer(p: GardenPicture, animated: boolean): string {
  const w = p.garden.weather;
  if (!w) return '';
  const rng = createRng(hashString(`fx:${p.garden.date}`));
  const out: string[] = [];
  if (w.condition === 'rain' || (w.condition === 'storm' && w.rain >= 1)) {
    const slant = w.condition === 'storm' ? -9 : -3;
    const count = Math.min(110, 30 + Math.round(w.rain * 5));
    for (const group of ['a', 'b']) {
      const lines: string[] = [];
      for (let i = 0; i < count / 2; i++) {
        const x = rng() * (SVG_WIDTH + 60);
        const y = rng() * (SCENE_HEIGHT - 110);
        lines.push(`M${f(x)} ${f(y)}l${slant} 14`);
      }
      out.push(
        `<path${animated ? ` class="rn ${group}"` : ''} d="${lines.join('')}" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/>`,
      );
    }
  }
  if (w.condition === 'snow') {
    for (const group of ['a', 'b']) {
      const flakes: string[] = [];
      for (let i = 0; i < 40; i++) {
        flakes.push(
          `<circle cx="${f(rng() * SVG_WIDTH)}" cy="${f(rng() * (SCENE_HEIGHT - 120))}" r="${f(1.3 + rng() * 1.6)}"/>`,
        );
      }
      out.push(`<g${animated ? ` class="sn ${group}"` : ''} fill="#ffffff" fill-opacity=".9">${flakes.join('')}</g>`);
    }
  }
  if (w.condition === 'frost') {
    const glints: string[] = [];
    for (let i = 0; i < 26; i++) {
      const x = rng() * WIDTH;
      if (Math.abs(x - CHANNEL.center) < CHANNEL.halfWidth) continue;
      const y = groundY(x, rng() * 2 - 1) - 2;
      glints.push(`M${f(x * UNIT - 2.5)} ${f(y)}h5M${f(x * UNIT)} ${f(y - 2.5)}v5`);
    }
    out.push(`<path d="${glints.join('')}" stroke="#ffffff" stroke-width="1.1"/>`);
  }
  if (w.condition === 'storm') {
    const leaves: string[] = [];
    for (let i = 0; i < 14; i++) {
      leaves.push(ellipse(rng() * SVG_WIDTH, 60 + rng() * 220, 3.2, 1.6, rng() * 3));
    }
    out.push(`<path${animated ? ' class="lf"' : ''} d="${leaves.join('')}" fill="#9a8a3a" fill-opacity=".8"/>`);
  }
  return out.join('');
}

function captionLayer(p: GardenPicture): string {
  const e = p.entry;
  const w = p.garden.weather;
  const top = SCENE_HEIGHT;
  const small = 3;
  const big = 4;
  const accent = w ? CONDITION_COLOR[w.condition] : CAPTION.accent;
  const left = `${p.name} · DAY ${e.day} · ${formatDate(e.date)}`;
  const right = w
    ? `${describeWeather(w)} · ${Math.round(w.tmax)}°/${Math.round(w.tmin)}°${w.fallback ? ' (REPEATED)' : ''}`
    : 'HEILBRONN · 49.14 N 9.21 E';
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

const STYLE = [
  '@keyframes sw{0%,100%{transform:rotate(-.7deg)}50%{transform:rotate(.7deg)}}',
  '@keyframes sf{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}',
  '@keyframes st{0%,100%{transform:rotate(-2.2deg)}50%{transform:rotate(1.4deg)}}',
  '.sw{animation:sw 6s ease-in-out infinite}.sf{animation-name:sf;animation-duration:4s}',
  '.storm .sw{animation:st 1.4s ease-in-out infinite}',
  '.d1{animation-delay:-1.5s}.d2{animation-delay:-3s}.d3{animation-delay:-4.5s}',
  '@keyframes rn{from{transform:translate(0,-60px)}to{transform:translate(-14px,70px)}}',
  '.rn{animation:rn .8s linear infinite}.rn.b{animation-delay:-.4s}',
  '@keyframes sn{from{transform:translate(0,-50px)}to{transform:translate(12px,60px)}}',
  '.sn{animation:sn 7s linear infinite}.sn.b{animation-delay:-3.5s}',
  '@keyframes cl{from{transform:translateX(-26px)}to{transform:translateX(26px)}}',
  '.cl{animation:cl 38s ease-in-out infinite alternate}',
  '@keyframes sh{0%,100%{opacity:.25}50%{opacity:.85}}.sh{animation:sh 3.2s ease-in-out infinite}',
  '@keyframes mk{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}.mk{animation:mk 1.4s ease-in-out infinite}',
  '@keyframes fl{0%,100%{opacity:.7}50%{opacity:1}}.fl{animation:fl 2.4s ease-in-out infinite}',
  '@keyframes bz{0%,100%{transform:translate(0,0)}33%{transform:translate(6px,-4px)}66%{transform:translate(-5px,3px)}}.bz{animation:bz 2s ease-in-out infinite}',
  '@keyframes lf{from{transform:translate(-40px,0)}to{transform:translate(60px,30px)}}.lf{animation:lf 2.6s linear infinite}',
  '@media (prefers-reduced-motion:reduce){*{animation:none!important}}',
].join('');

export function renderGardenSvg(p: GardenPicture, options: GardenSvgOptions = {}): string {
  const animated = options.animated ?? true;
  const caption = options.caption ?? true;
  const height = SCENE_HEIGHT + (caption ? CAPTION_HEIGHT : 0);
  const rows = rowsLayer(p, animated);
  const w = p.garden.weather;
  const title = `${p.name} – Day ${p.entry.day}: ${p.entry.title}`;
  const desc = `${p.entry.lore}${w ? ` Weather: ${CONDITION_INFO[w.condition].label}, ${describeWeather(w)}.` : ''}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${height}" width="${SVG_WIDTH}" height="${height}" role="img" aria-labelledby="t d">`,
    `<title id="t">${escapeXml(title)}</title>`,
    `<desc id="d">${escapeXml(desc)}</desc>`,
    animated ? `<style>${STYLE}</style>` : '',
    skyLayer(p, animated),
    groundLayer(p),
    rows.svg,
    soilLayer(p),
    weatherLayer(p, animated),
    options.highlight === false ? '' : rows.mark,
    caption ? captionLayer(p) : '',
    '</svg>',
    '',
  ].join('\n');
}

/** Everything the picture needs for day index `i` of a timeline (defaults to the last day). */
export function gardenPicture(world: World, gardens?: readonly Garden[], i = world.days.length - 1): GardenPicture {
  const entry = world.days[i] as DayEntry;
  const garden = gardens?.[i] ?? replay(world, entry.day);
  const window = world.days.slice(Math.max(0, i - 29), i + 1);
  const recent = window.map((d) => d.weather);
  const lastWeeks = world.days.slice(Math.max(0, i - 20), i + 1).filter((d) => d.weather);
  const rainy = lastWeeks.filter((d) => d.weather && (d.weather.condition === 'rain' || d.weather.rain >= 1)).length;
  // before three weeks are on record, assume an average share of rain days
  const expected = rainy + Math.max(0, 21 - lastWeeks.length) * 0.25;
  return { name: world.name.toUpperCase(), garden, entry, recent, lush: Math.min(1, 0.25 + expected / 8) };
}
