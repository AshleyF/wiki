# Classes

## SICP (05 OCT 2026 - )

### [Lecture 1A: Overview and Introduction to Lisp](https://youtu.be/-J_xL4IGhJA?si=XTBJ0xFbkZVt-EqM)

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
- Prefix notation, operator, operands, combination e.g. (+ 3 (* 5 6 ) 7 2) -> 42
- Definitions (DEFINE (SQUARE X) (* X X)) or (DEFINE SQUARE (LAMBDA (X) (* X X)))

```lisp
(define (abs x)
  (cond ((< x 0) (- x))
       ((= x 0) (0))
       ((> x 0) (x))))

(define (abs x) (if (< x 0>) (- x) (x)))
```

```lisp
(define (try guess x)
  (if (good-enough? guess x)
      guess
      (try (improve guess x) x)))

(define (sqrt x) (try 1 x))

(define (improve guess x)
  (average guess (/ x guess)))

(define (good-enough? guess x)
  (< (abs (- (square guess) x))
     0.001))
```

```lisp
(define (sqrt x)
  (define (improve guess)
    (average guess (/ x guess)))
  (define (good-enough? guess)
    (< (abs (- (square guess) x))
       0.001))
  (define (try guess)
    (if (good-enough? guess)
        guess
        (try (improve guess))))
  (try 1))
```
### [Lecture 1B: Procedures and Processes; Substitution Model](https://youtu.be/V_7mmwpgJHU?si=mbAdqMHgEJ59CQm6)

Kinds of expressions:
* Numbers
* Symbols
* Lambda expressions
* Definitions
* Conditionals
* Combinations

Substitution Rule:
* Eval operator->procedure
* Eval operands->arguments
* Apply procedure to arguments
  * Copy body, substituting args
  * Eval resulting body
* To eval `if`, eval predicate, then consequent or alternative

Normal order would pass *unevaluated* arguments.

Process "shape":

```lisp
(define (sos x y)
  (+ (sq x) (sq y)))

(define (sq x) (* x x))
```

Iterative process:

```lisp
(sos 3 4)
(+ (sq 3) (sq 4))
(+ (sq 3) (* 4 4))
(+ (sq 3) 16)
(+ (* 3 3) 16)
(+ 9 16)
25
```

```lisp
(define (+ x y)
  (if (= x 0)
      y
      (+ (-1+ x) (1+ y))))

(+ 3 4)
(+ 2 5)
(+ 1 6)
(+ 0 7)
7
```

```lisp
(define (+ x y)
  (if (= x 0)
      y
      (1+ (+ (-1+ x) y))))

(+ 3 4)
(1+ (+ 2 4))
(1+ (1+ (+ 1 4)))
(1+ (1+ (1+ (+ 0 4))))
(1+ (1+ (1+ 4)))
(1+ (1+ 5))
(1+ 6)
7
```

Iterative O(n) vs. recursive O(n) space. Both O(1) time.

```lisp
(define (fib n)
  (if (< n 2)
      n
      (+ (fib (- n 1)
         (fib (- n 2))))))
```

O(fib)! Unless memoized.

```lisp
(define (move n from to spare)
  (cond ((= n 0) "done")
        (else (move (-1+ n) from spare to)
              (print-move from to)
              (move (-1+ n) spare to from))))
```

### [Lecture 2A: Higher-order Procedures](https://youtu.be/eJeMOEiHv8c?si=RlB3onIh8_Y8bIXu)

Almost the same code:

```math
\sum_{k=a}^{b} k
```

```lisp
(define (sum-int a b)
  (if (> a b)
      0
      (+ a
         (sum-int (1+ a)))))
```

```math
\sum_{k=a}^{b} k^2
```

```lisp
(define (sum-sq a b)
  (if (> a b)
      0
      (+ (square a)
         (sum-sq (1+ a) b))))
```

```math
\sum_{\substack{i=1 \\ \text{by }4}}^{\infty}\frac{1}{i(i+2)} = \frac{\pi}{8}
```

```lisp
(define (pi-sum a b)
  (if (> a b)
      0
      (+ (/ 1 (* a (+ a 2)))
         (pi-sum (+ a 4) b))))
```


## Ringo Starr Teaches Drumming (05 AUG 2026 - 10 AUG 2026)

He spends a lot of time just telling stories, while following a loose curriculum.

## Garry Kasparov Teaches Chess (05 AUG 2026 - 10 AUG 2026)

I'm impressed by his psychological approach. He definitely doesn't play the board, but the person sitting on the other side. He's fine with playing suboptimal moves even to make his opponent less comfortable and to steer the game to his style of play and away from his opponent's. I was surprised by this.

He mainly goes over basic tactics with all kinds of interesting positions and problems. Most of them are constructed, simplified positions, and some are from his actual games.
