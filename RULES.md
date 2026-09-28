# The rules of the garden

> Generated from `src/features/garden/` by `npm run world:render` – the code enforces every sentence below.
> Change the code, not this file.

Every morning the routine records **yesterday’s weather in Heilbronn** (Open-Meteo, daily values) and
reduces it to one condition. First nature acts – then the gardener makes **exactly one choice**.

## 1 · Nature: rain grows, sun ripens, frost stops, storm fells

The conditions are checked in this order; the first that matches is the day’s weather.

| | Condition | What it does |
|---|---|---|
| 🌬️ | **Storm** | Gusts of 62 km/h or more blow away blossoms and fruit. A grown tree may fall (at most one every 60 days) – otherwise a paper boat strands on the sand bank. |
| 🌨️ | **Snow** | From 0.5 cm of fresh snow the garden turns white. Snowmen become possible; they melt with the snow. |
| 🧊 | **Frost** | A night below 0 °C stops all growth, freezes the stream and makes the annual flowers wilt. Nothing can be planted in frozen ground. |
| 🌧️ | **Rain** | From 1 mm every plant in its growing season grows one stage – two from 10 mm – and the stream rises. |
| ☀️ | **Sun** | 6 hours of sunshine on a dry day open blossoms and ripen fruit. The stream sinks and the sand bank grows. |
| ☁️ | **Grey** | A grey day without enough rain or sun: nothing grows, nothing breaks. A good day to water. |

- Order: storm (gusts ≥ 62 km/h or wind ≥ 40 km/h) → snow (≥ 0.5 cm) → frost (night < 0 °C) → rain (≥ 1 mm) → sun (≥ 6 h) → grey.
- The stream has levels 0–8. Because its bed is a trough, higher water is also wider water; low water leaves sand banks.
- Ice melts on the first day above 5 °C; snow melts from 3 °C (faster with rain or 8 °C).
- A storm fells the tallest tree that is at least 45 % grown – at most one tree every 60 days. Otherwise a paper boat strands on the sand bank; rising water carries it away.
- Annual flowers wilt at the first frost; their dry stalks are cleared on the first day of spring (March).
- Blossoms and fruit only exist in their months; unharvested fruit falls when its season ends.
- If the weather service cannot be reached, yesterday’s weather is repeated and marked as repeated.

## 2 · The gardener: one choice a day

| Choice | Rule |
|---|---|
| 🌱 **plant** | one plant of a species, in its planting months, on free ground that suits it (see below). Nothing can be planted in frozen or snowy ground. |
| 🔨 **build** | one structure whose requirement is met (see below). |
| 💧 **water** | one growing plant grows one stage – only on a dry day (sun or grey) and in its growing months. |
| 🧺 **harvest** | pick the ripe fruit of one plant (at least three apples, or a sunflower’s seed head). |
| 🪑 **rest** | always allowed – some days the garden needs nothing. |

## 3 · Plants

The garden is 64 columns wide with three rows (back, middle, front). A stream crosses it near column 44. Trees need room: at most 14 at once.

| Plant | Planting | Rules |
|---|---|---|
| **oak** | Mar–Apr, Oct–Nov | planted Mar–Apr, Oct–Nov on the meadow or the stream bank; grows on rain in Mar–Oct; fully grown at stage 110; 6 columns from other trees and 4 from the garden's edge. |
| **birch** | Mar–Apr, Oct–Nov | planted Mar–Apr, Oct–Nov on the meadow or the stream bank; grows on rain in Mar–Oct; fully grown at stage 90; 5 columns from other trees and 4 from the garden's edge. |
| **pine** | Mar–Apr, Sep–Nov | planted Mar–Apr, Sep–Nov on the meadow; grows on rain all year; fully grown at stage 100; 5 columns from other trees and 4 from the garden's edge. |
| **apple tree** | Mar–Apr, Oct–Nov | planted Mar–Apr, Oct–Nov on the meadow; grows on rain in Mar–Oct; fully grown at stage 80; 6 columns from other trees and 4 from the garden's edge; blooms in the sun Apr–May from stage 24; apples ripen in the sun Aug–Oct. |
| **willow** | Mar–May, Oct–Nov | planted Mar–May, Oct–Nov on the stream bank; grows on rain in Mar–Oct; fully grown at stage 90; 6 columns from other trees and 4 from the garden's edge. |
| **lavender** | Apr–Jun, Sep | planted Apr–Jun, Sep on the meadow; grows on rain in Apr–Sep; fully grown at stage 12; 2 columns from other shrubs; needs full sun – no grown tree within three columns; blooms in the sun Jun–Aug from stage 5. |
| **fern** | Mar–May, Sep–Oct | planted Mar–May, Sep–Oct on the meadow or the stream bank; grows on rain in Apr–Sep; fully grown at stage 10; 2 columns from other shrubs; needs shade – a tree of stage 16 or more within four columns. |
| **reed** | Mar–Sep | planted Mar–Sep on the sand bank or the stream bank; grows on rain in Apr–Sep; fully grown at stage 12; blooms in the sun Jul–Oct from stage 6. |
| **sunflower** | Apr–Jul | planted Apr–Jul on the meadow or the stream bank; grows on rain in Apr–Oct; fully grown at stage 14; needs full sun – no grown tree within three columns; blooms in the sun Jul–Sep from stage 9; seed heads ripen in the sun Sep–Oct; wilts at the first frost. |
| **poppy** | Mar–May, Sep–Oct | planted Mar–May, Sep–Oct on the meadow or the stream bank; grows on rain in Mar–Oct; fully grown at stage 7; blooms in the sun May–Jul from stage 4; wilts at the first frost. |
| **tulip** | Sep–Nov | planted Sep–Nov on the meadow or the stream bank; grows on rain in Feb–May; fully grown at stage 7; blooms in the sun Apr–May from stage 5. |
| **water lily** | Apr–Aug | planted Apr–Aug on the stream (at least half a unit deep); grows on rain in May–Sep; fully grown at stage 8; blooms in the sun Jun–Aug from stage 4; at most 4. |
| **mushroom** | Sep–Nov | planted Sep–Nov on the meadow or the stream bank; grows on rain in Sep–Nov; fully grown at stage 4; needs wood – a fallen log or a tree of stage 24 or more within three columns; at most 6. |

## 4 · Things to build

| Structure | At most | Requirement |
|---|---|---|
| **mossy stone** | 8 | It fits on any free cell of dry ground. |
| **bench** | 2 | It needs shade: a tree of stage 20 or more within three columns. |
| **birdhouse** | 3 | It hangs in a tree of stage 24 or more, one per tree. |
| **beehive** | 1 | It needs three flowering plants in the garden. |
| **row of stepping stones** | 1 | It crosses the stream in the middle row while the water is at level 5 or lower. |
| **bridge** | 1 | It is built from a fallen tree across the stream in the back row – a storm has to fell one first. |
| **lantern** | 3 | It stands within four columns of a bench or the bridge. |
| **garden shed** | 1 | It needs eight living plants to look after and three free meadow columns in the back row. |
| **rain barrel** | 1 | It stands right next to the shed (two columns from its centre). |
| **sundial** | 1 | It needs twenty sunny days on record. |
| **scarecrow** | 1 | It guards at least three living annual flowers (sunflowers or poppies). |
| **snowman** | 2 | It needs snow on the ground – and melts when it is gone. |
| **paper boat** | 1 | It only arrives with a storm and floats away when the water rises over it. |

Stepping stones need the stream at level 5 or lower when they are laid.
