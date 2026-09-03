# Piano sheet music

These scores can play themselves or follow a piano over MIDI. **Play** performs the written music and highlights each event. **Follow MIDI** waits at each written note or chord until the correct keys arrive from the selected MIDI input, then advances through the score at the player's pace.

The plain-text `piano-score` notation keeps measures and durations explicit. Pitch names use scientific pitch notation; `q`, `e`, and `h` mean quarter, eighth, and half notes; a trailing dot makes a duration dotted; `r` is a rest; and bracketed pitches form a chord.

## When the Saints Go Marching In

A simple C-major melody in 2/4. This [traditional spiritual](https://library.timelesstruths.org/music/When_the_Saints_Go_Marching_In/) is in the public domain.

```piano-score
title When the Saints Go Marching In
tempo 104
meter 2/4
clef treble
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

Return to [Music](#/music).
