import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import {
  Callout,
  ConditionTable,
  Derivation,
  GardenFigure,
  GrowthStrip,
  SpeciesTable,
} from '@/features/chapters/mdx/components';

const components: MDXComponents = {
  a: ({ href = '', children, ...rest }) =>
    href.startsWith('/') ? (
      <Link href={href} className="link" {...rest}>
        {children}
      </Link>
    ) : (
      <a href={href} className="link" {...rest}>
        {children}
      </a>
    ),
  Callout,
  ConditionTable,
  Derivation,
  GardenFigure,
  GrowthStrip,
  SpeciesTable,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
