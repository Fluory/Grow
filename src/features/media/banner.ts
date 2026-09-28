import { hashString, type Plant, type SpeciesId } from '@/features/garden';
import { mix, plantSvg, rasterText } from '@/features/render';

/**
 * The README banner: a row of L-system plants growing out of a strip of soil while a rain
 * cloud drifts past, and the title in the pixel font of the archipelago. CSS-animated SVG.
 */

const ROW: [SpeciesId, number, number][] = [
  ['pine', 0.9, 0],
  ['sunflower', 1, 1],
  ['oak', 1, 0],
  ['lavender', 1, 12],
  ['birch', 0.85, 0],
  ['tulip', 1, 1],
  ['apple', 0.95, 0],
  ['reed', 1, 3],
  ['willow', 0.9, 0],
  ['poppy', 1, 4],
];

function textPath(text: string): string {
  const parts: string[] = [];
  rasterText(text, (x, y) => parts.push(`M${x} ${y}h1v1h-1z`));
  return parts.join('');
}

export function bannerSvg(options: { width?: number; height?: number; animated?: boolean } = {}): string {
  const W = options.width ?? 1280;
  const H = options.height ?? 400;
  const animated = options.animated ?? true;
  const ground = H - 64;
  const titleScale = Math.round(H / 26);
  const title = 'GROW';
  const lines = [
    ['A GARDEN THAT GROWS WITH', '#3d5243'],
    ['THE REAL WEATHER IN HEILBRONN', '#3d5243'],
    ['RAIN GROWS · SUN RIPENS', '#4f8a36'],
    ['FROST STOPS · STORM FELLS', '#4f8a36'],
  ] as const;
  const subScale = Math.max(2, Math.floor(H / 170));
  const left = Math.round(W * 0.05);
  const titleY = Math.round(H * 0.12);

  const plants: string[] = [];
  const x0 = W * 0.5;
  const span = W - x0 - W * 0.03;
  ROW.forEach(([species, growth, bloom], i) => {
    const plant: Plant = {
      id: `banner-${i}`,
      species,
      x: 0,
      row: 1,
      day: 0,
      stage: Math.round(growth * 100),
      bloom,
      fruit: 0,
      status: 'growing',
    };
    const stage = { oak: 110, birch: 90, pine: 100, apple: 80, willow: 90 }[species as string];
    if (stage) plant.stage = Math.round(growth * stage);
    else plant.stage = 20;
    const x = x0 + (span * (i + 0.5)) / ROW.length;
    const unit = Math.min(H / 34, (ground - H * 0.08) / 14);
    const svg = plantSvg(plant, '2026-06-20', { x, y: ground, unit, snow: false });
    const delay = (0.35 * i).toFixed(2);
    plants.push(
      animated
        ? `<g class="gr" style="transform-origin:${x.toFixed(1)}px ${ground}px;animation-delay:${delay}s"><g class="sw" style="transform-origin:${x.toFixed(1)}px ${ground}px;animation-delay:-${hashString(species) % 4}s">${svg}</g></g>`
        : svg,
    );
  });

  const hills = (base: number, amp: number, freq: number, phase: number) => {
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 32) pts.push(`${x} ${(base + Math.sin(x / freq + phase) * amp).toFixed(1)}`);
    return `M0 ${H}L${pts.join('L')}L${W} ${H}Z`;
  };
  const rain: string[] = [];
  for (let i = 0; i < 26; i++) {
    const x = (hashString(`r${i}`) % 220) - 110;
    const y = 70 + (hashString(`y${i}`) % 120);
    rain.push(`M${x} ${y}l-4 14`);
  }
  const soilTop = ground;
  const style = animated
    ? `<style>@keyframes gr{from{transform:scale(0)}to{transform:scale(1)}}.gr{animation:gr 1.6s cubic-bezier(.22,1,.36,1) both}@keyframes sw{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.2deg)}}.sw{animation:sw 5s ease-in-out infinite}@keyframes cl{from{transform:translateX(${W * 0.35}px)}to{transform:translateX(${W * 1.05}px)}}.cl{animation:cl 16s linear infinite}@keyframes rn{from{transform:translateY(-10px)}to{transform:translateY(24px)}}.rn{animation:rn .6s linear infinite}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`
    : '';
  const cloud = `<g${animated ? ' class="cl"' : ` transform="translate(${W * 0.62} 0)"`}><path d="${rain.join('')}" stroke="#5a86a8" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"${animated ? ' class="rn"' : ''}/><g fill="#b9c6d0"><circle cx="-60" cy="62" r="30"/><circle cx="-20" cy="48" r="38"/><circle cx="26" cy="58" r="32"/><circle cx="62" cy="66" r="24"/></g><rect x="-92" y="62" width="178" height="26" rx="13" fill="#b9c6d0"/></g>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Grow – a garden that grows with the real weather in Heilbronn">`,
    style,
    `<defs><linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0f0"/><stop offset=".7" stop-color="#e6f0e8"/><stop offset="1" stop-color="#f3efe2"/></linearGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="url(#bsky)"/>`,
    `<circle cx="${W * 0.93}" cy="${H * 0.2}" r="${H * 0.08}" fill="#ffd970"/>`,
    `<path d="${hills(ground - 70, 14, 170, 1.3)}" fill="#a9c79a"/>`,
    `<path d="${hills(ground - 38, 10, 120, 4.1)}" fill="${mix('#a9c79a', '#6f9a4a', 0.4)}"/>`,
    cloud,
    `<rect x="0" y="${soilTop}" width="${W}" height="${H - soilTop}" fill="#6f5039"/>`,
    `<rect x="0" y="${soilTop}" width="${W}" height="14" fill="#5b4331"/>`,
    `<rect x="0" y="${soilTop - 4}" width="${W}" height="6" fill="#79ad48"/>`,
    plants.join(''),
    `<path transform="translate(${left} ${titleY}) scale(${titleScale})" fill="#17261c" d="${textPath(title)}"/>`,
    ...lines.map(
      ([text, color], i) =>
        `<path transform="translate(${left} ${titleY + titleScale * 9 + subScale * 11 * i + (i >= 2 ? subScale * 5 : 0)}) scale(${subScale})" fill="${color}" d="${textPath(text)}"/>`,
    ),
    `<path transform="translate(${left} ${H - 40}) scale(${subScale})" fill="#f3efe2" d="${textPath('ONE CLAUDE ROUTINE · ONE COMMIT A DAY · OPEN SOURCE')}"/>`,
    '</svg>',
    '',
  ].join('\n');
}
