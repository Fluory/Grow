import {
  CHANNEL,
  CONDITION_INFO,
  createRng,
  describeWeather,
  growth,
  hashString,
  replay,
  seasonOf,
  SPECIES,
  WIDTH,
  type DayEntry,
  type Garden,
  type Plant,
  type Structure,
  type World,
} from '@/features/garden';
import { captionLayer } from './caption';
import {
  CAPTION_HEIGHT,
  cellView,
  f,
  groundY,
  ROW_HAZE,
  ROW_T,
  SCENE_HEIGHT,
  SVG_WIDTH,
  UNIT,
  waterLine,
  type GardenPicture,
  type GardenSvgOptions,
} from './layout';
import { CAPTION, skyFor } from './palette';
import { ellipse, plantSvg } from './plant-svg';
import { groundLayer, skyLayer, soilLayer } from './scenery';
import { structureSvg } from './structure-svg';

/**
 * The README picture (`world/garden.svg`): a side view of the garden as a diorama – sky and
 * weather, the Heilbronn hills, three rows of plants, the stream, and a cross-section of the
 * soil with roots and bulbs. Pure string building, deterministic, animated with CSS only.
 */

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] ?? c);

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

export { CAPTION_HEIGHT, cellView, groundY, SCENE_HEIGHT, SVG_WIDTH, UNIT, type GardenPicture, type GardenSvgOptions };
