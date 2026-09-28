import Link from 'next/link';
import { ViewTransition } from 'react';
import { Reveal } from '@/shared/motion';
import styles from './GardenTeaser.module.css';
import { SceneSection } from './SceneSection';
import { SectionHead } from './SectionHead';

/** Today's README picture, framed – the same SVG the daily commit writes to world/garden.svg. */
export function GardenTeaser({ svg }: { svg: string }) {
  return (
    <SceneSection className="section" camera="far" dim={0.62} labelledBy="garden-title">
      <div className={`container ${styles.teaser}`}>
        <SectionHead
          eyebrow="Garden & timeline"
          title="A cross-section of the garden, redrawn every day."
          id="garden-title"
        >
          Roots and bulbs under the soil, the stream in its trough, every plant grown from its own L-system. Drag the
          timeline back to the empty bed and hover any plant to read its story.
        </SectionHead>
        <Reveal>
          <Link href="/garden" className={`${styles.frame} glass`} aria-label="Open the garden explorer">
            <ViewTransition name="garden-picture" share="morph" default="none">
              <div className={styles.picture} dangerouslySetInnerHTML={{ __html: svg }} />
            </ViewTransition>
          </Link>
        </Reveal>
      </div>
    </SceneSection>
  );
}
