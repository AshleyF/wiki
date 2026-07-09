# CMLL

These are the CMLL algs that I use. Mostly from [Kian Mansour's site](https://sites.google.com/view/kianroux/cmll).

## O Cases

Adjacent Swap

```cube-cmll
R U R' F' R U R' U' R' F R2 U' R'
```

OH

```cube-cmll
R U2 R' U' R U2 z U' z' U R' U' z U z'
```

Diagonal Swap

```cube-cmll
r2 D r' U r D' R2' U' F' U' F
```

OH

```cube-cmll
F R U' R' U' R U R' F' R U R' U' R' F R F'
```

## H Cases

### Columns

Two ways. First one also OH.

```cube-cmll
R U2 R' U' R U R' U' R U' R'
```

```cube-cmll
R U R' U R U' R' U R U2' R'
```

### Rows

F sexy3 F'. Also OH.

```cube-cmll
F R U R' U' R U R' U' R U R' U' F'
```

### Column

```cube-cmll
R U2' R2' F R F' U2 R' F R F'
```

OH

```cube-cmll
F R U' R' U R U2 R' U' R U R' U' F'
```

### Row

```cube-cmll
r U' r2' D' r U' r' D r2 U r'
```

OH

```cube-cmll
R' U' R U' R' U' z U z' U' R U z U' z'
```

## Pi Cases

### Right Bar

F sexy2 F'. Also OH.

```cube-cmll
F R U R' U' R U R' U' F'
```

### Back Slash

Also OH.

```cube-cmll
F R' F' R U2 R U' R' U R U2' R'
```