# Cubing algorithms

Cube fences keep standard algorithm notation readable while adding the case state needed for recognition. A `cube-cmll` fence starts with a solved cube, applies the inverse of the algorithm, and renders the resulting CMLL case.

See the [CMLL page](#/cmll).

## CMLL

```cube-cmll
R U R' U R U2 R'
```

The default CMLL view follows Brief Cubing: last-layer edges and the U center are masked so the corner orientation and permutation remain visually dominant.

Fence parameters use `name=value` pairs. This diagnostic version reveals the edges and center and applies an AUF and viewing rotation before deriving the case:

```cube-cmll edges=show center=show auf=U rotation=y
R U2 R' U' R U' R'
```

Supported parameters are `edges=show|hide`, `center=show|hide`, `auf=<move>`, and `rotation=<move>`. Standard face, slice, wide, and cube-rotation notation is accepted in the algorithm body.

Return to the [home page](#/home) or visit the [sound sketches](#/sound).
