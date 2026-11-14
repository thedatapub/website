# Current artwork · Barman

This is the single working root for the pub's current editable artwork. The character is **Barman**, an original fictional bartender.

| Master | Purpose |
| --- | --- |
| `source/bar-environment.aseprite` | 640×360 environment; 12 layers, no obsolete character group or hands |
| `source/beer-mug.aseprite` | 28×32, two editable variants; frame 1 supplies the five counter mugs |
| `source/barman.aseprite` | 136×144 Barman; eight frames, ten layers |
| `source/apron-emblem.aseprite` | Independent 32×26 mug/laurel emblem |
| `source/bar-scene.aseprite` | 1920×480 composed scene; eight frames, current runtime export source |

[inventory.json](inventory.json) records current source hashes, dimensions, frames, layer/tag names and tools. [export-manifest.json](export-manifest.json) records export inputs, output hashes/dimensions, prop bounds and frame durations. The palette and environment layer map are in `source/`.

## Edit and export

Edit the relevant native master in Aseprite. Changes to the environment, Barman or mug must be composed into `bar-scene.aseprite` before runtime export. Do not overwrite reviewed sources with a drawing recipe.

From the repository root:

```sh
bun run art:export
bun run build
bun run test
```

`art:components` is an alias for the same exporter. It defaults to `/Applications/Aseprite.app/Contents/MacOS/aseprite`; `ASEPRITE_BIN` selects another binary. The source documents are read-only during export. After intentional source edits, review and update the corresponding source hash and metadata in `inventory.json` as part of the same change.

The exporter stages its work outside the repo, verifies the environment guard and all eight frames, then writes only these runtime files under `site/assets/pub/`:

- `bar-base.png`, containing resting Barman and the environment without movable library/calendar props.
- `barman-scene-sheet.png` and `barman-animation.css`.
- `library-prop.png`, `events-prop.png`, `ceiling-edge.png`, `floor-edge.png`.

The two boards, mug token and brand mark are authored SVGs at their runtime paths, listed in the inventory; they are not duplicated under `art/`. All metadata stays here, outside the static document root.

Barman's frame durations are `2800, 140, 160, 120, 2980, 80, 120, 100` ms: 6.5 seconds total. The base contains the first pose. Without JavaScript, when motion is disabled, or under reduced motion, the animation overlay is hidden and that same current pose remains visible.

## Environment guard

`environment-baseline.json` stores only a SHA-256 fingerprint, not an image. It covers every frame-1 RGBA8 pixel outside `[899,1087) × [171,315)`, in row-major order: 894,528 pixels. This is exactly the previous environment comparison coverage. Dimensions, rectangle, byte count, ordering and digest are checked before any staged file is published. A deliberate environment change requires a reviewed baseline update; do not automatically accept a new digest after a failure.

There is no old panorama file or producer in the repo. The current scene supplies the ceiling/floor strips.

## Reconstruct in a fresh folder

Create fresh `source/` and `exports/` subdirectories outside the repo. Run Aseprite with `--noinapp --batch`, passing these script parameters:

1. `tools/create-barman.lua`: `out=<fresh-folder>`, `palette=<absolute art/source/bar-environment.aseprite>`. This draws Barman and the independent apron emblem. It rejects an existing Barman master.
2. `tools/compose-scene.lua`: `out=<fresh-folder>`, `master=<absolute art/source/bar-environment.aseprite>`, `barman=<absolute art/source/barman.aseprite>` (or the freshly created master), `stein=<absolute art/source/beer-mug.aseprite>`. It composes the layered scene and optional review exports without changing inputs.
3. `tools/verify-anatomy.lua`: `barman=<absolute Barman master>`. It checks mirrored body/forearm silhouettes and connected hands across all eight frames.

The environment and mug masters are the canonical editable inputs; obsolete drawing recipes that also recreated retired characters were archived. Native masters, their palette and the current composition/export tools reproduce the complete current runtime artwork without those recipes.

## Art rules

Use a native 1 px grid, square pixels, integer scaling, binary alpha and the embedded 36 opaque colors plus transparent entry 0. Brand anchors are navy `#24343B`, sand `#F1E4C8`, amber `#C88B3D`. Warm lamp light uses upper/left highlights and lower/right shadows. Keep numbered material/object layers separate; avoid smoothing, mixed sprite resolution or automatic gradients. The calendar drawing is symbolic, not an event-date claim.

The artwork is original; no Habbo art, branding or code is included. Code and font licenses remain at their existing locations.
