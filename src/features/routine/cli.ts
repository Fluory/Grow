import { parseArgs } from 'node:util';
import {
  addDays,
  applyDay,
  applyWeather,
  berlinDate,
  createGenesis,
  isBuildable,
  isIsoDate,
  isSpecies,
  recommend,
  replay,
  validateWorld,
  WorldRuleError,
  type Buildable,
  type Choice,
  type SpeciesId,
} from '@/features/garden';
import { PATHS, readWorld, staleFiles, worldExists, writeWorld } from './files';
import { commitMessage, commitTitle, plan, prBody, status } from './report';
import { loadWeather } from './weather-client';

/**
 * The daily routine's toolbox. Claude calls these commands; the code guarantees the rules.
 *
 *   npm run day -- status            is today's change already there?
 *   npm run day -- weather           yesterday's weather in Heilbronn (fetched once, cached in tmp/)
 *   npm run day -- plan              weather, what nature will do, every legal choice + a suggestion
 *   npm run day -- apply --action plant --species oak --x 20 --row 1 --lore "…"
 *   npm run day -- apply --action build --structure bench --x 22 --row 2
 *   npm run day -- apply --action water|harvest --target p3      |  --action rest
 *   npm run day -- auto              let the rule-based director decide
 *   npm run day -- check             validate world.json and the generated files
 *   npm run day -- render            regenerate garden.svg, LOGBOOK.md, RULES.md
 *   npm run day -- pr-body | commit-message | commit-title
 *   npm run day -- genesis --date YYYY-MM-DD   create a brand-new garden (once)
 */

const EXIT_RULE = 2;
const EXIT_ALREADY_DONE = 3;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    date: { type: 'string' },
    action: { type: 'string' },
    species: { type: 'string' },
    structure: { type: 'string' },
    target: { type: 'string' },
    x: { type: 'string' },
    row: { type: 'string' },
    title: { type: 'string' },
    lore: { type: 'string' },
    'weather-file': { type: 'string' },
    'image-url': { type: 'string' },
    verify: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
});

const print = (value: unknown) =>
  process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`);
const fail = (message: string, code = 1): never => {
  process.stderr.write(`✗ ${message}\n`);
  process.exit(code);
};

function today(): string {
  const date = values.date ?? berlinDate();
  if (!isIsoDate(date)) fail(`--date must be YYYY-MM-DD, got "${date}"`);
  return date;
}

function int(name: 'x' | 'row'): number {
  const raw = values[name];
  const n = Number(raw);
  if (raw === undefined || !Number.isInteger(n)) fail(`--${name} must be a whole number`);
  return n;
}

function choiceFromArgs(): Choice {
  switch (values.action) {
    case 'plant': {
      const species = values.species ?? '';
      if (!isSpecies(species)) fail(`--species is not a plant of this garden: "${species}"`);
      return { action: 'plant', species: species as SpeciesId, x: int('x'), row: int('row') };
    }
    case 'build': {
      const structure = values.structure ?? '';
      if (!isBuildable(structure)) fail(`--structure cannot be built: "${structure}"`);
      return { action: 'build', structure: structure as Buildable, x: int('x'), row: int('row') };
    }
    case 'water':
    case 'harvest':
      if (!values.target) fail('--target <plant id> is required');
      return { action: values.action, target: values.target as string };
    case 'rest':
      return { action: 'rest' };
    default:
      return fail('--action must be plant, build, water, harvest or rest');
  }
}

async function commit(choice: Choice | 'director', date: string) {
  const world = readWorld();
  const s = status(world, date);
  if (s.done) fail(`Day for ${date} is already recorded – nothing to do.`, EXIT_ALREADY_DONE);
  const { weather } = await loadWeather(world, s.weatherDate, values['weather-file']);
  const picked = choice === 'director' ? recommend(applyWeather(replay(world), weather, s.day, date)).choice : choice;
  try {
    const result = applyDay(
      world,
      {
        weather,
        choice: picked,
        title: choice === 'director' ? undefined : values.title,
        lore: choice === 'director' ? undefined : values.lore,
        source: choice === 'director' ? 'director' : 'claude',
      },
      date,
    );
    const files = writeWorld(result.world);
    print({
      day: result.entry.day,
      date: result.entry.date,
      weather: weather.condition,
      nature: result.garden.effects,
      action: result.entry.action,
      title: result.entry.title,
      lore: result.entry.lore,
      source: result.entry.source,
      commitTitle: commitTitle(result.world),
      files,
    });
  } catch (error) {
    if (error instanceof WorldRuleError) fail(`rule: ${error.message}`, EXIT_RULE);
    throw error;
  }
}

const command = positionals[0] ?? 'help';

switch (command) {
  case 'status':
    print(status(readWorld(), today()));
    break;

  case 'weather': {
    const world = readWorld();
    const s = status(world, today());
    print(await loadWeather(world, s.weatherDate, values['weather-file']));
    break;
  }

  case 'plan': {
    const date = today();
    const world = readWorld();
    const s = status(world, date);
    if (s.done) {
      print({ ...s, note: 'today is already recorded – stop without changes' });
      break;
    }
    const loaded = await loadWeather(world, s.weatherDate, values['weather-file']);
    print({
      weatherSource: loaded.source,
      ...(loaded.error ? { weatherError: loaded.error } : {}),
      ...plan(world, date, loaded.weather),
    });
    break;
  }

  case 'apply':
    await commit(choiceFromArgs(), today());
    break;

  case 'auto':
    await commit('director', today());
    break;

  case 'render': {
    const files = writeWorld(readWorld());
    print(files.length ? `updated: ${files.join(', ')}` : 'everything up to date');
    break;
  }

  case 'check': {
    if (!worldExists()) fail(`${PATHS.world} is missing – run "npm run day -- genesis --date YYYY-MM-DD" once`);
    const world = readWorld();
    const problems = validateWorld(world);
    const stale = staleFiles(world);
    if (stale.length) problems.push(`out of date: ${stale.join(', ')} – run "npm run world:render"`);
    if (problems.length) fail(`world check failed:\n  - ${problems.join('\n  - ')}`);
    print(
      `world ok – day ${world.days[world.days.length - 1]?.day}, ${world.plants.length} plants, ${world.structures.length} structures, generated files up to date`,
    );
    break;
  }

  case 'pr-body':
    print(prBody(readWorld(), { imageUrl: values['image-url'], verify: values.verify }));
    break;

  case 'commit-message':
    print(commitMessage(readWorld()).trimEnd());
    break;

  case 'commit-title':
    print(commitTitle(readWorld()));
    break;

  case 'genesis': {
    if (worldExists() && !values.force)
      fail(`${PATHS.world} already exists – genesis happens only once (use --force to overwrite)`);
    const date = today();
    const files = writeWorld(createGenesis(date));
    print({ genesis: date, files, firstRoutine: addDays(date, 1) });
    break;
  }

  default:
    print(
      [
        'usage: npm run day -- <command> [options]',
        '',
        '  status | weather | plan | apply | auto | check | render | pr-body | commit-message | commit-title | genesis',
        '',
        '  --date YYYY-MM-DD        pretend it is this day (default: today in Europe/Berlin)',
        '  --weather-file <path>    use this weather JSON instead of Open-Meteo',
        '  apply: --action plant --species <id> --x <col> --row <0-2>',
        '         --action build --structure <id> --x <col> --row <0-2>',
        '         --action water|harvest --target <plant id>  |  --action rest',
        '         [--title "<title>"] [--lore "<one line>"]',
      ].join('\n'),
    );
    if (command !== 'help') process.exit(1);
}
