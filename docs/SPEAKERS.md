# Speakers, TV/VHS and the normalized archive

Speakers recognizes people; TV/VHS preserves editions and their programs. The archive currently contains **117 profiles, 142 person/edition participations, 86 editions, 137 talks, 18 specific videos across 17 editions and one local article**. Historical public participation means announced, not attendance verified. Both collections retain twelve-slot responsive boards, local-date ordering and the latest year (2026) as the initial view.

## Editable sources and derived views

- `data/people.json`: profiles and identity metadata only, including historical name aliases and previous profile IDs.
- `data/talks.json`: titles, canonical speaker/moderator IDs, event foreign key, talk recordings and provenance.
- `data/articles.json`: local/external articles and confirmed author IDs. The current article retains collective credit to The Data Pub, with no individual author assignment.
- `data/events.json`: edition title, local date, Meetup source, summary, event recordings and participants whose contribution cannot be assigned to a particular talk.

`bun run build` validates all four sources, derives the public people and event datasets, and builds HTML. `data:people`, `data:talks` and `data:build` remain compatible commands to rebuild the joined datasets without HTML. They never write source JSON or import snapshots. `src/posts.mjs` is a read-only adapter, not a second content source. See [the complete schema, templates and merge procedure](../data/README.md).

The profile has no reverse participation or article list. Histories join talk `speakerIds`/`moderatorIds` and event-only `participants`; article lists join `authorIds`. Programs join talks on `eventId`. Dates and edition titles live only on the edition and are copied only into generated runtime views. A profile can exist without a talk and remains accessible by its own URL. Multiple talks in one edition are grouped into one profile contribution.

`data/provenance/meetup-public-2026-11-12.json` retains the original public snapshot. The build uses only the canonical sources listed above. Original names remain provenance; changing a link does not require a historical source participant ID.

## Identities and preserved attribution

Pedro’s editorial merge retains `hermilo-cortes-gonzalez` as the canonical identity. Talks `301041360-1` (29 May 2024) and `311027455-1` (24 September 2025) both refer directly to that ID. Original names, evidence, dates, roles and talk IDs are preserved. The two retired profile URLs resolve the same current profile through `previousIds`, including static HTML without JavaScript. This records an editorial decision, not newly discovered public evidence.

Four unresolved identity groups remain separate:

- Liliana Millán / Liliana Millán Núñez.
- José Carlos Méndez / Jose Carlos Mendez.
- Jorge Rotter’s 2018 and 2019 records.
- Miguel Escalante’s 2015 and 2017 records.

Normalization itself did not merge other identities; subsequent editorial decisions are recorded in `data/people.json`. Five dated bios and eight professional links remain intact. Original names are retained in profile aliases, even when a historical spelling equals the current display name, so a later name correction does not rewrite history. Ambiguous August 2022 names remain event-only participation, without individual talk credit. The Data Management Association organization remains in the tape program and is not turned into a person. Barman has no identity connection to historical contributors.

## TV, playback and navigation

TV and VHS are separate scene components. Existing art, Barman, Agenda and Librero positions are unchanged. Every edition has one tape with local date, participants, program and Meetup source. Three sourced editorial summaries and all 18 video metadata records retain their existing scope. April 2018 has two independently labeled recordings; editions without videos have no playback actions.

“Ver ahora” is visually primary and receives initial focus in the interactive tape detail. Each video has one secondary YouTube link on viewports up to 850px. Desktop interactive playback uses native embed controls without a separate external CTA. Static tape links remain available; static watch pages retain a direct fallback without JavaScript. Playback heading and document title use “Data Pub · Mes Año” from the local event date; the talk label is secondary.

The privacy-enhanced iframe and official API load only after playback is requested. Autoplay blocking and explicit provider errors are reported; route changes and closing remove the frame. Forward/reloaded watch views require a new play action. Queued close events cannot clear a newly reopened player. CSP and referrer behavior are unchanged: privacy-enhanced frames and official API hosts are allowed, with strict-origin-when-cross-origin and no proxy/backend.

- People: `/speakers/`, `/speakers/YEAR/PAGE/`, `/speakers/person/ID/`; hashes `#speakers/YEAR/PAGE/ID`.
- TV: `/tv/`, `/tv/YEAR/PAGE/`, `/tv/event/EVENT-ID/`, `/tv/watch/EVENT-ID/VIDEO-ID/`; matching `#tv/...` hashes.
- Old numeric Speakers event/session routes open TV. Profile `previousIds` resolve the current person and expose a canonical HTML link.

Escape, X, backdrop and back links close one stage at a time, preserving focus and year/page context. Year arrows, selectors and board keyboard navigation remain equivalent. Reduced motion, static pages and data-load fallback remain supported.

## Verification

```sh
bun run build
bun run test
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bun run test:data-edit
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bun run test:archive
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bun run test:content
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bun run test:browser
```

The normalized temporary-edit test modifies each source independently in an isolated copy, adds a new co-speaker with two talks, supplies test-only author attribution, then checks the generated profile, tape, local month, Librero, article authors and old Hermilio URLs with and without JS. It checks source hashes after a normal build and both compatibility entry points. Production author attribution is unchanged.

Unit validation covers unknown/duplicate IDs, missing authorship evidence, unsafe URLs, duplicate authority, event-only scope, multiple speakers, multiple talks, profile merges and templates. The collection browser suite covers 1440×900, 390×844, 320×740 and 844×390, focus/history, both April video IDs, no-video cases, provider error 150 and no-JavaScript links. Content checks exercise the four existing panels and local article; general checks exercise the scene and Barman.

The previous real-network check observed PLAYING with advancing time for October 2026 (`f2RtD9soINs`, desktop) and April 2018 (`lBho-kM71D0`, 320px). Playback code and URLs were not changed by normalization. That evidence covers two videos in local Chrome, not all videos or physical mobile browsers.

Normalization verification passed: build, all compatibility data commands, 29 unit tests, the independent-source temporary-edit test (including two consecutive builds with new edition/talk IDs), all four collection viewport scenarios, existing content/no-JS checks and 13 general browser scenarios. All 142 previous participations, five bios, eight professional links, original provenance and all video metadata compare exactly with the pre-migration evidence. The canonical JSON hashes remain unchanged by builds; prior source files are archived byte-for-byte. All 476 prior collection routes remain, two retired Hermilio profile routes now resolve the canonical profile, and all 485 HTML pages have valid local targets.
