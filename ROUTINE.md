# ROUTINE.md – the daily routine

> This is the instruction a scheduled Claude routine follows every day at **08:53 (Europe/Berlin)**.
> It is part of the product: versioned, reviewed and public like the code. Change it only through a
> normal pull request. The garden rules are enforced by code – this file describes *how to use* them.

## Mission

Record **yesterday's real weather in Heilbronn**, let it act on the garden, make **exactly one**
gardener's choice and land the day on `main` as **exactly one commit** – or change nothing at all.
Never two days, never a partial day, never invented weather.

## Hard rules

1. One calendar day in Europe/Berlin = at most one day entry. If today is already recorded, stop.
2. Change the garden **only** through `npm run day -- …`. The only files a daily pull request may
   touch are `world/world.json`, `world/garden.svg` and `LOGBOOK.md`. Never edit them by hand; never
   touch code, configuration, docs, workflows or this file.
3. The weather comes from `npm run day -- weather` and nowhere else. Never type weather values in,
   never "correct" them. If the service is down the CLI repeats the last day and marks it – that is
   the only allowed fallback.
4. Never push to `main`, never force-push, never rewrite history, never use `--no-verify`, never
   disable or work around a hook. Work on a `claude/daily-<YYYY-MM-DD>` branch (or the `claude/…`
   branch the session assigns).
5. Lore is **one sentence in English**, present tense, at most 200 characters; titles at most 80.
   No links, no @mentions, no real people, brands, trademarks, politics or violence. Gentle,
   concrete, a little poetic – it should read well in a chronicle a year from now. Let the weather
   show in it when it matters (the first frost, a storm, a long dry spell).
6. Stuck? After two failed attempts with the same cause: stop, leave the garden unchanged and say
   precisely what failed. A missing day is better than a broken one.

## Steps

1. **Fresh start.** `git fetch origin main`, then create the branch from `origin/main`:
   `git switch -C claude/daily-<today> origin/main`. Run `npm ci`.
2. **Already done?** `npm run -s day -- status`. If `"done": true` → stop, report "nothing to do".
   Also look at open pull requests whose title starts with `Day `:
   - one for today exists → stop, report its link;
   - older ones (a day that never merged) → close them with the comment
     "Superseded – the garden moved on without this day." (the missing day stays missing).
3. **Ask the sky.** `npm run -s day -- weather` fetches yesterday in Heilbronn from Open-Meteo and
   caches it in `tmp/`. `"source": "fallback"` means the service was unreachable – continue; the day
   will be marked as repeated weather.
4. **Read the garden.** `npm run -s day -- plan` prints JSON: the weather and its rule, what nature
   will do (`nature.effects`), the garden after the weather, the last five days, every legal choice
   (`plant` with example cells, `build`, `water`, `harvest`, `rest`) and the director's
   `recommendation`.
5. **Decide.** Pick **one** choice. Good gardening:
   - react to the weather: water a young plant on a dry day, harvest ripe apples before a storm
     season, build a snowman when it snows, rest when a storm has just passed;
   - plant in season and give the garden a shape – a few trees with room, beds of flowers, reeds
     and lilies by the stream, ferns and mushrooms in the shade;
   - build milestones the moment they unlock (bench, birdhouse, beehive, bridge, shed);
   - vary: avoid the same choice three days in a row; when unsure, take the `recommendation`.
6. **Apply.** One command, lore included:

   ```bash
   npm run -s day -- apply --action plant --species <id> --x <col> --row <0-2> --lore "<one sentence>"
   npm run -s day -- apply --action build --structure <id> --x <col> --row <0-2> --lore "…"
   npm run -s day -- apply --action water --target <plant id> --lore "…"
   npm run -s day -- apply --action harvest --target <plant id> --lore "…"
   npm run -s day -- apply --action rest --lore "…"
   ```

   `--title "<title>"` is optional (the CLI writes one). Exit code `2` means a rule rejected the
   choice – read the reason and pick another legal option. After two rejections run
   `npm run -s day -- auto` (the director decides; the logbook marks it).
7. **Prove it.** `npm run verify` must be green. If it is red: stop, do not push, report the error.
8. **Commit.** `git add world/world.json world/garden.svg LOGBOOK.md` and
   `git commit -m "$(npm run -s day -- commit-message)"` – the message is
   `Day N: <title> (<weather>)`, the lore and what nature did.
9. **Push & open the pull request.** `git push -u origin <branch>`. Open **one** pull request into
   `main` with the GitHub tools: title = `npm run -s day -- commit-title`, body =
   `npm run -s day -- pr-body --image-url https://raw.githubusercontent.com/Fluory/Grow/<commit-sha>/world/garden.svg`.
10. **Finish.** Do not merge yourself – the CI workflow squash-merges the pull request once all
    checks are green, which puts exactly one commit on `main`. Report: day, weather, title, lore, link.

## Failure modes

| Situation | What happens |
|---|---|
| Routine runs twice | `status` says `done`, the second run changes nothing |
| Open-Meteo unreachable | the last recorded weather is repeated and marked `fallback` – in world.json, the commit, the logbook |
| A choice breaks a rule | the CLI refuses (exit 2); choose again, then fall back to `auto` |
| Frozen ground | `plan` says so and lists no plants – build, harvest or rest |
| `verify` or CI is red | nothing is merged; the day stays empty and the logbook shows the gap |
| Yesterday's PR never merged | today's run closes it as superseded and starts from `main` |
