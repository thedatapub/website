# Fuentes editables del archivo

Edita directamente estos cuatro JSON. **El build nunca los reescribe** y no requiere IDs de participantes de Meetup para cambiar vínculos.

| Archivo canónico | Autoridad | Plantilla |
| --- | --- | --- |
| `data/people.json` | Perfiles: ID, nombre, semblanza, redes/sitio, variantes de nombre e IDs anteriores. **Sin participaciones, charlas ni artículos.** | [`templates/person.json`](templates/person.json) |
| `data/talks.json` | Charlas: ID, `eventId`, título, `speakerIds`, `moderatorIds`, grabaciones y procedencia. | [`templates/talk.json`](templates/talk.json) |
| `data/articles.json` | Artículos: ID, contenido o URL, `authorIds` confirmados y fuente de atribución. | [`templates/article.json`](templates/article.json) |
| `data/events.json` | Ediciones: ID, título, fecha local, zona horaria, Meetup, resumen, grabaciones de edición y participaciones sin charla asignada. | Estructura abajo |

Cada archivo tiene `schemaVersion: 1` y una lista con el mismo nombre (`people`, `talks`, `articles`, `events`). Las plantillas son registros reales de ejemplo; no se importan y no constituyen otra fuente. Para reemplazar un registro conserva su ID; para añadirlo usa un ID nuevo.

```sh
bun run build
```

Ese único comando valida las fuentes, genera los joins en `site/assets/data/people.json` y `site/assets/data/talks.json`, y produce el HTML. No edites esos archivos generados. La vista interactiva los solicita realmente: `site/assets/js/archive.js` carga `assets/data/people.json` y `assets/data/talks.json` mediante `fetch` al abrir la colección. El primero añade `appearances`, `years` y `articles` derivados a cada perfil; no es otra fuente editable. `src/speakers.mjs` también lo utiliza para producir las páginas HTML sin JS. `bun run data:people`, `bun run data:talks` y `bun run data:build` son entradas compatibles para regenerar **ambos** datasets sin construir HTML. Ninguno importa automáticamente snapshots ni sobrescribe los JSON fuente.

## Perfiles: `people.json`

La raíz conserva `checkedAt`, `source` y `unresolvedVariants` como información editorial. Los grupos no resueltos contienen IDs canónicos de personas que deben mantenerse separadas. Cada perfil admite:

| Campo | Uso |
| --- | --- |
| `id` | ID único estable, letras minúsculas/números separados por guiones; forma `/speakers/person/ID/`. |
| `name` | Nombre público; corregirlo no requiere cambiar el ID ni las relaciones. |
| `aliases` | Nombres históricos documentados, incluido el nombre actual si figura en las fuentes. Consérvalos al corregir `name`, para que la procedencia no cambie; no fusionan personas por coincidencia de texto. |
| `previousIds` | IDs de perfiles retirados al fusionar. Sus rutas HTML y hashes resuelven el perfil canónico; no pueden coincidir con otro perfil vigente. |
| `bio` | `null` o `{ "text": "Semblanza", "asOf": "2026-11-14", "evidenceUrl": "https://example.org/fuente" }`. |
| `links` | `{ "label": "Sitio / LinkedIn / GitHub", "url": "https://example.org/perfil", "evidenceUrl": "https://example.org/atribucion" }`. |
| `identityBasis` | Explicación de la identidad o de la decisión editorial de unión, sin presentar una decisión como evidencia pública nueva. |
| `identityReview` | `single_source`, `reviewed_join` o `unresolved_same_name`. |

Para agregar una persona, añade un registro a `people` con `aliases`, `previousIds` y `links` como listas vacías si no hay información. Se puede crear un perfil sin participaciones: tiene URL propia y no aparece en tableros de años hasta que una charla o participación de edición lo referencia. Una atribución de artículo aparece en su ficha aunque no tenga charlas.

## Charlas: `talks.json`

Ejemplo de una charla con dos ponentes; los IDs del ejemplo deben existir en `people.json`:

```json
{
  "id": "mi-charla",
  "eventId": "316979242",
  "title": "Título de la charla",
  "kind": "Charla",
  "speakerScope": "session",
  "speakerIds": ["persona-uno", "persona-dos"],
  "moderatorIds": [],
  "otherSpeakers": [],
  "videos": []
}
```

`eventId` es el único vínculo a la edición. **No copies su título, fecha ni año**. El programa de la edición se obtiene filtrando charlas por ese ID, y el historial de una persona por `speakerIds`/`moderatorIds`. Una persona puede tener varias charlas en la misma edición: se agrupan en una sola participación en su ficha.

`speakerIds` contiene ponentes; `moderatorIds` contiene moderadores. No repitas el mismo ID en ambas listas de una charla. `otherSpeakers` conserva contribuciones no personales, como una organización, mediante `{ "name": "Organización", "reason": "La fuente no identifica una persona" }`; no crea perfiles humanos.

`provenance` es opcional y contiene `speakerNames`/`moderatorNames` tal como aparecían en la fuente. Es evidencia histórica, **no una lista de vínculos**: no hay que cambiarla al corregir una atribución. La ficha conserva el nombre original cuando coincide con el nombre o un alias del perfil; el programa usa los nombres canónicos actuales. `evidenceUrl` y `note` son opcionales para documentar una fuente o aclaración específica; en su ausencia se usa la fuente de la edición.

Cuando la fuente solo anuncia personas para una edición y no asigna charlas, conserva `speakerScope: "event"` con ambas listas de IDs vacías. Esas personas se referencian únicamente en `events[].participants`; no se inventa crédito individual de charla. Así se preserva el caso de agosto de 2022.

## Ediciones: `events.json`

La raíz conserva `snapshotDate` como fecha de corte histórica. Cada evento tiene `id`, `title`, `date` (`YYYY-MM-DD` local), `timezone`, `sourceUrl`, `sourceRetrievedAt`, `evidenceStatus: "past_public_listing_not_attendance_verified"`, `participants` y `videos`. Puede incluir `summary` con `evidenceUrl` y `provenance.speakerNames`.

`participants` solo se usa para participaciones **sin charla asignada**:

```json
{
  "personId": "persona-uno",
  "roles": ["Ponencia"],
  "provenance": { "nameInSource": "Nombre anunciado" }
}
```

La procedencia es opcional. También admite `evidenceUrl` y `note`. No repitas aquí a alguien ya vinculado a una charla de la edición; para concretar su charla, elimina la referencia de `participants` y añade su ID en la charla correspondiente. Los roles admitidos son `Ponencia` y `Moderación`. El estado sigue indicando programación anunciada, no asistencia verificada.

Las grabaciones de edición viven en `events[].videos`; las de una charla en `talks[].videos`. El vínculo se deduce del contenedor, sin repetir `eventId`, `talkId` ni `scope` en cada video. Se conserva `{ "url", "title", "publisher", "publisherUrl" (opcional), "evidenceUrl", "matchBasis", "checkedAt", "playbackVerified" }`. La URL debe identificar un video específico de YouTube; no se permite repetir la misma grabación en una edición y sus charlas.

## Artículos: `articles.json`

Un artículo local usa `kind: "local"`, `id`, `slug`, `title`, `date`, `summary`, `note` y `blocks` (secciones con `title`, `paragraphs` y opcionalmente `steps`). `slug` conserva la ruta `/blog/SLUG/`; los títulos y fechas no se repiten en los perfiles. `src/posts.mjs` es solamente un adaptador de lectura y ya no contiene contenido editable.

- Con autoría individual confirmada: `authorIds: ["persona-uno", "persona-dos"]` y `authorEvidenceUrl: "https://example.org/atribucion"`; omite `authorLabel`. Los nombres del artículo y los enlaces de sus fichas se resuelven por esos IDs.
- Sin autoría individual confirmada: `authorIds: []` y `authorLabel`, por ejemplo `"The Data Pub"`. No asignes un artículo colectivo a personas por inferencia. El artículo actual `primer-post` mantiene ese crédito colectivo.
- Un artículo externo usa `kind: "external"`, `id`, `title`, `url` HTTP(S), `authorIds` y su atribución; `date` es opcional. No tiene `slug` ni `blocks`. Se enlaza en las fichas de sus autores; no genera una página local del Librero.

## Corregir o fusionar identidades

1. Para corregir un nombre, semblanza o red, edita solamente el perfil. Su ID no cambia.
2. Para corregir quién dio una charla, cambia `speakerIds` o `moderatorIds` en **esa charla**. Para corregir autoría, cambia `authorIds` en **ese artículo**. No edites un historial inverso ni un ID de Meetup.
3. Para fusionar A dentro de B, conserva el perfil B y sustituye A por B en las entidades que lo referencian: charlas, artículos y, si aplica, participaciones sin charla en eventos. Elimina duplicados si ambos ya estaban en la misma lista. Revisa el rol si uno figuraba como moderador y el otro como ponente de la misma charla.
4. Conserva las semblanzas, redes y variantes verificadas. Añade el nombre anterior a `aliases` y el ID A a `previousIds` de B. Marca `reviewed_join`, documenta la decisión y retira el grupo resuelto de `unresolvedVariants`. Elimina el perfil A después de redirigir sus vínculos.
5. Ejecuta `bun run build` y revisa la ficha, las ediciones y los artículos afectados.

La fusión de Hermilio está modelada así: las charlas `301041360-1` (mayo de 2024) y `311027455-1` (septiembre de 2025) usan `speakerIds: ["hermilo-cortes-gonzalez"]`. Las variantes históricas están en `aliases` y en la procedencia. No se consulta ningún `participantId` fuente para resolver esos vínculos. Los dos IDs anteriores de perfil se conservan como rutas compatibles.

## Procedencia

`data/provenance/meetup-public-2026-11-12.json` conserva el snapshot original y sigue siendo una entrada de las pruebas de procedencia. El build usa únicamente las cuatro fuentes canónicas descritas arriba.

La unión editorial de Hermilio se conserva mediante el ID canónico de sus charlas, sus variantes de nombre y las rutas de perfil anteriores. No se presenta como evidencia pública nueva ni se asignan autores individuales al artículo colectivo.

## Validación y pruebas

El build valida los cuatro archivos completos antes de escribir los datasets derivados: IDs únicos y referencias existentes, IDs anteriores sin colisiones, listas sin duplicados, roles, atribución de autores, URLs HTTP(S) sin credenciales, fechas locales válidas y videos sin asociaciones duplicadas. Rechaza campos que duplican autoridad (por ejemplo `participations` en un perfil o `date` en una charla). No verifica por sí mismo que una afirmación editorial sea cierta: conserva las fuentes.

```sh
bun run test
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bun run test:data-edit
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bun run test:archive
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bun run test:content
```

`test:data-edit` cambia una copia temporal de cada fuente, agrega una persona con dos charlas y coautoría de prueba, ejecuta un build normal y las dos entradas compatibles, y verifica perfiles, VHS, fecha local, Librero y autores con y sin JS. También comprueba las rutas anteriores de Hermilio y que los hashes de las fuentes no cambian al construir. La copia se elimina. `test:people-edit` sigue disponible como alias de esa prueba.

Para validar un conjunto alternativo de los cuatro JSON sin modificar los outputs habituales:

```sh
node scripts/import-people.mjs --source-dir /ruta/a/fuentes --output-dir /tmp/archivo-generado
```
