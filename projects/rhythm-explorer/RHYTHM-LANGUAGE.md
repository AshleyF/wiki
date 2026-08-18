# Rhythm language draft

Status: initial round-trip compiler implemented; the broader language remains a design draft.

This document specifies a terse, live-editable rhythm language for Rhythm Explorer. It borrows Forth's stack-oriented style: values are followed by short words that consume and transform them. It is not intended to copy Forth or Strudel.

The language represents repeating percussion patterns and continuous performance controls, routes them into instrument instances, and translates between text and Rhythm Explorer's grid.

## Implemented subset

Rhythm Explorer's Edit view currently compiles and regenerates this deliberately small subset:

- `slots`, `meter`, and `bpm` configuration lines;
- `~` pattern literals using `.`, `*`, `^*`, and `g*`;
- automatic repetition of short literals across the selected section;
- uppercase reusable pattern definitions;
- `+` overlay and `-` occupancy subtraction;
- direct default voices including `kk`, `sn`, `hh`, `ph`, toms, cymbals, ride, china, and cowbell;
- qualified discrete routes including `sn.cross`, `sn.flam`, `sn.drag`, tom flams/drags, `hh.open`, `hh.bark`, and `ph.splash`;
- grid-to-text serialization using the shortest exact repeating period for every route.

Applying valid source replaces the selected section's grid. Invalid source reports a line-specific error and leaves the last valid section untouched. Command-Enter or Control-Enter is equivalent to the Apply button.

The compiler does not yet implement instrument construction, continuous controls, velocity transforms, local/global swing words, forward references, probability, or automatic abstraction discovery. The source editor represents the stable section itself; generator and live-performance parameters remain ordinary explorer controls.

## Design principles

- A pattern contains timing and velocity, not instrument-specific articulation.
- Lowercase names identify instruments, their inputs, and executable words.
- Uppercase names identify reusable abstract values that make no sound by themselves.
- Each definition occupies one line.
- The first word on a definition line is its destination.
- The remaining words form a reverse-Polish expression that produces one pattern.
- Short patterns repeat automatically.
- Patterns may have different periods.
- Pattern algebra operates on logical grid positions.
- Swing and humanization alter performance time without changing the logical grid.
- Common grooves should remain extremely short.

## Basic example

At the explorer's sixteenth-note resolution, a one-bar money beat is:

```text
16 slots
4/4 meter
100 bpm
kk ~*.......
sn ~....*...
hh ~*.
```

`16 slots` establishes the visible section, `4/4 meter` supplies its musical grouping, and `100 bpm` establishes the tempo. Each voice has its own repeating pattern:

- `kk ~*.......` repeats a kick on beats one and three.
- `sn ~....*...` repeats a snare on beats two and four.
- `hh ~*.` repeats a hit and rest, producing eighth-note hi-hats.

Accenting every other hi-hat remains only a two-slot pattern:

```text
16 slots
4/4 meter
100 bpm
kk ~*.......
sn ~....*...
hh ~^*.
```

The kick and snare patterns are eight slots long and repeat twice in the sixteen-slot section. The two-slot hi-hat pattern repeats eight times.

## Execution model

The interpreter is a small token-oriented stack machine. Whitespace separates numbers, identifiers, pattern literals, and executable words.

Lexical categories are distinguished explicitly:

```text
~...       event-pattern literal; whitespace ends it
123        integer
0.8        decimal number
hat.open   qualified identifier
A          abstract identifier
sn         lowercase identifier or executable word
+ - &      symbolic operator
```

The `~` sigil prevents pattern bodies from being confused with source words. The characters after `~` are validated using the restricted pattern alphabet.

Numeric tokens push their values:

```text
16 slots
100 bpm
```

Conceptually:

```text
16     push 16
slots  consume it as the cycle length
100    push 100
bpm    consume it as the tempo
```

Every executable word should document its Forth-style stack effect:

```text
word ( inputs -- outputs )
```

### Timing configuration

Cycle length and tempo use separate words:

```text
slots ( cycle-slots -- )
bpm   ( tempo -- )
```

Therefore:

```text
16 slots
100 bpm
```

means a sixteen-slot cycle at 100 BPM. Either setting can be changed independently during live editing without restating the other.

Cycle length alone does not fully describe meter. Twelve slots might represent 3/4, 6/8, or an ungrouped cycle. Pulse grouping will eventually be needed for swing, beaming, notation, accents, and structural boundaries.

Still to decide:

- What musical unit the BPM counts.
- How pulse grouping is specified, including irregular groupings such as 3+2+2.
- What defaults apply when either timing command is omitted.

## Definitions

Each definition line has this form:

```text
destination expression
```

The expression must leave one pattern value on the stack. Newline assigns it to the destination.

```text
A ~*...
sn A
```

`A` stores an abstract pattern. `sn A` retrieves that pattern and assigns it to the snare voice.

Whitespace is sufficient between the destination and expression. A colon is not part of the syntax.

### Names

- Lowercase identifiers name instrument instances, input ports, and executable words.
- Uppercase identifiers name reusable abstract values, initially patterns and control signals.
- Built-in instrument models and default instances generally use two characters.
- The grammar permits variable-length names.
- Version one may restrict abstract names to one uppercase letter.

References see the most recent preceding definition. Forward references and circular definitions are errors.

A destination may be redefined incrementally:

```text
hh ~*.
hh hh sn -
```

The second line pushes the current hi-hat pattern and the previously defined snare pattern, subtracts the latter, and replaces `hh`.

For common default instances, assigning directly to the instance name is shorthand for its primary hit trigger. Thus `hh ~*.` is equivalent to `hh.hit ~*.`. Qualified ports are required for secondary triggers and controls.

## Instrument instances, triggers, and controls

A playable setup has three different kinds of values:

1. **Instrument instance:** a hi-hat, snare, ride, sampled stack, or another sound-producing object.
2. **Trigger pattern:** discrete attacks and their velocities.
3. **Control signal:** a parameter that may change continuously or stepwise over time.

This distinction models a hi-hat more accurately. A hit is a discrete trigger. Openness is a continuous control. A foot splash is another trigger or gesture. These should not all be collapsed into either one event alphabet or several unrelated instruments.

### Creating an instance

Provisional syntax:

```text
hat hh inst
kitsn sn inst
```

```text
inst ( instrument-model -- instrument-instance )
```

The line destination names the resulting instance. `hh` and `sn` are built-in instrument models. Common setups may provide default instances so authors can omit these declarations.

### Trigger ports

Dot-qualified destinations route event patterns to an instrument's trigger inputs:

```text
hat.hit ~^*.
hat.foot ~....*...
hat.splash ~........^*.....

kitsn.center ~....^*..
kitsn.cross ~..g*....
kitsn.rim ~........^*.....
```

Cross-stick has no event character. It is a distinct trigger input on the snare instance. Ghosting remains velocity information in the pattern and can be applied to any trigger.

The exact port vocabulary belongs to each instrument model. A backend maps these semantic ports to browser synthesis, MIDI notes, sampler articulations, or another output representation.

### Continuous control ports

Control destinations receive signals rather than hit patterns:

```text
hat.open 0.15 const
kitsn.pos 0.35 const
```

```text
const ( number -- signal )
```

Suggested normalized ranges use `0` through `1`:

- `hat.open`: `0` tightly closed, `1` fully open.
- `kitsn.pos`: `0` center, `1` edge.

A changing signal can use the same stack-oriented transformations as other values:

```text
O 0.1 0.8 4 ramp
hat.open O
```

The trigger samples the current control values when an attack occurs. Controls may also change between attacks, which is necessary for pedal motion, choking, and continuous MIDI controllers.

### Backend adaptation

The language describes semantic controls even when a playback backend cannot reproduce them continuously.

- A synthesizer may use the continuous value directly.
- MIDI may emit an appropriate controller such as a hi-hat pedal control.
- A sample library may quantize openness or strike position to its available articulation samples.
- A simple browser kit may map the value onto a small number of sound variants.

Backend limitations should not force the source language to pretend that a continuous control is always a separate physical instrument.

Still to decide:

- The exact syntax for instrument construction and model lookup.
- Whether dot-qualified ports are destinations, ordinary words, or both.
- How instrument-specific port schemas are declared and inspected.
- How foot-close and foot-splash gestures interact with the openness signal.
- Whether control signals interpolate linearly, step, or carry an explicit interpolation mode.

## Pattern values

A pattern describes:

- which logical slots contain attacks;
- spacing between attacks;
- velocity or dynamic class of each attack.

It does not select an instrument, trigger port, or control signal.

A pattern literal begins with `~` and ends at whitespace. The sigil tells the lexer to apply the pattern grammar rather than treating the token as an identifier or executable word.

```text
~*...
~..g*....
```

The initial body alphabet is:

```text
*   ordinary hit
.   rest
^*  accented hit
g*  ghosted hit
```

Only hits and rests consume slots. `^` and `g` are velocity markers for the following hit and do not consume time themselves.

Ghosting is not an articulation or separate sound. It is low velocity and can be used on any trigger:

```text
kitsn.center ~..g*....
kitsn.cross ~..g*....
```

Cross-stick has no special pattern character. It is routed to the snare instance's `cross` trigger.

The core pattern alphabet has no articulation syntax. Instrument models expose distinct triggers and controls.

Still to decide:

- Exact default velocities for `g*`, `*`, and `^*`.
- Whether numeric velocities should supplement the three symbolic classes.
- How sustained sounds such as brush sweeps represent duration.

## Automatic repetition

Every pattern repeats independently. A definition need not spell out the configured cycle:

```text
16 slots
100 bpm
hh ~^*.
```

The two-slot hi-hat pattern repeats eight times in the sixteen-slot cycle.

When a period does not divide the configured cycle, the preferred behavior is continuous phase: the pattern keeps repeating without resetting at the cycle boundary. This permits polymeter and phase patterns naturally. The grid and notation views materialize a finite window of that continuing pattern.

Finite phrases, explicit phase resets, and fixed repeat counts are future operations.

## Velocity transformations

Words transform pattern values before assignment.

### Crescendo and decrescendo

```text
sn ~*... 4 cresc
sn ~^*.* 2 decresc
```

Provisional stack effects:

```text
cresc   ( pattern span -- pattern )
decresc ( pattern span -- pattern )
```

The rhythmic ostinato remains short while a slower envelope changes its velocity over the requested span. A compiled value may therefore contain a repeating event cycle plus a longer velocity envelope.

Other likely words:

```text
louder ( pattern amount -- pattern )
softer ( pattern amount -- pattern )
gain   ( pattern factor -- pattern )
ramp   ( pattern start-velocity end-velocity span -- pattern )
```

Examples:

```text
sn ~*... 12 louder
sn ~*... 0.8 gain
sn ~*... 40 112 4 ramp
```

Still to decide:

- Whether spans count slots, beats, cycles, or explicit units.
- Whether an envelope repeats, holds its final value, or can choose either behavior.
- Whether velocity curves are linear in MIDI velocity or perceived loudness.

## Pattern algebra

Abstract patterns and defined tracks are pattern values. Operators combine them pointwise in logical score time.

### Overlay

```text
A ~....^*..
G ~..g*....
sn A G +
```

```text
+ ( left right -- combined )
```

Where only one operand hits, the result preserves that hit and velocity. When both hit, `+` keeps the greater velocity. This makes overlay idempotent. A future `sum` word could deliberately add and clamp colliding velocities.

### Subtraction

```text
sn ~....^*..
hh ~* sn -
```

```text
- ( source mask -- result )
```

The right operand acts as an occupancy mask. Wherever it contains a hit, the corresponding source hit is removed. Its velocity is irrelevant.

This directly expresses omitting the hi-hat on snare hits. It also works with structural cymbal events:

```text
c1 ~^* 64 every
hh ~* c1 -
```

Proposed recurrence word:

```text
every ( pattern span -- pattern )
```

### Other Boolean-like operations

Potential operations include:

```text
&    retain left hits only where the right also hits
not  invert occupied and empty slots
xor  retain slots occupied by exactly one operand
```

Velocity rules remain separate from occupancy rules. Intersection would preserve the left velocity; inversion must choose a default velocity for newly created hits.

### Unequal periods

Algebra evaluates both operands at the same absolute logical slot using each operand's period. The result repeats after the least common multiple of those periods:

```text
A ~*.       period 2
B ~*...     period 4
C A B +    period 4
```

Relatively prime periods can produce a large result. Implementations should retain lazy transformation graphs rather than expanding every combined pattern indefinitely. A grid or notation view materializes only its finite visible window.

## Score time and performance time

The logical grid is score time. It controls repetition, algebra, structural equality, grid placement, and notation.

Playback scheduling is performance time. Swing and humanization may displace a hit without changing its logical slot.

Pattern algebra always runs in score time before performance-time displacement. Masks never compare floating-point playback timestamps.

### Swing

Provisional global setting:

```text
1 66 sw!
```

```text
sw! ( slot-unit amount -- )
```

Possible placement convention:

```text
50    straight 1:1 spacing
66.7  triplet-like 2:1 spacing
75    hard dotted 3:1 spacing
```

On a sixteenth-note grid, slot unit `1` swings adjacent sixteenth slots. Slot unit `2` swings eighth-note positions.

Pattern-local swing:

```text
hh ~^*. 1 62 sw
```

```text
sw ( pattern slot-unit amount -- pattern )
```

The `!` suffix follows the Forth convention for changing global state. Names such as `swing` and `swing!` remain possible if clarity outweighs terseness.

Example with score-time subtraction followed by local swing:

```text
sn ~....^*..
hh ~* sn - 1 62 sw
```

Still to decide:

- Whether local swing replaces or composes with global swing.
- Whether subdivision is expressed in slots, named units, or pulse groups.
- How negative swing is represented.
- Whether swing phase resets at a configured cycle boundary.

Related future performance transformations include `humanize`, `ahead`, `behind`, `push`, and `layback`. None should change score-time identity.

## Text and grid synchronization

The language and grid share one internal event model:

```text
text <-> event model <-> grid / VexFlow / playback / MIDI
```

### Text to grid

1. Evaluate global configuration commands.
2. Evaluate abstract definitions and voice definitions in source order.
3. Apply pattern algebra and transformations lazily.
4. Materialize the selected finite section.
5. Populate the existing grid and playback model.

### Grid to text

For each trigger port:

1. Convert grid events into velocity-aware tokens.
2. Find the smallest exact repeating period.
3. Emit only that period when it repeats across the complete grid.
4. Emit the complete line when no shorter period exists.

For example, sixty-four slots containing the same two-slot motif serialize as:

```text
hh ~^*.
```

The first reverse compiler need not invent abstractions or algebra. A later factoring operation can discover shared motifs and introduce uppercase definitions.

## Live-editing behavior

- Successful evaluation updates the selected section.
- Invalid source leaves the last valid performance playing.
- Errors identify the line, token, word, and relevant stack state.
- Changes become audible at a musical boundary rather than interrupting scheduled audio.
- Editing an abstract pattern updates all of its consumers.
- Text, grid, notation, highlighting, browser audio, and MIDI remain synchronized.

Version one may use an explicit Evaluate command. Automatic evaluation after a short pause can follow once error handling is dependable.

## Version-one scope

The first interpreter should support:

- Whitespace-delimited integers and decimal numbers.
- Separate `slots` and `bpm` timing configuration words.
- One destination plus one RPN expression per definition line.
- Lowercase instrument instances and ports, plus uppercase abstract values.
- `~`-prefixed event-pattern literals containing `*`, `.`, `^*`, and `g*`.
- Instrument instances with primary and qualified trigger destinations.
- Constant control signals for parameters such as hi-hat openness and strike position.
- Independent automatic repetition.
- References to earlier definitions.
- `+` overlay and `-` occupancy subtraction.
- Basic velocity transformations, including `cresc`, `decresc`, and `gain`.
- Global and local swing.
- Text-to-grid compilation.
- Grid-to-text serialization using shortest exact periods.
- Clear lexical, stack, undefined-name, and type errors.

Version one should not include probability, conditionals, recursion, arbitrary JavaScript, automated factoring, or a large standard library.

## Current decisions

- Definitions use whitespace, not colons.
- Lines are evaluated sequentially.
- `slots` sets the logical cycle length and `bpm` sets tempo independently.
- `~` begins an event-pattern literal and whitespace ends it.
- Lowercase identifiers name instrument models, instances, ports, and executable words.
- Built-in model names are generally two characters, while identifiers are variable length.
- Uppercase identifiers are abstract patterns or control signals.
- Patterns contain timing and velocity only.
- Instrument instances expose discrete trigger ports and continuous control ports.
- Cross-stick is a snare trigger port rather than an `x` event.
- Only hits and rests consume logical slots.
- Short patterns repeat automatically and preserve phase across cycle boundaries.
- Pattern algebra evaluates logical slots before swing or humanization.
- `+` overlays patterns and `-` subtracts occupancy.
- Unequal periods combine pointwise and remain lazily represented.
- Score time and performance time are separate.

The remaining unresolved items are limited to pulse grouping, velocity values and units, control-signal sequencing and interpolation, instrument construction syntax, envelope lifecycle, swing composition, finite phrase operations, and the eventual standard word vocabulary.
