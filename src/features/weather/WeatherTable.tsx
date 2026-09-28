import { formatDate, type Weather } from '@/features/garden';
import { CONDITION_LABEL, WeatherIcon } from './icons';
import styles from './weather.module.css';

const deg = (n: number) => `${n.toFixed(1).replace('-', '−')} °C`;

/** The table twin of every chart – each value is reachable without hovering. */
export function WeatherTable({ days, caption }: { days: readonly Weather[]; caption: string }) {
  return (
    <details className={styles.tableView}>
      <summary>Show every day as a table ({days.length} days)</summary>
      <div className={styles.tableScroll}>
        <table>
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Condition</th>
              <th scope="col">Rain</th>
              <th scope="col">Snow</th>
              <th scope="col">Sun</th>
              <th scope="col">Min</th>
              <th scope="col">Max</th>
              <th scope="col">Gusts</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((w) => (
              <tr key={w.date}>
                <th scope="row">{formatDate(w.date)}</th>
                <td>
                  <span className={styles.cond}>
                    <WeatherIcon condition={w.condition} size={15} /> {CONDITION_LABEL[w.condition]}
                    {w.fallback ? ' (repeated)' : ''}
                  </span>
                </td>
                <td>{w.rain.toFixed(1)} mm</td>
                <td>{w.snow.toFixed(1)} cm</td>
                <td>{w.sun.toFixed(1)} h</td>
                <td>{deg(w.tmin)}</td>
                <td>{deg(w.tmax)}</td>
                <td>{Math.round(w.gust)} km/h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
