import { monthOf } from './calendar';
import { cloneGarden, growth, isTree, zoneAt, type Garden } from './garden';
import type { Plant, Weather } from './schema';
import { SPECIES, type SpeciesInfo } from './species';
import { STRUCTURES } from './structures';
import { MAX_WATER, waterSpan } from './terrain';
import { THRESHOLDS } from './weather';

/**
 * Nature's turn. Before the gardener acts, the recorded weather changes the garden:
 * rain grows, sun ripens, frost stops, snow covers, storm fells. Pure and deterministic.
 */

/** A storm fells a tree only if it is at least this grown … */
export const FALL_FROM = 0.45;
/** … and no other tree fell within this many days. */
export const FALL_COOLDOWN = 60;

const round1 = (n: number) => Math.round(n * 10) / 10;
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "2 sunflowers and 3 poppies" */
export function listPlants(plants: readonly Plant[]): string {
  const bySpecies = new Map<SpeciesInfo, number>();
  for (const p of plants) {
    const info = SPECIES[p.species];
    bySpecies.set(info, (bySpecies.get(info) ?? 0) + 1);
  }
  const parts = [...bySpecies].map(([info, n]) => count(n, info.label, info.plural));
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Rain makes a plant grow only in its growing season – water lilies only while they float. */
export function canGrow(g: Garden, p: Plant, month: number): boolean {
  const info = SPECIES[p.species];
  if (p.status !== 'growing' || p.stage >= info.maxStage) return false;
  if (!info.grows.includes(month)) return false;
  if (info.zones.includes('water') && zoneAt(g, p.x) !== 'water') return false;
  return true;
}

function seasonal(g: Garden, month: number): void {
  if (month >= 3 && month <= 8) {
    const wilted = g.plants.filter((p) => p.status === 'wilted');
    if (wilted.length > 0) {
      g.plants = g.plants.filter((p) => p.status !== 'wilted');
      g.effects.push(`The dry stalks of ${listPlants(wilted)} were cleared for spring.`);
    }
  }
  let dropped = 0;
  let label = '';
  for (const p of g.plants) {
    const info = SPECIES[p.species];
    if (p.bloom > 0 && !info.bloom?.months.includes(month)) p.bloom = 0;
    if (p.fruit > 0 && !info.fruit?.months.includes(month)) {
      dropped += p.fruit;
      label = info.fruit?.label ?? 'fruit';
      p.fruit = 0;
    }
  }
  if (dropped > 0) g.effects.push(`The season is over: ${dropped} unharvested ${label} fell to the grass.`);
}

function floatBoats(g: Garden): void {
  const floating = g.structures.filter((s) => s.type === 'boat' && zoneAt(g, s.x) === 'water');
  if (floating.length === 0) return;
  g.structures = g.structures.filter((s) => !floating.includes(s));
  g.effects.push('The rising water lifted the paper boat and carried it off downstream.');
}

function wiltAnnuals(g: Garden): Plant[] {
  const wilted = g.plants.filter((p) => p.status === 'growing' && SPECIES[p.species].life === 'annual');
  for (const p of wilted) {
    p.status = 'wilted';
    p.bloom = 0;
    p.fruit = 0;
  }
  return wilted;
}

function freezeBlossoms(g: Garden): number {
  let frozen = 0;
  for (const p of g.plants) {
    frozen += p.bloom;
    p.bloom = 0;
  }
  return frozen;
}

function rain(g: Garden, w: Weather, month: number): void {
  const steps = w.rain >= THRESHOLDS.heavyRain ? 2 : 1;
  g.nature.water = Math.min(MAX_WATER, g.nature.water + steps);
  let grown = 0;
  for (const p of g.plants) {
    if (!canGrow(g, p, month)) continue;
    p.stage = Math.min(SPECIES[p.species].maxStage, p.stage + steps);
    grown++;
  }
  const growthText =
    grown > 0
      ? `${count(grown, 'plant', 'plants')} grew ${steps === 2 ? 'two stages' : 'one stage'}`
      : 'nothing was in its growing season';
  const streamText =
    g.nature.water >= MAX_WATER ? 'the stream is brimming' : `the stream rose to level ${g.nature.water}`;
  g.effects.push(`Rain, ${w.rain.toFixed(1)} mm: ${growthText} and ${streamText}.`);
  floatBoats(g);
}

function sun(g: Garden, w: Weather, month: number): void {
  if (!g.nature.ice) g.nature.water = Math.max(0, g.nature.water - 1);
  let opened = 0;
  let ripened = 0;
  let fruitLabel = 'fruit';
  for (const p of g.plants) {
    if (p.status !== 'growing') continue;
    const info = SPECIES[p.species];
    const { bloom, fruit } = info;
    if (bloom && bloom.months.includes(month) && p.stage >= bloom.from && p.bloom < bloom.max) {
      const next = Math.min(bloom.max, p.bloom + Math.max(1, Math.ceil(bloom.max / 5)));
      opened += next - p.bloom;
      p.bloom = next;
    }
    if (fruit && fruit.months.includes(month) && p.stage >= fruit.from && p.fruit < fruit.max) {
      const next = Math.min(fruit.max, p.fruit + Math.max(1, Math.ceil(fruit.max / 6)));
      ripened += next - p.fruit;
      fruitLabel = fruit.label;
      p.fruit = next;
    }
  }
  const parts: string[] = [];
  if (opened > 0) parts.push(`${count(opened, 'blossom', 'blossoms')} opened`);
  if (ripened > 0) parts.push(`${ripened} ${fruitLabel} ripened`);
  const stream = g.nature.ice
    ? 'the stream stayed frozen'
    : g.nature.water === 0
      ? 'the stream bed lies dry'
      : `the stream sank to level ${g.nature.water} and the sand bank grew`;
  parts.push(stream);
  g.effects.push(`Sun, ${w.sun.toFixed(1)} h: ${joinParts(parts)}.`);
}

function frost(g: Garden, w: Weather): void {
  const parts: string[] = [];
  if (g.nature.water > 0 && !g.nature.ice) {
    g.nature.ice = true;
    parts.push('the stream froze');
  }
  const wilted = wiltAnnuals(g);
  if (wilted.length > 0) parts.push(`${listPlants(wilted)} wilted`);
  const frozen = freezeBlossoms(g);
  if (frozen > 0) parts.push(`${count(frozen, 'blossom', 'blossoms')} froze`);
  parts.push('nothing grows today');
  g.effects.push(`Frost, ${w.tmin.toFixed(1).replace('-', '−')} °C: ${joinParts(parts)}.`);
}

function snow(g: Garden, w: Weather): void {
  g.nature.snow = Math.min(3, g.nature.snow + (w.snow >= 3 ? 2 : 1));
  const parts = [`the garden lies under snow (depth ${g.nature.snow} of 3)`];
  if (w.tmin < 0) {
    if (g.nature.water > 0 && !g.nature.ice) {
      g.nature.ice = true;
      parts.push('the stream froze');
    }
    const wilted = wiltAnnuals(g);
    if (wilted.length > 0) parts.push(`${listPlants(wilted)} wilted`);
    freezeBlossoms(g);
  }
  g.effects.push(`Snow, ${w.snow.toFixed(1)} cm: ${joinParts(parts)}.`);
}

/** Where a storm strands the paper boat: the first free sand-bank cell next to the water. */
function boatCell(g: Garden): { x: number; row: number } | null {
  const span = waterSpan(g.nature.water);
  if (!span) return null;
  for (const x of [span[1] + 1, span[0] - 1]) {
    if (zoneAt(g, x) !== 'beach') continue;
    for (const row of [2, 1, 0]) {
      const taken =
        g.plants.some((p) => p.x === x && p.row === row) ||
        g.structures.some(
          (s) => s.row === row && Math.abs(s.x - x) <= (s.type === 'stepping' || s.type === 'bridge' ? 2 : 0),
        );
      if (!taken) return { x, row };
    }
  }
  return null;
}

function storm(g: Garden, w: Weather): void {
  let blossoms = 0;
  let fruit = 0;
  for (const p of g.plants) {
    blossoms += p.bloom;
    fruit += p.fruit;
    p.bloom = 0;
    p.fruit = 0;
  }
  const parts: string[] = [];
  const candidates = g.plants
    .filter((p) => isTree(p) && p.status === 'growing' && growth(p) >= FALL_FROM)
    .sort(
      (a, b) =>
        SPECIES[b.species].height * growth(b) - SPECIES[a.species].height * growth(a) ||
        Number(a.id.slice(1)) - Number(b.id.slice(1)),
    );
  const victim = candidates[0];
  if (victim && (g.lastFall === null || g.day - g.lastFall >= FALL_COOLDOWN)) {
    victim.status = 'fallen';
    victim.fell = g.day;
    g.lastFall = g.day;
    g.stats.fallen++;
    const houses = g.structures.filter((s) => s.type === 'birdhouse' && s.on === victim.id);
    g.structures = g.structures.filter((s) => !houses.includes(s));
    parts.push(`the ${SPECIES[victim.species].label} planted on day ${victim.day} fell`);
    if (houses.length > 0) parts.push('its birdhouse came down with it');
  } else {
    const cell = !g.nature.ice && !g.structures.some((s) => s.type === 'boat') ? boatCell(g) : null;
    if (cell) {
      g.structures.push({ id: `s${g.nextStructure++}`, type: 'boat', x: cell.x, row: cell.row, day: g.day });
      parts.push(`a ${STRUCTURES.boat.label} stranded on the sand bank`);
    } else {
      parts.push('the garden held on');
    }
  }
  if (blossoms > 0) parts.push(`${count(blossoms, 'blossom', 'blossoms')} blew away`);
  if (fruit > 0) parts.push(`${fruit} fruit fell`);
  if (w.rain >= THRESHOLDS.rain && !g.nature.ice) {
    g.nature.water = Math.min(MAX_WATER, g.nature.water + 1);
    parts.push(`the stream rose to level ${g.nature.water}`);
  }
  g.effects.push(`Storm, gusts of ${Math.round(w.gust)} km/h: ${joinParts(parts)}.`);
  floatBoats(g);
}

function thaw(g: Garden, w: Weather): void {
  const cold = w.condition === 'frost' || w.condition === 'snow';
  if (g.nature.ice && (g.nature.water === 0 || (!cold && w.tmax >= 5))) {
    g.nature.ice = false;
    if (g.nature.water > 0) g.effects.push('The ice on the stream melted.');
  }
  if (g.nature.snow > 0 && w.condition !== 'snow' && w.tmax >= 3) {
    g.nature.snow = Math.max(0, g.nature.snow - (w.tmax >= 8 || w.rain >= THRESHOLDS.rain ? 2 : 1));
    g.effects.push(g.nature.snow === 0 ? 'The last snow melted.' : 'The snow is melting.');
  }
  if (g.nature.snow === 0) {
    const snowmen = g.structures.filter((s) => s.type === 'snowman');
    if (snowmen.length > 0) {
      g.structures = g.structures.filter((s) => s.type !== 'snowman');
      g.effects.push(snowmen.length === 1 ? 'The snowman melted.' : `${snowmen.length} snowmen melted.`);
    }
  }
}

function joinParts(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Advance the garden to `day` and let the recorded weather act on it. */
export function applyWeather(prev: Garden, weather: Weather | undefined, day: number, date: string): Garden {
  const g = cloneGarden(prev);
  g.day = day;
  g.date = date;
  g.weather = weather;
  g.effects = [];
  const month = monthOf(date);
  seasonal(g, month);
  if (!weather) return g;

  switch (weather.condition) {
    case 'rain':
      g.stats.rainDays++;
      rain(g, weather, month);
      break;
    case 'sun':
      g.stats.sunDays++;
      sun(g, weather, month);
      break;
    case 'cloudy':
      g.stats.cloudyDays++;
      g.effects.push(
        `Grey, ${weather.tmax.toFixed(1).replace('-', '−')} °C: a quiet day – nothing grew, nothing broke.`,
      );
      break;
    case 'frost':
      g.stats.frostDays++;
      frost(g, weather);
      break;
    case 'snow':
      g.stats.snowDays++;
      snow(g, weather);
      break;
    case 'storm':
      g.stats.stormDays++;
      storm(g, weather);
      break;
  }
  g.stats.rainTotal = round1(g.stats.rainTotal + weather.rain);
  thaw(g, weather);
  if (weather.fallback) g.effects.push('The weather service was unreachable – yesterday’s weather was repeated.');
  return g;
}
