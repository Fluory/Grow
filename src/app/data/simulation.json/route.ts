import { getSimulation } from '@/features/world-data';

export const dynamic = 'force-static';

/** A simulated year (real 2025/26 Heilbronn weather) – labelled as simulation wherever it is shown. */
export function GET() {
  return Response.json(getSimulation());
}
