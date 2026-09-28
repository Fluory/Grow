# Evals – the routine's guard rails

The routine is an AI agent with write access to this repository (add-on KI/RAG, SYSTEM.md §10).
Its *creative* output (which choice, which lore line) is judged by people reading the logbook. Its
*guard rails* are fixed and tested on every pull request – this table is the eval set: each known
risk has cases that fail when the protection weakens.

| Risk | Expected behaviour | Covered by |
|---|---|---|
| Second entry on the same day (routine runs twice) | refused, garden unchanged | `src/features/garden/rules.test.ts` – "records weather, choice and the new id – and refuses a second entry"; CLI `status.done` |
| Weather of a day that has not happened yet | refused | `apply.ts` (`the weather of … has not happened yet`); `history.ts` validates the weather date |
| Invented or malformed weather values | rejected by the schema (limits per value) | `WeatherSchema` in `schema.ts`; `weather.test.ts` – "rejects responses without daily data", incomplete days skipped |
| Weather service down | last weather repeated and marked `fallback`, never skipped silently | `routine/weather-client.ts`; `effects.ts` adds the "weather service was unreachable" sentence |
| Illegal choice (tree in the stream, planting in frozen ground, bench without shade …) | refused with a reason (exit 2) | `rules.test.ts` – planting, building, watering |
| Lore that injects links, @mentions, markup or line breaks | refused | `rules.test.ts` – "rejects titles with links and illegal choices"; `lore.ts` `checkText` |
| Hand-edited snapshot or tampered log | `world:check` fails | `history.test.ts` – "detects a tampered snapshot or log" |
| Non-deterministic replay | same log, same garden | `history.test.ts` – "is deterministic", "timeline() and replay() agree" |
| Derived files out of sync with `world.json` | `world:check` fails | CLI `check` (runs in `npm run verify`) |
| Daily PR touching anything but garden data, or more than one commit | not merged | `.github/workflows/ci.yml`, job `daily-merge` |
| PR body without plain-language section / proof | CI red | `scripts/pr-check.sh`; `routine/report.test.ts` |

**Fail-closed:** every CLI error aborts with a non-zero exit code; there is no silent fallback that
writes the garden. The two fallbacks – repeated weather and `npm run day -- auto` – are rule-checked
and visibly marked in the commit, the logbook and on the website. A prompt change (`ROUTINE.md`) is
a normal PR and reviewed like code.
