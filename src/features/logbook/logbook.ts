import {
  formatDate,
  formatMonth,
  gardenStats,
  SPECIES,
  timeline,
  type Condition,
  type DayEntry,
  type World,
} from '@/features/garden';

/**
 * LOGBOOK.md – the garden's chronicle, newest day first: the weather, what nature did and
 * the gardener's one choice. Generated from world.json; never edit it by hand.
 */

export const WEATHER_EMOJI: Record<Condition, string> = {
  sun: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  frost: '🧊',
  snow: '🌨️',
  storm: '🌬️',
};

export function actionEmoji(entry: DayEntry): string {
  switch (entry.action) {
    case 'genesis':
      return '🌰';
    case 'plant':
      return entry.species && SPECIES[entry.species].kind === 'tree' ? '🌳' : '🌱';
    case 'build':
      return entry.structure === 'snowman' ? '⛄' : '🔨';
    case 'water':
      return '💧';
    case 'harvest':
      return '🧺';
    case 'rest':
      return '🪑';
  }
}

export function weatherBadge(entry: DayEntry): string {
  const w = entry.weather;
  if (!w) return '';
  const value =
    w.condition === 'rain' || w.condition === 'storm'
      ? `${w.rain.toFixed(1)} mm`
      : w.condition === 'snow'
        ? `${w.snow.toFixed(1)} cm`
        : w.condition === 'sun'
          ? `${w.sun.toFixed(1)} h`
          : `${Math.round(w.tmin)}°/${Math.round(w.tmax)}°`;
  return `${WEATHER_EMOJI[w.condition]} ${value}${w.fallback ? ' *(repeated)*' : ''}`;
}

export function renderLogbook(world: World): string {
  const gardens = timeline(world);
  const last = gardens[gardens.length - 1];
  const stats = gardenStats(world, last);
  const out: string[] = [
    '# Logbook',
    '',
    `> The chronicle of **${world.name}**, newest day first: yesterday’s weather in Heilbronn, what it did to the`,
    '> garden, and the gardener’s one choice. Written by the daily routine ([ROUTINE.md](ROUTINE.md)); the single',
    '> source of truth is [`world/world.json`](world/world.json). Days marked *auto* were decided by the rule-based director.',
    '',
    `**Day ${stats.day}** · ${stats.living} living plants (${stats.byKind.tree} trees) · ${stats.structures} things built · ` +
      `${stats.rainDays} rain days, ${stats.rainTotal.toFixed(1)} mm in total · ${stats.harvested} fruit harvested · planted ${formatDate(world.genesis)}`,
  ];
  let month = '';
  for (let i = world.days.length - 1; i >= 0; i--) {
    const entry = world.days[i] as DayEntry;
    const m = formatMonth(entry.date);
    if (m !== month) {
      month = m;
      out.push('', `## ${m}`, '');
    }
    const [, , d] = entry.date.split('-');
    const monthShort = formatDate(entry.date).split(' ')[1];
    const auto = entry.source === 'director' ? ' <sub>· auto</sub>' : '';
    const badge = weatherBadge(entry);
    out.push(
      `- **Day ${entry.day}** · ${Number(d)} ${monthShort}${badge ? ` · ${badge}` : ''} · ${actionEmoji(entry)} **${entry.title}** — ${entry.lore}${auto}`,
    );
    const effects = gardens[i]?.effects ?? [];
    if (effects.length > 0) out.push(`  <br><sub>${effects.join(' ')}</sub>`);
  }
  out.push('');
  return out.join('\n');
}
