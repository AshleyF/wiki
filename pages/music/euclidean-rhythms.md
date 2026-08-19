# Euclidean Rhythms

A Euclidean rhythm distributes a chosen number of hits as evenly as possible across a fixed number of equal time slots. It is a compact and musically useful rhythm generator. One Euclidean pattern does **not** generate every possible rhythm, but Boolean combinations of several patterns can—in a formal sense—be made universal.

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

Euclidean rhythms can still participate in a much larger generative system. Rotating, layering, mutating, masking, accenting, orchestrating, and changing `k` or `n` over time creates a broad vocabulary. With unrestricted Boolean combinations that vocabulary can be mathematically exhaustive; with a small number of nontrivial generators, it remains a selective and musically directed search space.

## Combining Euclidean rhythms as sets

[Open the Euclidean Rhythm Explorer](projects/euclidean-rhythm-explorer/) to change Euclidean generators live, combine them with Boolean operations, assign the results to drum tracks, and hear the composite loop.

A binary rhythm of length `n` can be treated as a set of occupied positions on the cyclic grid `0...n-1`. Ordinary set operations then become rhythm operations:

- **Union** (`A OR B`) plays a hit wherever either pattern has one.
- **Intersection** (`A AND B`) keeps only simultaneous hits.
- **Difference** (`A AND NOT B`) removes B's hits from A.
- **Symmetric difference** (`A XOR B`) keeps hits belonging to exactly one pattern, so collisions cancel.
- **Complement** swaps every hit and rest.

For example, align `E(3, 8)` with a rotation of `E(2, 8)`:

```text
A:              x . . x . . x .
B:              . . x . . . x .
A union B:      x . x x . . x .
A minus B:      x . . x . . . .
A intersect B:  . . . . . . x .
A xor B:        x . x x . . . .
```

The result of one of these operations will generally **not** itself be Euclidean. That is useful: the source patterns contribute regularity, while their collisions and omissions create less-even structures.

### Different cycle lengths

Patterns of different lengths first need a shared time grid. Repeat both patterns until they meet at the least common multiple of their lengths, then apply the operation slot by slot.

For example, `E(3, 8)` and `E(2, 5)` meet after `lcm(8, 5) = 40` slots. Their union can therefore create a forty-slot composite phrase even though neither source is long. If the result contains additional symmetry, its actual smallest repeating period may be a divisor of forty.

This is closely related to layering cyclic ostinatos or polymetric parts. It is important to distinguish **different cycle lengths** from **different subdivision sizes**: the patterns must ultimately be placed on compatible physical time points before a union or difference has a definite meaning.

### Can combinations generate every binary rhythm?

Yes, if rotations and the one-hit Euclidean pattern are allowed.

`E(1, n)` contains one hit in an `n`-slot cycle. Its `n` rotations place that hit in each possible slot. Given any target rhythm, take the union of the rotated `E(1, n)` patterns corresponding to the target's occupied slots. The result is exactly that target. Union alone is therefore enough to construct all `2^n` binary rhythms.

The same fact can be expressed subtractively: begin with `E(n, n)`, the completely filled grid, and subtract a rotated `E(1, n)` for every desired rest.

This proof is universal but musically rather trivial. Once every single-slot pattern is available, “Euclidean” has ceased to constrain the result; the construction is effectively writing an arbitrary bit pattern one bit at a time. The more interesting generative question is what can be made with restrictions such as:

- Only two or three source patterns
- No one-hit or completely filled patterns
- A limited range of densities and cycle lengths
- A limited number of rotations
- Union, difference, or XOR but not every operation
- A penalty for excessively long least-common-multiple periods

Those restrictions retain the characteristic evenness of the ingredients while still allowing complicated results. They also define a useful search space for a rhythm explorer: discover how much rhythmic variety a small, intelligible expression can produce.

### Published connections

This general territory has been studied explicitly. Francisco Gómez-Martín, Perouz Taslakian, and Godfried Toussaint define operations on Euclidean rhythms including **complementation, alternation, and decomposition**, then connect them to **interlocking rhythms**, **tiling canons**, and **tiling quasi-canons**.

Their definition of complementary interlocking is especially close to Boolean thinking: the component rhythms have no shared onset and together place exactly one onset at every pulse. In set language, their intersection is empty and their union is the full grid. A rhythm and its complement are the simplest example. The paper also studies when these operations preserve the Euclidean property rather than assuming that every composite remains Euclidean.

Boolean union and arbitrary set difference are a broader algebra than the particular operations emphasized in that paper, but they fit the same representation of rhythms as subsets of a cyclic lattice.

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

Layering can leave the voices separate, so the listener hears their interlock, or it can flatten them into a new pattern with union, difference, intersection, or XOR. Those are musically different operations even when the final onset locations happen to match: separate orchestration preserves which voice contributed each hit.

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
- [Interlocking and Euclidean Rhythms](https://doi.org/10.1080/17459730902916545) — Gómez-Martín, Taslakian, and Toussaint's 2009 treatment of complementation, alternation, decomposition, interlocking, and tiling canons.

Return to the [music page](#/music) or the broader [rhythm study map](#/music/rhythm).
