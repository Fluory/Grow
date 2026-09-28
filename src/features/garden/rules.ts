import { monthOf } from './calendar';
import {
  cloneGarden,
  countStructures,
  distance,
  isTree,
  occupant,
  plantById,
  zoneAt,
  type Cell,
  type Garden,
} from './garden';
import { ROWS, WIDTH, type Buildable, type Plant, type SpeciesId, type Structure } from './schema';
import { monthRange, SPECIES, TREE_MARGIN, ZONE_TEXT } from './species';
import { footprint, STRUCTURES } from './structures';
import { CHANNEL, inGarden, MARGIN, waterDepth } from './terrain';

/**
 * The gardener's turn: exactly one choice per day, checked against the garden *after*
 * the weather acted. The routine may only pick what these rules allow.
 */

export type Choice =
  | { action: 'plant'; species: SpeciesId; x: number; row: number }
  | { action: 'build'; structure: Buildable; x: number; row: number }
  | { action: 'water'; target: string }
  | { action: 'harvest'; target: string }
  | { action: 'rest' };

export const TREE_LIMIT = 14;
export const STEPPING_MAX_WATER = 5;

/** Growth stages that unlock things. */
export const UNLOCK = {
  shadeForSun: 12,
  shadeForFern: 16,
  bench: 20,
  birdhouse: 24,
  woodForMushrooms: 24,
  shedPlants: 8,
  sundialSunDays: 20,
  beehiveFlowers: 3,
  scarecrowAnnuals: 3,
} as const;

function describe(o: Plant | Structure): string {
  return 'species' in o ? `the ${SPECIES[o.species].label}` : `the ${STRUCTURES[o.type].label}`;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

export function frozenGround(g: Garden): string | null {
  if (g.weather?.condition === 'frost') return 'the ground is frozen today';
  if (g.weather?.condition === 'snow' || g.nature.snow > 0) return 'the ground is under snow';
  return null;
}

const livingTrees = (g: Garden) => g.plants.filter((p) => isTree(p) && p.status === 'growing');
const nearTree = (g: Garden, x: number, radius: number, minStage: number) =>
  livingTrees(g).find((t) => Math.abs(t.x - x) <= radius && t.stage >= minStage);

export function checkPlant(g: Garden, species: SpeciesId, x: number, row: number): string | null {
  const info = SPECIES[species];
  const month = monthOf(g.date);
  if (!inGarden(x)) return `column ${x} is outside the garden (use ${MARGIN}–${WIDTH - 1 - MARGIN})`;
  if (row < 0 || row >= ROWS) return 'row must be 0 (back), 1 (middle) or 2 (front)';
  const frozen = frozenGround(g);
  if (frozen) return `nothing can be planted – ${frozen}`;
  if (!info.sow.includes(month)) return `${info.plural} are planted in ${monthRange(info.sow)}`;
  if (info.kind === 'tree' && (x < TREE_MARGIN || x > WIDTH - 1 - TREE_MARGIN))
    return `trees keep ${TREE_MARGIN} columns from the edge of the garden (use ${TREE_MARGIN}–${WIDTH - 1 - TREE_MARGIN})`;
  const zone = zoneAt(g, x);
  if (!info.zones.includes(zone))
    return `${article(info.label)} ${info.label} needs ${info.zones.map((z) => ZONE_TEXT[z]).join(' or ')}, column ${x} is ${ZONE_TEXT[zone]}`;
  if (species === 'waterlily' && waterDepth(x, g.nature.water) < 0.5)
    return 'the water is too shallow for a water lily here';
  const taken = occupant(g, x, row);
  if (taken) return `the cell is taken by ${describe(taken)}`;
  const present = g.plants.filter((p) => p.species === species && p.status !== 'fallen').length;
  if (info.limit && present >= info.limit) return `the garden has room for at most ${info.limit} ${info.plural}`;
  if (info.kind === 'tree' && livingTrees(g).length >= TREE_LIMIT)
    return `the garden has room for at most ${TREE_LIMIT} trees`;

  for (const q of g.plants) {
    if (q.status === 'fallen') continue;
    const other = SPECIES[q.species];
    const d = distance(q, { x, row });
    const both = (kind: string) => info.kind === kind && other.kind === kind;
    if (both('tree') && d < Math.max(info.spacing, other.spacing))
      return `too close to the ${other.label} at ${q.x}/${q.row} – trees need ${Math.max(info.spacing, other.spacing)} columns between them`;
    if (both('shrub') && d < Math.max(info.spacing, other.spacing))
      return `too close to the ${other.label} at ${q.x}/${q.row} – shrubs need ${Math.max(info.spacing, other.spacing)} columns`;
    const mixed = (info.kind === 'tree' && other.kind === 'shrub') || (info.kind === 'shrub' && other.kind === 'tree');
    if (mixed && d < 2) return `too close to the ${other.label} at ${q.x}/${q.row}`;
  }

  if (info.needs === 'sun') {
    const shade = nearTree(g, x, 3, UNLOCK.shadeForSun);
    if (shade)
      return `${info.plural} need full sun – the ${SPECIES[shade.species].label} at ${shade.x} shades this spot`;
  }
  if (info.needs === 'shade' && !nearTree(g, x, 4, UNLOCK.shadeForFern))
    return `${info.plural} need shade – a tree of stage ${UNLOCK.shadeForFern} or more within four columns`;
  if (info.needs === 'wood') {
    const log = g.plants.some((p) => p.status === 'fallen' && Math.abs(p.x - x) <= 3);
    if (!log && !nearTree(g, x, 3, UNLOCK.woodForMushrooms))
      return `${info.plural} need wood – a fallen log or a tree of stage ${UNLOCK.woodForMushrooms} or more within three columns`;
  }
  return null;
}

/** Cells a channel structure lies on: five columns across the stream. */
export function spanCells(x: number, row: number): Cell[] {
  return [-2, -1, 0, 1, 2].map((dx) => ({ x: x + dx, row }));
}

export function checkBuild(g: Garden, type: Buildable, x: number, row: number): string | null {
  const info = STRUCTURES[type];
  if (countStructures(g, type) >= info.max)
    return info.max === 1
      ? `the garden already has its ${info.label}`
      : `the garden already has ${info.max} ${info.plural}`;
  if (row < 0 || row >= ROWS) return 'row must be 0 (back), 1 (middle) or 2 (front)';

  if (info.place === 'tree') {
    const tree = g.plants.find((p) => p.x === x && p.row === row && isTree(p) && p.status === 'growing');
    if (!tree) return 'a birdhouse must hang in a living tree – give that tree’s column and row';
    if (tree.stage < UNLOCK.birdhouse)
      return `the ${SPECIES[tree.species].label} is too small for a birdhouse (stage ${tree.stage}, needs ${UNLOCK.birdhouse})`;
    if (g.structures.some((s) => s.type === 'birdhouse' && s.on === tree.id))
      return `the ${SPECIES[tree.species].label} already has a birdhouse`;
    return null;
  }

  if (info.place === 'channel') {
    const wantRow = type === 'stepping' ? 1 : 0;
    if (x !== CHANNEL.center || row !== wantRow)
      return `the ${info.label} crosses the stream at column ${CHANNEL.center}, row ${wantRow}`;
    if (type === 'stepping' && g.nature.water > STEPPING_MAX_WATER)
      return `the water is too high for stepping stones (level ${g.nature.water}, at most ${STEPPING_MAX_WATER})`;
    if (type === 'bridge' && !g.plants.some((p) => p.status === 'fallen'))
      return 'a bridge needs a fallen tree – no storm has felled one yet';
    for (const c of spanCells(x, row)) {
      const taken = occupant(g, c.x, c.row);
      if (taken) return `${describe(taken)} is in the way at ${c.x}/${c.row}`;
    }
    return null;
  }

  for (const col of footprint(type, x)) {
    if (!inGarden(col)) return `column ${col} is outside the garden`;
    const zone = zoneAt(g, col);
    if (!info.place.includes(zone)) return `${article(info.label)} ${info.label} cannot stand on ${ZONE_TEXT[zone]}`;
    const taken = occupant(g, col, row);
    if (taken) return `the cell ${col}/${row} is taken by ${describe(taken)}`;
  }

  const living = g.plants.filter((p) => p.status === 'growing');
  switch (type) {
    case 'bench':
      return nearTree(g, x, 3, UNLOCK.bench)
        ? null
        : `a bench needs shade – a tree of stage ${UNLOCK.bench} or more within three columns`;
    case 'beehive': {
      const flowering = living.filter((p) => SPECIES[p.species].bloom).length;
      return flowering >= UNLOCK.beehiveFlowers
        ? null
        : `a beehive needs ${UNLOCK.beehiveFlowers} flowering plants (the garden has ${flowering})`;
    }
    case 'lantern': {
      const seat = g.structures.some((s) => (s.type === 'bench' || s.type === 'bridge') && Math.abs(s.x - x) <= 4);
      return seat ? null : 'a lantern stands within four columns of a bench or the bridge';
    }
    case 'shed':
      if (row !== 0) return 'the shed stands in the back row (row 0)';
      return living.length >= UNLOCK.shedPlants
        ? null
        : `a shed needs ${UNLOCK.shedPlants} living plants to look after (the garden has ${living.length})`;
    case 'barrel': {
      const shed = g.structures.find((s) => s.type === 'shed');
      if (!shed) return 'a rain barrel needs the shed first';
      return shed.row === row && Math.abs(shed.x - x) === 2
        ? null
        : `the rain barrel stands right next to the shed (column ${shed.x - 2} or ${shed.x + 2}, row ${shed.row})`;
    }
    case 'sundial':
      return g.stats.sunDays >= UNLOCK.sundialSunDays
        ? null
        : `a sundial needs ${UNLOCK.sundialSunDays} sunny days on record (so far ${g.stats.sunDays})`;
    case 'scarecrow': {
      const annuals = living.filter((p) => SPECIES[p.species].life === 'annual').length;
      return annuals >= UNLOCK.scarecrowAnnuals
        ? null
        : `a scarecrow needs ${UNLOCK.scarecrowAnnuals} living annual flowers to guard (the garden has ${annuals})`;
    }
    case 'snowman':
      return g.nature.snow > 0 ? null : 'a snowman needs snow on the ground';
    default:
      return null;
  }
}

export function checkWater(g: Garden, target: string): string | null {
  const plant = plantById(g, target);
  if (!plant) return `there is no plant ${target}`;
  const info = SPECIES[plant.species];
  const condition = g.weather?.condition;
  if (condition !== 'sun' && condition !== 'cloudy') return 'watering only makes sense on a dry day (sun or grey)';
  if (plant.status !== 'growing') return `the ${info.label} is not growing any more`;
  if (plant.stage >= info.maxStage) return `the ${info.label} is fully grown`;
  if (!info.grows.includes(monthOf(g.date))) return `${info.plural} do not grow in this month`;
  if (info.zones.includes('water')) return 'water lilies do not need watering';
  return null;
}

export function harvestMinimum(p: Plant): number {
  return Math.min(3, SPECIES[p.species].fruit?.max ?? Infinity);
}

export function checkHarvest(g: Garden, target: string): string | null {
  const plant = plantById(g, target);
  if (!plant) return `there is no plant ${target}`;
  const info = SPECIES[plant.species];
  if (!info.fruit) return `${info.plural} bear nothing to harvest`;
  if (plant.fruit < harvestMinimum(plant))
    return `nothing ripe on the ${info.label} yet (${plant.fruit} ${info.fruit.label}, needs ${harvestMinimum(plant)})`;
  return null;
}

export function checkChoice(g: Garden, choice: Choice): string | null {
  switch (choice.action) {
    case 'plant':
      return checkPlant(g, choice.species, choice.x, choice.row);
    case 'build':
      return checkBuild(g, choice.structure, choice.x, choice.row);
    case 'water':
      return checkWater(g, choice.target);
    case 'harvest':
      return checkHarvest(g, choice.target);
    case 'rest':
      return null;
  }
}

export interface Outcome {
  garden: Garden;
  /** Id of the new plant or structure, or of the plant watered / harvested. */
  target?: string;
  amount?: number;
}

/** Apply a checked choice. Throws if the choice breaks a rule. */
export function applyChoice(prev: Garden, choice: Choice): Outcome {
  const reason = checkChoice(prev, choice);
  if (reason) throw new Error(reason);
  const g = cloneGarden(prev);
  switch (choice.action) {
    case 'plant': {
      const id = `p${g.nextPlant++}`;
      g.plants.push({
        id,
        species: choice.species,
        x: choice.x,
        row: choice.row,
        day: g.day,
        stage: 1,
        bloom: 0,
        fruit: 0,
        status: 'growing',
      });
      return { garden: g, target: id };
    }
    case 'build': {
      const id = `s${g.nextStructure++}`;
      const structure: Structure = { id, type: choice.structure, x: choice.x, row: choice.row, day: g.day };
      if (choice.structure === 'birdhouse') {
        const tree = g.plants.find((p) => p.x === choice.x && p.row === choice.row && isTree(p));
        if (tree) structure.on = tree.id;
      }
      if (choice.structure === 'bridge') {
        const log = g.plants.find((p) => p.status === 'fallen');
        if (log) {
          structure.on = log.id;
          g.plants = g.plants.filter((p) => p !== log);
        }
      }
      g.structures.push(structure);
      return { garden: g, target: id };
    }
    case 'water': {
      const plant = plantById(g, choice.target);
      if (plant) plant.stage += 1;
      g.stats.watered++;
      return { garden: g, target: choice.target };
    }
    case 'harvest': {
      const plant = plantById(g, choice.target);
      const amount = plant?.fruit ?? 0;
      if (plant) plant.fruit = 0;
      g.stats.harvested += amount;
      return { garden: g, target: choice.target, amount };
    }
    case 'rest':
      return { garden: g };
  }
}

export interface Options {
  frozen: string | null;
  plant: { species: SpeciesId; cells: Cell[] }[];
  build: { structure: Buildable; cells: Cell[] }[];
  water: Plant[];
  harvest: Plant[];
}

/** Every legal choice for the garden as it is after today's weather. */
export function options(g: Garden): Options {
  const cells: Cell[] = [];
  for (let x = MARGIN; x < WIDTH - MARGIN; x++) for (let row = 0; row < ROWS; row++) cells.push({ x, row });

  const plant = (Object.keys(SPECIES) as SpeciesId[])
    .map((species) => ({ species, cells: cells.filter((c) => checkPlant(g, species, c.x, c.row) === null) }))
    .filter((o) => o.cells.length > 0);

  const build = (Object.keys(STRUCTURES) as (keyof typeof STRUCTURES)[])
    .filter((t): t is Buildable => t !== 'boat')
    .map((structure) => ({
      structure,
      cells: cells.filter((c) => checkBuild(g, structure, c.x, c.row) === null),
    }))
    .filter((o) => o.cells.length > 0);

  return {
    frozen: frozenGround(g),
    plant,
    build,
    water: g.plants.filter((p) => checkWater(g, p.id) === null),
    harvest: g.plants.filter((p) => checkHarvest(g, p.id) === null),
  };
}
