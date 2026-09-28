import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWorld, timeline, type World } from '@/features/garden';
import { renderLogbook, renderRulesDoc } from '@/features/logbook';
import { gardenPicture, renderGardenSvg } from '@/features/render';
import { serializeWorld } from './serialize';

/** Repository paths of the world and everything derived from it. */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const PATHS = {
  world: 'world/world.json',
  svg: 'world/garden.svg',
  logbook: 'LOGBOOK.md',
  rules: 'RULES.md',
} as const;

export const abs = (relative: string) => join(ROOT, relative);

export function worldExists(): boolean {
  return existsSync(abs(PATHS.world));
}

export function readWorld(): World {
  return parseWorld(JSON.parse(readFileSync(abs(PATHS.world), 'utf8')));
}

/** Everything that is derived from world.json, keyed by repository path. */
export function derivedFiles(world: World): Record<string, string> {
  const gardens = timeline(world);
  return {
    [PATHS.world]: serializeWorld(world),
    [PATHS.svg]: renderGardenSvg(gardenPicture(world, gardens)),
    [PATHS.logbook]: renderLogbook(world),
    [PATHS.rules]: renderRulesDoc(),
  };
}

export function writeWorld(world: World): string[] {
  const written: string[] = [];
  for (const [path, content] of Object.entries(derivedFiles(world))) {
    const target = abs(path);
    mkdirSync(dirname(target), { recursive: true });
    const before = existsSync(target) ? readFileSync(target, 'utf8') : undefined;
    if (before !== content) {
      writeFileSync(target, content);
      written.push(path);
    }
  }
  return written;
}

/** Files whose content on disk differs from what world.json produces. */
export function staleFiles(world: World): string[] {
  return Object.entries(derivedFiles(world))
    .filter(([path, content]) => !existsSync(abs(path)) || readFileSync(abs(path), 'utf8') !== content)
    .map(([path]) => path);
}
