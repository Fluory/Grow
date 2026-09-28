/** A seedling above the soil – the brand mark. Pixel art, 8×8. */
const ROWS = ['..gg....', '.gGGg.gg', '.gGG.gGG', '..g.gGGg', '...gg.g.', '....g...', 'ssssgsss', 'dddddddd'];
const COLORS: Record<string, string> = {
  g: '#8cc152',
  G: '#4f8a36',
  s: '#6b4e36',
  d: '#3e2d21',
};

export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      {ROWS.flatMap((row, y) =>
        [...row].map((c, x) =>
          COLORS[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLORS[c]} /> : null,
        ),
      )}
    </svg>
  );
}
