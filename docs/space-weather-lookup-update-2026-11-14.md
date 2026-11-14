# Space weather lookup update — 14 November 2026

Branch `space-weather-lookup`. This note covers only the DONKI solar event lookup in the Mission panel. No other feature, document or dataset was changed. It supersedes the DONKI paragraph in `mission-gap-completion-2026-11-14.md`, which describes the earlier SEP-only, seven-day version.

## What changed

- **More to show.** The lookup now counts two NASA DONKI catalogues over the last 30 days (UTC): coronal mass ejections (CME) and solar energetic particle events (SEP). It lists the five most recent records with links. Before, it queried SEP only over seven days, which usually returned nothing.
- **Each catalogue is fetched separately.** One that fails is shown as "unavailable — unknown", never as zero. If both fail, the existing "Lookup unavailable" message appears.
- **Empty answers are handled.** A NASA response with an empty body is treated as no records, not as an error.
- **Team API key.** The key is read from `VITE_NASA_API_KEY`. Without it, the shared `DEMO_KEY` is used, as before.

Labels are unchanged in meaning: Earth-side observations, Mars conditions unknown, no clearance, not saved in the mission report.

## Setting the key

1. Get a free key at https://api.nasa.gov.
2. Copy `mars-explorer-web/.env.example` to `mars-explorer-web/.env.local`.
3. Put the key after `VITE_NASA_API_KEY=`.
4. Restart `npm run dev`, or rebuild.

`.env.local` is ignored by git. For a deployed site, set the same variable in the hosting service's build settings. The key ends up inside the built site and is visible to visitors, so use a free api.nasa.gov key only.

## Why solar flares are not included

The plan was to add solar flares (FLR) too. On 14 November 2026, `https://api.nasa.gov/DONKI/FLR` answered HTTP 404 on three attempts, with and without dates, while CME and SEP answered normally. The flare parser and its test are in place; `SOLAR_KINDS` in `src/spaceWeather.ts` has a comment showing the one line to add if NASA restores the list.

## Files

| File | Change |
|---|---|
| `mars-explorer-web/src/spaceWeather.ts` | Catalogue list, 30-day window, per-catalogue parsing, empty-body handling, key selection |
| `mars-explorer-web/src/SpaceWeatherCheck.tsx` | Two requests, counts, recent-records list, key from settings |
| `mars-explorer-web/tests/space-weather.test.ts` | Updated and extended (1 test became 4) |
| `mars-explorer-web/.env.example` | New: shows the one setting |
| `docs/space-weather-lookup-update-2026-11-14.md` | This note |

## Verification

- Unit tests: 80 passed, 0 failed (`npm test`; 77 before, 3 added).
- TypeScript: `tsc -b` passed with no errors, run in a temporary copy of `src` with dependencies installed from the lockfile.
- Live requests with `DEMO_KEY`, 15 October to 14 November 2026: CME returned 88 records; SEP returned an empty list; FLR returned 404. `api.nasa.gov` sent `Access-Control-Allow-Origin: *`.
- **Not done:** the production build and a click-through in the browser. Please run both before merging.

## Rate limit observed

The `DEMO_KEY` response headers showed a limit of 10 requests in the current window. One click now makes two requests, so the shared key allows about five clicks per window. A team key avoids this.
