# Personal Wiki: agent guide

This file is the project briefing for coding agents and maintainers. Read it before changing the site.

## Purpose and product concept

Personal Wiki is a personal, static wiki for writing ordinary prose alongside small domain-specific languages. The source of truth is meant to remain readable plain text—currently a deliberately small Markdown dialect—while the browser turns selected fenced blocks into richer, interactive artifacts.

The first interactive custom language is Strudel. A note can explain a musical idea and place executable Strudel code directly beside the explanation:

````md
```strudel
note("c3 e3 g3").sound("sawtooth")
```
````

The first notation language is ABC. A note can include compact text music notation and have the browser render it as staff notation:

````md
```abc
X:1
K:C
CDEF GABc |]
```
````

The first purpose-built notation language is `drums`. It avoids forcing drum-kit notation through ABC and instead renders a small drum DSL with VexFlow:

````md
```drums
tempo 104
meter 4/4
hh: x x x x x x o x
sn: . . x . . . x .
bd: x . . x . x . .
wb: . . . . . . x .
```
````

Cubing notes use a standard algorithm body with a purpose-specific fence label:

````md
```cube-cmll edges=hide center=hide
R U R' U R U2 R'
```
````

The long-term idea is broader than music. Future fences might describe drawing gestures, diagrams, visualizations, timelines, or other small languages. The prose must remain useful when read as raw text. Interactive rendering is progressive enhancement, not the canonical representation of the note.

## Non-negotiable constraints

- The deployed site must work as static files on GitHub Pages.
- There is no application server, database, server-side rendering, or runtime API.
- Wiki content remains plain-text files committed with the site.
- URLs and assets must work when the site is hosted under a GitHub project subpath.
- Page navigation must not require server-side fallback routing.
- Unknown fenced languages must remain visible as escaped source code.
- Do not introduce a build system or framework casually. The current zero-build design is intentional.

Third-party browser dependencies are acceptable when they unlock an interactive language, but they should be pinned to a version and documented. Consider whether a dependency should eventually be vendored for offline use and deterministic deployment.

## Repository map

```text
.
├── index.html       Persistent page shell and sidebar navigation
├── styles.css       All shell, article, responsive, and extension styling
├── app.js           Router, Markdown renderer, extension renderers, interactions
├── cube-notation.js Cubing facelet model and CMLL SVG renderer
├── pages/           Plain-text wiki content
│   ├── home.md
│   ├── sound.md
│   └── cubing.md
├── README.md        Short operator and author documentation
└── AGENTS.md        Architecture and maintenance guidance (this file)
```

There is intentionally no generated output directory. GitHub Pages serves these files exactly as committed.

## Runtime architecture

The runtime has four layers:

1. `index.html` provides a persistent header, navigation sidebar, and empty `<main id="content">` element.
2. The hash router in `app.js` converts a URL such as `#/music` into `pages/music/index.md`, and nested URLs such as `#/music/rudiments` into matching nested Markdown files.
3. `fetch()` loads that file as plain text and `renderMarkdown()` converts the supported syntax to HTML.
4. Fenced-language renderers and delegated event handlers add behavior to special blocks such as Strudel.

The main page-load flow is:

```text
initial load or hashchange
        ↓
currentPage() validates #/<slug>
        ↓
loadPage() fetches the matching Markdown file under pages/
        ↓
renderMarkdown() walks source line by line
        ↓
inline() handles supported inline syntax
        ↓
HTML replaces #content; shell remains mounted
```

All content navigation uses hash URLs such as `#/home`. This is required because GitHub Pages has no rewrite rule that maps `/sound` back to `index.html`. A hash changes client-side state without requesting a different HTML file from the host.

Page paths are restricted by `currentPage()` to lowercase ASCII letters, digits, hyphens, and single `/` separators. This prevents arbitrary paths and defines the file-naming convention. An invalid or missing hash resolves to `home`. A valid path whose file does not exist renders the in-shell not-found state.

## Markdown dialect

`renderMarkdown()` is a small purpose-built renderer, not a CommonMark implementation. It currently supports:

- ATX headings at levels 1–3
- paragraphs
- ordered and unordered single-level lists
- single-line block quotes
- fenced code blocks using triple backticks
- inline code, bold, emphasis, and links

It does not support nested lists, images, tables, raw HTML, multiline block quotes, alternate heading syntax, or complex/nested inline markup. Preserve this distinction in documentation and tests. If the content eventually needs broad Markdown compatibility, replace the parser with a maintained implementation rather than continually growing fragile regular expressions. Keep the fenced renderer contract when doing so.

Raw HTML from Markdown is intentionally unsupported. `escapeHtml()` runs before inline substitutions, and ordinary fenced code is escaped. Link destinations are limited to `http:`, `https:`, `mailto:`, and hash links. Do not weaken these rules without explicitly redesigning the trust model.

Rendered external `http:` and `https:` Markdown links open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`. Hash wiki links and `mailto:` links stay in the current browsing context.

## Fenced-language extension architecture

`fenceRenderers` is the extension registry. The word immediately following an opening triple-backtick fence selects a renderer:

```js
const fenceRenderers = {
  languageName(source) {
    return "...rendered HTML...";
  },
  default(source, language) {
    return "...escaped fallback...";
  }
};
```

To add a language:

1. Choose a stable, lowercase fence label.
2. Add a renderer to `fenceRenderers`.
3. Escape source whenever it is inserted into HTML or an attribute.
4. Prefer delegated events on `#content`, because page navigation replaces its descendants.
5. Add language-specific styles with a distinct class namespace.
6. Ensure an unknown or failed block still leaves its source readable.
7. Add an example page or example block that exercises the integration.

Renderers are synchronous HTML producers at present. Expensive libraries should initialize lazily on first interaction where practical. If a renderer needs asynchronous transformation, add an explicit post-render enhancement phase rather than making `renderMarkdown()` itself perform network work.

## ABC notation integration

`index.html` loads the pinned `abcjs@6.6.3` browser bundle from jsDelivr before `app.js`. An `abc` fence renders a notation panel with a target `<div>` for generated SVG, a single Play/Stop button, and a collapsible copy of the raw source.

ABC rendering is a progressive enhancement. `renderMarkdown()` creates the placeholder HTML synchronously, then `loadPage()` calls `renderAbcBlocks()` after replacing `#content`. `renderAbcBlocks()` passes each decoded ABC source string to `window.ABCJS.renderAbc()` with responsive SVG sizing and stores the first returned visual object on the block for playback. If the library is unavailable or rendering throws, the notation area shows a concise error and the escaped source remains available in the collapsible Source section.

ABC playback uses abcjs's built-in synth API rather than translating ABC to Strudel. The first user click creates or resumes a shared `AudioContext`, initializes `ABCJS.synth.CreateSynth()` from the stored visual object, primes the buffer, and starts playback. Ordinary notation defaults to MIDI program `0` (`acoustic_grand_piano`). If the ABC source explicitly looks percussive through a percussion clef or `%%MIDI drum` directive, playback uses MIDI channel 10. This heuristic is intentionally small; future instrument mapping should come from ABC metadata or a project-specific convention rather than hard-coded page names.

ABC playback highlighting uses `ABCJS.TimingCallbacks`. The first version intentionally keeps the cursor simple: `eventCallback` clears the previous `.abc-current-note` class and applies it to the current event's SVG elements. `renderAbc()` must keep `add_classes: true` so the generated SVG remains suitable for styling. Stop, end-of-tune, and navigation must clear the highlight.

Only one audio source should play at a time. Starting ABC playback calls `stopStrudelBlocks()` and starting Strudel playback calls `stopAbcBlocks()`. Navigation stops both.

ABC source is declarative music notation, not executable JavaScript. It is still third-party parser input, so keep the raw source visible, escape all fallback HTML, and avoid accepting untrusted remote Markdown without revisiting the broader trust model.

## Drum notation integration

`index.html` loads the pinned `vexflow@4.2.2` browser bundle from jsDelivr before `app.js`. A `drums` fence renders a VexFlow percussion staff and a collapsible copy of the raw source.

The `drums` DSL is intentionally narrow in its first version:

- `tempo N`
- `meter 4/4`
- `division 8`, `division 12`, `division 16`, or `division 24`; `8` means eighth-note slots, `12` means eighth-note-triplet slots, `16` means sixteenth-note slots, and `24` means sixteenth-triplet/sextuplet slots
- `hh: ...` for hi-hat
- `sn: ...` for snare
- `bd: ...` for bass drum/kick
- `cr: ...` and `rd: ...` for crash and ride cymbals
- `ht: ...`, `mt: ...`, and `ft: ...` for high, mid, and floor toms
- `ph: ...` for pedal hi-hat
- `wb: ...` for woodblock

Each row currently takes exactly `division` slots: eight slots for eighth notes, twelve slots for eighth-note triplets, sixteen slots for sixteenth notes, or twenty-four slots for sixteenth-note triplets/sextuplets. `x` means hit, `o` means open hi-hat in source semantics, and `.` means rest. Rendering maps hi-hat and woodblock to X noteheads with upward stems, and kick/snare to normal noteheads with downward stems. Playback is scheduled from the parsed event grid rather than by reverse-engineering rendered SVG.

When adding rudiments, keep the audible stroke spacing consistent with the existing examples unless the note is deliberately about a different speed. The playback engine computes one source slot as `240 / (tempo * division)` seconds, so equivalent plain-stroke grids need different tempos:

- `division 16` at `tempo 100` is the baseline plain sixteenth-note spacing.
- `division 8` needs `tempo 200` to sound equally fast with plain `x` strokes.
- `division 12` needs `tempo 133.333` to sound equally fast with plain triplet-grid strokes.
- `division 24` needs `tempo 66.667` when the written figure uses twice as many tuplet slots for the same audible stroke spacing.

Do not use diddle shorthand (`x/`) just to save horizontal space when the rudiment is meant to show evenly spaced written strokes. `x/` schedules two hits inside one source slot, so its effective inner stroke spacing is half the slot duration. For diddle-roll examples that use `x/`, slow the slot tempo accordingly; for explicit triplet or paradiddle examples, prefer plain `x` tokens and set `tempo` from the grid division.

Flams and drags add grace-note playback around the written slot. Their grace timing should stay proportional to the current `stepDuration`; do not use a fixed millisecond offset that makes faster rudiments feel rushed or slower rudiments feel too open. When a flam or drag token is accented, the accent applies to the main written stroke, not to the grace note; keep grace-note playback light.

Keep `drums` separate from ABC. ABC remains useful for melodic staff notation and abcjs playback, but abcjs does not provide idiomatic drum-kit engraving such as X-shaped hi-hat noteheads and compact kit layout. The `drums` fence exists specifically to preserve a human-friendly source format while targeting a renderer with lower-level engraving control.

The renderer treats each slot as one rhythmic event. Every instrument hit in that slot becomes a notehead in a single VexFlow chord with an upward stem; continuous hits provide the shared beam. This deliberately avoids separate percussion voices and the rests they introduce, producing the compact drum-set convention used by teaching tools such as Drumeo.

Future rudiment-specific rendering may deserve its own fence, likely `rudiment`, instead of continuing to force all rudiments through VexFlow drum-staff notation. A useful target is the common single-line rudimental engraving style: one horizontal line, right-hand noteheads above the line, left-hand noteheads below the line, rhythm shown by stems/beams, and accents/flams/roll slashes drawn directly. This would preserve the current plain-text `drums`-style source while giving rudiments cleaner notation, simpler dark-mode styling, and more reliable playback highlighting. Keep VexFlow for full drum-staff examples unless this custom renderer is implemented deliberately.

For tuplet grids, the renderer may collapse a beat group that contains one hit followed only by `.` slots into a longer landing note. For example, in `division 24`, `x x x x x x x> . . . . .` engraves as a sextuplet followed by an accented quarter-note landing instead of a short sextuplet note followed by hidden spacer rests. Playback still follows the original source slots.

Tokens may carry idiomatic modifiers: `x>` adds a VexFlow `Articulation('a>')`, `(x)` wraps that row's notehead with `Parenthesis` modifiers, `x/`, `x//`, or `x///` add one to three VexFlow `Tremolo` slashes, `f` attaches one slashed `GraceNote` as a flam, and `d` attaches two beamed grace notes as a drag. Playback treats `x/` as a double and `x//`/`x///` as short multiple-bounce clusters. A separate `stick:` row accepts `R`, `L`, `RL`, `LR`, or `.` in each slot and adds a bottom-positioned VexFlow `Annotation`. These are DSL conventions, not VexFlow's own text syntax; VexFlow is the rendering target.

VexFlow is an engraving library and does not provide audio. Drum playback therefore uses the same parsed DSL events to schedule a small dependency-free Web Audio kit: a pitched oscillator for kick and woodblock, filtered noise plus a short tone for snare, and filtered noise for closed/open hi-hat. Playback honors the optional `tempo` directive, highlights the VexFlow chord at each slot, and loops until the user presses Stop or navigates away. Open hi-hats use the conventional circle just above the X notehead; this marker is added to the finished SVG because VexFlow's generic top annotation is positioned above the beam instead.

If a drum block includes a `stick:` row, playback uses simple stereo placement: `R` pans the slot right, `L` pans it left, and `RL`, `LR`, `.`, or missing sticking stay centered. Flam and drag grace notes use the opposite hand from the main written stroke, so a right-hand flam sounds left-right and a left-hand drag sounds right-right-left. Keep this tied to the parsed sticking data instead of deriving it from rendered annotations, because rendering details can change.

Drum notation renders begin/end repeat barlines by default, matching playback behavior: every drum sample loops until stopped. Do not remove repeat signs from rudiment examples unless playback behavior is also changed or the source gains an explicit repeat directive.

Playback highlighting is bound through each main `StaveNote` object's `getSVGElement()` result. Do not reconstruct this mapping by querying every `.vf-stavenote`: grace notes used by flams and drags also have that class and will shift the timeline-to-element correspondence.

## Cube notation integration

`cube-notation.js` contains a dependency-free 3×3 facelet model and CMLL SVG renderer derived from the architecture of the sibling Brief Cubing project. `cube-cmll` source is ordinary Singmaster-style algorithm notation. The renderer reverses and inverts the move sequence, applies it to a solved cube, and displays the state from which the written algorithm solves the case.

Fence lines may include whitespace-separated `name=value` parameters. `renderMarkdown()` preserves the text after the language label, `parseFenceOptions()` validates its generic syntax, and `renderCubeBlocks()` validates renderer-specific keys. CMLL currently accepts `edges=show|hide`, `center=show|hide`, `auf=<move>`, and `rotation=<move>`. This split allows later fences such as `cube-eolr` to reuse the parameter mechanism while defining different view presets.

The CMLL default uses Brief Cubing's original 21-polygon last-layer SVG geometry and color palette. U-layer edges and the U center are masked, while the four corners and their adjacent side stickers remain colored. Supported moves include face turns, `M/E/S`, lowercase or `Rw`-style wide turns, and `x/y/z` rotations.

## Strudel integration

`index.html` loads the pinned `@strudel/web@1.0.3` browser bundle from unpkg before `app.js`. A `strudel` fence renders a single Play button and a collapsible copy of the raw source. When active, the button changes to Stop; if playback fails, the same button changes to an error/retry state.

The click handler on `#content` performs the following work:

1. Initializes Strudel once through `prepareStrudel()`.
2. Calls `hush()` so only one wiki sketch is active.
3. Decodes and evaluates the fenced source.
4. Requires the result to expose `.play()`.
5. Updates the button state or reports the thrown error through the retry button state.

`prepareStrudel()` must wait for both `initStrudel()` and the global Strudel DSL symbols used by fenced source. The CDN bundle can resolve initialization before globals such as `note` and `sine` are immediately evaluable; without the extra readiness check, the first Play after page load can fail and the retry can succeed.

Navigation also calls `hush()` so sound does not continue after leaving a page. Browser autoplay rules require playback to originate from a user gesture.

Strudel source is JavaScript and is evaluated globally. Therefore, Markdown files are trusted executable project content. This site must not fetch or render arbitrary user submissions. If untrusted authors are introduced, this architecture is insufficient; use a sandboxed iframe with a carefully designed message boundary.

The CDN dependency means first playback requires network access. Vendoring the pinned runtime is the likely future path for offline behavior. Strudel uses the AGPL-3.0 license; review its obligations before bundling, modifying, or distributing a derived deployment.

## Presentation architecture

`styles.css` owns the complete visual system. Important characteristics:

- CSS custom properties define the paper, ink, accent, code, and notation panel colors.
- Theme selection uses `data-theme="dark|light"` on `<html>`, defaults to dark, and persists the user's choice in `localStorage` under `personal-wiki-theme`.
- Desktop layout is a three-column grid with the article in the center and a sticky sidebar.
- Below 720 px, the layout becomes single-column and navigation is toggled by the Menu button.
- Article typography and extension components are scoped under `.content` or language-specific classes.
- The persistent shell is not recreated during navigation.

Maintain keyboard access, visible focus behavior, semantic controls, and status announcements. Dynamic content is inserted into a focusable `main` with `aria-live="polite"`; after navigation, focus moves there without forcing an additional scroll.

## Content authoring conventions

- Place top-level pages in `pages/<slug>.md` and section pages in `pages/<section>/<slug>.md`; section landing pages use `pages/<section>/index.md`.
- Use lowercase kebab-case slugs only.
- Link between wiki pages with `[label](#/slug)`.
- Add important pages to the static sidebar in `index.html`.
- Keep each page understandable as raw Markdown.
- Put sub-language source in a labeled fence; do not hide canonical content in generated HTML.
- Treat every Strudel fence as executable code during review.

The sidebar is currently curated manually. Do not imply that all files under `pages/` are automatically discovered.

## Local development and deployment

Do not open `index.html` directly with `file://` for normal testing. Browser security commonly blocks `fetch()` of the Markdown files and may restrict external scripts. Serve the repository over HTTP:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/#/home`.

Production deployment consists of publishing the repository root through GitHub Pages. Relative references such as `styles.css`, `app.js`, and `pages/home.md` are intentional; root-relative references such as `/styles.css` would break when hosted at `https://example.github.io/project-name/`.

## Verification expectations

There is no automated test suite yet. For every behavioral change:

1. Run `node --check app.js`.
2. Serve the repository over HTTP rather than using `file://`.
3. Load `#/home` and confirm Markdown rendering.
4. Navigate home → music → cubing → home and verify the URL, active sidebar item, title, scroll reset, and content replacement.
5. Visit a missing slug and verify the not-found state.
6. At a narrow viewport, verify the Menu control and article layout.
7. For Strudel changes, verify the Play/Stop toggle, playback replacement, navigation cleanup, and retry state when the runtime or pattern fails.
8. For ABC changes, verify an `abc` fence renders staff notation and the Source section still shows readable text if the library fails.
9. Check the browser console for unexpected errors.

If parser behavior grows, add isolated automated fixtures before expanding syntax further. Important fixtures should cover HTML escaping, rejected link protocols, unclosed fences, list transitions, and extension dispatch.

## Engineering guidance

- Preserve the static-hosting constraint and plain-text source model.
- Keep content, presentation, parsing, routing, and extension behavior conceptually separate even while the codebase is small.
- Do not duplicate route state outside the URL hash.
- Do not add page-specific conditionals to the parser when a fence renderer is the appropriate abstraction.
- Do not attach event listeners directly to rendered child nodes unless they are reattached after every navigation; delegated events are preferred.
- Stop active media when replacing a page.
- Pin external runtime versions. Avoid `@latest` in production HTML.
- Document new executable-content and licensing implications.
- Keep `README.md` concise for authors and operators; keep detailed architectural rationale here.

## Known limitations and likely next steps

Current limitations are intentional or accepted, not accidental:

- The Markdown parser covers only the documented subset.
- Navigation and the sidebar are not generated from page metadata.
- There is no search, backlinks, page index, or front matter.
- ABC notation depends on a CDN unless the pinned renderer is vendored locally.
- Strudel depends on a CDN and executes trusted source with global `eval`.
- There are no automated parser or browser tests.
- There is no offline service worker or asset cache.

Likely future work includes extracting parser and renderer modules, adding test fixtures, introducing optional front matter for titles/navigation, vendoring interactive runtimes, and adding new fenced-language plugins. Any such change should strengthen the central premise: durable human-readable notes, progressively rendered into a useful static wiki.
