# Classes

## SICP (05 OCT 2026 - )

### Lecture 1A: [Overview and Introduction to Lisp](https://youtu.be/-J_xL4IGhJA?si=XTBJ0xFbkZVt-EqM)

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

### Lecture 1B: [Procedures and Processes; Substitution Model](https://youtu.be/V_7mmwpgJHU?si=mbAdqMHgEJ59CQm6)

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

### Lecture 2A: [Higher-order Procedures](https://youtu.be/eJeMOEiHv8c?si=RlB3onIh8_Y8bIXu)

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

### Lecture 2B: [Compound Data](https://youtu.be/DrFkf-T-6Co?si=FmS7pKKEsDNmjYY3)

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

### Lecture 3A: [Henderson Escher Example](https://youtu.be/PEwZL3H2oKg?si=JxcuP_xLKqLLBfdI)

```lisp
(define (make-vector x y) (cons x y))
(define (xcor p) (car p))
(define (ycor p) (cdr p))

(define (make-seg p q) (cons p q))
(define (seg-start s) (car s))
(define (seg-end s) (cdr s))
```

Or simpler!

```lisp
(define make-vector cons)
(define xcor car)
(define ycor cdr)

(define make-seg cons p q)
(define seg-start car s)
(define seg-end cdr s)
```

"Closure" under means of combination (e.g. Basic & Fortran can make arrays of numbers, but not arrays of arrays).

A "List" in Lisp is a conventional representation of a sequence of data stored in pairs (`car` is data, `cdr` in next pair or nil ... `(cons 1 (cons 2 (cons 3 nil)))` -> `(list 1 2 3)`).

CDR-ing down a list:

```lisp
(define (scale-list s l)
  (if (null? l)
      nil
      (cons (* (car l) s)
            (scale-list s (cdr l)))))
```

Higher-order:

```lisp
(define (map p l)
  (if (null? l)
      nil
      (cons (p (car l))
            (map p (cdr l)))))

(define (scale-list s l)
  (map (λ (item) (* item s)))) 
```

Man, partial applicaton would be nice (map over `* s`).

Henderson Escher pictures:

```lisp
(define (coord-map rect)
  (λ (point)
    (+vect
      (+vect (scale (xcor point)
                    (horiz rect))
             (scale (ycor point)
                    (vert rect)))
      (origin rect))))

(define (make-picture seglist)
  (λ (rect)
    (for-each
      (λ (s)
        ((coord-map rect) (seg-start s))
        ((coord-map rect) (seg-end s))))
    seglist))

(define (beside p1 p2 a)
  (λ (rect)
    (p1 (make-rect
          (origin rect)
          (scale a (horiz rect))
          (vert rect)))
    (p2 (make-rect
          (+vert (origin rect)
                 (scale a (horiz rect)))
          (scale (- 1 a) (horiz rect))
          (vert rect)))))

(define (rotate90 pict)
  (λ (rect)
    (pict (make-rect
            (+vect (origin rect)
                   (horiz rect))
            (vert rect)
            (scale -1 (horiz rect))))))
```

Language-level embedding with pictures as procedures is powerful. Example, recursion comes for free:

```lisp
(define (right-push n p a)
  (if (= n 0)
      p
      (beside p
              (right-push
                p
                (- n 1)
                a)
              a)))
```

Generalized:

```lisp
(define (push comb)
  (λ (pict n a)
    ((repeated
      (λ (p) (comb pict p a))
      n)
    pict)))

(define right-push (push beside))
```

Ending statement was about how language-oriented design is inherently more general. Built in layers instead of a tree. Each layer is a general language. Example: language of pictures, language of transformations, language of schemes (e.g. recursive push). Much more like "Lego" bricks of functionality. And embedded within Lisp so that all the more general facilities (like recursive procedures) are available.

### Lecture 3B: [Symbolic Differentiation; Quotation](https://youtu.be/bV87UzKMRtE?si=wEPDKLk4e5Ekl_OI)

Language embedding makes computer engineering more powerful than other kinds of engineering.

Numerical approximation of derivative:

```lisp
(define deriv
  (λ (f)
    (λ (x)
      (/ (- (f (+ x dx))
            (f x))
         dx))))
```

Symbolic differentiation is exact and follows _reduction_ rules. Recursion is natural. Integrals are the inverse but require search.

```math
\begin{aligned}
1.\quad &\frac{dc}{dx}=0 && \text{where } c \text{ is constant} \\
2.\quad &\frac{dx}{dx}=1 \\
3.\quad &\frac{d(cu)}{dx}=c\frac{du}{dx} \\
4.\quad &\frac{d(u+v)}{dx}=\frac{du}{dx}+\frac{dv}{dx} \\
5.\quad &\frac{d(uv)}{dx}=u\frac{dv}{dx}+\frac{du}{dx}v \\
6.\quad &\frac{d(u/v)}{dx}=\frac{v\frac{du}{dx}-u\frac{dv}{dx}}{v^2} \\
7.\quad &\frac{d(u^n)}{dx}=nu^{n-1}\frac{du}{dx}
\end{aligned}
```

Derivative of _expression_ rather than numerical approximation of a function.

```lisp
(define (deriv exp var)
  (cond ((constant? exp var) 0)
        ((same-var? exp var) 1)
        ((sum? exp)
         (make-sum (deriv (a1 exp) var)
                   (deriv (a2 exp) var)))
        ((product? exp)
         (make-sum
           (make-prod (x exp)
                      (deriv (y exp) var))
           (make-prod (deriv (x exp) var))
                      (y exp)))))
```

Example expression:

```lisp
(define myexp
  '(+ (* a (* x x))
     (+ (* b x)
       c)))
```

Predicates:

```lisp
(define (constant? exp var)
  (and (atom? exp)
       (not (eq? exp var))))

(define (same-var? exp var)
  (and (atom? exp)
       (eq? exp var)))

(define (sum? exp)
  (and (not (atom? exp))
       (eq? (car exp) '+)))

(define (make-sum x y)
  (list '+ x y))

(define (product? exp)
  (and (not (atom? exp))
       (eq? (car exp) '*)))

(define (make-product x y)
  (list '* x y))

(define x cadr)
(define y caddr)
```

Say your name. vs Say "your name." Quotations. Tick mark in Lisp.

* `car` is from "contents of address register"
* `cdr` is from "contents of decrement register"
* `cadr` is `car` of `cdr`
* `caddr` is `car` of `cdr` of `cdr`

Verbose result:

```lisp
(deriv myexp 'x)
-> (+ (+ (* a (+ (* x 1) (* 1 x)))
         (* 0 (* x x)))
      (+ (+ (* b 1) (* 0 x))
         0))
```

Simplify expressions:

```lisp
(define (make-sum x y)
  (cond ((and (number? x)
              (number? y))
         (+ x y))
        ((and (number? x) (= x 0) x))
        ((and (number? y) (= y 0) y))
        (else (list '+ x y))))

(define (make-product x y)
  (cond ((and (number? x)
              (number? y))
         (* x y))
        ((and (number? x) (= x 1) x))
        ((and (number? y) (= y 1) y))
        ((and (number? x) (= x 0) 0))
        ((and (number? y) (= y 0) 0))
        (else (list '* x y))))
```

Now:

```lisp
(deriv myexp 'x)
-> (+ (* a (* x x)) b)

(deriv myexp 'a)
-> (* x x)

(deriv myexp 'b)
-> x

(deriv myexp 'c)
-> 1
```

### Lecture 4A: [Pattern Matching and Rule-based Substitution](https://youtu.be/_fXQ1SwKjDg?si=EBOlrL2DmcdVh8Na)

Bring the computer to the level of the problem, rather than translating the problem into the computer's language; as we did in the last lecture.

```lisp
(define deriv-rules
  '(
    ( (dd (?c v) (? v)) 0 )
    ( (dd (?v v) (? v)) 1 )
    ( (dd (?v u) (? v)) 0 )
    
    ( (dd (+ (? x1) (? x2)) (? v))
      (+ (dd (: x1) (: v))
         (dd (: x2) (: v))))
    ( (dd (* (? x1) (? x2)) (? v))
      (+ (* (: x1) (dd (: x2) (: v)))
         (* (dd (: x1) (: v)) (: x2))))
    ( (dd (** (? x) (?c n)) (? v))
      (* (* (: n))))
  ))
```

Pattern matching rules:

| Pattern | Match |
| ------- | ----- |
| `foo` | exactly `foo` |
| `(f a b)` | list |
| `(? x)` | anything, call `x` |
| `(?c x)` | constant, call `x` |
| `(?v x)` | variable, call `x` |

Skeletons:

| Pattern | Match |
| ------- | ----- |
| `foo` | instance of itself |
| `(f a b)` | list with sub-elements instantiated |
| `(: x)` | instance of `x` |

Matcher takes an expression, pattern and dictionary and produces a new dictionary (of pattern variables -> values found by matching).

```lisp
(define (match pat exp dict)
  (cond ((eq? dict 'failed) 'failed)
  ((atom? pat)
    (if (atom? exp)
        (if (eq? pat exp)
            dict
            'failed)
        'failed))
  ((arb-const? pat)
    (if (const? exp)
        (extend-dict pat exp dict)
        'failed))
  ((arb-var? pat)
    (if (var? exp)
        (extend-dict pat exp dict)
        'failed))
  ((arb-exp? pat)
    (extend-dict pat exp dict))
  ((atom? exp) 'failed)
  (else
    (match (cdr pat)
           (cdr exp)
           (match (car pat)
                  (car exp)
                  dict)))))
```

Instantiator is given a dictionary and a skeleton and produces an expression.

```list
(define (instantiate skeleton dict)
  (define (loop s)
    (cond ((atom? s) s)
          ((skeleton-evaluation? s)
           (evaluate (eval-exp s) dict))
          (else (cons (loop (car s))
                      (loop (cdr s))))))
  (loop skeleton))

(define (evaluate form dict)
  (inf (atom? form)
       (lookup form dict)
       (apply
         (eval (lookup (car form dict)
               user-initial-environment)
         (mapcar (λ (v)
                   (lookup v dict))
                 (cdr form))))))
```

Simplifier:

```lisp
(define (simplifier rules)
  (define (simplify-exp exp)
    ***)
  (define (simplify-parts exp)
    ***)
  (define (try-rules exp)
    (define (scan rules)
      (if (null? rules)
          exp
          (let ((dict
                 (match (pattern car rules))
                        exp
                        (empty-dict))))
            (if (eq? dict 'failed)
                (scan (cdr rules))
                (simplify-exp
                  (instantiate
                    (skeleton (car rules))
                    dict))))))
    (scan rules))
  simplify-exp)
```

```lisp
(define (empty-dict) '())

(define (extend-dict pat dat dict)
  (let ((name (var-name pat)))
    (let ((v (assq name dict)))
      (cond ((null? v)
             (cons (list name dat) dict))
            ((eq? (cadr v) dat) dict)
            (else 'failed)))))

(define (lookup var dict)
  (let ((v (assq var dict)))
    (if (null? v) var (cadr v))))
```

### Lecture 4B: [Generic Operators](https://youtu.be/OscT4N2qq7o?si=atT3O5ZlFrJ9R7Ym)

Complex number example:

Selectors:

```lisp
(real-part z)
(imag-part z)
(magnitude z)
(angle z)

(make-rectangular x y)
(make-polar r a)
```

Complex sum is easier with rectangular coordinates, while product is easier with polar coordinates.

```lisp
(define (+c z1 z2)
  (make-rectangular
    (+ (real-part z1) (real-part z2))
    (+ (imag-part z1) (imag-part z2))))

(define (*c z1 z2)
  (make-polar
    (* (magnitude z1) (magnitude z2))
    (+ (angle z1) (angle z2))))
```

George's representation (rectangular):

```lisp
(define (make-rectangular x y) (cons x y))
(define real-part car)
(define imag-part cdr)

(define  (make-polar r a)
  (cons (* r (cos a)) (* r (sin a))))

(define (magnitude z)
  (sqrt (+ (square (car z))
           (square (cdr z)))))

(define (angle z)
  (atan (cdr z) (car z)))
```

Martha's representation (polar):

```lisp
(define (make-polar r a) (cons r a))
(define magnitude car)
(define angle cdr)

(define (make-rectangular x y)
  (cons (sqrt (+ (square x) (square y)))
        (atan y x)))

(define (real-part z)
  (* (car z) (cos (cdr z))))

(define (imag-part z)
  (* (car z) (sin (cdr z))))
```

Which is better? Don't decide! Add "type tags."

```lisp
(define attach-type cons)
(define type car)
(define contents cdr)

(define (rectangular? z)
  (eq? (type z) 'rectangular))

(define (polar? z)
  (eq? (type z) 'polar))
```

Add type tagging to George's and Martha's constructors and make names unique (append `*-rectangular`, `*-polar`). Then define generic selectors and operators that dispatch on type. Later it's possible to use namespaces to avoid renaming.

Annoying that the dispatch layer nas to change any time a new type is added, and also that it's not doing any "real" work. Really just a table. As in all beuocracies, automation the "manager" out of a job!

Go back and do the same for the rational number library. Hal shows off nested tagged types, unpacked recursively as you pass down the layews. Then he goes on to introduce polynomials and does it in terms of the generic operators, so then coefficients can be *any* type (even polynomials themselves)! Now go back and rewrite the rational library in terms of the generic operators. Recursive type structure.

The coersion problem is not covered in the lecture (it is in the book). For example adding 5 and 3/4. They're incompatible types, but 5 could be converted to 5/1.

### Lecture 5A: [Assignment, State, and Side-effects](https://youtu.be/dO1aqPBJCPg?si=bswz852FzHk7yikX)

## Ringo Starr Teaches Drumming (05 AUG 2026 - 10 AUG 2026)

He spends a lot of time just telling stories, while following a loose curriculum. It ends with a giant jam session. Fun to watch, but not really a learning experience.

## Garry Kasparov Teaches Chess (05 AUG 2026 - 10 AUG 2026)

I'm impressed by his psychological approach. He definitely doesn't play the board, but the person sitting on the other side. He's fine with playing suboptimal moves even to make his opponent less comfortable and to steer the game to his style of play and away from his opponent's. I was surprised by this.

He mainly goes over basic tactics with all kinds of interesting positions and problems. Most of them are constructed, simplified positions, and some are from his actual games.
