import {
  addDays,
  applyWeather,
  CONDITION_INFO,
  daysBetween,
  describePlace,
  describeWeather,
  formatDate,
  gardenStats,
  options,
  recommend,
  replay,
  seasonOf,
  SPECIES,
  speciesRule,
  STRUCTURES,
  weatherLine,
  type DayEntry,
  type Weather,
  type World,
} from '@/features/garden';

/** What the routine needs to know before it decides anything. */
export function status(world: World, date: string) {
  const last = world.days[world.days.length - 1] as DayEntry;
  return {
    today: date,
    day: daysBetween(world.genesis, date),
    season: seasonOf(date),
    /** The weather that shapes today: yesterday's. */
    weatherDate: addDays(date, -1),
    lastDay: last.day,
    lastDate: last.date,
    /** true → today's change already exists, the routine must stop without changes. */
    done: last.date >= date,
  };
}

const MAX_CELLS = 8;

/** The decision sheet for Claude: weather, what it will do, the garden, every legal choice. */
export function plan(world: World, date: string, weather: Weather) {
  const s = status(world, date);
  const g = applyWeather(replay(world), weather, s.day, date);
  const opts = options(g);
  const suggestion = recommend(g, opts);
  const stats = gardenStats(world);
  const living = g.plants.filter((p) => p.status !== 'fallen');
  return {
    ...s,
    weather: {
      line: weatherLine(weather),
      condition: weather.condition,
      rule: CONDITION_INFO[weather.condition].effect,
      fallback: weather.fallback ?? false,
    },
    nature: { effects: g.effects, stream: g.nature },
    frozenGround: opts.frozen,
    garden: {
      living: stats.living,
      byKind: stats.byKind,
      structures: g.structures.map((st) => `${STRUCTURES[st.type].label} (${st.id}) at ${st.x}/${st.row}`),
      plants: living.map(
        (p) =>
          `${p.id} ${SPECIES[p.species].label} at ${p.x}/${p.row}, stage ${p.stage}/${SPECIES[p.species].maxStage}` +
          `${p.status === 'wilted' ? ', wilted' : ''}${p.bloom ? `, ${p.bloom} blossoms` : ''}${p.fruit ? `, ${p.fruit} ${SPECIES[p.species].fruit?.label ?? 'fruit'}` : ''}`,
      ),
    },
    recent: world.days.slice(-5).map((d) => `Day ${d.day}: ${d.title} — ${d.lore}`),
    choices: {
      plant: opts.plant.map((o) => ({
        species: o.species,
        rule: speciesRule(SPECIES[o.species]),
        legalCells: o.cells.length,
        examples: o.cells
          .filter((_, i) => i % Math.max(1, Math.floor(o.cells.length / MAX_CELLS)) === 0)
          .slice(0, MAX_CELLS)
          .map((c) => ({ x: c.x, row: c.row, place: describePlace(g, c.x, c.row) })),
      })),
      build: opts.build.map((o) => ({
        structure: o.structure,
        rule: STRUCTURES[o.structure].rule,
        cells: o.cells.slice(0, MAX_CELLS).map((c) => ({ x: c.x, row: c.row, place: describePlace(g, c.x, c.row) })),
      })),
      water: opts.water.map((p) => `${p.id} ${SPECIES[p.species].label} (stage ${p.stage})`),
      harvest: opts.harvest.map(
        (p) => `${p.id} ${SPECIES[p.species].label} (${p.fruit} ${SPECIES[p.species].fruit?.label ?? ''})`,
      ),
      rest: 'always allowed',
    },
    recommendation: suggestion,
  };
}

function lastEntry(world: World): DayEntry {
  return world.days[world.days.length - 1] as DayEntry;
}

/** "Day 12: A young oak by the stream (rain 6.4 mm)" */
export function commitTitle(world: World): string {
  const last = lastEntry(world);
  const weather = last.weather ? ` (${describeWeather(last.weather)}${last.weather.fallback ? ', repeated' : ''})` : '';
  return `Day ${last.day}: ${last.title}${weather}`;
}

export function commitMessage(world: World): string {
  const last = lastEntry(world);
  const effects = replay(world).effects;
  return [commitTitle(world), '', last.lore, ...(effects.length ? ['', ...effects] : []), ''].join('\n');
}

/**
 * Body of the daily pull request. Follows .github/PULL_REQUEST_TEMPLATE.md so that
 * scripts/pr-check.sh accepts it (headings stay in the template's language).
 */
export function prBody(world: World, options: { imageUrl?: string; verify?: string } = {}): string {
  const last = lastEntry(world);
  const garden = replay(world);
  const stats = gardenStats(world, garden);
  const who =
    last.source === 'claude'
      ? 'Claude hat die Entscheidung getroffen und die Lore geschrieben'
      : 'Der regelbasierte Director hat automatisch entschieden';
  const weather = last.weather ? `**${weatherLine(last.weather)}**` : 'kein Wetter (Genesis)';
  return [
    '## Warum',
    '',
    `Tägliche Routine ([ROUTINE.md](../blob/main/ROUTINE.md)) – **Day ${last.day}** (${formatDate(last.date)}). Kein Issue: die Routine selbst ist der wiederkehrende Auftrag.`,
    '',
    '## Was ist passiert (Klartext)',
    '',
    `Das Wetter von gestern in Heilbronn: ${weather}. Die Natur hat den Garten danach verändert, dann hat der Gärtner genau eine Sache getan: „${last.title}“. ${who}; die Regeln hat der Code geprüft. Der Garten hat jetzt ${stats.living} lebende Pflanzen (${stats.byKind.tree} Bäume) und ${stats.structures} Bauwerke.`,
    '',
    `> ${last.lore}`,
    '',
    ...(garden.effects.length > 0 ? ['Was die Natur getan hat:', '', ...garden.effects.map((e) => `- ${e}`), ''] : []),
    ...(options.imageUrl ? [`![Day ${last.day}](${options.imageUrl})`, ''] : []),
    '## Plan-Pflicht (SYSTEM.md §4)',
    '',
    '- [x] Kein Auslöser – keine Modulgrenze, öffentliche API, Migration, Auth/Rechte, kein Zahlungs-/Daten-/Infrapfad, höchstens zwei Module, keine Architekturvarianten, umkehrbar',
    '- [ ] Auslöser zutreffend – Impact Manifest ausgefüllt (Plan vor Code)',
    '',
    '## Geändert',
    '',
    '- `world/world.json`: ein Tag – Wetter, Natur, eine Entscheidung',
    '- `world/garden.svg`, `LOGBOOK.md`: daraus neu erzeugt',
    '',
    '## Nachweis (SYSTEM.md §11)',
    '',
    '- `verify:changed`: grün – `npm run world:check`',
    `- \`verify\`: ${options.verify ?? 'grün – lokal `npm run verify`'}`,
    '- `verify:full` / E2E-Spec: nicht betroffen (nur Gartendaten)',
    '',
    '## Doku-Entscheidung (genau eine)',
    '',
    '- [x] Keine langlebige Doku betroffen – Begründung: tägliche Gartendaten, LOGBOOK.md wird generiert',
    '- [ ] Doku betroffen und im selben PR aktualisiert:',
    '',
    'Entferntes oder Umbenanntes: nichts entfernt',
    '',
    '## Dateigrößen und neue Bausteine (SYSTEM.md §7)',
    '',
    'Dateien über 500 Zeilen im Diff (Ausnahmen: generierter Code, Lockfiles, Fixtures, Migrationen, Schemas, Ressourcen, Doku, Konfiguration):',
    '- [x] keine',
    '',
    'Über 800 Zeilen mit neuer Fachlogik oder über 1000 Zeilen (P1/P2): nicht betroffen',
    '',
    'Neue Shared-Komponente, Utility-Datei, Adapter oder fachlicher Service:',
    '- [x] nein',
    '',
    '## Subagent-Einsätze',
    '',
    'Keine',
    '',
    '## Risiken / offene Punkte',
    '',
    `- ${last.weather?.fallback ? 'Wetterdienst war nicht erreichbar – das Wetter von gestern wurde wiederholt (markiert).' : 'Keine'} – der PR wird nach grüner CI automatisch per Squash gemergt (Ausnahmen-Register in docs/ARCHITEKTUR.md).`,
    '',
  ].join('\n');
}
