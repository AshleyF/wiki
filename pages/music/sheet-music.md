# Piano sheet music

These scores can play themselves or follow a piano over MIDI. **Play** performs the written music and highlights each event; after connecting MIDI, it sends the performance to the selected output instead of using browser audio. **Follow** waits at each written note or chord until the correct keys arrive from the selected MIDI input, then advances at the player's pace. **Reset** returns to the first note.

The plain-text `piano-score` notation keeps measures and durations explicit. Pitch names use scientific pitch notation; `q`, `e`, and `h` mean quarter, eighth, and half notes; a trailing dot makes a duration dotted; `r` is a rest; and bracketed pitches form a chord. Beginner scores can add `note-names show` before `notes:` to print pitch letters beneath the staff.

## When the Saints Go Marching In (middle C)

The same simple C-major melody in 2/4, beginning on middle C and staying within C4–G4.

```piano-score
title When the Saints Go Marching In (middle C)
tempo 104
meter 2/4
clef treble
note-names show
notes:
r:e C4:e E4:e F4:e | G4:h |
r:e C4:e E4:e F4:e | G4:h |
r:e C4:e E4:e F4:e | G4:q E4:q |
C4:q E4:q | D4:h |
r:e E4:e E4:e D4:e | C4:h |
E4:q G4:q | G4:e F4:q. |
r:q E4:e F4:e | G4:q E4:q |
C4:q D4:q | C4:h
```

## When the Saints Go Marching In

The same melody one octave higher, in C5–G5. This [traditional spiritual](https://library.timelesstruths.org/music/When_the_Saints_Go_Marching_In/) is in the public domain.

```piano-score
title When the Saints Go Marching In
tempo 104
meter 2/4
clef treble
note-names show
notes:
r:e C5:e E5:e F5:e | G5:h |
r:e C5:e E5:e F5:e | G5:h |
r:e C5:e E5:e F5:e | G5:q E5:q |
C5:q E5:q | D5:h |
r:e E5:e E5:e D5:e | C5:h |
E5:q G5:q | G5:e F5:q. |
r:q E5:e F5:e | G5:q E5:q |
C5:q D5:q | C5:h
```

## Ode to Joy

A beginner C-major setting of Beethoven's theme, centered around middle C.

```piano-score
title Ode to Joy
tempo 100
meter 4/4
clef treble
note-names show
notes:
E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q |
C4:q C4:q D4:q E4:q | E4:q. D4:e D4:h |
E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q |
C4:q C4:q D4:q E4:q | D4:q. C4:e C4:h |
D4:q D4:q E4:q C4:q | D4:q E4:q F4:q E4:e C4:e |
D4:q E4:q F4:q E4:e D4:e | C4:q D4:q G3:h |
E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q |
C4:q C4:q D4:q E4:q | D4:q. C4:e C4:h
```

Return to [Music](#/music).
