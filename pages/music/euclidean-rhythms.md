# Euclidean Rhythms

A Euclidean rhythm distributes a chosen number of hits as evenly as possible across a fixed number of equal time slots. It is a compact and musically useful rhythm generator, but it does **not** generate every possible rhythm by itself.

The usual notation is `E(k, n)`:

- `k` is the number of hits, also called onsets.
- `n` is the number of equal slots, sometimes called pulses, in the cycle.
- A rotation chooses which slot is treated as the beginning.

Here, `x` means a hit and `.` means an empty slot.

```text
E(3, 8): x . . x . . x .
gaps:       3     3   2
```

The three hits divide the eight-slot circle into distances of `3, 3, 2`. Those distances differ by no more than one slot, so the hits are maximally even.

Another example is five hits in eight slots:

```text
E(5, 8): x . x x . x x .
gaps:       2 1   2 1   2
```

## Rotation and phase

Rotating a Euclidean rhythm preserves its cyclic spacing while changing where it lands against beat one:

```text
x . . x . . x .
. x . . x . . x
```

Those are rotations of the same `E(3, 8)` pattern. They can feel quite different once a barline, backbeat, melody, or another drum part supplies a reference point. In practice, rotation is as important as the hit count.

When `k` and `n` share a divisor, the result contains a smaller repeating cell. `E(4, 8)`, for example, is alternating hits and rests, so it is really a two-slot cell repeated four times. When they are relatively prime, the pattern traverses the entire cycle before repeating.

## Why it is called Euclidean

E. Bjorklund devised an efficient procedure for distributing timing-system events as evenly as possible. Godfried Toussaint observed that its recursive grouping resembles the Euclidean algorithm for greatest common divisors and that many resulting patterns correspond, up to rotation, to traditional musical timelines.

For practical use, the underlying idea can be understood without implementing the full algorithm: distribute the empty slots among the hits so that the gaps are as equal as possible. A generator is valuable because it performs that distribution consistently for any `k` and `n`.

This is a mathematical description of onset spacing, not a claim that the musical traditions modeled by these patterns were created by an algorithm. Their meter, accents, movement, sound, social function, and performance practice carry information the binary pattern does not.

## Does it generate all possible rhythms?

No—not in the ordinary meaning of “all possible rhythms.”

With `n` binary slots, where every slot is independently either hit or rest, there are `2^n` possible patterns. With eight slots there are `256`. If exactly `k` of those slots must be hits, there are “n choose k” possible patterns. For three hits in eight slots, that is `56` patterns.

`E(3, 8)` selects one especially even spacing family from those `56` patterns. Because three and eight are relatively prime, it has eight distinct rotations. It does not produce clustered patterns such as three adjacent hits unless another transformation is applied.

So there are two different tools for two different jobs:

- **Binary enumeration** generates every hit/rest configuration: count from `0` through `2^n - 1` and interpret the bits as slots.
- **Euclidean generation** chooses a highly structured representative for each density: distribute `k` hits as evenly as possible among `n` slots.

Euclidean rhythms can still participate in a much larger generative system. Rotating, layering, mutating, masking, accenting, orchestrating, and changing `k` or `n` over time creates a broad vocabulary. That vocabulary is not mathematically exhaustive, but it is far more directed than undifferentiated random hits.

## Using them on drumset

### Density

For a fixed cycle length, `k` is a direct density control. Raising it fills more slots without abandoning even distribution. This is useful for building intensity in a timekeeping or ostinato voice.

### Cycle length

`n` need not equal the number of subdivisions in one conventional bar. A five-, seven-, or eleven-slot cycle can repeat across `4/4`, producing shifting alignment. That is a cyclic pattern against a meter; whether it is best heard as polymeter, displacement, or simply an odd-length ostinato depends on the musical context.

### Rotation

Rotation moves the pattern relative to the downbeat without changing its internal interval pattern. Try every rotation before deciding that a particular `E(k, n)` is unmusical.

### Layering

Different voices can use different Euclidean patterns over the same grid:

```text
kick:  E(3, 8), rotation 0
snare: E(2, 8), rotation 2
hat:   E(7, 8), rotation 0
```

This is only a starting configuration. Collisions may be useful unisons or may be removed to make the groove more linear. Multiple cycle lengths can also interlock, although the combined phrase may become much longer than any individual part.

### Controlled evolution

A stable Euclidean pattern works well as a lower layer while accents, ghost notes, fills, crashes, and occasional mutations happen above it. Slowly changing density or rotation can evolve a groove while preserving more continuity than regenerating every hit independently.

## What the model leaves out

A binary Euclidean pattern describes onset locations only. A playable groove still needs decisions about:

- Meter and grouping
- Instrument and articulation
- Accents, ghost notes, and velocity
- Note length and cymbal choking
- Sticking and limb feasibility
- Swing and other microtiming
- Repetition, variation, and phrase structure

The same `E(k, n)` can therefore become many different grooves. Conversely, two performances can share the same binary pattern and feel completely different.

## References

- [The Euclidean Algorithm Generates Traditional Musical Rhythms](https://archive.bridgesmathart.org/2005/bridges2005-47.html) — Godfried Toussaint's 2005 paper introducing the musical connection and surveying timeline patterns.
- [The Distance Geometry of Music](https://arxiv.org/abs/0705.4085) — further mathematical treatment of rhythms, similarity, and the family of traditional timelines described by Euclidean patterns.

Return to the [music page](#/music) or the broader [rhythm study map](#/music/rhythm).
