# Classes

## SICP (05 OCT 2026 - )

### [Lecture 1A: Overview and Introduction to Lisp](https://youtu.be/-J_xL4IGhJA?si=XTBJ0xFbkZVt-EqM)

- "Computer Science" is not really about computers and it's not a science (confusing the essence with the tools)
  - Fomalizing declarative knowledge about process ("how to" knowledge)
  - Example: Square root of x: Make a guess (g), improve the guess (average g and x/g), repeate until "good enough."
- Controlling complexity is the essence
  - Software is made with "idealized components" (e.g. electrical engineer can't make a million-stage amplifier, but software can recurse infinitely)
  - Black box abstraction (modularity, eg. `sqrt(a) + sqrt(b)`)
  - Example: Fixed point of f, such that f(x)=x, guess x, apply f until "good enough"
    - Fixed point of f->AVG y AND x/y, produces `sqrt` function (HOF)
  - Conventional interfaces (plug things together, generics)
  - OOP, streams (operations on aggregates), language-oriented programming
- Language: primitives (data/procedures), means of abstraction, means of combination
- Prefix notation, operator, operands, combination e.g. `(+ 3 (* 5 6 ) 7 2)` -> 42
- Definitions `(define (square x) (* x x))` or `(define square (lambda (x) (* x x)))`

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

Using HOF:

```lisp
(define (sum term a next b)
  (if (> a b)
      0
      (+ (term a)
         (sum term (next a) next b))))

(define (sum-int a b)
  (define (identity a) a)
  (sum identity a 1+ b))

(define (sum-sq a b)
  (sum square a 1+ b))

(define (pi-sum a b)
  (sum (λ (i) (/ 1 (* i (+ i 2)))
    a
    (λ (i) (+ i 4))
    b)))
```

Iterative implementation ("pluggable" implementations, same `sum-int`/`sum-sq`/`pi-sum`):

```lisp
(define (sum term a next b)
  (define (iter j ans)
    if (> j b)
       ans
       (iter (next j)
             (+ (term j) ans)))
  (iter a 0))
```

Note: passing procedures by name (e.g. `term`, `next`, `identity`, `square`, `1+`) or anonomously (e.g. `(λ (i) (+ i 4))`)

Fixed point: f(x) = x. Herron of Alexandria's method is essentially repeated application of function to find fixed point.


```lisp
(define (sqrt x)
  (fixed-point
     (λ (y) (average-damp (λ (y) (/ x y)))
     1)))

(define (fixed-point f start)
  (define tolerance 0.00001)
  (define (close-enough? u v)
    (< (abs (- u v)) tolerance))
  (define (iter old new)
    (if (close-enough? old new)
        new
        (iter new (f new))))
  (iter start (f start)))

(define (average-damp f)
  (λ (x) (average (f x) x)))
```

HOF can _take_ a procedure, but can also _return_ a new procedure (e.g. `average-damp`).

Newton's method: Find y such that f(y)=0
* Start with guess
* Iterate this:

```math
y_{n+1} = y_n - \frac{f(y_n)}{f'(y_n)}
```

```lisp
(define (sqrt x)
  (newton (λ (y) (- x (square y))) 1))

(define (newton f guess)
  (define df (deriv f))
  (fixed-point
    (λ (x) (- x (/ (f x) (df x))))
    guess))

(define deriv
  (λ (f)
    (λ (x)
      (/ (- (f (+ x dx))
            (f x))
         dx))))

(define dx 0.00001)
```

Rights and Privileges of First-class Citizens (in a programming language):
* To be named by variables
* To be passed as arguments to procedures
* To be returned as values of procedures
* To be incorporated into data structures

### [Lecture 2B: Compound Data](https://youtu.be/DrFkf-T-6Co?si=FmS7pKKEsDNmjYY3)

All about data abstraction. George doesn't know, doesn't want to know. Example was a system of rationals. Issolate use (`+rat`, `*rat`) from representation (pairs, closures) via an "abstraction layer" (`make-rat`, `numer`, `denom`).

```lisp
(define (+rat x y)
  (make-rat
    (+ (* (numer x) (denom y))
       (* (numer y) (denom x)))))

(define (*rat x y)
  (make-rat
    (* (numer x) (numer y))
    (* (denom y) (denom x))))
```
* `cons` constructs pair
* `car` selects first
* `cdr` selects second

```lisp
(define (make-rat n d) (cons n d))
(define (numer r) (car r))
(define (denom r) (cdr r))
```

Better `make-rat`:

```lisp
(define (make-rat n d)
  (let ((g (gcd n d)))
    (cons (/ n g)
          (/ d g))))
```

I liked Hal's quip about how people who religiously espouse designing everything upfront, are people who haven't built very complicated things.

Another example (line segments):

```lisp
(define (make-vector x y) (cons x y))
(define (xcor p) (car p))
(define (ycor p) (cdr p))

(define (make-seg p q) (cons p q))
(define (seg-start s) (car s))
(define (seg-end s) (cdr s))

(define (midpoint s)
  (let ((a (seg-start s))
        (b (seg-end s))
    (make-vector
      (average (xcor a) (xcor b))
      (average (ycor a) (ycor b))))))

(define (length s)
  (let
    ((dx (- (xcor (seg-end s))
            (xcor (seg-start s))))
     (dy (- (ycor (seg-end s))
            (ycor (seg-start s)))))
    (sqrt (+ (square dx)
             (square dy)))))
```

Pairs from thin air! "Pure abstraction" as Hal says. Really, it's closures of course, but nice trick!

```lisp
(define (cons a b)
  (λ (pick)
    (cond ((= pick 1) a)
          ((= pick 2) b))))

(define (car x) (x 1))
(define (cdr x) (x 2))
```

### [Lecture 3A: Henderson Escher Example](https://youtu.be/PEwZL3H2oKg?si=JxcuP_xLKqLLBfdI)

## Ringo Starr Teaches Drumming (05 AUG 2026 - 10 AUG 2026)

He spends a lot of time just telling stories, while following a loose curriculum.

## Garry Kasparov Teaches Chess (05 AUG 2026 - 10 AUG 2026)

I'm impressed by his psychological approach. He definitely doesn't play the board, but the person sitting on the other side. He's fine with playing suboptimal moves even to make his opponent less comfortable and to steer the game to his style of play and away from his opponent's. I was surprised by this.

He mainly goes over basic tactics with all kinds of interesting positions and problems. Most of them are constructed, simplified positions, and some are from his actual games.
