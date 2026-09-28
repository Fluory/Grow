import type { ReactNode } from 'react';
import { CONDITION_INFO, SPECIES, SPECIES_LIST, speciesRule, type Condition, type SpeciesId } from '@/features/garden';
import { derive, GRAMMARS, type Module } from '@/features/plants';
import { gardenPicture, renderGardenSvg } from '@/features/render';
import { WeatherIcon } from '@/features/weather';
import { getSimulation, getTimeline, getWorld } from '@/features/world-data';
import { PlantCover } from '../PlantCover';
import styles from './mdx.module.css';

export function Callout({ icon = '💡', children }: { icon?: string; children: ReactNode }) {
  return (
    <aside className={`${styles.callout} glass`}>
      <span className={styles.calloutIcon} aria-hidden="true">
        {icon}
      </span>
      <div>{children}</div>
    </aside>
  );
}

/** The README picture – today's garden, or a day of the simulated year. */
export function GardenFigure({ simulatedDay, caption }: { simulatedDay?: number; caption?: string }) {
  const simulated = simulatedDay !== undefined;
  const world = simulated ? getSimulation() : getWorld();
  const index = simulated
    ? Math.max(
        0,
        world.days.findIndex((d) => d.day === simulatedDay),
      )
    : world.days.length - 1;
  const svg = renderGardenSvg(gardenPicture(world, simulated ? undefined : getTimeline(), index), { animated: true });
  const entry = world.days[index];
  return (
    <figure className={styles.figure}>
      <div className={`${styles.figureFrame} glass`} dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption>
        {caption ??
          (simulated
            ? `Day ${entry?.day ?? 0} of the simulated year – real Heilbronn weather, grown by the rule-based director.`
            : `The garden on day ${entry?.day ?? 0} – straight from world/world.json.`)}
      </figcaption>
    </figure>
  );
}

/** One plant at increasing growth: the L-system gains a level of branches as it grows. */
export function GrowthStrip({ species, steps = [0.05, 0.2, 0.4, 0.65, 1] }: { species: SpeciesId; steps?: number[] }) {
  return (
    <figure className={styles.figure}>
      <div className={`${styles.strip} glass`}>
        {steps.map((g) => (
          <div key={g} className={styles.stripItem}>
            <PlantCover species={species} growth={g} size={150} />
            <span>
              stage {Math.max(1, Math.round(g * SPECIES[species].maxStage))} / {SPECIES[species].maxStage}
            </span>
          </div>
        ))}
      </div>
      <figcaption>
        The same {SPECIES[species].label} – same seed, same grammar – at five stages. Every stage is a rain day.
      </figcaption>
    </figure>
  );
}

function moduleText(m: Module): string {
  switch (m.s) {
    case 'F':
      return 'F';
    case '+':
      return m.a >= 0 ? '+' : '−';
    case '&':
      return m.a >= 0 ? '&' : '^';
    case '/':
      return '/';
    case 'L':
      return 'L';
    case 'K':
      return 'K';
    case 'T':
    case '@':
      return '';
    default:
      return m.s;
  }
}

/** The module string of a plant after 0, 1 and 2 rewrites – watch it grow. */
export function Derivation({ species, seed = 7, levels = 3 }: { species: SpeciesId; seed?: number; levels?: number }) {
  const grammar = GRAMMARS[species];
  if (!grammar) return null;
  const rows = Array.from({ length: levels }, (_, n) => {
    const text = derive({ ...grammar, levels: n }, seed)
      .map(moduleText)
      .join('');
    return { n, text, length: text.length };
  });
  return (
    <div className={`${styles.derivation} glass`}>
      {rows.map((r) => (
        <p key={r.n}>
          <span className={styles.derivationLevel}>level {r.n}</span>
          <code>{r.text.length > 220 ? `${r.text.slice(0, 220)}…` : r.text}</code>
          <span className={styles.derivationLength}>{r.length} symbols</span>
        </p>
      ))}
    </div>
  );
}

const ORDER: Condition[] = ['storm', 'snow', 'frost', 'rain', 'sun', 'cloudy'];

/** The six conditions, in the order they are checked. */
export function ConditionTable() {
  return (
    <div className={`${styles.tableWrap} glass`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Condition</th>
            <th scope="col">What it does</th>
          </tr>
        </thead>
        <tbody>
          {ORDER.map((c) => (
            <tr key={c}>
              <td>
                <span className={styles.condition}>
                  <WeatherIcon condition={c} size={18} /> <strong>{CONDITION_INFO[c].label}</strong>
                </span>
              </td>
              <td>{CONDITION_INFO[c].effect}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Every plant and its rules, generated from the catalogue the code enforces. */
export function SpeciesTable() {
  return (
    <div className={`${styles.tableWrap} glass`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Plant</th>
            <th scope="col">Rules</th>
          </tr>
        </thead>
        <tbody>
          {SPECIES_LIST.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.label}</strong>
              </td>
              <td>{speciesRule(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
