# A wiki for unfinished ideas

This is a small wiki whose source material is ordinary text. The browser fetches each Markdown file when you follow a link and renders it inside the shell around this page.

> The durable part is the writing. The presentation can keep changing.

## Start exploring

- Open the [music](#/music) to see a fenced Strudel block.
- Check out the [cubing algs](#/cubing) to see alg rendering.
- Read this page's source at `pages/home.md`.

## What this first version understands

It supports headings, paragraphs, **bold**, *emphasis*, `inline code`, links, block quotes, ordered and unordered lists, and fenced code blocks. A fence labeled `strudel` has its own renderer, which is the first extension point.

```js
const ordinaryFence = "rendered as code";
```

Everything runs in the browser. There is no build step and no server-side code.

## Test

[Test link](#/test)
