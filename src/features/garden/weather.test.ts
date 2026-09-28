import { describe, expect, it } from 'vitest';
import { classify, describeWeather, parseOpenMeteo } from './weather';
import { weather } from './testing';

const base = { date: '2026-01-01', code: 3, tmax: 10, tmin: 4, rain: 0, snow: 0, sun: 2, wind: 10, gust: 20 };

describe('classify', () => {
  it('checks the conditions in priority order', () => {
    expect(classify({ ...base, gust: 70, snow: 5, tmin: -5, rain: 20 })).toBe('storm');
    expect(classify({ ...base, snow: 1, tmin: -5, rain: 3 })).toBe('snow');
    expect(classify({ ...base, tmin: -0.1, rain: 5 })).toBe('frost');
    expect(classify({ ...base, rain: 1 })).toBe('rain');
    expect(classify({ ...base, sun: 6 })).toBe('sun');
    expect(classify({ ...base, rain: 0.9, sun: 5.9 })).toBe('cloudy');
  });

  it('treats a strong sustained wind as a storm', () => {
    expect(classify({ ...base, wind: 40 })).toBe('storm');
  });
});

describe('parseOpenMeteo', () => {
  it('reads daily values, converts sunshine to hours and skips incomplete days', () => {
    const json = {
      daily: {
        time: ['2026-01-01', '2026-01-02'],
        weather_code: [61, 3],
        temperature_2m_max: [5.04, 4],
        temperature_2m_min: [1.26, null],
        precipitation_sum: [6.44, 0],
        snowfall_sum: [0, 0],
        sunshine_duration: [3600, 0],
        wind_speed_10m_max: [12, 8],
        wind_gusts_10m_max: [30, 20],
      },
    };
    const [day, ...rest] = parseOpenMeteo(json);
    expect(rest).toHaveLength(0);
    expect(day).toMatchObject({ date: '2026-01-01', tmax: 5, tmin: 1.3, rain: 6.4, sun: 1, condition: 'rain' });
  });

  it('rejects responses without daily data', () => {
    expect(() => parseOpenMeteo({ error: true })).toThrow(/daily/);
  });
});

it('describes the weather in a few words', () => {
  expect(describeWeather(weather('2026-01-01', { rain: 6.44 }))).toBe('rain 6.4 mm');
  expect(describeWeather(weather('2026-01-01', { tmin: -3.2 }))).toBe('frost −3.2 °C');
  expect(describeWeather(weather('2026-01-01', { gust: 71.6 }))).toBe('storm 72 km/h');
});
