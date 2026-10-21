import assert from 'node:assert/strict';
import test from 'node:test';
import { renderInlineMarkdown } from './markdown-inline.js';
import { renderMarkdownTable } from './markdown-table.js';

test('renders the SICP pattern table with inline code',() => {
  const lines = [
    '| Pattern | Match |',
    '| ------- | ----- |',
    '| `foo` | exactly `foo` |',
    '| `(f a b)` | list |'
  ];
  const table = renderMarkdownTable(lines,0,renderInlineMarkdown);
  assert.equal(table.nextIndex,4);
  assert.match(table.html,/<table class="wiki-table">/);
  assert.match(table.html,/<th scope="col" class="wiki-table-align-left">Pattern<\/th>/);
  assert.match(table.html,/<td class="wiki-table-align-left"><code>foo<\/code><\/td>/);
  assert.match(table.html,/<code>\(f a b\)<\/code>/);
});

test('supports column alignment and pipes inside code spans',() => {
  const table = renderMarkdownTable([
    '| Left | Center | Right |',
    '| :--- | :----: | ----: |',
    '| a | `b|c` | d |'
  ],0,renderInlineMarkdown);
  assert.match(table.html,/wiki-table-align-left/);
  assert.match(table.html,/wiki-table-align-center/);
  assert.match(table.html,/wiki-table-align-right/);
  assert.match(table.html,/<code>b\|c<\/code>/);
});

test('does not treat an ordinary pipe-delimited sentence as a table',() => {
  assert.equal(renderMarkdownTable(['one | two','not a delimiter'],0,renderInlineMarkdown),null);
});

