import { hashString, createRng, pick } from './rng';
import { isTree, plantById, zoneAt, type Garden } from './garden';
import type { Choice } from './rules';
import type { Condition } from './schema';
import { SPECIES } from './species';
import { STRUCTURES } from './structures';
import { CHANNEL, HILL } from './terrain';

/**
 * Place names, automatic titles and lore (used by the director and as the routine's
 * fallback), and the plain-text check every title and lore line must pass.
 */

export function describePlace(g: Garden, x: number, row: number): string {
  const zone = zoneAt(g, x);
  if (zone === 'water') return 'in the stream';
  if (zone === 'beach') return 'on the sand bank';
  if (zone === 'bank') return x < CHANNEL.center ? 'on the west bank of the stream' : 'on the east bank of the stream';
  const tree = g.plants.find(
    (p) =>
      isTree(p) && p.status === 'growing' && p.stage >= 8 && Math.abs(p.x - x) <= 3 && !(p.x === x && p.row === row),
  );
  if (tree) return `beneath the ${SPECIES[tree.species].label}`;
  const side = row === 0 ? ' at the back' : row === 2 ? ' at the front' : '';
  if (Math.abs(x + 0.5 - HILL.center) < 6) return `on the little hill${side}`;
  if (x < 24) return `in the west of the garden${side}`;
  if (x < CHANNEL.center - 8) return `in the middle of the garden${side}`;
  return `on the far side of the stream${side}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const an = (word: string) => (/^[aeiou]/i.test(word) ? 'An' : 'A');

const REST_TITLES: Record<Condition, string> = {
  rain: 'Listening to the rain',
  sun: 'A lazy day in the sun',
  cloudy: 'A quiet grey day',
  frost: 'Frost on every blade of grass',
  snow: 'Snow day',
  storm: 'Sitting out the storm',
};

export function autoTitle(g: Garden, choice: Choice, amount?: number): string {
  switch (choice.action) {
    case 'plant': {
      const info = SPECIES[choice.species];
      const place = describePlace(g, choice.x, choice.row);
      if (info.kind === 'tree') return `${an(info.label)} ${info.label} sapling ${place}`;
      if (choice.species === 'waterlily') return 'A water lily in the stream';
      if (choice.species === 'reed') return `Reeds ${place}`;
      if (choice.species === 'mushroom') return `Mushroom spores ${place}`;
      if (info.life === 'bulb') return `${cap(info.label)} bulbs ${place}`;
      if (info.life === 'annual') return `${cap(info.label)} seeds ${place}`;
      return `A young ${info.label} ${place}`;
    }
    case 'build': {
      const info = STRUCTURES[choice.structure];
      if (choice.structure === 'stepping') return 'Stepping stones across the stream';
      if (choice.structure === 'bridge') {
        const log = g.plants.find((p) => p.status === 'fallen');
        return log ? `A bridge from the fallen ${SPECIES[log.species].label}` : 'A bridge across the stream';
      }
      if (choice.structure === 'birdhouse') {
        const tree = g.plants.find((p) => p.x === choice.x && p.row === choice.row && isTree(p));
        return tree ? `A birdhouse in the ${SPECIES[tree.species].label}` : 'A birdhouse';
      }
      if (choice.structure === 'shed') return 'A garden shed at the back';
      if (choice.structure === 'barrel') return 'A rain barrel by the shed';
      return `${an(info.label)} ${info.label} ${describePlace(g, choice.x, choice.row)}`;
    }
    case 'water': {
      const plant = plantById(g, choice.target);
      return plant ? `Watering the young ${SPECIES[plant.species].label}` : 'Watering the garden';
    }
    case 'harvest': {
      const plant = plantById(g, choice.target);
      const label = plant ? (SPECIES[plant.species].fruit?.label ?? 'fruit') : 'fruit';
      if (plant?.species === 'sunflower') return 'Harvest: a sunflower full of seeds';
      return `Harvest: ${amount ?? plant?.fruit ?? 0} ${label}`;
    }
    case 'rest':
      return REST_TITLES[g.weather?.condition ?? 'cloudy'];
  }
}

const LORE: Record<string, readonly string[]> = {
  tree: [
    'Planted with a little hope and a lot of patience. The rain will do the rest.',
    'A stick with three leaves today. Give it a few wet summers.',
    'Somebody will sit in its shade one day. Probably not this year.',
  ],
  shrub: ['Small, stubborn and already smelling of summer.', 'It will fill this corner by next year.'],
  flower: [
    'Seeds in the soil and a promise in the air.',
    'Pressed in with a thumb, watered by the sky.',
    'Nothing to see yet – that is how every flower starts.',
  ],
  water: ['The stream got a new neighbour.', 'Roots in the mud, leaves in the light.'],
  fungus: ['Hidden in the damp, waiting for the next rain.', 'Autumn has its own kind of flowers.'],
  build: [
    'Built from what the garden had to spare.',
    'A small thing, made carefully.',
    'Every garden needs a place for people, too.',
  ],
  water_action: ['A can of water on a dry day – one stage of help.', 'The rain was late, so the gardener stepped in.'],
  harvest: [
    'Carried inside in a basket, the best one eaten on the way.',
    'Picked at the right moment, still warm from the sun.',
  ],
  rest: [
    'Some days the best thing a gardener can do is watch.',
    'Nothing planted, nothing built. The weather had the garden to itself.',
    'A cup of tea on the doorstep and a long look at everything.',
  ],
};

export function autoLore(g: Garden, choice: Choice): string {
  const rng = createRng(hashString(`${g.date}:${choice.action}`));
  switch (choice.action) {
    case 'plant': {
      const kind = SPECIES[choice.species].kind;
      return pick(rng, LORE[kind] ?? LORE.flower ?? []);
    }
    case 'build':
      return pick(rng, LORE.build ?? []);
    case 'water':
      return pick(rng, LORE.water_action ?? []);
    case 'harvest':
      return pick(rng, LORE.harvest ?? []);
    case 'rest':
      return pick(rng, LORE.rest ?? []);
  }
}

const FORBIDDEN = /(https?:\/\/|www\.|@\w)/i;

/** Titles and lore are plain, single-line English text – no links, mentions, markup or emoji. */
export function checkText(kind: 'title' | 'lore', value: string): string | null {
  const text = value.trim();
  const max = kind === 'title' ? 80 : 200;
  if (text.length < 3) return `${kind} is too short`;
  if (text.length > max) return `${kind} is longer than ${max} characters`;
  if (/[\r\n\t]/.test(text)) return `${kind} must be a single line`;
  if (/[<>`|*_\\[\]{}]/.test(text)) return `${kind} must be plain text (no markdown or HTML)`;
  if (FORBIDDEN.test(text)) return `${kind} must not contain links or @mentions`;
  if (/\p{Extended_Pictographic}/u.test(text)) return `${kind} must not contain emoji`;
  return null;
}
