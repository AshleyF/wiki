import assert from 'node:assert/strict';
import test from 'node:test';
import { highlightLisp } from './lisp-highlighter.js';

test('highlights Scheme structure without making identifiers noisy', () => {
  const html = highlightLisp('(define square (lambda (x) (* x 2)))');
  assert.match(html, /lisp-punctuation">\(<\/span>/);
  assert.match(html, /lisp-keyword">define<\/span>/);
  assert.match(html, /lisp-lambda">lambda<\/span>/);
  assert.match(html, /lisp-builtin">\*<\/span>/);
  assert.match(html, /lisp-number">2<\/span>/);
  assert.match(html, /<\/span> square <span/);
  assert.doesNotMatch(html, /class="lisp-[^"]+">square/);
});

test('highlights comments, strings, constants, and the lambda glyph', () => {
  const html = highlightLisp('; note\n(list "x" #t #\\space #\\( λ)');
  assert.match(html, /lisp-comment">; note<\/span>/);
  assert.match(html, /lisp-string">&quot;x&quot;<\/span>/);
  assert.match(html, /lisp-constant">#t<\/span>/);
  assert.match(html, /lisp-constant">#\\space<\/span>/);
  assert.match(html, /lisp-constant">#\\\(<\/span>/);
  assert.match(html, /lisp-lambda">λ<\/span>/);
});

test('escapes source before adding highlighting markup', () => {
  const html = highlightLisp('(display "<script>")');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
