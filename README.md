# The Data Pub · Web B1.1

**No Bullshit AI.** A full-viewport pixel pub with a continuous horizontal camera, Barman at the counter, agenda, team board, Speakers archive and library.

## Run locally

```sh
bun run dev
```

Open the URL printed by the command. Bun binds only to `127.0.0.1`, tries port 4173 and chooses a free port if the default is occupied. Existing listeners remain untouched. Use `PORT=0 bun run dev` for a free port or `PORT=4280 bun run dev` to require a specific port. The committed `site/` is ready to serve; use HTTP because `file://` does not load browser ES modules.

## Current structure

| Path | Purpose |
| --- | --- |
| `art/source/` | Five current Aseprite masters, palette and environment layer map |
| `art/tools/` | Current export, composition, Barman drawing and validation tools |
| `art/README.md`, `art/inventory.json` | Editing/regeneration workflow and current master inventory |
| `art/export-manifest.json` | Source/output hashes, dimensions and timing |
| `src/`, `scripts/build.mjs` | Content and templates for seven pages and the Speakers routes |
| `data/` | Canonical profiles, talks, articles and editions; templates and original provenance snapshot |
| `site/` | Static deployment document root; artwork is not duplicated in `art/` |
| `site/assets/js/scene-objects.js` | Central positions/sizes for library, calendar, team and Speakers |
| `scripts/serve.ts`, `scripts/preview-port.mjs` | Local Bun server and port policy |
| `tests/`, `scripts/test-*.mjs` | Unit, preview, browser and archive checks |

The browser uses `bar-base.png`, `barman-scene-sheet.png` and `barman-animation.css`. Barman is stationary, with mouth/blink animation over eight frames in a 6.5-second loop. Reduced motion, motion disabled and no-JavaScript states show the current first pose in the base. The scene uses one integer pixel scale. Artwork and native menu/static routes work without JavaScript; dynamic dialogs, archive and camera controls enhance them when available.

Move wall props through `SCENE_OBJECTS`, then rebuild. Their artwork, clickable areas, labels and camera positions move together. The initial camera centers on Barman, with Speakers to the left and the calendar to the right. The team board opens Equipo/Contact; the library opens the materials/blog panel. Barman is decorative, with no avatar controls.

`SCENE.crop` limits the visible/scrollable span to native x=252…1718, just outside the end columns. The full 1920×480 artwork and Barman coordinates are unchanged inside that clipped range. Equipo is at x=1406, clear of the window. The television is an unfocusable decorative image; the tapes and menu open **Eventos pasados**. `/tv/`, historical routes and **Ver ahora** retain their player behavior.

## Build and edit

```sh
bun run build
bun run test
```

Ordinary builds use checked-in assets and require no Aseprite. To export edited artwork, follow [the art workflow](art/README.md):

```sh
bun run art:export
bun run build
bun run test
```

Export verifies the original environment coverage using a compact fingerprint. The old panorama and its producers are absent. No historical native input is needed. Current masters and SVG sources remain editable.

`src/content.mjs` holds copy, verified links and confirmed future events. Each event requires `title`, ISO `datetime` with timezone, `dateLabel`, `venue` and HTTPS `url`. Rebuild after edits. Agenda shares the Luma calendar embed and fallback from its `calendar` configuration. The home loads it only when Agenda opens and disposes it on close; `/events/` preserves the calendar link without JavaScript. No upcoming date or event URL is inferred from an empty calendar.

Speakers recognizes people: one canonical profile per evidenced identity and one plaque per participating year, ordered by first local participation date. The current canonical data contains 117 identity records and four ambiguous groups kept separate pending stronger evidence. Editions paginate in fixed boards of twelve slots. The new, separate TV and VHS shelf hold the 86 events and 137 talks, with 18 specific YouTube recordings in 17 tapes. Playback is opt-in inside a privacy-enhanced YouTube frame; closing removes the player. Two recordings were observed playing in the local Chrome check. Historical event links now open the TV collection. See [identity evidence, routes and verification](docs/SPEAKERS.md).

Edit profiles in [`data/people.json`](data/people.json), talk assignments in [`data/talks.json`](data/talks.json), article content/authors in [`data/articles.json`](data/articles.json), and editions in [`data/events.json`](data/events.json). `bun run build` derives both public datasets and HTML from those sources. No reverse participation/article lists or Meetup participant IDs need to be maintained in profiles. The [schema, templates and merge procedure](data/README.md) describe each field; `bun run test:data-edit` verifies temporary edits through the rendered views.

Nosotros, Agenda, Librero and Equipo share local content and static routes. The public blog article retains its original 2026-05-11 date at `/blog/primer-post/`; historical plans are labeled as such. The team board opens Equipo, while the central sign opens Nosotros. See [migration sources and verification](docs/CONTENT-MIGRATION.md).

```sh
bun run data:talks
bun run build
bun run test:archive
```

## Verification

```sh
npm ci
bun run build
bun run test
bun run test:preview
npx playwright install chromium
bun run test:browser
bun run test:hotspots
bun run test:framing
bun run test:agenda
bun run test:archive
```

Alternatively set `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'` for the browser commands. They start their own Bun server on a free port. `TEST_PORT` and `BUN_BIN` configure the general browser runner. QA evidence is generated in ignored `artifacts/`; it is not an input or a deliverable kept with the source artwork. Port tests preserve existing listeners.

Tests cover runtime assets, source/output hashes, eight-frame animation, exact static fallback, desktop/mobile camera and touch, menu/dialog focus, agenda, team, library, Speakers pagination/details, history and no-JavaScript navigation. Tagged axe checks cover tested states; physical iOS/Android and Safari require separate verification.

`test:agenda` checks the real Luma embed at desktop/mobile widths, its scoped CSP, keyboard entry/exit, lazy lifecycle and no-JavaScript fallback. Other UI suites use a deterministic calendar fixture; they do not assert the provider’s current events.

`test:hotspots` checks all six interactive scene objects for mouse entry/exit, keyboard focus, touch, modal return and direct links without JavaScript. Their shared outline and hint are transient; the pub sign is the only scene link to About. Dates, years and result pagination remain functional counters.

`test:framing` checks the cropped edges, clamping, initial center, focused objects, decorative TV, tape label and direct archive return at desktop, mobile and wide landscape sizes. It also checks that native artwork dimensions stay unchanged.

## Hosting and licensing

Serve `site/` as the static document root, with the host's 404 handling. There is no backend, authentication, cookies, analytics, external fonts or live API dependency, and no publish command in this checkout. Production ownership and migration of the separate public site's content require separate work. The local content routes retain their public links.

Code retains the Apache 2.0 [LICENSE](LICENSE). Fraunces and Source Sans 3 are self-hosted with their SIL licenses in `site/assets/fonts/`. Artwork is original; Barman is a fictional character.
