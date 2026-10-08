const LISP_SPECIAL_FORMS = new Set([
  'and', 'begin', 'case', 'cond', 'define', 'delay', 'do', 'else', 'if',
  'let', 'let*', 'letrec', 'or', 'quasiquote', 'quote', 'set!', 'unquote',
  'unquote-splicing'
]);

const LISP_BUILTINS = new Set([
  '*', '+', '-', '/', '<', '<=', '=', '>', '>=',
  'abs', 'append', 'apply', 'assq', 'car', 'cdr', 'cons', 'display',
  'eq?', 'equal?', 'error', 'eval', 'length', 'list', 'list?', 'map',
  'max', 'member', 'min', 'newline', 'not', 'null?', 'number?', 'pair?',
  'procedure?', 'remainder', 'reverse', 'round', 'sqrt', 'symbol?'
]);

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const span = (type, value) => `<span class="lisp-${type}">${escapeHtml(value)}</span>`;

function classifyAtom(atom) {
  if (atom === 'lambda' || atom === 'λ') return 'lambda';
  if (LISP_SPECIAL_FORMS.has(atom)) return 'keyword';
  if (LISP_BUILTINS.has(atom)) return 'builtin';
  if (/^#(?:t|f|true|false)$/i.test(atom) || /^#\\(?:.|[a-z-]+)$/i.test(atom)) return 'constant';
  if (/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\d+\/\d+)$/i.test(atom)) return 'number';
  return '';
}

export function highlightLisp(source) {
  const output = [];
  let cursor = 0;

  while (cursor < source.length) {
    const character = source[cursor];

    if (/\s/.test(character)) {
      const start = cursor;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      output.push(escapeHtml(source.slice(start, cursor)));
      continue;
    }

    if (character === ';') {
      const end = source.indexOf('\n', cursor);
      const commentEnd = end < 0 ? source.length : end;
      output.push(span('comment', source.slice(cursor, commentEnd)));
      cursor = commentEnd;
      continue;
    }

    if (character === '"') {
      const start = cursor;
      cursor += 1;
      while (cursor < source.length) {
        if (source[cursor] === '\\') cursor += 2;
        else if (source[cursor++] === '"') break;
      }
      output.push(span('string', source.slice(start, Math.min(cursor, source.length))));
      continue;
    }

    if (source.startsWith('#\\', cursor)) {
      const start = cursor;
      cursor += 2;
      if (/[a-z]/i.test(source[cursor] || '')) {
        while (cursor < source.length && /[a-z-]/i.test(source[cursor])) cursor += 1;
      } else if (cursor < source.length) {
        cursor += 1;
      }
      output.push(span('constant', source.slice(start, cursor)));
      continue;
    }

    if ('()[]{}'.includes(character)) {
      output.push(span('punctuation', character));
      cursor += 1;
      continue;
    }

    if (character === "'" || character === '`' || character === ',') {
      const punctuation = character === ',' && source[cursor + 1] === '@' ? ',@' : character;
      output.push(span('punctuation', punctuation));
      cursor += punctuation.length;
      continue;
    }

    const start = cursor;
    while (cursor < source.length && !/[\s()[\]{}'`",;]/.test(source[cursor])) cursor += 1;
    const atom = source.slice(start, cursor);
    const type = classifyAtom(atom);
    output.push(type ? span(type, atom) : escapeHtml(atom));
  }

  return output.join('');
}
