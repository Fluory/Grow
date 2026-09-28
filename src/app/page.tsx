import { ChapterCards } from '@/features/chapters';
import type { Weather } from '@/features/garden';
import { gardenPicture, renderGardenSvg } from '@/features/render';
import {
  Archipelago,
  GardenTeaser,
  Hero,
  LogbookPreview,
  Routine,
  SceneSection,
  SectionHead,
  Timelapse,
  WeatherRules,
  WeatherSection,
} from '@/features/story';
import {
  getDaysNewestFirst,
  getLatest,
  getStats,
  getTimeline,
  getWeatherYear,
  getWorld,
  repoUrl,
} from '@/features/world-data';

/** Below this many recorded days the weather section shows the reference year instead. */
const MIN_RECORD = 30;

export default function HomePage() {
  const world = getWorld();
  const latest = getLatest();
  const stats = getStats();
  const svg = renderGardenSvg(gardenPicture(world, getTimeline()), { caption: false });
  const recorded = world.days.map((d) => d.weather).filter((w): w is Weather => Boolean(w));
  const reference = recorded.length < MIN_RECORD;

  return (
    <>
      <Hero latest={latest} stats={stats} />
      <WeatherRules rulesUrl={repoUrl('blob/main/RULES.md')} />
      <Timelapse real={world} />
      <WeatherSection days={reference ? getWeatherYear() : recorded} reference={reference} />
      <GardenTeaser svg={svg} />
      <Routine latest={latest} routineUrl={repoUrl('blob/main/ROUTINE.md')} />
      <LogbookPreview entries={getDaysNewestFirst().slice(0, 6)} />
      <SceneSection className="section" camera="hero" dim={0.62} labelledBy="chapters-title">
        <div className="container">
          <SectionHead eyebrow="Chapters" title="How it works, in four short stories." id="chapters-title" />
          <ChapterCards />
        </div>
      </SceneSection>
      <Archipelago />
    </>
  );
}
