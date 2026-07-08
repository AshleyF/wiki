# Personal Wiki static site

A dependency-free, client-rendered wiki for GitHub Pages. Content lives in plain-text Markdown files under `pages/`; `app.js` fetches and renders them into the HTML shell.

## Run locally

Browsers usually block `fetch()` from pages opened directly with `file://`, so serve the folder over HTTP:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Add a page

1. Add `pages/my-page.md`.
2. Link to it as `[My page](#/my-page)`.
3. Optionally add it to the sidebar in `index.html`.

The hash-based URL is intentional: GitHub Pages always serves `index.html`, while a path such as `/my-page` would otherwise produce a 404 on a static host.

## Extension blocks

Fenced blocks select a renderer by their language label:

````md
```strudel
note("c3 e3 g3")
```
````

````md
```abc
X:1
T:Example
M:4/4
L:1/8
K:C
CDEF GABc | cBAG FEDC |]
```
````

````md
```drums
tempo 104
meter 4/4
hh: x x x x x x o x
sn: . . x . . . x .
bd: x . . x . x . .
wb: . . . . . . x .
```
````

````md
```cube-cmll edges=hide center=hide
R U R' U R U2 R'
```
````

Add renderers to `fenceRenderers` in `app.js`. Unknown labels fall back to escaped code. The `strudel` renderer shows a Play button that toggles to Stop during playback, plus a collapsible Source section. It uses the pinned `@strudel/web@1.0.3` browser build from unpkg, so playback requires a network connection unless that dependency is vendored locally. Browsers also require the user to press Play before audio can begin.

The `abc` renderer uses the pinned `abcjs@6.6.3` browser build from jsDelivr to render ABC notation as SVG sheet music and play it through abcjs's synthesized audio. During playback, the current note or chord is highlighted in the score. The raw ABC remains available in a collapsible Source section. Ordinary notation defaults to acoustic grand piano playback. ABC is plain-text music notation, so the source remains readable even without the renderer.

The `drums` renderer uses the pinned `vexflow@4.2.2` browser build from jsDelivr to render a small human-friendly drum notation DSL. This first version renders one 4/4 bar divided into eight eighth-note slots. Simultaneous kit parts share one upward stem and beam, matching compact drum-set notation without filler rests. Its Play button schedules the parsed hits through a dependency-free Web Audio drum synth and highlights the current chord as it plays.

Drum tokens can add common engraving modifiers: `x>` for an accent, `(x)` for a parenthesized ghost note, `x/` for a double, `f` for a flam, and `d` for a drag. A `stick:` row adds aligned `R`/`L` sticking below the staff. The renderer translates these into VexFlow articulations, parentheses, tremolo slashes, grace-note groups, and annotations. Additional rows include crash (`cr`), ride (`rd`), high/mid/floor toms (`ht`, `mt`, `ft`), and pedal hi-hat (`ph`).

The `cube-cmll` renderer is a dependency-free port of Brief Cubing's case-generation approach. It applies the inverse of the written algorithm to a solved facelet model, then renders a CMLL top-layer diagram. Fence options can reveal edges or the U center and specify an AUF or cube rotation.

Strudel blocks are evaluated as JavaScript. Only publish Markdown from authors you trust; this wiki is not designed to safely render untrusted contributions. Strudel is AGPL-3.0 licensed, so review that license before distributing a derived or bundled deployment.

The parser is intentionally small rather than fully CommonMark-compliant; nested lists, tables, images, raw HTML, multiline quotes, and complex inline nesting are not supported. If those become important, replace `renderMarkdown()` with a maintained parser while keeping the same page format and extension registry.

## GitHub Pages

Published site: [https://ashleyf.github.io/wiki/](https://ashleyf.github.io/wiki/)

Publish this directory from a branch or GitHub Actions. Relative asset and content URLs make it work both at a user site and under a project subpath. File names must use lowercase letters, digits, and hyphens because the router rejects other characters.
