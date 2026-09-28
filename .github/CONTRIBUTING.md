# Contributing

Thanks for stopping by the garden! A few things are different here, because the garden grows by itself – with the weather.

## What you can change

- **Code** – the garden engine (`src/features/garden`), the L-system plants (`src/features/plants`),
  the renderer (`src/features/render`), the website (`src/app`, `src/features/*`), tests and docs.
  Open an issue first for anything bigger than a small fix, so we can agree on the goal.
- **Rules and plants** – new species, structures or weather effects are welcome as proposals. A
  rule change needs a test in `src/features/garden/*.test.ts`; RULES.md is generated from the code.

## What you cannot change

- **The garden itself.** `world/world.json`, `world/garden.svg` and `LOGBOOK.md` change exactly once
  a day, through the routine described in [ROUTINE.md](../ROUTINE.md). Pull requests that edit them
  by hand are closed – and nobody can change the weather.

## Workflow

1. Fork, create a branch, make the change.
2. `npm ci`, then `npm run verify` (format, lint, types, tests, world check, build) must be green.
3. Open a pull request with a clear description. Maintainers fill in the project's PR template
   (Klartext, Nachweis, Doku-Entscheidung) before merging – you do not have to.

## Development

```bash
npm ci
npm run dev                 # website on http://localhost:3000
npm run day -- weather      # yesterday's weather in Heilbronn (Open-Meteo)
npm run day -- plan         # what the routine would see today
npm run day -- status       # is today already done?
npm test                    # unit tests
```

By contributing you agree that your code is released under the MIT license and any world content
(garden) under CC BY 4.0. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).
