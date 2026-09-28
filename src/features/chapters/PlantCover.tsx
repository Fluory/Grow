import { SPECIES, type SpeciesId } from '@/features/garden';
import { plantSvg } from '@/features/render';

/** A plant drawn by the same L-system renderer as the garden – used as chapter cover art. */
export function PlantCover({
  species,
  growth = 1,
  bloom = 0,
  fruit = 0,
  date = '2026-07-15',
  size = 140,
}: {
  species: SpeciesId;
  growth?: number;
  bloom?: number;
  fruit?: number;
  date?: string;
  size?: number;
}) {
  const info = SPECIES[species];
  const plant = {
    id: `cover-${species}`,
    species,
    x: 0,
    row: 1,
    day: 0,
    stage: Math.max(1, Math.round(growth * info.maxStage)),
    bloom,
    fruit,
    status: 'growing' as const,
  };
  const unit = (size * 0.78) / Math.max(1.2, info.height * growth);
  const svg = plantSvg(plant, date, { x: size / 2, y: size * 0.93, unit, snow: false });
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
