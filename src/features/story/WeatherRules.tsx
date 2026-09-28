import { CONDITION_INFO, formatDate, monthOf, THRESHOLDS, type Condition, type DayEntry } from '@/features/garden';
import { gardensOf } from '@/features/scene';
import { WeatherIcon } from '@/features/weather';
import { getSimulation } from '@/features/world-data';
import { Reveal } from '@/shared/motion';
import { SceneSection } from './SceneSection';
import { SectionHead } from './SectionHead';
import styles from './WeatherRules.module.css';

interface Rule {
  condition: Condition;
  threshold: string;
  camera: 'low' | 'hero' | 'side' | 'overview';
  /** Which day of the simulated year shows this weather best. */
  months: number[];
  effect?: string;
}

const RULES: Rule[] = [
  {
    condition: 'rain',
    threshold: `≥ ${THRESHOLDS.rain} mm · ${THRESHOLDS.heavyRain} mm counts twice`,
    camera: 'low',
    months: [6, 7],
  },
  { condition: 'sun', threshold: `≥ ${THRESHOLDS.sun} h of sunshine, dry`, camera: 'overview', months: [8] },
  { condition: 'frost', threshold: `night below ${THRESHOLDS.frost} °C`, camera: 'side', months: [1, 12] },
  { condition: 'storm', threshold: `gusts ≥ ${THRESHOLDS.stormGust} km/h`, camera: 'low', months: [], effect: 'fell' },
];

/** The day of the simulated year that shows a rule best. */
function showcase(rule: Rule): DayEntry | undefined {
  const sim = getSimulation();
  const gardens = gardensOf(sim);
  return sim.days.find((d, i) => {
    if (d.weather?.condition !== rule.condition) return false;
    if (rule.effect) return (gardens[i]?.effects ?? []).some((e) => e.includes(rule.effect ?? ''));
    return rule.months.includes(monthOf(d.date));
  });
}

/** Four sentences, four scenes: while a card is on screen the 3D garden shows its weather. */
export function WeatherRules({ rulesUrl }: { rulesUrl: string }) {
  return (
    <section className="section" aria-labelledby="rules-title">
      <div className="container">
        <SectionHead
          eyebrow="The four rules"
          title="Rain grows. Sun ripens. Frost stops. Storm fells."
          id="rules-title"
        >
          Every morning the routine records yesterday&apos;s real weather in Heilbronn and boils it down to one
          condition. The condition acts on the garden first – only then does the gardener get a turn.
        </SectionHead>
      </div>
      {RULES.map((rule) => {
        const day = showcase(rule);
        return (
          <SceneSection
            key={rule.condition}
            className={styles.scene}
            camera={rule.camera}
            preview={rule.condition}
            source={day ? 'simulation' : 'real'}
            day={day?.day ?? Infinity}
            shift={-0.14}
            mobileShiftY={0.22}
            labelledBy={`rule-${rule.condition}`}
          >
            <div className={`container ${styles.row}`}>
              <Reveal>
                <article className={`${styles.card} glass`} data-condition={rule.condition}>
                  <span className={styles.icon}>
                    <WeatherIcon condition={rule.condition} size={34} />
                  </span>
                  <h3 id={`rule-${rule.condition}`} className={styles.motto}>
                    {CONDITION_INFO[rule.condition].motto}
                  </h3>
                  <p className={styles.effect}>{CONDITION_INFO[rule.condition].effect}</p>
                  <p className={styles.threshold}>{rule.threshold}</p>
                  {day && (
                    <p className={styles.scenery}>
                      Behind this card: the simulated garden on {formatDate(day.date)} – real weather of that day.
                    </p>
                  )}
                </article>
              </Reveal>
            </div>
          </SceneSection>
        );
      })}
      <div className="container">
        <p className={`${styles.more} glass`}>
          Snow covers the garden and makes snowmen possible; a grey day changes nothing – a good day to water.{' '}
          <a className="link" href={rulesUrl}>
            All rules of the garden →
          </a>
        </p>
      </div>
    </section>
  );
}
