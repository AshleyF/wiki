# Percussion Notation

The drum renderer favors a consistent, compact spelling of rhythm. The priorities are clarity, using as little notation as necessary, and writing the same rhythm the same way every time.

For a sixteenth-note grid in 4/4, each quarter-note beat is treated as a four-slot cell: `1 e & a`. Notes are beamed within that beat whenever possible, but beams do not cross the quarter-note boundary. Silent slots are combined into the longest conventional rest or note value that preserves the rhythm. This avoids chains of unnecessary sixteenth rests and avoids separate flags when notes can communicate their grouping with beams.

The following reference exhausts the 16 possible hit patterns in one four-slot cell. `1` means a stroke and `0` means silence. Each cell is repeated on all four beats so its canonical engraving is easy to inspect and hear.

## Groove voice separation

In a groove, dense hi-hat or ride timekeeping is visually separated from the musical conversation played by the kick, snare, and toms. The timekeeping voice uses upward stems; the lower kit voice uses downward stems. Stem direction follows the role of the voice rather than the average vertical position of its notes, so reorchestrating the same lower rhythm from kick to tom does not make its visual direction change.

The renderer applies this split automatically when a hi-hat or ride pattern occupies at least half the grid and occurs in every quarter-note beat. Sparse cymbal accents remain part of the single kit voice. Add `voices split` to force two voices or `voices single` to keep everything in one voice when the automatic choice does not express the musical idea.

```drums
tempo 100
meter 4/4
division 16
voices split
hh: x x x x | x x x x | x x x x | x x x x
sn: . . . . | x . . . | . . . . | x . . .
bd: x . . . | . . x . | x . x . | . . . .
```

## 0000 — quarter rest

Four silent slots collapse to one quarter-note rest.

```drums
tempo 80
meter 4/4
division 16
sn: . . . . | . . . . | . . . . | . . . .
```

## 0001 — dotted-eighth rest, sixteenth

The first three silent slots become a dotted-eighth rest. The final sixteenth stands alone.

```drums
tempo 80
meter 4/4
division 16
sn: . . . x | . . . x | . . . x | . . . x
```

## 0010 — eighth rest, eighth note

Two silent slots become an eighth rest; the hit consumes the final eighth of the beat.

```drums
tempo 80
meter 4/4
division 16
sn: . . x . | . . x . | . . x . | . . x .
```

## 0011 — eighth rest, two sixteenths

The two final sixteenths share both beams.

```drums
tempo 80
meter 4/4
division 16
sn: . . x x | . . x x | . . x x | . . x x
```

## 0100 — sixteenth rest, dotted-eighth note

The dotted-eighth hit stands alone after the initial sixteenth rest.

```drums
tempo 80
meter 4/4
division 16
sn: . x . . | . x . . | . x . . | . x . .
```

## 0101 — sixteenth rest, eighth, sixteenth

The two notes share the primary beam; the final sixteenth carries a partial secondary beam.

```drums
tempo 80
meter 4/4
division 16
sn: . x . x | . x . x | . x . x | . x . x
```

## 0110 — sixteenth rest, sixteenth, eighth

The notes share the primary beam; the first note carries the partial secondary beam.

```drums
tempo 80
meter 4/4
division 16
sn: . x x . | . x x . | . x x . | . x x .
```

## 0111 — sixteenth rest, three sixteenths

The three strokes share both beams.

```drums
tempo 80
meter 4/4
division 16
sn: . x x x | . x x x | . x x x | . x x x
```

## 1000 — quarter note

One stroke followed by three silent slots is written as a quarter note.

```drums
tempo 80
meter 4/4
division 16
sn: x . . . | x . . . | x . . . | x . . .
```

## 1001 — dotted eighth, sixteenth

The notes share the primary beam; the final sixteenth carries a partial secondary beam.

```drums
tempo 80
meter 4/4
division 16
sn: x . . x | x . . x | x . . x | x . . x
```

## 1010 — two eighth notes

The two eighth notes share one beam.

```drums
tempo 80
meter 4/4
division 16
sn: x . x . | x . x . | x . x . | x . x .
```

## 1011 — eighth, two sixteenths

One primary beam joins all three notes; the last two share the secondary beam.

```drums
tempo 80
meter 4/4
division 16
sn: x . x x | x . x x | x . x x | x . x x
```

## 1100 — two sixteenths, eighth rest

The first two sixteenths share both beams. The final two silent slots become an eighth rest. This is the preferred spelling for this cell.

```drums
tempo 80
meter 4/4
division 16
sn: x x . . | x x . . | x x . . | x x . .
```

## 1101 — sixteenth, eighth, sixteenth

One primary beam joins all three notes. Each outside sixteenth has a partial secondary beam.

```drums
tempo 80
meter 4/4
division 16
sn: x x . x | x x . x | x x . x | x x . x
```

## 1110 — two sixteenths, eighth

One primary beam joins all three notes; the first two share the secondary beam.

```drums
tempo 80
meter 4/4
division 16
sn: x x x . | x x x . | x x x . | x x x .
```

## 1111 — four sixteenths

All four strokes share both beams.

```drums
tempo 80
meter 4/4
division 16
sn: x x x x | x x x x | x x x x | x x x x
```

Return to [Music](#/music).
