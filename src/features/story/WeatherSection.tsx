import Link from 'next/link';
import type { Weather } from '@/features/garden';
import { RainCalendar, StatTiles } from '@/features/weather';
import { Reveal } from '@/shared/motion';
import { SceneSection } from './SceneSection';
import { SectionHead } from './SectionHead';

/** The weather so far – headline numbers and the rain calendar – with a link to the full record. */
export function WeatherSection({ days, reference }: { days: Weather[]; reference: boolean }) {
  return (
    <SceneSection className="section" camera="far" dim={0.62} labelledBy="weather-title">
      <div className="container">
        <SectionHead
          eyebrow={reference ? 'The weather · a reference year' : 'The weather so far'}
          title="Heilbronn is the gardener's only boss."
          id="weather-title"
        >
          {reference
            ? 'The real record starts with the garden. Until it is long enough to tell a story, here is the year before it: 364 days of real Heilbronn weather, the same numbers the simulation grew under.'
            : 'Every value below is the real weather in Heilbronn on the day before each commit – fetched from Open-Meteo by the routine and stored in world.json.'}
        </SectionHead>
        <Reveal>
          <StatTiles days={days} />
        </Reveal>
        <Reveal>
          <div className="glass" style={{ padding: 'var(--s-5)', marginTop: 'var(--s-4)' }}>
            <RainCalendar days={days} label={reference ? 'Heilbronn 2025/26' : 'Heilbronn since the garden began'} />
          </div>
        </Reveal>
        <p style={{ marginTop: 'var(--s-6)' }}>
          <Link href="/weather" className="btn btn-ghost">
            The full weather record <span className="arrow">→</span>
          </Link>
        </p>
      </div>
    </SceneSection>
  );
}
