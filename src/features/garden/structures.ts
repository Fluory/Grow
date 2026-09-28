import type { StructureType } from './schema';
import type { Zone } from './terrain';

/** Things the gardener can build – each unlocked by what the weather has grown so far. */

export interface StructureInfo {
  id: StructureType;
  label: string;
  plural: string;
  max: number;
  /** Where it may stand; `channel` structures span the stream, `tree` ones hang in a tree. */
  place: readonly Zone[] | 'channel' | 'tree';
  /** The requirement, one sentence – RULES.md is generated from it. */
  rule: string;
}

export const STRUCTURES: Record<StructureType, StructureInfo> = {
  stone: {
    id: 'stone',
    label: 'mossy stone',
    plural: 'mossy stones',
    max: 8,
    place: ['meadow', 'bank', 'beach'],
    rule: 'fits on any free cell of dry ground',
  },
  bench: {
    id: 'bench',
    label: 'bench',
    plural: 'benches',
    max: 2,
    place: ['meadow', 'bank'],
    rule: 'needs shade: a tree of stage 20 or more within three columns',
  },
  birdhouse: {
    id: 'birdhouse',
    label: 'birdhouse',
    plural: 'birdhouses',
    max: 3,
    place: 'tree',
    rule: 'hangs in a tree of stage 24 or more, one per tree',
  },
  beehive: {
    id: 'beehive',
    label: 'beehive',
    plural: 'beehives',
    max: 1,
    place: ['meadow'],
    rule: 'needs three flowering plants in the garden',
  },
  stepping: {
    id: 'stepping',
    label: 'row of stepping stones',
    plural: 'stepping stones',
    max: 1,
    place: 'channel',
    rule: 'crosses the stream in the middle row while the water is at level 5 or lower',
  },
  bridge: {
    id: 'bridge',
    label: 'bridge',
    plural: 'bridges',
    max: 1,
    place: 'channel',
    rule: 'is built from a fallen tree across the stream in the back row – a storm has to fell one first',
  },
  lantern: {
    id: 'lantern',
    label: 'lantern',
    plural: 'lanterns',
    max: 3,
    place: ['meadow', 'bank'],
    rule: 'stands within four columns of a bench or the bridge',
  },
  shed: {
    id: 'shed',
    label: 'garden shed',
    plural: 'garden sheds',
    max: 1,
    place: ['meadow'],
    rule: 'needs eight living plants to look after and three free meadow columns in the back row',
  },
  barrel: {
    id: 'barrel',
    label: 'rain barrel',
    plural: 'rain barrels',
    max: 1,
    place: ['meadow'],
    rule: 'stands right next to the shed (two columns from its centre)',
  },
  sundial: {
    id: 'sundial',
    label: 'sundial',
    plural: 'sundials',
    max: 1,
    place: ['meadow'],
    rule: 'needs twenty sunny days on record',
  },
  scarecrow: {
    id: 'scarecrow',
    label: 'scarecrow',
    plural: 'scarecrows',
    max: 1,
    place: ['meadow', 'bank'],
    rule: 'guards at least three living annual flowers (sunflowers or poppies)',
  },
  snowman: {
    id: 'snowman',
    label: 'snowman',
    plural: 'snowmen',
    max: 2,
    place: ['meadow', 'bank', 'beach'],
    rule: 'needs snow on the ground – and melts when it is gone',
  },
  boat: {
    id: 'boat',
    label: 'paper boat',
    plural: 'paper boats',
    max: 1,
    place: ['beach'],
    rule: 'only arrives with a storm and floats away when the water rises over it',
  },
};

export const STRUCTURE_LIST = Object.values(STRUCTURES);

/** Columns a structure covers (the shed is three columns wide). */
export function footprint(type: StructureType, x: number): number[] {
  return type === 'shed' ? [x - 1, x, x + 1] : [x];
}
