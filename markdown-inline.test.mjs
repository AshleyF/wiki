import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { renderInlineMarkdown } from './markdown-inline.js';

test('renders balanced parentheses and underscores inside long link destinations',() => {
  const href = 'https://alg.cubing.net/?setup=R-_F-&alg=x_%2F%2F_orient_(green-yellow)%0AFB_(6_moves)';
  assert.equal(
    renderInlineMarkdown(`[solve](https://alg.cubing.net/?setup=R-_F-&alg=x_%2F%2F_orient_(green-yellow)%0AFB_(6_moves))`),
    `<a href="${href.replace('&','&amp;')}" target="_blank" rel="noopener noreferrer">solve</a>`
  );
});

test('renders text after a parenthesized URL outside the link',() => {
  const html = renderInlineMarkdown('[solution](https://example.com/a_(b)) afterwards');
  assert.match(html,/href="https:\/\/example\.com\/a_\(b\)"/);
  assert.match(html,/>solution<\/a> afterwards$/);
  assert.doesNotMatch(html,/<em>/);
});

test('keeps inline formatting in labels and rejects unsafe destinations',() => {
  assert.equal(
    renderInlineMarkdown('[**safe**](javascript:alert(1))'),
    '<a href="#"><strong>safe</strong></a>'
  );
});

test('renders every cubing.net link in the affected wiki pages without leaking its query into the prose',() => {
  for (const path of ['pages/microblog/2026/sep.md','pages/cubing/roux-solves.md']) {
    const lines = readFileSync(new URL(path,import.meta.url),'utf8')
      .split('\n')
      .filter(line => line.includes('https://alg.cubing.net/'));
    assert.ok(lines.length > 0,`${path} should retain its cubing.net fixtures`);
    for (const line of lines) {
      const expectedLinks = line.match(/\]\(https:\/\/alg\.cubing\.net\//g)?.length || 0;
      const html = renderInlineMarkdown(line);
      assert.equal(html.match(/<a href="https:\/\/alg\.cubing\.net\//g)?.length || 0,expectedLinks);
      assert.doesNotMatch(html.replace(/<a\b[^>]*>|<\/a>/g,''),/[?&](?:amp;)?(?:setup|alg)=/);
    }
  }
});
