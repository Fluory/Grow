# Changelog – Grow

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Newest entry first.
Only what changes **in the product** – the daily garden changes live in [LOGBOOK.md](LOGBOOK.md).

## [Unreleased]

### Added
- Garden engine: Heilbronn weather reduced to six conditions (rain grows, sun ripens, frost stops, snow covers, storm fells, grey rests), a stream that rises and widens, ice, snow cover, 13 plants and 13 structures with rules, a deterministic director, replay and verification of the day log.
- L-system plants with birth levels – every growth level adds a ring of branches; one skeleton for the SVG and the 3D scene.
- README picture `world/garden.svg`: weather sky, vineyard hills, three rows of plants, the stream and a soil cross-section with roots and bulbs; CSS-animated rain, snow and wind.
- Day CLI for the routine: `status`, `weather` (Open-Meteo, cache, marked fallback), `plan`, `apply`, `auto`, `check`, `render`, `pr-body`, `commit-message`, `commit-title`, `genesis`.
- Generated `LOGBOOK.md` and `RULES.md`; daily routine instructions in `ROUTINE.md`; CI merges the routine's daily pull request with squash when green.
- Website: persistent 3D garden behind every page, weather-rule scenes, a scroll timelapse of a simulated year under real 2025/26 weather, a garden explorer with timeline, a weather record with rain calendar and charts, logbook, day pages, four MDX chapters, day/night theme, imprint and privacy pages.
- Genesis: day 0 on 2026-09-28 – an empty garden bed by a stream.
