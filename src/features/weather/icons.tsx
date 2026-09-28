import type { Condition } from '@/features/garden';

/** Line icons for the six conditions – shape carries the meaning, colour only follows the text. */

const PATHS: Record<Condition, string> = {
  sun: 'M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6ZM12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7',
  cloudy: 'M7 18h10.5a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.4 8.6 4.7 4.7 0 0 0 7 18Z',
  rain: 'M7 14.5h10.5a3.6 3.6 0 0 0 .5-7.15A5 5 0 0 0 8.2 6 4.2 4.2 0 0 0 7 14.5ZM8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3',
  frost:
    'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5M3.9 10.1l3.4-.9-.9-3.4M20.1 13.9l-3.4.9.9 3.4M3.9 13.9l3.4.9-.9 3.4M20.1 10.1l-3.4-.9.9-3.4',
  snow: 'M7 13.5h10.5a3.6 3.6 0 0 0 .5-7.15A5 5 0 0 0 8.2 5 4.2 4.2 0 0 0 7 13.5ZM8 17.2h.01M12 18.8h.01M16 17.2h.01M10 21h.01M14 21h.01',
  storm: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7',
};

export const CONDITION_LABEL: Record<Condition, string> = {
  sun: 'Sun',
  cloudy: 'Grey',
  rain: 'Rain',
  frost: 'Frost',
  snow: 'Snow',
  storm: 'Storm',
};

export function WeatherIcon({
  condition,
  size = 20,
  className,
}: {
  condition: Condition;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[condition]} />
    </svg>
  );
}
