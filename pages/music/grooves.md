# Grooves

A groove is more than a list of drum hits. It is a repeating pattern of expectation and surprise: where attacks fall, which instruments reinforce one another, which events are withheld, and how the pattern changes across its cycle.

[Open Rhythm Explorer](projects/rhythm-explorer/) to edit, generate, hear, notate, and analyze patterns with kick, snare, hi-hat, cymbals, toms, and cowbell.

## A useful vocabulary

- **Pulse** is the regular underlying beat you can tap along with.
- **Meter** groups pulses into a recurring structure such as 4/4.
- **Subdivision** divides each pulse into smaller positions: eighth notes, sixteenths, triplets, and so on.
- **Backbeat** usually means a strong snare on beats 2 and 4 in 4/4.
- **Syncopation** places emphasis where the meter makes an event less expected, or withholds an expected event.
- **Interlocking** lets instruments answer one another instead of striking together. A kick pattern with no kick/snare unisons often feels clearer and more conversational.
- **Unison** means two instruments attack at the same moment. Kick/snare unisons add weight but can reduce independence.
- **Density** is the number of attacks in a span. Density can be considered per instrument and for the kit as a whole.
- **Run** is a sequence of adjacent attacks on the same subdivision grid. Long kick runs feel different from isolated kicks even at the same density.
- **Period** is the shortest span after which a pattern repeats. A one-beat or half-bar cell feels more predictable than a pattern that develops across a full bar or two.
- **Evenness** describes how uniformly attacks are distributed around a cycle. Euclidean rhythms are maximally even distributions; groove often comes from departing from that evenness deliberately.
- **Microtiming** is the small displacement of played notes from the exact grid. The notation below describes quantized structure; laid-back or pushed performance is another dimension.
- **Orchestration** assigns a rhythmic idea to kick, snare, hats, toms, cymbals, or auxiliary percussion. The same attack pattern can feel entirely different when moved around the kit.

## Expectation and groove

The patterns I tend to like avoid excessive kick/snare unisons, avoid long kick runs, develop over a longer cycle, and contain a few attacks that are plausible without being obvious. That fits a recurring result in groove research: pleasure and the urge to move often peak at an intermediate level of rhythmic complexity. Perfect predictability can be dull, while constant surprise can make the pulse hard to inhabit.

That does not produce a single formula for a good beat. Style, tempo, sound, repetition, dynamics, microtiming, and the listener's experience all change the result. It does give the explorer useful dimensions to expose instead of merely labeling patterns “good” or “bad.”

Useful starting points:

- [Predictability and surprise in pleasurable groove](https://pmc.ncbi.nlm.nih.gov/articles/PMC9396343/)
- [Syncopation as probabilistic musical expectation](https://onlinelibrary.wiley.com/doi/10.1111/cogs.13390)
- [Formal models for measuring rhythmic syncopation](https://pmc.ncbi.nlm.nih.gov/articles/PMC3769263/)
- [Godfried Toussaint on Euclidean rhythms and evenness](https://archive.bridgesmathart.org/2005/bridges2005-47.html)

## Grounded money beat

This short-period groove reinforces the quarter-note pulse with kick on 1 and 3, snare on 2 and 4, and steady eighth-note hats.

```drums
tempo 200
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x . . .
```

## Interlocking variation

The extra kicks anticipate beats 2 and 4 without landing on the snare. It has the same kit and density class, but a less literal relationship to the pulse.

```drums
tempo 200
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x x . .
```

Return to [Music](#/music).
