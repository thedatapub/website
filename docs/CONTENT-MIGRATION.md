# Public content migration — 2026-11-14

The four pub panels and their static pages share `src/content.mjs` and the same renderer. The team board opens Contact/Equipo; the pub sign and central hotspot open About/Nosotros. Barman remains a decorative fictional host. The public organizer credit is separate from the character.

## Sources and local destinations

| Public source | Local destination | Adaptation |
| --- | --- | --- |
| https://thedata.pub/about/ | `/about/`, Sobre la barra/Nosotros | Community, philosophy, topics and published venue; history from the archive and official LinkedIn founding year |
| https://thedata.pub/events/ | `/events/`, Agenda | Only the three-step attendance guide; existing agenda data and registration link retained, no old event table |
| https://thedata.pub/blog/ | `/blog/`, Librero | Dated local index of real public posts |
| https://thedata.pub/blog/primer-post/ | Same local path | Adapted announcement, dated 2026-05-11 and credited to The Data Pub; its plans explicitly remain historical |
| https://thedata.pub/contact/ | `/contact/`, Equipo | Official channels, talk proposals and sponsorship/collaboration instructions |

The public blog RSS (`/blog/index.xml`), site RSS (`/index.xml`), sitemap (`/sitemap.xml`) and blog index were inspected on 2026-11-14. Each lists one actual blog article: `/blog/primer-post/`. Both feeds date it 11 May 2026. No additional articles, tutorials or event summaries were invented. The current editable source for the index and article page is `data/articles.json`; `src/posts.mjs` is a read-only compatibility adapter after normalization.

All migrated prose is adapted, not a long verbatim reproduction. Dynamic counters from About were omitted to avoid presenting old membership/attendance figures as current. The venue is described as the published venue, with each event's listing controlling attendance details.

The exact contact destinations are backed by the official Contact page: Meetup (`https://www.meetup.com/the-data-pub/`), LinkedIn (`https://www.linkedin.com/company/thedatapub/`), X (`https://x.com/thedatapub`) and Facebook (`https://www.facebook.com/thedatapub/`). Meetup and LinkedIn returned public content; X supplied no readable text and Facebook displayed an access restriction. These are source-verified destinations, not a guarantee of anonymous access on every platform. LinkedIn's official profile also lists the founding year as 2015. No account connection is needed by the local site.

Navigation links to the old site were replaced with relative local routes. External Meetup, YouTube and social links retain their meaning. Source URLs in this document record provenance, not navigation dependencies. Static HTML serves all five migrated routes and works without JavaScript. Agenda now embeds the user-supplied Luma calendar (`https://luma.com/embed/calendar/cal-fH2RJsxbE5e0vtS/events`) and links to `https://luma.com/thedatapub` for calendar and registration; other sections and historical Meetup references retain their destinations. The embed is loaded when the home Agenda panel opens and removed on close. On `/events/`, its visible Luma link remains available without JavaScript or when the external calendar fails. The real provider returned HTTP 200 and “No Upcoming Events” on 2026-11-14; no next-event URL was inferred.

## Verification at the original content-migration checkpoint

`bun run build`, `bun run test`, `bun run test:browser`, `bun run test:archive` and `bun run test:content` cover the shared content, scene interactions, static navigation, dated article, chronological event boards and relevant browser behavior. Browser checks use the installed Chrome via `CHROME_PATH`; they do not publish anything.

Verification completed locally on 2026-11-14: build and 19 unit tests passed; 13 general browser scenarios passed; content panels passed at 1440px and 390px with axe and five no-JavaScript routes; Speakers passed at 1440×900, 390×844, 320×740 and 844×390, including all-year geometry/order, April 2018, focus/history, synthetic pagination and JSON failure fallback. A scan of all 248 generated HTML pages found no missing local links and no navigation links to the old domain. Hash comparison with the task-start snapshot found no changes to artwork, Barman assets, camera/scene coordinates or original event/media source files. `git diff --check` passed. Nothing was staged or published.

The counts above describe that earlier checkpoint. The normalized archive and its verification commands are documented in [SPEAKERS.md](SPEAKERS.md).
