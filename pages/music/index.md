# Music

## Wiki notes

### Drums

- [Drum rudiments](#/music/rudiments) — sticking, rolls, paradiddles, flams, drags, and hybrid rudiments
- [Triplet Vocabulary](#/music/triplet-vocabulary) — nine abstract A/B triplet melodies with playable ghost-note practice loops
- [Paradiddle inversions](#/music/paradiddles) — the four PAS inversions and every ordered pair
- [Drum fills](#/music/fills) — fill rhythms organized by length and subdivision, with orchestration variants

### Piano

- [Piano sheet music](#/music/sheet-music) — playable scores that can follow a MIDI keyboard note by note

### Theory

- [Percussion notation](#/music/percussion-notation) — canonical, compact spellings for common rhythmic cells
- [Grooves](#/music/grooves) — playable beats and groove theory
- [Rhythm](#/music/rhythm) — a study map of rhythmic concepts, percussion, and technique
- [Euclidean rhythms](#/music/euclidean-rhythms) — even-distribution rhythms and Boolean combinations

## Standalone tools

- [Rhythm Explorer](projects/rhythm-explorer/) — generate, edit, orchestrate, and perform layered drum parts
- [Euclidean Rhythm Explorer](projects/euclidean-rhythm-explorer/) — combine Euclidean generators into playable tracks
- [Piano Reading Trainer](projects/piano/) — beginner sight-reading drills with MIDI input and a moving cursor
- [Piano Flashcards](projects/piano-flashcards/) — endless letter, grand-staff, and ear-training note drills with on-screen or MIDI input

## Strudel

Strudel patterns can live next to the thinking that produced them. Press **Play** below to run this pattern in the browser; the button changes to **Stop** while it is playing. See the [Strudel documentation](https://strudel.cc/learn/getting-started/) for the live-coding language behind this block.

```strudel
note("c3 eb3 g3 bb3")
  .sound("sawtooth")
  .slow(2)
  .lpf(sine.range(400, 1800).slow(8))
```

## Staff notation from text

ABC notation is a compact plain-text format for melodies, chords, meter, key, repeats, and other score markings. The `abc` fence renders it as standard music notation in the browser. For syntax details, see [abcjs on ABC notation](https://docs.abcjs.net/overview/abc-notation) and the [ABC 2.1 standard](https://abcnotation.com/wiki/abc:standard:v2.1).

```abc
X:1
T:Small phrase
M:4/4
L:1/8
K:C
CDEF GABc | cBAG FEDC | "F"A2A2 "G"G2G2 | "C"C4 z4 |]
```

## Drum staff

ABC is not a great drum-kit engraving tool, so this wiki has a small `drums` fence for compact drum notation. It uses [VexFlow](https://www.vexflow.com/) to render a percussion clef, X noteheads for cymbal-like parts, and normal noteheads for kick/snare. For comparison, see a general overview of [standard percussion notation](https://en.wikipedia.org/wiki/Percussion_notation).

```drums
tempo 104
meter 4/4
hh: x x x x x x o x
sn: . . x . . . x .
bd: x . . x . x . .
```

### Drum notation reference

This second block is deliberately an engraving sampler rather than a musical groove. It shows the extra kit rows and modifiers available to copy into other notes.

```drums
tempo 88
meter 4/4
cr: x> . . . x . . .
rd: . x x x . x . x
hh: . . o . . . . .
sn: f . (x) . d> . x/ .
ht: . x> . . . . . .
mt: . . . x . . . .
ft: . . . . . x . .
bd: x . . x . . . .
ph: . . . . x . . .
stick: R L R L R R L L
```

## Why fence it?

The `strudel` label is a clean boundary between prose and a sub-language. Its renderer adds controls and sends the block to the Strudel runtime. Other labels can map to other renderers.

- The Markdown remains readable in any text editor.
- Unknown languages still appear as safe, escaped code.
- The source stays independent of the visual design.

Return to the [home page](#/home).
