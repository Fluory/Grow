import Link from 'next/link';
import { Countdown } from '@/features/chrome';
import { CONDITION_INFO, describeWeather, formatDate, type DayEntry, type GardenStats } from '@/features/garden';
import { WeatherIcon } from '@/features/weather';
import { Magnetic, SplitReveal } from '@/shared/motion';
import styles from './Hero.module.css';
import { SceneSection } from './SceneSection';

export function Hero({ latest, stats }: { latest: DayEntry; stats: GardenStats }) {
  const w = latest.weather;
  return (
    <SceneSection className={styles.hero} camera="hero" shiftY={0.2} mobileShiftY={0.3} labelledBy="hero-title">
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className="eyebrow">
            Day {latest.day} · {formatDate(latest.date)} · Heilbronn
          </p>
          <SplitReveal as="h1" id="hero-title" className={styles.heroTitle} by="chars" immediate>
            A garden that grows <em>with the weather.</em>
          </SplitReveal>
          <SplitReveal as="p" className="lede" by="lines" immediate delay={0.5}>
            Every morning at 08:53 a Claude routine reads yesterday&apos;s weather in Heilbronn. Rain grows, sun ripens,
            frost stops, storm fells – then the gardener makes one choice, and exactly one commit.
          </SplitReveal>
          <div className={styles.heroActions}>
            <Magnetic>
              <Link href="/garden" className="btn btn-accent">
                Walk the garden <span className="arrow">→</span>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="/weather" className="btn btn-ghost">
                The weather record
              </Link>
            </Magnetic>
          </div>
        </div>
        <aside className={`${styles.today} glass`} aria-label="Today in the garden">
          <div className={styles.todayHead}>
            <span className="eyebrow">Today · Day {latest.day}</span>
            <span className="pill">
              <span className="dot" aria-hidden="true" /> live
            </span>
          </div>
          {w ? (
            <p className={styles.todayWeather}>
              <WeatherIcon condition={w.condition} size={22} />
              <span>
                <strong>{CONDITION_INFO[w.condition].motto}</strong> {describeWeather(w)} yesterday
              </span>
            </p>
          ) : (
            <p className={styles.todayWeather}>
              <WeatherIcon condition="sun" size={22} />
              <span>
                <strong>Planted today.</strong> The first weather arrives tomorrow.
              </span>
            </p>
          )}
          <p className={styles.todayTitle}>{latest.title}</p>
          <p className={styles.todayLore}>{latest.lore}</p>
          <div className={styles.todayMeta}>
            <span>
              {stats.living} plants · {stats.rainTotal.toFixed(0)} mm of rain
            </span>
            <span>
              next weather in <Countdown />
            </span>
          </div>
        </aside>
      </div>
      <div className={styles.scrollCue} aria-hidden="true">
        SCROLL
        <span />
      </div>
    </SceneSection>
  );
}
