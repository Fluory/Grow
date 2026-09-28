import Link from 'next/link';
import { SceneDirective } from '@/features/scene';
import pageStyles from './page.module.css';

export default function NotFound() {
  return (
    <div
      className={`${pageStyles.narrow} ${pageStyles.page}`}
      style={{ minHeight: '80svh', display: 'grid', alignContent: 'center' }}
    >
      <SceneDirective camera="far" dim={0.2} />
      <div className={`${pageStyles.panel} glass`} style={{ display: 'grid', gap: 'var(--s-4)' }}>
        <p className="eyebrow">404 · bare soil</p>
        <h1 className="h2">Nothing has grown here yet.</h1>
        <p className="lede">Maybe after the next rain. Until then, the garden is this way.</p>
        <p>
          <Link href="/" className="btn btn-accent">
            Back to the garden <span className="arrow">→</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
