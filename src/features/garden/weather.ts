import { PLACE, type Condition, type Weather } from './schema';

/**
 * The weather mechanic. Every day the routine records yesterday's weather in Heilbronn
 * (Open-Meteo, daily aggregates) and reduces it to one condition. The condition decides what
 * nature does to the garden – rain grows, sun ripens, frost stops, storm fells.
 */

export const DAILY_VARIABLES = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'snowfall_sum',
  'sunshine_duration',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
] as const;

/** Thresholds of the six conditions, checked in this order – the first match wins. */
export const THRESHOLDS = {
  /** Beaufort 8 ("gale") gusts, or a sustained strong wind. */
  stormGust: 62,
  stormWind: 40,
  /** Fresh snow in cm. */
  snow: 0.5,
  /** Night minimum in °C. */
  frost: 0,
  /** Precipitation in mm; from `heavyRain` everything grows twice. */
  rain: 1,
  heavyRain: 10,
  /** Hours of sunshine on a dry day. */
  sun: 6,
} as const;

export interface ConditionInfo {
  label: string;
  /** What the condition does, one sentence – used in RULES.md, the site and the plan. */
  effect: string;
  /** The rule in four words, for headlines. */
  motto: string;
}

export const CONDITION_INFO: Record<Condition, ConditionInfo> = {
  storm: {
    label: 'Storm',
    motto: 'Storm fells.',
    effect: `Gusts of ${THRESHOLDS.stormGust} km/h or more blow away blossoms and fruit. A grown tree may fall (at most one every 60 days) – otherwise a paper boat strands on the sand bank.`,
  },
  snow: {
    label: 'Snow',
    motto: 'Snow covers.',
    effect: `From ${THRESHOLDS.snow} cm of fresh snow the garden turns white. Snowmen become possible; they melt with the snow.`,
  },
  frost: {
    label: 'Frost',
    motto: 'Frost stops.',
    effect:
      'A night below 0 °C stops all growth, freezes the stream and makes the annual flowers wilt. Nothing can be planted in frozen ground.',
  },
  rain: {
    label: 'Rain',
    motto: 'Rain grows.',
    effect: `From ${THRESHOLDS.rain} mm every plant in its growing season grows one stage – two from ${THRESHOLDS.heavyRain} mm – and the stream rises.`,
  },
  sun: {
    label: 'Sun',
    motto: 'Sun ripens.',
    effect: `${THRESHOLDS.sun} hours of sunshine on a dry day open blossoms and ripen fruit. The stream sinks and the sand bank grows.`,
  },
  cloudy: {
    label: 'Grey',
    motto: 'Grey rests.',
    effect: 'A grey day without enough rain or sun: nothing grows, nothing breaks. A good day to water.',
  },
};

/** Raw daily values before classification. Sunshine is in hours. */
export type WeatherValues = Omit<Weather, 'condition' | 'fallback'>;

export function classify(values: WeatherValues): Condition {
  if (values.gust >= THRESHOLDS.stormGust || values.wind >= THRESHOLDS.stormWind) return 'storm';
  if (values.snow >= THRESHOLDS.snow) return 'snow';
  if (values.tmin < THRESHOLDS.frost) return 'frost';
  if (values.rain >= THRESHOLDS.rain) return 'rain';
  if (values.sun >= THRESHOLDS.sun) return 'sun';
  return 'cloudy';
}

export function makeWeather(values: WeatherValues): Weather {
  return { ...values, condition: classify(values) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function openMeteoUrl(date: string, source: 'forecast' | 'archive' = 'forecast', end = date): string {
  const host =
    source === 'archive' ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
  const params = new URLSearchParams({
    latitude: String(PLACE.lat),
    longitude: String(PLACE.lon),
    daily: DAILY_VARIABLES.join(','),
    timezone: 'Europe/Berlin',
    start_date: date,
    end_date: end,
  });
  return `${host}?${params.toString()}`;
}

interface OpenMeteoDaily {
  daily?: Record<string, unknown[] | undefined>;
}

/** Turn an Open-Meteo daily response into weather records; days with missing values are skipped. */
export function parseOpenMeteo(json: unknown): Weather[] {
  const daily = (json as OpenMeteoDaily | null)?.daily;
  const time = daily?.time;
  if (!daily || !Array.isArray(time)) throw new Error('Open-Meteo response has no daily data');
  const num = (key: string, i: number): number | null => {
    const v = daily[key]?.[i];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const out: Weather[] = [];
  time.forEach((date, i) => {
    const code = num('weather_code', i);
    const tmax = num('temperature_2m_max', i);
    const tmin = num('temperature_2m_min', i);
    const rain = num('precipitation_sum', i);
    const snow = num('snowfall_sum', i);
    const sun = num('sunshine_duration', i);
    const wind = num('wind_speed_10m_max', i);
    const gust = num('wind_gusts_10m_max', i);
    if (typeof date !== 'string') return;
    if ([code, tmax, tmin, rain, snow, sun, wind, gust].some((v) => v === null)) return;
    out.push(
      makeWeather({
        date,
        code: Math.round(code ?? 0),
        tmax: round1(tmax ?? 0),
        tmin: round1(tmin ?? 0),
        rain: round1(rain ?? 0),
        snow: round1(snow ?? 0),
        sun: round1((sun ?? 0) / 3600),
        wind: round1(wind ?? 0),
        gust: round1(gust ?? 0),
      }),
    );
  });
  return out;
}

const degrees = (n: number) => `${n.toFixed(1).replace('-', '−')} °C`;

/** Short measurement for titles and captions: "rain 6.4 mm", "frost −3.2 °C". */
export function describeWeather(w: Weather): string {
  switch (w.condition) {
    case 'rain':
      return `rain ${w.rain.toFixed(1)} mm`;
    case 'sun':
      return `sun ${w.sun.toFixed(1)} h`;
    case 'frost':
      return `frost ${degrees(w.tmin)}`;
    case 'snow':
      return `snow ${w.snow.toFixed(1)} cm`;
    case 'storm':
      return `storm ${Math.round(w.gust)} km/h`;
    case 'cloudy':
      return `grey ${degrees(w.tmax)}`;
  }
}

/** One readable line: "Rain · 6.4 mm · 14.2 °C / 8.1 °C · gusts 31 km/h". */
export function weatherLine(w: Weather): string {
  const parts = [CONDITION_INFO[w.condition].label];
  if (w.rain > 0) parts.push(`${w.rain.toFixed(1)} mm`);
  if (w.snow > 0) parts.push(`${w.snow.toFixed(1)} cm snow`);
  parts.push(`${w.sun.toFixed(1)} h sun`);
  parts.push(`${degrees(w.tmax)} / ${degrees(w.tmin)}`);
  parts.push(`gusts ${Math.round(w.gust)} km/h`);
  return parts.join(' · ') + (w.fallback ? ' · (repeated: weather service unreachable)' : '');
}
