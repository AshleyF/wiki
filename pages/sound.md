# Sound sketches

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

Return to [drawing](#/drawing) or the [home page](#/home).
