import { describeWeather, type DayEntry } from '@/features/garden';
import { Reveal } from '@/shared/motion';
import styles from './Routine.module.css';
import { SceneSection } from './SceneSection';
import { SectionHead } from './SectionHead';

const STEPS = [
  ['08:53', 'The routine wakes up', 'A Claude routine starts in the cloud, every day at 08:53 in Heilbronn.'],
  ['01', 'Is today already done?', 'If there is a commit for today it stops. Running twice changes nothing.'],
  [
    '02',
    'Ask the sky',
    'npm run day -- weather fetches yesterday in Heilbronn from Open-Meteo – or repeats the last day, marked.',
  ],
  [
    '03',
    'Let nature act',
    'npm run day -- plan shows what the weather does to the garden and every choice that is left.',
  ],
  ['04', 'Choose and write', 'Claude plants, builds, waters, harvests or rests – and writes one line of lore.'],
  ['05', 'Exactly one commit', 'A pull request with one commit – once CI is green it is merged into main.'],
  ['06', 'The site grows too', 'The merge redeploys this website. The garden you see is the commit of today.'],
] as const;

export function Routine({ latest, routineUrl }: { latest: DayEntry; routineUrl: string }) {
  return (
    <SceneSection className="section" camera="far" dim={0.62} labelledBy="routine-title">
      <div className="container">
        <SectionHead eyebrow="How it grows" title="Tended by a routine, one commit at a time." id="routine-title">
          The weather is real and nobody controls it. The gardener is a scheduled Claude routine – inside a strict frame
          of code, tests and continuous integration. Everything it does is public.
        </SectionHead>
        <div className={styles.routine}>
          <Reveal>
            <ol className={styles.steps}>
              {STEPS.map(([no, title, text]) => (
                <li key={no} className={`${styles.step} glass`}>
                  <span className={styles.stepNo}>{no}</span>
                  <div>
                    <p className={styles.stepTitle}>{title}</p>
                    <p className={styles.stepText}>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
          <div className={`${styles.commit} glass`}>
            <p className="eyebrow">Today&apos;s commit</p>
            <pre className={styles.terminal}>
              <span className={styles.prompt}>$</span> npm run day -- status{'\n'}
              <span className={styles.dim}>{`{ "day": ${latest.day}, "done": true }`}</span>
              {'\n\n'}
              <span className={styles.prompt}>$</span> git log -1 --format=%s{'\n'}
              <span
                className={styles.ok}
              >{`Day ${latest.day}: ${latest.title}${latest.weather ? ` (${describeWeather(latest.weather)})` : ''}`}</span>
              {'\n\n'}
              <span className={styles.dim}># one day of weather · one choice · one commit</span>
            </pre>
            <p className="muted">
              The routine&apos;s instructions are a file in the repository – versioned, reviewable, open.
            </p>
            <p>
              <a className="btn btn-ghost" href={routineUrl}>
                Read ROUTINE.md <span className="arrow">→</span>
              </a>
            </p>
          </div>
        </div>
      </div>
    </SceneSection>
  );
}
