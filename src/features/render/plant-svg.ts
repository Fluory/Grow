import { growth, hashString, SPECIES, type Plant } from '@/features/garden';
import { lookOf, plantForm, seedOf, type Form, type FormLeaf, type Look } from '@/features/plants';

/**
 * SVG for one plant, drawn as a botanical side view: branches as tapered strokes grouped by
 * width, leaves as small ellipses grouped by colour, blossoms and fruit on top. Coordinates
 * are screen pixels; `unit` is the size of one garden unit at this depth.
 */

export interface PlantView {
  x: number;
  y: number;
  unit: number;
  snow: boolean;
  /** Mix every colour towards this haze (aerial perspective), 0 = none. */
  haze?: { color: string; amount: number };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255;
    const vb = (pb >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** An ellipse as a path fragment: centre, half-length along `angle`, half-width. */
export function ellipse(cx: number, cy: number, a: number, b: number, angle: number): string {
  const dx = Math.cos(angle) * a;
  const dy = Math.sin(angle) * a;
  const deg = f((angle * 180) / Math.PI);
  return `M${f(cx - dx)} ${f(cy - dy)}A${f(a)} ${f(b)} ${deg} 1 0 ${f(cx + dx)} ${f(cy + dy)}A${f(a)} ${f(b)} ${deg} 1 0 ${f(cx - dx)} ${f(cy - dy)}Z`;
}

const LEAF_SHAPE: Record<FormLeaf['kind'], { along: number; across: number; offset: number }> = {
  blob: { along: 0.5, across: 0.45, offset: 0 },
  drop: { along: 0.42, across: 0.26, offset: 0.35 },
  needle: { along: 0.5, across: 0.3, offset: 0.25 },
  blade: { along: 0.5, across: 0.13, offset: 0.5 },
  grass: { along: 0.5, across: 0.035, offset: 0.5 },
  pinna: { along: 0.5, across: 0.16, offset: 0.5 },
  heart: { along: 0.5, across: 0.34, offset: 0.5 },
  broad: { along: 0.46, across: 0.3, offset: 0.4 },
};

function leafAngle(d: readonly number[], i: number): number {
  const dx = d[0] ?? 0;
  const dy = -(d[1] ?? 0);
  if (Math.hypot(dx, dy) < 0.15) return ((hashString(`a${i}`) % 628) / 100) as number;
  return Math.atan2(dy, dx);
}

function paint(color: string, view: PlantView): string {
  return view.haze ? mix(color, view.haze.color, view.haze.amount) : color;
}

/** Dark lenticels across the white bark of a birch. */
function birchMarks(form: Form, view: PlantView): string {
  const parts: string[] = [];
  form.segments.forEach((s, i) => {
    if (s.order > 1) return;
    const ax = view.x + s.a[0] * view.unit;
    const ay = view.y - s.a[1] * view.unit;
    const bx = view.x + s.b[0] * view.unit;
    const by = view.y - s.b[1] * view.unit;
    const len = Math.hypot(bx - ax, by - ay);
    const width = s.w * view.unit;
    if (len < 4 || width < 2.5) return;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let t = 0.2 + (hashString(`b${i}`) % 5) / 25; t < 0.95; t += 7 / len + 0.12) {
      const cx = ax + (bx - ax) * t;
      const cy = ay + (by - ay) * t;
      const half = width * (0.25 + (hashString(`m${i}${t}`) % 30) / 100);
      const off = width * (((hashString(`o${i}${t}`) % 40) - 20) / 100);
      parts.push(
        `M${f(cx + nx * (off - half))} ${f(cy + ny * (off - half))}L${f(cx + nx * (off + half))} ${f(cy + ny * (off + half))}`,
      );
    }
  });
  return parts.length > 0
    ? `<path d="${parts.join('')}" stroke="${paint('#3a3531', view)}" stroke-width="1.1" stroke-linecap="round"/>`
    : '';
}

function segmentsSvg(form: Form, look: Look, view: PlantView): string {
  const buckets = new Map<number, string[]>();
  for (const s of form.segments) {
    const width = Math.max(0.7, s.w * view.unit);
    const key = Math.round(width * 2) / 2;
    const list = buckets.get(key) ?? [];
    list.push(
      `M${f(view.x + s.a[0] * view.unit)} ${f(view.y - s.a[1] * view.unit)}L${f(view.x + s.b[0] * view.unit)} ${f(view.y - s.b[1] * view.unit)}`,
    );
    buckets.set(key, list);
  }
  const bark = paint(look.bark, view);
  const out: string[] = [];
  for (const [width, parts] of [...buckets].sort((a, b) => b[0] - a[0])) {
    out.push(
      `<path d="${parts.join('')}" stroke="${bark}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`,
    );
  }
  if (view.snow) {
    const snow = form.segments
      .filter((s) => s.order <= 2 && Math.abs(s.b[0] - s.a[0]) > Math.abs(s.b[1] - s.a[1]) * 0.6)
      .map((s) => {
        const lift = Math.max(0.8, s.w * view.unit * 0.6);
        return `M${f(view.x + s.a[0] * view.unit)} ${f(view.y - s.a[1] * view.unit - lift)}L${f(view.x + s.b[0] * view.unit)} ${f(view.y - s.b[1] * view.unit - lift)}`;
      });
    if (snow.length > 0)
      out.push(`<path d="${snow.join('')}" stroke="#f7fbff" stroke-width="1.6" stroke-linecap="round" fill="none"/>`);
  }
  return out.join('');
}

function leavesSvg(leaves: FormLeaf[], look: Look, view: PlantView, dark: boolean): string {
  if (!look.leaves || leaves.length === 0) return '';
  const colors = look.leaves;
  const byColor = new Map<string, string[]>();
  leaves.forEach((leaf, i) => {
    const shape = LEAF_SHAPE[leaf.kind];
    const angle = leafAngle(leaf.d, i);
    const size = leaf.size * view.unit;
    const cx = view.x + leaf.p[0] * view.unit + Math.cos(angle) * size * shape.offset;
    const cy = view.y - leaf.p[1] * view.unit + Math.sin(angle) * size * shape.offset;
    const shade = dark
      ? (colors[colors.length - 1] ?? '#335533')
      : (colors[hashString(`l${i}`) % colors.length] ?? '#557744');
    const color = paint(dark ? mix(shade, '#0f2016', 0.18) : shade, view);
    const list = byColor.get(color) ?? [];
    list.push(ellipse(cx, cy, Math.max(0.6, size * shape.along), Math.max(0.5, size * shape.across), angle));
    byColor.set(color, list);
  });
  return [...byColor].map(([color, parts]) => `<path d="${parts.join('')}" fill="${color}"/>`).join('');
}

function bloomsSvg(plant: Plant, form: Form, look: Look, view: PlantView): string {
  const info = SPECIES[plant.species];
  const out: string[] = [];
  const u = view.unit;
  const at = (p: readonly number[]) => [view.x + (p[0] ?? 0) * u, view.y - (p[1] ?? 0) * u] as const;
  const shown = (rank: number, count: number) => rank < count;

  for (const b of form.blooms) {
    const [x, y] = at(b.p);
    const r = b.size * u;
    switch (b.kind) {
      case 'blossom':
        if (shown(b.rank, plant.bloom))
          out.push(
            `<circle cx="${f(x)}" cy="${f(y)}" r="${f(Math.max(1.2, r * 0.55))}" fill="${paint(look.bloom, view)}"/>`,
          );
        if (shown(b.rank, plant.fruit))
          out.push(
            `<circle cx="${f(x)}" cy="${f(y + r * 0.6)}" r="${f(Math.max(1.4, r * 0.62))}" fill="${paint(look.fruit, view)}"/>`,
          );
        break;
      case 'spike':
        if (shown(b.rank, plant.bloom)) {
          const angle = leafAngle(b.d, b.rank);
          out.push(
            `<path d="${ellipse(x + Math.cos(angle) * r * 0.4, y + Math.sin(angle) * r * 0.4, r * 0.55, Math.max(0.9, r * 0.2), angle)}" fill="${paint(look.bloom, view)}"/>`,
          );
        }
        break;
      case 'cattail':
        if (shown(b.rank, plant.bloom)) {
          const angle = leafAngle(b.d, b.rank);
          out.push(
            `<path d="${ellipse(x, y, r * 0.5, Math.max(1, r * 0.16), angle)}" fill="${paint(look.bloom, view)}"/>`,
          );
        }
        break;
      case 'head': {
        if (look.wilted || plant.fruit > 0) {
          out.push(
            `<circle cx="${f(x + r * 0.2)}" cy="${f(y + r * 0.35)}" r="${f(r * 0.6)}" fill="${paint(look.wilted ? '#6e5230' : '#5a3a1c', view)}"/>`,
          );
        } else if (plant.bloom > 0) {
          out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${paint(look.bloom, view)}"/>`);
          out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.46)}" fill="${paint(look.bloomCenter, view)}"/>`);
        } else if (growth(plant) > 0.45) {
          out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.35)}" fill="${paint('#6f9a44', view)}"/>`);
        }
        break;
      }
      case 'cup': {
        if (look.wilted) break;
        if (plant.bloom > 0) {
          const w = r * 0.8;
          out.push(
            `<path d="M${f(x - w)} ${f(y - r * 0.9)}Q${f(x - w)} ${f(y + r * 0.5)} ${f(x)} ${f(y + r * 0.45)}Q${f(x + w)} ${f(y + r * 0.5)} ${f(x + w)} ${f(y - r * 0.9)}L${f(x + w * 0.4)} ${f(y - r * 0.45)}L${f(x)} ${f(y - r)}L${f(x - w * 0.4)} ${f(y - r * 0.45)}Z" fill="${paint(look.bloom, view)}"/>`,
          );
          if (plant.species === 'poppy')
            out.push(
              `<circle cx="${f(x)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.22)}" fill="${paint(look.bloomCenter, view)}"/>`,
            );
        } else if (growth(plant) >= (info.bloom?.from ?? 0) / info.maxStage) {
          out.push(
            `<path d="${ellipse(x, y - r * 0.3, r * 0.45, r * 0.25, -Math.PI / 2)}" fill="${paint('#6f9a44', view)}"/>`,
          );
        }
        break;
      }
      case 'fruit':
        break;
    }
  }
  return out.join('');
}

function lilySvg(plant: Plant, look: Look, view: PlantView): string {
  const g = 0.35 + 0.65 * growth(plant);
  const u = view.unit * g;
  const colors = look.leaves ?? ['#4f8a4a'];
  const pads = [
    [-0.55, 0.05, 0.62],
    [0.45, -0.08, 0.5],
    [0.05, 0.14, 0.42],
  ];
  const out = pads.map(
    ([dx, dy, r], i) =>
      `<path d="${ellipse(view.x + (dx ?? 0) * u, view.y + (dy ?? 0) * u, (r ?? 0.5) * u, (r ?? 0.5) * u * 0.28, 0)}" fill="${paint(colors[i % colors.length] ?? '#4f8a4a', view)}"/>`,
  );
  for (let i = 0; i < Math.min(plant.bloom, 3); i++) {
    const [dx, dy] = pads[i] ?? [0, 0];
    const cx = view.x + (dx ?? 0) * u;
    const cy = view.y + (dy ?? 0) * u - u * 0.12;
    out.push(`<path d="${ellipse(cx, cy, u * 0.24, u * 0.13, 0)}" fill="${paint(look.bloom, view)}"/>`);
    out.push(
      `<circle cx="${f(cx)}" cy="${f(cy - u * 0.04)}" r="${f(u * 0.07)}" fill="${paint(look.bloomCenter, view)}"/>`,
    );
  }
  return out.join('');
}

function mushroomSvg(plant: Plant, look: Look, view: PlantView): string {
  const g = 0.4 + 0.6 * growth(plant);
  const u = view.unit * g;
  const out: string[] = [];
  const caps = [
    [0, 0.5, 0.34],
    [0.5, 0.32, 0.24],
    [-0.42, 0.26, 0.2],
  ];
  const count = 1 + Math.min(2, plant.stage);
  for (const [dx, h, r] of caps.slice(0, count)) {
    const x = view.x + (dx ?? 0) * u;
    const top = view.y - (h ?? 0.4) * u;
    out.push(
      `<rect x="${f(x - (r ?? 0.3) * u * 0.28)}" y="${f(top)}" width="${f((r ?? 0.3) * u * 0.56)}" height="${f((h ?? 0.4) * u)}" rx="1" fill="${paint(look.bark, view)}"/>`,
    );
    out.push(
      `<path d="M${f(x - (r ?? 0.3) * u)} ${f(top + 1)}Q${f(x)} ${f(top - (r ?? 0.3) * u * 1.3)} ${f(x + (r ?? 0.3) * u)} ${f(top + 1)}Z" fill="${paint(look.bloom, view)}"/>`,
    );
    if (look.bloom !== '#8a5a36') {
      out.push(
        `<circle cx="${f(x - (r ?? 0.3) * u * 0.35)}" cy="${f(top - (r ?? 0.3) * u * 0.25)}" r="${f(Math.max(0.7, u * 0.04))}" fill="${look.bloomCenter}"/>`,
      );
      out.push(
        `<circle cx="${f(x + (r ?? 0.3) * u * 0.3)}" cy="${f(top - (r ?? 0.3) * u * 0.4)}" r="${f(Math.max(0.7, u * 0.035))}" fill="${look.bloomCenter}"/>`,
      );
    }
  }
  return out.join('');
}

/** A tree the storm felled: a log with a cut end, lying beside its stump. */
function logSvg(plant: Plant, look: Look, view: PlantView): string {
  const length = Math.min(5.5, SPECIES[plant.species].height * growth(plant) * 0.55) * view.unit;
  const dir = hashString(plant.id) % 2 === 0 ? 1 : -1;
  const r = Math.max(3, view.unit * 0.32);
  const x0 = view.x + dir * view.unit * 0.3;
  const x1 = x0 + dir * length;
  const y = view.y - r;
  const bark = paint(look.bark, view);
  return [
    `<rect x="${f(view.x - r * 0.7)}" y="${f(view.y - r * 1.3)}" width="${f(r * 1.4)}" height="${f(r * 1.3)}" rx="1.5" fill="${bark}"/>`,
    `<path d="M${f(x0)} ${f(y - r)}L${f(x1)} ${f(y - r * 0.8)}L${f(x1)} ${f(y + r * 0.8)}L${f(x0)} ${f(y + r)}Z" fill="${bark}"/>`,
    `<path d="${ellipse(x1, y, r * 0.35, r * 0.82, 0)}" fill="${paint('#d8b98a', view)}"/>`,
    `<path d="${ellipse(x1, y, r * 0.14, r * 0.38, 0)}" fill="none" stroke="${paint('#a88760', view)}" stroke-width="1"/>`,
  ].join('');
}

export function plantSvg(plant: Plant, date: string, view: PlantView): string {
  const look = lookOf(plant, date);
  if (!look.visible) return '';
  if (plant.status === 'fallen') return logSvg(plant, look, view);
  if (plant.species === 'waterlily') return lilySvg(plant, look, view);
  if (plant.species === 'mushroom') return mushroomSvg(plant, look, view);

  const form = plantForm(plant.species, seedOf(plant), growth(plant));
  const keep = (i: number) => look.density >= 1 || (hashString(`k${i}`) % 1000) / 1000 < look.density;
  const leaves = form.leaves.filter((_, i) => keep(i));
  const depth = Math.max(0.3, ...form.segments.map((s) => Math.abs(s.b[2])));
  const back = leaves.filter((l) => l.p[2] < -depth * 0.25);
  const front = leaves.filter((l) => l.p[2] >= -depth * 0.25);
  return [
    leavesSvg(back, look, view, true),
    segmentsSvg(form, look, view),
    plant.species === 'birch' ? birchMarks(form, view) : '',
    leavesSvg(front, look, view, false),
    bloomsSvg(plant, form, look, view),
  ].join('');
}
