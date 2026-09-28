/** Public interface of the plants module: L-system grammars, growth forms and seasonal looks. */
export { lookOf, seedOf, type Look } from './appearance';
export { plantForm, skeletonOf, type Form, type FormBloom, type FormLeaf, type FormSegment } from './form';
export { GRAMMARS, GROWTH_MODE } from './grammars';
export {
  buildSkeleton,
  derive,
  interpret,
  type BloomKind,
  type Grammar,
  type LeafKind,
  type Module,
  type Skeleton,
  type Vec3,
} from './lsystem';
