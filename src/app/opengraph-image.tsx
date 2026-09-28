import { ImageResponse } from 'next/og';
import { describeWeather } from '@/features/garden';
import { gardenPicture, renderGardenSvg } from '@/features/render';
import { getLatest, getStats, getTimeline, getWorld } from '@/features/world-data';

export const alt = 'Today in Grow – a garden that grows with the real weather in Heilbronn';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Social preview: today's garden under the day's title. Regenerated with every deployment. */
export default function OpenGraphImage() {
  const latest = getLatest();
  const stats = getStats();
  const svg = renderGardenSvg(gardenPicture(getWorld(), getTimeline()), { caption: false, animated: false });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const weather = latest.weather ? ` · ${describeWeather(latest.weather)}` : '';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #cfe6ef 0%, #e6f0e8 45%, #f3efe2 100%)',
        padding: '40px 56px',
        gap: 22,
        fontFamily: 'serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 84, lineHeight: 0.9, color: '#17261c' }}>Grow</div>
        <div style={{ fontSize: 24, letterSpacing: 3, color: '#3d5243', fontFamily: 'monospace' }}>
          {`DAY ${latest.day}${weather.toUpperCase()}`}
        </div>
      </div>
      <img
        src={src}
        width={1088}
        height={500 * (1088 / 1024) * 0.94}
        alt=""
        style={{ borderRadius: 24, boxShadow: '0 30px 60px rgba(23,38,28,.3)', objectFit: 'cover' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#17261c' }}>
        <span>{latest.title}</span>
        <span style={{ color: '#3d5243' }}>{`${stats.living} plants · grown by the weather`}</span>
      </div>
    </div>,
    size,
  );
}
