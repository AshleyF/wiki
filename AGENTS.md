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
├── projects/        Standalone static experiments and reusable project assets
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

- ATX headings at levels 1–6
- paragraphs
- ordered and unordered single-level lists
- single-line block quotes
- horizontal rules from lines containing four or more hyphens
- forced line breaks from a trailing backslash at the end of a paragraph line
- fenced code blocks using triple backticks
- inline code, bold, emphasis, and links

It does not support nested lists, images, tables, raw HTML, multiline block quotes, alternate heading syntax, or complex/nested inline markup. Preserve this distinction in documentation and tests. If the content eventually needs broad Markdown compatibility, replace the parser with a maintained implementation rather than continually growing fragile regular expressions. Keep the fenced renderer contract when doing so.

Raw HTML from Markdown is intentionally unsupported. `escapeHtml()` runs before inline substitutions, and ordinary fenced code is escaped. Link destinations are limited to `http:`, `https:`, `mailto:`, hash links, and restricted relative paths under `projects/`. Do not weaken these rules without explicitly redesigning the trust model.

Rendered external `http:` and `https:` Markdown links and local `projects/...` links open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`. Hash wiki links and `mailto:` links stay in the current browsing context. Project-relative links deliberately accept only lowercase letters, digits, slashes, and hyphens; traversal and arbitrary relative assets remain rejected.

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

## Piano score integration

The `piano-score` fence is the wiki's compact, interactive score format for piano practice. It accepts `title`, `tempo`, `meter`, `clef`, the optional `note-names show|hide` directive, and a bar-separated `notes:` body. Note tokens use scientific pitch plus a duration (`C4:q`), `r` represents a rest (`r:e`), brackets represent chords (`[C4,E4,G4]:h`), and a trailing duration dot makes a dotted value (`F4:q.`). Each written measure must exactly fill the declared meter. Note names are hidden by default; when enabled, compact pitch-class labels appear beneath playable notes while rests remain unlabeled.

VexFlow renders the score and the parsed event list drives both Web Audio playback and note highlighting. Follow MIDI mode is deliberately untimed: it skips written rests, highlights the next playable event, and advances only when the selected MIDI input supplies the exact pitch or chord. The selected input shares the Piano Reading Trainer's `piano-reading-trainer-midi-input` preference. Starting another wiki audio block, navigating, hiding the document, or blurring the window must stop score playback and following cleanly.

## Drum notation integration

`index.html` loads the pinned `vexflow@4.2.2` browser bundle from jsDelivr before `app.js`. A `drums` fence renders a VexFlow percussion staff and a collapsible copy of the raw source.

The `drums` DSL is intentionally narrow in its first version:

- `tempo N`
- `meter 4/4`
- `voices auto`, `voices split`, or `voices single`; `auto` is the default
- `division 8`, `division 12`, `division 16`, or `division 24`; `8` means eighth-note slots, `12` means eighth-note-triplet slots, `16` means sixteenth-note slots, and `24` means sixteenth-triplet/sextuplet slots
- `hh: ...` for hi-hat
- `sn: ...` for snare
- `bd: ...` for bass drum/kick
- `cr: ...` and `rd: ...` for crash and ride cymbals
- `ht: ...`, `mt: ...`, and `ft: ...` for high, mid, and floor toms
- `ph: ...` for pedal hi-hat
- `wb: ...` for woodblock

Each row currently takes a whole-bar multiple of `division` slots: eight slots per bar for eighth notes, twelve slots per bar for eighth-note triplets, sixteen slots per bar for sixteenth notes, or twenty-four slots per bar for sixteenth-note triplets/sextuplets. `x` means hit, `o` means open hi-hat in source semantics, and `.` means rest. `_` is a playback-only ghost stroke: it occupies and sounds softly on its source slot but is not itself engraved or highlighted. `~` is an ordinary-strength playback-only stroke; `~>` is its strong, accent-velocity counterpart. The triplet-vocabulary page uses `~>` for a clearly audible pedal-hi-hat timekeeper that remains absent from the reduced engraving. Three-slot groups containing hidden playback strokes use `drumHiddenTripletSpellings`: `100` becomes an ordinary quarter note without a tuplet mark, `101` becomes quarter–eighth under a triplet bracket, `110` becomes two eighths plus an eighth rest, and `010` becomes an eighth rest plus a quarter. Necessary rests belong to the reduced melody spelling, not to the hidden playback strokes themselves. Rendering maps hi-hat and woodblock to X noteheads and drums to normal noteheads; stem direction follows the semantic voice rules below. Playback is scheduled from the parsed event grid rather than by reverse-engineering rendered SVG.

When adding rudiments, keep the audible stroke spacing consistent with the existing examples unless the note is deliberately about a different speed. The playback engine computes one source slot as `240 / (tempo * division)` seconds, so equivalent plain-stroke grids need different tempos:

- `division 16` at `tempo 100` is the baseline plain sixteenth-note spacing.
- `division 8` needs `tempo 200` to sound equally fast with plain `x` strokes.
- `division 12` needs `tempo 133.333` to sound equally fast with plain triplet-grid strokes.
- `division 24` needs `tempo 66.667` when the written figure uses twice as many tuplet slots for the same audible stroke spacing.

Do not use diddle shorthand (`x/`) just to save horizontal space when the rudiment is meant to show evenly spaced written strokes. `x/` schedules two hits inside one source slot, so its effective inner stroke spacing is half the slot duration. For diddle-roll examples that use `x/`, slow the slot tempo accordingly; for explicit triplet or paradiddle examples, prefer plain `x` tokens and set `tempo` from the grid division.

Flams and drags add grace-note playback around the written slot. Their grace timing should stay proportional to the current `stepDuration`; do not use a fixed millisecond offset that makes faster rudiments feel rushed or slower rudiments feel too open. When a flam or drag token is accented, the accent applies to the main written stroke, not to the grace note; keep grace-note playback light. Rendering automatically adds tiny sticking annotations to grace notes from the opposite hand; do not duplicate those grace-note stickings in the source DSL.

Keep `drums` separate from ABC. ABC remains useful for melodic staff notation and abcjs playback, but abcjs does not provide idiomatic drum-kit engraving such as X-shaped hi-hat noteheads and compact kit layout. The `drums` fence exists specifically to preserve a human-friendly source format while targeting a renderer with lower-level engraving control.

The renderer treats each slot as one rhythmic event. Every instrument hit in that slot becomes a notehead in a single VexFlow chord with an upward stem; continuous hits provide the shared beam. This deliberately avoids separate percussion voices and the rests they introduce, producing the compact drum-set convention used by teaching tools such as Drumeo.

Future rudiment-specific rendering may deserve its own fence, likely `rudiment`, instead of continuing to force all rudiments through VexFlow drum-staff notation. A useful target is the common single-line rudimental engraving style: one horizontal line, right-hand noteheads above the line, left-hand noteheads below the line, rhythm shown by stems/beams, and accents/flams/roll slashes drawn directly. This would preserve the current plain-text `drums`-style source while giving rudiments cleaner notation, simpler dark-mode styling, and more reliable playback highlighting. Keep VexFlow for full drum-staff examples unless this custom renderer is implemented deliberately.

For tuplet grids, the renderer may collapse a beat group that contains one hit followed only by `.` slots into a longer landing note. For example, in `division 24`, `x x x x x x x> . . . . .` engraves as a sextuplet followed by an accented quarter-note landing instead of a short sextuplet note followed by hidden spacer rests. Playback still follows the original source slots.

For ordinary grids such as `division 16`, the renderer may also collapse a hit followed by silent `.` slots into a longer note value when the occupied slot count maps cleanly to a standard duration. For example, `x> . . . d x x x` engraves as an accented quarter note followed by four sixteenth-note events, not as a beamed sixteenth note plus invisible spacer rests. Playback still follows the original source slots. Scan the entire consecutive silent run and choose the longest prefix that maps to a standard duration; do not stop at an invalid intermediate prefix such as three sixteenth slots, because the following fourth slot completes a valid quarter note.

For `division 16` in `meter 4/4`, use the explicit beat-cell spellings in `drumSixteenthBeatSpellings` instead of the generic duration-collapse pass. Each quarter-note beat is one four-slot cell, beams never cross that boundary, rests are consolidated, and equivalent cells always receive the same spelling. The 16 canonical masks are rendered and explained on `pages/music/percussion-notation.md`; treat that page as the visual regression fixture when changing durations, rests, or beam grouping. In particular, preserve compound spellings such as `0001` = dotted-eighth rest plus a standalone sixteenth, `0101` = sixteenth rest plus a beamed eighth–sixteenth pair, `1001` = beamed dotted-eighth–sixteenth, `1100` = two beamed sixteenths plus an eighth rest, and `1101` = a beamed sixteenth–eighth–sixteenth group with partial secondary beams at both ends.

Groove engraving separates semantic voices rather than choosing stems from average staff position. In `voices auto`, a hi-hat or ride row that occupies at least half the grid and has a hit in every quarter-note beat triggers a split: crash/ride/hi-hat/woodblock form the stems-up upper voice, while toms/snare/kick/pedal hi-hat form the stems-down lower voice. Sparse cymbal accents do not trigger the split. `voices split` forces that organization and `voices single` disables it. Keep playback on the original unified event grid; the voice split is engraving-only. This role-based rule is deliberate: moving an otherwise identical lower-voice rhythm between kick and tom must not reverse its stems.

Playback highlighting must honor the engraved duration of collapsed notes and rests. A glyph that consumes several source slots remains current throughout all of those slots; otherwise a correctly engraved quarter note or longer rest appears to go blank after its first subdivision. Store the consumed-slot span on the `StaveNote` and map its rendered SVG elements into every corresponding `drumStepElements` entry. Visible rests are highlighted; invisible spacer rests and playback-only hidden strokes are not.

Tokens may carry idiomatic modifiers: `x>` adds a VexFlow `Articulation('a>')`, `(x)` wraps that row's notehead with `Parenthesis` modifiers, `x/`, `x//`, or `x///` add one to three VexFlow `Tremolo` slashes, `f` attaches one slashed `GraceNote` as a flam, and `d` attaches two beamed grace notes as a drag. Playback treats `x/` as two equal-velocity ordinary strokes by the same hand; the slash is rhythmic shorthand and must not give the second stroke a different timbre or lower velocity. `x//`/`x///` remain short multiple-bounce clusters whose later bounces decay. A separate `stick:` row accepts `R`, `L`, `RL`, `LR`, or `.` in each slot and adds a bottom-positioned VexFlow `Annotation`. In rendering, a single diddle token such as `x/` expands a simple sticking annotation from `R` to `RR` or from `L` to `LL`, while accented written strokes render their sticking annotation in bold. These are DSL conventions, not VexFlow's own text syntax; VexFlow is the rendering target.

VexFlow's default above-positioned accents can overlap upward stems and beams in compact percussion engraving, and its modifier-level vertical shift is not reliable after this renderer's formatting and beam pass. VexFlow 4.2.2 appends the accent glyph path to the first `.vf-notehead` group without retaining an SVG element on the `Articulation` object. After VexFlow draws the voice and beams, `positionDrumAccents()` identifies that appended direct-child path for accented notes and compares its SVG bounding box with beams crossing the same horizontal position. Inspect the notehead group's actual children rather than using a `:scope` selector. The main notehead glyph is the first direct path and its accent is the second; a flam may append its grace-note slash as a later path in that same outer group, so never select the last path. For a sloped beam, calculate its top edge at the accent's horizontal center rather than using the bounding box's global top. An overlapping accent is translated upward just far enough to leave six pixels beneath it; unbeamed accents retain VexFlow's placement. A beam is the horizontal connector joining eighth notes (one beam), sixteenth notes (two), and shorter values.

VexFlow is an engraving library and does not provide audio. Drum playback therefore uses the same parsed DSL events to schedule Web Audio. Snare hits use the velocity-layered, round-robin sample library under `projects/rhythm-explorer/assets/drums/`; the remaining instruments retain the dependency-free synthesized kit. The wiki selects `ludwig-black-beauty-snare-center` as its default kit through `library.json`, rather than depending on a leaf manifest's directory. Playback honors the optional `tempo` directive, highlights the VexFlow chord at each slot, and loops until the user presses Stop or navigates away. Open hi-hats use the conventional circle just above the X notehead; this marker is added to the finished SVG because VexFlow's generic top annotation is positioned above the beam instead.

`projects/rhythm-explorer/drum-sample-kit.js` is a reusable, DOM-free sample library shared from the Rhythm Explorer directory. `DrumSampleLibrary` validates the `drum-sample-library/1` discovery manifest, lists matching kits for UI controls, and resolves a stable `kit_id` to its leaf manifest; `DrumSampleKit` validates that `drum-sample-kit/1` manifest, fetches only the velocity layers required by the current pattern, decodes and caches their WAV files, selects variants with the manifest's weights while avoiding immediate repeats, and applies each variant's `gain_linear`. WAV files retain variable pre-attack audio, so playback must also honor each sample's `playback_offset_seconds` by calling `source.start(beatTime, playbackOffset)`; this places the detected attack onset on the musical event instead of aligning file frame zero. Channel handling follows leaf-manifest metadata: true mono buffers are centered by Web Audio before the existing subtle sticking pan, while genuine stereo buffers remain stereo. If a file declared mono unexpectedly decodes with multiple channels—for example, a stale cached capture with a silent interface channel—the loader reduces it to the highest-energy channel rather than treating the silent channel as half of a stereo image. A kit instance and its decoded buffers are shared by every drum block for the lifetime of the page. The Play button should display Loading only when a required manifest or decoded velocity layer is actually missing, not merely because playback preparation crosses an asynchronous boundary. Every drum block exposes the same synchronized snare selector. Its selection is global across wiki drum blocks, persists under `personal-wiki-drum-snare-kit`, and restarts active playback when changed. Ludwig Black Beauty remains the fallback default if no valid preference exists. The wiki maps its existing strength convention through the current ghost/normal/accent profile, whose defaults are MIDI velocities `16`, `64`, and `111`, and preserves right/left stereo panning after sample selection. If the library, manifest, or a sample cannot load, snare playback falls back to the synthesized sound. MIDI mode bypasses browser sample playback exactly as it bypassed the synthesized kit.

Acoustic runtime kits deliberately map one requested velocity to several nearby physical strikes rather than only the closest recording. The acoustic exporter currently supplies seven weighted variants from an inferred ±8-velocity neighborhood, permits gain matching in both directions, limits boost to 3 dB, retains at least 0.5 dB peak headroom, and applies a 1 dB output safety trim. Preserve the `source_velocity` field on variants so this neighborhood remains auditable. The wider mapping and `avoid_immediate_repeat` behavior are what keep repeated equal-velocity rudimental strokes from sounding like the identical WAV every time.

Superior Drummer-derived kits preserve every genuinely observed round robin at its original MIDI velocity. A post-export diversification pass supplements only mappings with fewer than seven choices, drawing from nearby velocity layers under the same ±8 window, 3 dB boost limit, 0.5 dB headroom floor, and 1 dB output trim. Its weights retain observed-frequency influence while reducing extreme dominance and penalizing velocity distance. Keep `mapping_origin=observed|neighbor`, `source_velocity`, measured sample `attack_rms_db`/`peak_dbfs`, and `selection.neighbor_diversification` intact; these fields distinguish authentic same-layer round robins from gain-matched neighboring layers and make the safety constraints testable.

Each drum block has one three-handle velocity control for ghost, normal, and accented hits. The defaults are symmetric MIDI values `16`, `64`, and `111`: ghost is 16 above zero, accent is 16 below 127, and normal is the MIDI midpoint. Handles remain strictly ordered; moving one through a neighbor pushes that neighbor and can cascade into the third handle. The current values feed the same piecewise strength-to-velocity mapping used by sample preparation, live Web Audio scheduling, synthesized fallback sounds, grace/bounce dynamics, and MIDI output. MIDI responds directly to every `input` event. Sample playback coalesces rapid input into a serialized preparation queue: it continues using the last fully prepared profile, then atomically latches each newly prepared recent profile while the pointer is still down. Never fall back to synthesized snare hits merely because a newly requested layer is still loading, and never launch overlapping preparation waves for every pointer event.

Every drum block has a playback-only swing control. Its range is deliberately symmetric around triplet swing: 50% at the left is straight 1:1 timing, 66⅔% at the physical midpoint is a 2:1 pair, and 83⅓% at the right is the same additional percentage-point distance beyond triplet swing. The optional `swing N` source directive sets a block's initial slider value; it must remain between 50 and 83.333. The midpoint has a visible tick and a narrow pointer/touch-only magnetic snap zone; do not apply that snap indiscriminately to keyboard input or the arrow keys can become trapped at the midpoint. Swing delays every odd-numbered grid slot while leaving each two-slot pair's total duration unchanged. Web Audio, MIDI, and playback highlighting must all use the same swung timestamps. Moving the slider updates playback without stopping or restarting it: both MIDI and Web Audio use short rolling schedulers and latch the latest value at the next two-slot pair. The slider does not rewrite the fenced source or alter VexFlow engraving.

Each drum block also exposes a persistent MIDI mode and output selector. MIDI mode uses Web MIDI, sends percussion on channel 10, and automatically suppresses the built-in Web Audio sounds while preserving looping and notation highlighting. The scheduler maps the same parsed hit data—including accents, ghost notes, flams, drags, and tremolo/bounce strokes—to MIDI timing. Core kit notes follow Toontrack Standard where it differs materially from General MIDI: the wiki sends high tom on note 48 because Superior Drummer uses GM high-tom note 50 for a muted crash. Snare sticking uses a Superior Drummer-oriented articulation convention: `R` sends center-snare note 38, `L` sends off-center-snare note 125, and unsticked snare hits remain on note 38. Flam and drag grace notes use the opposite hand's snare articulation, matching built-in stereo playback. Toontrack mappings can vary by library, so a non-core kit may need those notes assigned in Superior Drummer's MIDI mapping. MIDI uses a short rolling lookahead rather than timestamping a whole loop. Stopping or navigating cancels that scheduler, clears the output queue, and sends immediate plus tail-end All Sound Off and All Notes Off messages. Replacing an active MIDI rudiment delays the new start only through that bounded tail, preventing the old and new patterns from overlapping. Web MIDI requires a compatible browser and a secure context such as GitHub Pages or localhost.

If a drum block includes a `stick:` row, playback uses subtle stereo placement: `R` pans slightly right, `L` pans slightly left, and `RL`, `LR`, `.`, or missing sticking stay centered. The spread should suggest the physical width between two hands over one drum, not instruments placed near opposite speakers. Flam and drag grace notes use the opposite hand from the main written stroke, so a right-hand flam sounds left-right and a left-hand drag sounds right-right-left. Keep this tied to the parsed sticking data instead of deriving it from rendered annotations, because rendering details can change.

The wiki stops Strudel, ABC, drum audio, and drum MIDI playback whenever the document becomes hidden or its window loses focus. Browsers throttle inactive timers aggressively, so attempting to keep the rolling schedulers alive produces slow or uneven playback and may queue a burst for the return to the tab. Returning to the page leaves playback stopped; the user starts it again explicitly. Async drum preparation must check both document visibility and the block's loading state before scheduling so a completed sample load cannot restart playback after the inactivity stop.

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

## Rhythm Explorer language architecture

The standalone Rhythm Explorer under `projects/rhythm-explorer/` has its own source/grid round-trip language. `rhythm-language.js` is a DOM-free ES module that owns parsing and shortest-period serialization; keep language semantics there rather than embedding them in the explorer's already-large `app.js`. The Edit view regenerates compact source from the selected section and applies valid edits back through the same pattern model used by the grid, notation, Web Audio, and MIDI. Invalid source must leave the last valid pattern untouched. `rhythm-language.test.mjs` provides dependency-free Node fixtures for round trips, pattern algebra, articulations, and errors; run it whenever the language changes. `RHYTHM-LANGUAGE.md` distinguishes the implemented subset from future design.

## Piano reading trainer

`projects/piano/` is a standalone static sight-reading trainer. It uses the pinned VexFlow browser bundle for notation and Web MIDI for note input. Bluetooth MIDI is paired at the operating-system level; once the device appears as a browser MIDI input, the trainer treats it exactly like a wired controller. The on-screen keyboard calls the same note-attempt path and also plays a short synthesized piano-like tone through Web Audio, whether or not a drill is running.

The minimum handheld layout target is an iPhone 14 in landscape orientation (approximately 844×390 CSS pixels). Preserve `viewport-fit=cover`, safe-area padding for the landscape notch, 44-pixel interactive targets, and 16-pixel select/number text that prevents Safari input zoom. At this width the transport becomes a compact five-column grid, the 25-key on-screen keyboard narrows to fit inside the safe area, and longer scores retain contained horizontal momentum scrolling with automatic cursor following rather than widening the page.

Each drill is normalized to timed events containing a set of MIDI pitches and a duration in quarter-note beats. Beginner content is grouped into progressive levels: two or three natural notes, a five-note C position, then full-octave treble and bass reading. Do not introduce sharps or flats into these natural-note levels; future accidental content should live in an explicitly separate group. A public-domain song group currently includes Mary Had a Little Lamb, Three Blind Mice, Twinkle Twinkle Little Star, and Ode to Joy. Preserve their quarter- and half-note timing when editing the event lists. Introductory chord drills use two- and three-pitch events engraved as VexFlow chords. Physical MIDI note-ons are collected over a short chord-entry window; the on-screen keyboard's Chord hold mode lets a user select pitches and explicitly submit them together. The physical on-screen keyboard still shows black keys because it represents the real keyboard, even when the selected drill never requests them.

The cursor follows the performance clock rather than note-entry timing. MIDI tracks both note-on and note-off state. A correct MIDI note or chord pressed slightly before the ordinary timing window—up to half a beat early, capped at 500 ms—becomes a pending held entry instead of immediately pausing the drill. If it remains depressed when the timing window opens, it is accepted then; releasing it first cancels the pending entry. The pending entry belongs only to the current score event, so holding a pitch cannot automatically satisfy a following repeated pitch. Notes pressed farther ahead, wrong pitch sets, and missed deadlines pause the exercise at the current event and highlight every expected on-screen key as a recovery hint. While paused, both MIDI and the on-screen keyboard remain active: one correct entry clears those hints, accepts the event, and restarts the clock toward the following event, while another wrong entry leaves the drill paused. Keep the pure timing, held-entry, and pitch-set helpers in `trainer-core.js` and run `node projects/piano/trainer-core.test.mjs` when changing those semantics. Microphone pitch detection is not implemented; if added later, keep its latency calibration and confidence filtering separate from the MIDI path before feeding accepted pitches into the shared attempt classifier.

## Piano flashcards

`projects/piano-flashcards/` is a separate endless note-identification trainer. Its three mutually exclusive modes ask with a letter, a single note on a complete grand staff, or an audible pitch with no visual answer clue. One shared setting controls the range (`C4–B4`, `C3–C5`, or `C2–C6`) and whether accidentals are included across all three modes, and persists under `piano-flashcard-settings`; switching modes must never replace those values. The default is the seven natural notes from middle C through B. Letter prompts include the octave number when the range is wider than the middle-C octave. The on-screen keyboard covers the complete C2–C6 range and labels only octave C keys.

Both an on-screen key and a Web MIDI note-on answer the active card. MIDI setup exposes separate input and output selectors. When an output is selected, ear questions and clicked-key feedback are sent as channel-1 MIDI notes to that device; otherwise a short browser-synthesized piano-like tone is used. Bluetooth pairing remains an operating-system responsibility. Correct answers hold their green prompt/key feedback for 650 ms before advancing; keep this pause long enough to read and to separate an ear-training answer from the following question tone. Wrong answers remain on the same card, turn the central prompt red, and highlight the expected key without playing an error sound. The horizontally scrollable keyboard minimally follows each target so it remains visible on narrow portrait screens; this deliberately keeps the rest of the keyboard visible rather than centering the answer as an excessive hint. Session statistics are intentionally ephemeral. Keep random selection and accuracy helpers in `flashcard-core.js`, avoid immediate note repetition, and run `node projects/piano-flashcards/flashcard-core.test.mjs` whenever its question-pool behavior changes.

For MIDI-capable standalone tools, opening a dedicated MIDI disclosure should request Web MIDI immediately when it is not already enabled; do not require a second Enable click. The inner button becomes Disable MIDI after access is granted and detaches/closes the app's ports when used. Persist explicitly selected input and output IDs per tool, restore them when those ports are available, and retain the preference if a device is temporarily absent. Rhythm Explorer's MIDI controls live under the broader More disclosure, so its explicit Enable MIDI button remains the one-click activation point. The wiki's drum MIDI checkbox is already a direct one-action control and is not governed by this disclosure behavior.

VexFlow key strings use `b/4` for B natural as well as spellings such as `bb/4` for B-flat. Never detect flats with a broad `key.includes('b')` check; use `vexAccidentalForKey()` so natural B does not receive an erroneous flat glyph.

The flashcard app shares the existing theme storage key and VexFlow version but has its own UI and state machine. Its minimum handheld target is also an iPhone 14 in landscape orientation: preserve safe-area padding, the full keyboard at the bottom, compact controls, and a prompt region that can fit the complete grand staff without page scrolling. The landscape keyboard is intentionally shallow to reserve vertical space for both staves; test the reduced browser-content viewport as well as the device's nominal resolution.

## Euclidean Rhythm Explorer architecture

`projects/euclidean-rhythm-explorer/` is a smaller standalone instrument for combining Euclidean patterns. `euclidean-core.js` is the DOM-free model: it generates rotated `E(k,n)` patterns, evaluates left-to-right Boolean clauses, calculates least-common-multiple periods, and renders finite track sequences. Keep these semantics separate from `app.js`, which owns the nested track editor, cumulative previews, persistence, shared playhead, and Web Audio scheduler.

The page starts with no tracks. Add Track creates an unassigned track with a neutral `E(3,8)` pattern; the instrument selector belongs permanently to the track header and may be changed without rewriting its rhythm. Unassigned tracks retain their editing and preview state but are skipped by audio and MIDI playback. Each track has a Level control that drives both built-in playback strength and outgoing MIDI velocity. It remains in the header at wide desktop sizes; below the compact-layout breakpoint it moves onto its own row and is hidden while the track is collapsed. Each track owns its own Euclidean clauses rather than referring to shared named generators. A track starts with one pattern and may apply union, difference, intersection, or XOR operations in visible left-to-right order. The initial expanded clause shows only its editable Pattern because its result would be identical. Each later expanded clause reads top-to-bottom as operation, editable Pattern, then cumulative Result; its collapsed header retains only that cumulative result, and the collapsed track retains the final result. Cumulative operation previews compare against the preceding stage: retained hits use the normal hit color, added hits are solid accent cells, and removed hits remain visible as hollow accent cells. The final track preview is not a comparison: it shows only surviving hits in the normal hit color and never carries added or removed styling from the last operation. Different cycle lengths repeat on the common slot grid; the adjustable bar length is the audible/displayed loop boundary and may be shorter than a track's natural least-common-multiple period.

All tracks share the transport's uniform master slot grid. The global Swing Unit independently chooses eighth- or sixteenth-note offbeats, so it is not coupled to either the meter or the grid resolution. Swing leaves numbered beat anchors fixed and delays only hits that land on alternating offbeats of that unit; 50% is straight, 66⅔% is triplet swing, and 83⅓% is the maximum, placing triplet swing at the physical midpoint. For example, eighth-note swing on a four-slot-per-quarter grid delays slots 2, 6, 10, and 14 rather than swinging adjacent sixteenth-note slots. Each track exposes a Swing override checkbox: unchecked stores `null`, follows the global value, and disables the track slider; checked stores and enables a numeric per-track value. Track Timing adds a constant microtiming displacement from −80 ms (ahead) through 0 ms (on beat) to +80 ms (behind). Swing ranges show a midpoint mark at 66⅔%, while Timing shows one at 0 ms. Pointer and touch drags have a narrow magnetic snap zone around those marks; keyboard input remains unsnapped for precise adjustment. Web Audio, outgoing MIDI notes, and that track's preview playhead use the same combined offset. MIDI clock remains an unswung 24-PPQN tempo reference: swing and microtiming affect notes, not transport clock pulses. Future-scheduled Web Audio nodes are tracked and stopped with the transport so large swing delays cannot leak hits after Stop.

`instrument-catalog.js` owns the explorer's instrument and MIDI-note definitions. Most entries use General MIDI percussion notes so a default Superior Drummer mapping can receive them; explicitly Toontrack-oriented extensions must be labeled as such because library mappings vary. The current brush additions follow the user's Superior Drummer mapping: backward swirl on note 66 and forward swirl on note 67. Those numbers overlap General MIDI percussion assignments, so they are intentionally labeled Toontrack rather than presented as portable mappings. Hi-hat entries may share a note while differing through pedal CC4 openness. Selecting a MIDI output suppresses built-in synthesis, but track mute, velocity, Boolean timing, highlighting, and the short rolling scheduler remain shared. Stop clears future MIDI events, sends Stop when clock is active, and sends All Sound Off plus All Notes Off. Run both `euclidean-core.test.mjs` and `instrument-catalog.test.mjs` whenever generation, algebra, instruments, or MIDI mappings change.

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
- Put a standalone static experiment in `projects/<slug>/`, link it with `[label](projects/<slug>/)`, and do not assume that it shares the wiki shell.
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
9. For drum sample changes, run `node projects/rhythm-explorer/drum-sample-kit.test.mjs`, verify only required velocity layers load, and confirm Play/Stop plus MIDI bypass still work.
10. Check the browser console for unexpected errors.

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
