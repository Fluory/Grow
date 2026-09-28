import { CHANNEL, createRng, growth, hashString, seasonOf, SPECIES, waterEdges, WIDTH } from '@/features/garden';
import { f, groundY, poly, profile, SCENE_HEIGHT, SVG_WIDTH, UNIT, waterLine, type GardenPicture } from './layout';
import { meadowFor, SAND, skyFor, SNOW, SOIL, WATER } from './palette';
import { ellipse, mix } from './plant-svg';

/** The layers around the plants: sky and hills, the ground band with the stream, the soil cross-section. */

export function skyLayer(p: GardenPicture, animated: boolean): string {
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

export function groundLayer(p: GardenPicture): string {
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
export function soilLayer(p: GardenPicture): string {
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
