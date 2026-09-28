import { Resvg } from '@resvg/resvg-js';
import { timeline, type World } from '@/features/garden';
import { gardenPicture, renderGardenSvg } from '@/features/render';
import { encodeGif } from './gif';

/**
 * The garden growing day by day as an animated GIF: every n-th day's README picture,
 * rasterised with resvg. Used for the monthly release and the README.
 */
export function timelapseGif(world: World, options: { every?: number; width?: number } = {}): Uint8Array {
  const every = options.every ?? 3;
  const width = options.width ?? 480;
  const gardens = timeline(world);
  const indices: number[] = [];
  for (let i = 0; i < world.days.length; i += every) indices.push(i);
  if (indices[indices.length - 1] !== world.days.length - 1) indices.push(world.days.length - 1);

  let height = 0;
  const frames = indices.map((i) => {
    const svg = renderGardenSvg(gardenPicture(world, gardens, i), { animated: false, highlight: false });
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render();
    height = image.height;
    return new Uint8ClampedArray(image.pixels);
  });
  return encodeGif(frames, width, height, { delay: 110, lastDelay: 3000 });
}
