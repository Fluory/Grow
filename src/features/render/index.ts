/** Public interface of the render module: the garden picture as SVG. */
export { GLYPH_HEIGHT, rasterText, textWidth, wrapText } from './font';
export {
  CAPTION_HEIGHT,
  cellView,
  gardenPicture,
  groundY,
  renderGardenSvg,
  SCENE_HEIGHT,
  SVG_WIDTH,
  UNIT,
  type GardenPicture,
  type GardenSvgOptions,
} from './garden-svg';
export { CAPTION, CONDITION_COLOR, meadowFor, skyFor, SOIL, WATER } from './palette';
export { ellipse, mix, plantSvg, type PlantView } from './plant-svg';
export { structureSvg } from './structure-svg';
