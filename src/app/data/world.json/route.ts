import { getWorld } from '@/features/world-data';

export const dynamic = 'force-static';

/** The garden for the browser (3D scene and explorer), cached with every deployment. */
export function GET() {
  return Response.json(getWorld());
}
