# Grooves

Every possible one-bar kick pattern on an eighth-note grid, while the closed hi-hat and snare backbeat stay fixed.

Bits map left-to-right onto **1 & 2 & 3 & 4 &**. A `1` plays the kick and a `0` leaves it silent. Pattern numbers remain the unsigned 8-bit binary values from 0 through 255.

The top-level groups separate patterns with no simultaneous kick and snare from patterns containing a kick/snare unison on beat 2, beat 4, or both. Within each, four-beat patterns come before eight-beat patterns, and each of those is divided into spaced kicks and kick runs. Entries are sorted by number of kick strokes and then by the lower binary number.

Here “four-beat” means that the kick figure repeats after four positions on this eighth-note grid. An “eight-beat” pattern needs all eight positions before repeating. Swapping the two halves of an eight-beat pattern changes its written starting point but produces the same continuous loop, so both rotations share one heading.

“Spaced kicks” never touch one another in the repeating cycle. “Kick runs” contain at least two adjacent kicks; the loop boundary counts, so a kick on the final position followed by one on the first position is a run.

With this mapping, **170 — 10101010** is four on the floor. **255 — 11111111** plays the kick on every eighth note.

## No kick/snare unisons

These 64 patterns form 36 distinct continuous loops.

### Four-beat patterns

These 8 patterns repeat after the first four grid positions, so their two written halves are identical.

#### Spaced kicks

These 5 loops never place two kicks next to one another, including across the loop boundary.

##### 0 — 00000000

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . . . .
```

##### 17 — 00010001

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . . . x
```

##### 68 — 01000100

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . x . .
```

##### 136 — 10001000 (original money beat)

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x . . .
```

##### 85 — 01010101

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . x . x
```

#### Kick runs

These 3 loops contain at least one pair of consecutive kicks. Longer runs include triples, quadruples, and denser sequences.

##### 153 — 10011001 (original variation 4)

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x . . x
```

##### 204 — 11001100 (original variation 2)

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x x . .
```

##### 221 — 11011101

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x x . x
```

### Eight-beat patterns

These 28 groups need the full eight-position cycle. Each pattern heading combines the two half-bar rotations of the same continuous loop.

#### Spaced kicks

These 10 loops never place two kicks next to one another, including across the loop boundary.

##### 1 — 00000001 ↔ 16 — 00010000

**1 — 00000001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . . . x
```

**16 — 00010000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . . . .
```

##### 4 — 00000100 ↔ 64 — 01000000

**4 — 00000100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . x . .
```

**64 — 01000000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . . . .
```

##### 8 — 00001000 ↔ 128 — 10000000

**8 — 00001000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x . . .
```

**128 — 10000000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . . . .
```

##### 5 — 00000101 ↔ 80 — 01010000

**5 — 00000101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . x . x
```

**80 — 01010000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . . . .
```

##### 9 — 00001001 ↔ 144 — 10010000

**9 — 00001001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x . . x
```

**144 — 10010000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . . . .
```

##### 20 — 00010100 ↔ 65 — 01000001

**20 — 00010100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . x . .
```

**65 — 01000001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . . . x
```

##### 72 — 01001000 ↔ 132 — 10000100

**72 — 01001000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x . . .
```

**132 — 10000100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . x . .
```

##### 21 — 00010101 ↔ 81 — 01010001

**21 — 00010101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . x . x
```

**81 — 01010001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . . . x
```

##### 69 — 01000101 ↔ 84 — 01010100

**69 — 01000101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . x . x
```

**84 — 01010100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . x . .
```

##### 73 — 01001001 ↔ 148 — 10010100 (original variation 5)

**73 — 01001001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x . . x
```

**148 — 10010100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . x . .
```

#### Kick runs

These 18 loops contain at least one pair of consecutive kicks. Longer runs include triples, quadruples, and denser sequences.

##### 12 — 00001100 ↔ 192 — 11000000

**12 — 00001100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x x . .
```

**192 — 11000000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . . . .
```

##### 24 — 00011000 ↔ 129 — 10000001

**24 — 00011000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x . . .
```

**129 — 10000001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . . . x
```

##### 13 — 00001101 ↔ 208 — 11010000

**13 — 00001101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x x . x
```

**208 — 11010000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . . . .
```

##### 25 — 00011001 ↔ 145 — 10010001

**25 — 00011001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x . . x
```

**145 — 10010001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . . . x
```

##### 28 — 00011100 ↔ 193 — 11000001

**28 — 00011100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x x . .
```

**193 — 11000001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . . . x
```

##### 76 — 01001100 ↔ 196 — 11000100

**76 — 01001100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x x . .
```

**196 — 11000100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . x . .
```

##### 88 — 01011000 ↔ 133 — 10000101

**88 — 01011000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x . . .
```

**133 — 10000101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . x . x
```

##### 137 — 10001001 ↔ 152 — 10011000 (original variation 3)

**137 — 10001001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x . . x
```

**152 — 10011000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x . . .
```

##### 140 — 10001100 (original variation 1) ↔ 200 — 11001000

**140 — 10001100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x x . .
```

**200 — 11001000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x . . .
```

##### 29 — 00011101 ↔ 209 — 11010001

**29 — 00011101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x x . x
```

**209 — 11010001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . . . x
```

##### 77 — 01001101 ↔ 212 — 11010100

**77 — 01001101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x x . x
```

**212 — 11010100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . x . .
```

##### 89 — 01011001 ↔ 149 — 10010101

**89 — 01011001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x . . x
```

**149 — 10010101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . x . x
```

##### 92 — 01011100 ↔ 197 — 11000101

**92 — 01011100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x x . .
```

**197 — 11000101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . x . x
```

##### 141 — 10001101 ↔ 216 — 11011000

**141 — 10001101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x x . x
```

**216 — 11011000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x . . .
```

##### 156 — 10011100 ↔ 201 — 11001001

**156 — 10011100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x x . .
```

**201 — 11001001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x . . x
```

##### 93 — 01011101 ↔ 213 — 11010101

**93 — 01011101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x x . x
```

**213 — 11010101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . x . x
```

##### 157 — 10011101 ↔ 217 — 11011001

**157 — 10011101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x x . x
```

**217 — 11011001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x . . x
```

##### 205 — 11001101 ↔ 220 — 11011100

**205 — 11001101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x x . x
```

**220 — 11011100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x x . .
```

## Kick/snare unisons

These 192 patterns form 100 distinct continuous loops.

### Four-beat patterns

These 8 patterns repeat after the first four grid positions, so their two written halves are identical.

#### Spaced kicks

These 2 loops never place two kicks next to one another, including across the loop boundary.

##### 34 — 00100010

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . . x .
```

##### 170 — 10101010 (four on the floor)

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x . x .
```

#### Kick runs

These 6 loops contain at least one pair of consecutive kicks. Longer runs include triples, quadruples, and denser sequences.

##### 51 — 00110011

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . . x x
```

##### 102 — 01100110

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . x x .
```

##### 119 — 01110111

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . x x x
```

##### 187 — 10111011

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x . x x
```

##### 238 — 11101110

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x x x .
```

##### 255 — 11111111 (every eighth note)

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x x x x
```

### Eight-beat patterns

These 92 groups need the full eight-position cycle. Each pattern heading combines the two half-bar rotations of the same continuous loop.

#### Spaced kicks

These 10 loops never place two kicks next to one another, including across the loop boundary.

##### 2 — 00000010 ↔ 32 — 00100000

**2 — 00000010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . . x .
```

**32 — 00100000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . . . .
```

##### 10 — 00001010 ↔ 160 — 10100000

**10 — 00001010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x . x .
```

**160 — 10100000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . . . .
```

##### 18 — 00010010 ↔ 33 — 00100001

**18 — 00010010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . . x .
```

**33 — 00100001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . . . x
```

##### 36 — 00100100 ↔ 66 — 01000010

**36 — 00100100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . x . .
```

**66 — 01000010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . . x .
```

##### 40 — 00101000 ↔ 130 — 10000010

**40 — 00101000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x . . .
```

**130 — 10000010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . . x .
```

##### 37 — 00100101 ↔ 82 — 01010010

**37 — 00100101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . x . x
```

**82 — 01010010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . . x .
```

##### 41 — 00101001 ↔ 146 — 10010010

**41 — 00101001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x . . x
```

**146 — 10010010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . . x .
```

##### 42 — 00101010 ↔ 162 — 10100010

**42 — 00101010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x . x .
```

**162 — 10100010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . . x .
```

##### 74 — 01001010 ↔ 164 — 10100100

**74 — 01001010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x . x .
```

**164 — 10100100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . x . .
```

##### 138 — 10001010 ↔ 168 — 10101000

**138 — 10001010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x . x .
```

**168 — 10101000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x . . .
```

#### Kick runs

These 82 loops contain at least one pair of consecutive kicks. Longer runs include triples, quadruples, and denser sequences.

##### 3 — 00000011 ↔ 48 — 00110000

**3 — 00000011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . . x x
```

**48 — 00110000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . . . .
```

##### 6 — 00000110 ↔ 96 — 01100000

**6 — 00000110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . x x .
```

**96 — 01100000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . . . .
```

##### 7 — 00000111 ↔ 112 — 01110000

**7 — 00000111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . . x x x
```

**112 — 01110000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . . . .
```

##### 11 — 00001011 ↔ 176 — 10110000

**11 — 00001011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x . x x
```

**176 — 10110000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . . . .
```

##### 14 — 00001110 ↔ 224 — 11100000

**14 — 00001110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x x x .
```

**224 — 11100000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . . . .
```

##### 19 — 00010011 ↔ 49 — 00110001

**19 — 00010011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . . x x
```

**49 — 00110001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . . . x
```

##### 22 — 00010110 ↔ 97 — 01100001

**22 — 00010110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . x x .
```

**97 — 01100001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . . . x
```

##### 26 — 00011010 ↔ 161 — 10100001

**26 — 00011010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x . x .
```

**161 — 10100001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . . . x
```

##### 35 — 00100011 ↔ 50 — 00110010

**35 — 00100011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . . x x
```

**50 — 00110010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . . x .
```

##### 38 — 00100110 ↔ 98 — 01100010

**38 — 00100110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . x x .
```

**98 — 01100010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . . x .
```

##### 44 — 00101100 ↔ 194 — 11000010

**44 — 00101100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x x . .
```

**194 — 11000010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . . x .
```

##### 52 — 00110100 ↔ 67 — 01000011

**52 — 00110100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . x . .
```

**67 — 01000011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . . x x
```

##### 56 — 00111000 ↔ 131 — 10000011

**56 — 00111000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x . . .
```

**131 — 10000011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . . x x
```

##### 70 — 01000110 ↔ 100 — 01100100

**70 — 01000110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . x x .
```

**100 — 01100100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . x . .
```

##### 104 — 01101000 ↔ 134 — 10000110

**104 — 01101000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x . . .
```

**134 — 10000110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . x x .
```

##### 15 — 00001111 ↔ 240 — 11110000

**15 — 00001111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . . x x x x
```

**240 — 11110000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . . . .
```

##### 23 — 00010111 ↔ 113 — 01110001

**23 — 00010111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x . x x x
```

**113 — 01110001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . . . x
```

##### 27 — 00011011 ↔ 177 — 10110001

**27 — 00011011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x . x x
```

**177 — 10110001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . . . x
```

##### 30 — 00011110 ↔ 225 — 11100001

**30 — 00011110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x x x .
```

**225 — 11100001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . . . x
```

##### 39 — 00100111 ↔ 114 — 01110010

**39 — 00100111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . . x x x
```

**114 — 01110010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . . x .
```

##### 43 — 00101011 ↔ 178 — 10110010

**43 — 00101011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x . x x
```

**178 — 10110010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . . x .
```

##### 45 — 00101101 ↔ 210 — 11010010

**45 — 00101101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x x . x
```

**210 — 11010010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . . x .
```

##### 46 — 00101110 ↔ 226 — 11100010

**46 — 00101110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x x x .
```

**226 — 11100010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . . x .
```

##### 53 — 00110101 ↔ 83 — 01010011

**53 — 00110101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . x . x
```

**83 — 01010011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . . x x
```

##### 54 — 00110110 ↔ 99 — 01100011

**54 — 00110110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . x x .
```

**99 — 01100011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . . x x
```

##### 57 — 00111001 ↔ 147 — 10010011

**57 — 00111001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x . . x
```

**147 — 10010011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . . x x
```

##### 58 — 00111010 ↔ 163 — 10100011

**58 — 00111010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x . x .
```

**163 — 10100011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . . x x
```

##### 60 — 00111100 ↔ 195 — 11000011

**60 — 00111100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x x . .
```

**195 — 11000011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . . x x
```

##### 71 — 01000111 ↔ 116 — 01110100

**71 — 01000111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . . x x x
```

**116 — 01110100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . x . .
```

##### 75 — 01001011 ↔ 180 — 10110100

**75 — 01001011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x . x x
```

**180 — 10110100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . x . .
```

##### 78 — 01001110 ↔ 228 — 11100100

**78 — 01001110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x x x .
```

**228 — 11100100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . x . .
```

##### 86 — 01010110 ↔ 101 — 01100101

**86 — 01010110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . x x .
```

**101 — 01100101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . x . x
```

##### 90 — 01011010 ↔ 165 — 10100101

**90 — 01011010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x . x .
```

**165 — 10100101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . x . x
```

##### 105 — 01101001 ↔ 150 — 10010110

**105 — 01101001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x . . x
```

**150 — 10010110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . x x .
```

##### 106 — 01101010 ↔ 166 — 10100110

**106 — 01101010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x . x .
```

**166 — 10100110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . x x .
```

##### 108 — 01101100 ↔ 198 — 11000110

**108 — 01101100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x x . .
```

**198 — 11000110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . x x .
```

##### 120 — 01111000 ↔ 135 — 10000111

**120 — 01111000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x . . .
```

**135 — 10000111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . . x x x
```

##### 139 — 10001011 ↔ 184 — 10111000

**139 — 10001011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x . x x
```

**184 — 10111000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x . . .
```

##### 142 — 10001110 ↔ 232 — 11101000

**142 — 10001110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x x x .
```

**232 — 11101000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x . . .
```

##### 154 — 10011010 ↔ 169 — 10101001

**154 — 10011010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x . x .
```

**169 — 10101001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x . . x
```

##### 172 — 10101100 ↔ 202 — 11001010

**172 — 10101100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x x . .
```

**202 — 11001010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x . x .
```

##### 31 — 00011111 ↔ 241 — 11110001

**31 — 00011111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . . x x x x x
```

**241 — 11110001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . . . x
```

##### 47 — 00101111 ↔ 242 — 11110010

**47 — 00101111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x . x x x x
```

**242 — 11110010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . . x .
```

##### 55 — 00110111 ↔ 115 — 01110011

**55 — 00110111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x . x x x
```

**115 — 01110011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . . x x
```

##### 59 — 00111011 ↔ 179 — 10110011

**59 — 00111011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x . x x
```

**179 — 10110011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . . x x
```

##### 61 — 00111101 ↔ 211 — 11010011

**61 — 00111101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x x . x
```

**211 — 11010011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . . x x
```

##### 62 — 00111110 ↔ 227 — 11100011

**62 — 00111110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x x x .
```

**227 — 11100011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . . x x
```

##### 79 — 01001111 ↔ 244 — 11110100

**79 — 01001111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . . x x x x
```

**244 — 11110100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . x . .
```

##### 87 — 01010111 ↔ 117 — 01110101

**87 — 01010111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x . x x x
```

**117 — 01110101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . x . x
```

##### 91 — 01011011 ↔ 181 — 10110101

**91 — 01011011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x . x x
```

**181 — 10110101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . x . x
```

##### 94 — 01011110 ↔ 229 — 11100101

**94 — 01011110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x x x .
```

**229 — 11100101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . x . x
```

##### 103 — 01100111 ↔ 118 — 01110110

**103 — 01100111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . . x x x
```

**118 — 01110110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x . x x .
```

##### 107 — 01101011 ↔ 182 — 10110110

**107 — 01101011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x . x x
```

**182 — 10110110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . x x .
```

##### 109 — 01101101 ↔ 214 — 11010110

**109 — 01101101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x x . x
```

**214 — 11010110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . x x .
```

##### 110 — 01101110 ↔ 230 — 11100110

**110 — 01101110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x x x .
```

**230 — 11100110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . x x .
```

##### 121 — 01111001 ↔ 151 — 10010111

**121 — 01111001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x . . x
```

**151 — 10010111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x . x x x
```

##### 122 — 01111010 ↔ 167 — 10100111

**122 — 01111010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x . x .
```

**167 — 10100111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . . x x x
```

##### 124 — 01111100 ↔ 199 — 11000111

**124 — 01111100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x x . .
```

**199 — 11000111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . . x x x
```

##### 143 — 10001111 ↔ 248 — 11111000

**143 — 10001111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . . x x x x
```

**248 — 11111000**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x . . .
```

##### 155 — 10011011 ↔ 185 — 10111001

**155 — 10011011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x . x x
```

**185 — 10111001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x . . x
```

##### 158 — 10011110 ↔ 233 — 11101001

**158 — 10011110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x x x .
```

**233 — 11101001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x . . x
```

##### 171 — 10101011 ↔ 186 — 10111010

**171 — 10101011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x . x x
```

**186 — 10111010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x . x .
```

##### 173 — 10101101 ↔ 218 — 11011010

**173 — 10101101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x x . x
```

**218 — 11011010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x . x .
```

##### 174 — 10101110 ↔ 234 — 11101010

**174 — 10101110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x x x .
```

**234 — 11101010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x . x .
```

##### 188 — 10111100 ↔ 203 — 11001011

**188 — 10111100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x x . .
```

**203 — 11001011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x . x x
```

##### 206 — 11001110 ↔ 236 — 11101100

**206 — 11001110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x x x .
```

**236 — 11101100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x x . .
```

##### 63 — 00111111 ↔ 243 — 11110011

**63 — 00111111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . . x x x x x x
```

**243 — 11110011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . . x x
```

##### 95 — 01011111 ↔ 245 — 11110101

**95 — 01011111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x . x x x x x
```

**245 — 11110101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . x . x
```

##### 111 — 01101111 ↔ 246 — 11110110

**111 — 01101111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x . x x x x
```

**246 — 11110110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . x x .
```

##### 123 — 01111011 ↔ 183 — 10110111

**123 — 01111011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x . x x
```

**183 — 10110111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x . x x x
```

##### 125 — 01111101 ↔ 215 — 11010111

**125 — 01111101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x x . x
```

**215 — 11010111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x . x x x
```

##### 126 — 01111110 ↔ 231 — 11100111

**126 — 01111110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x x x .
```

**231 — 11100111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . . x x x
```

##### 159 — 10011111 ↔ 249 — 11111001

**159 — 10011111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . . x x x x x
```

**249 — 11111001**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x . . x
```

##### 175 — 10101111 ↔ 250 — 11111010

**175 — 10101111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x . x x x x
```

**250 — 11111010**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x . x .
```

##### 189 — 10111101 ↔ 219 — 11011011

**189 — 10111101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x x . x
```

**219 — 11011011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x . x x
```

##### 190 — 10111110 ↔ 235 — 11101011

**190 — 10111110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x x x .
```

**235 — 11101011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x . x x
```

##### 207 — 11001111 ↔ 252 — 11111100

**207 — 11001111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . . x x x x
```

**252 — 11111100**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x x . .
```

##### 222 — 11011110 ↔ 237 — 11101101

**222 — 11011110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x x x .
```

**237 — 11101101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x x . x
```

##### 127 — 01111111 ↔ 247 — 11110111

**127 — 01111111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: . x x x x x x x
```

**247 — 11110111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x . x x x
```

##### 191 — 10111111 ↔ 251 — 11111011

**191 — 10111111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x . x x x x x x
```

**251 — 11111011**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x . x x
```

##### 223 — 11011111 ↔ 253 — 11111101

**223 — 11011111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x . x x x x x
```

**253 — 11111101**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x x . x
```

##### 239 — 11101111 ↔ 254 — 11111110

**239 — 11101111**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x . x x x x
```

**254 — 11111110**

```drums
tempo 100
meter 4/4
division 8
hh: x x x x x x x x
sn: . . x . . . x .
bd: x x x x x x x .
```

Return to [Music](#/music).
