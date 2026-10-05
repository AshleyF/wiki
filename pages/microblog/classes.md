# Classes

## SICP (05 OCT 2026 - )

- "Computer Science" is not really about computers and it's not a science (confusing the essence with the tools)
  - Fomalizing declarative knowledge about process ("how to" knowledge)
  - Example: Square root of X: Make a guess (G), improve the guess (average G and X/G), repeate until "good enough."
- Controlling complexity is the essence
  - Software is made with "idealized components" (e.g. electrical engineer can't make a million-stage amplifier, but software can recurse infinitely)
  - Black box abstraction (modularity, eg. SQRT(A) + SQRT(B))
  - Example: Fixed point of F, such that F(X)=X, guess X, apply F until "good enough"
    - Fixed point of F->avg Y and X/Y, produces SQRT function (HOF)
  - Conventional interfaces (plug things together, generics)
  - OOP, streams (operations on aggregates), language-oriented programming
- Language: primitives (data/procedures), means of abstraction, means of combination

### Lisp

- Prefix notation, operator, operands, combination e.g. (+ 3 (* 5 6 ) 7 2) -> 42
- Definitions (DEFINE (SQUARE X) (* X X)) or (DEFINE SQUARE (LAMBDA (X) (* X X)))

```lisp
(DEFINE (ABS X)
  (COND ((< X 0) (- X))
       ((= X 0) (0))
       ((> X 0) (X))))

(DEFINE (ABS X) (IF (< X 0>) (- X) (X)))
```

```lisp
(DEFINE (TRY GUESS X)
  (IF (GOOD-ENOUGH? GUESS X)
      GUESS
      (TRY (IMPROVE GUESS X) X)))

(DEFINE (SQRT X) (TRY 1 X))

(DEFINE (IMPROVE GUESS X)
  (AVERAGE GUESS (/ X GUESS)))

(DEFINE (GOOD-ENOUGH? GUESS X)
  (< (ABS (- (SQUARE GUESS) X))
     0.001))
```

## Ringo Starr Teaches Drumming (05 AUG 2026 - 10 AUG 2026)

He spends a lot of time just telling stories, while following a loose curriculum.

## Garry Kasparov Teaches Chess (05 AUG 2026 - 10 AUG 2026)

I'm impressed by his psychological approach. He definitely doesn't play the board, but the person sitting on the other side. He's fine with playing suboptimal moves even to make his opponent less comfortable and to steer the game to his style of play and away from his opponent's. I was surprised by this.

He mainly goes over basic tactics with all kinds of interesting positions and problems. Most of them are constructed, simplified positions, and some are from his actual games.
