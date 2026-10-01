const escapeHtml = (value) => value
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#039;');

function formatInlineText(text) {
  let result = escapeHtml(text);
  result = result.replace(/`([^`]+)`/g,'<code>$1</code>');
  result = result.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  result = result.replace(/(^|[^\w])__([^_\n]+?)__(?=[^\w]|$)/g,'$1<strong>$2</strong>');
  result = result.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  result = result.replace(/(^|[^\w])_([^_\n]+?)_(?=[^\w]|$)/g,'$1<em>$2</em>');
  return result;
}

function closingParenthesis(text,start) {
  let depth = 1;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
    } else if (text[index] === '(') {
      depth += 1;
    } else if (text[index] === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function renderLink(label,href) {
  const projectLink = /^projects\/[a-z0-9][a-z0-9/-]*\/?$/.test(href);
  const safeHref = /^(https?:|mailto:|#)/.test(href) || projectLink ? href : '#';
  const external = /^https?:/.test(safeHref) || projectLink
    ? ' target="_blank" rel="noopener noreferrer"'
    : '';
  return `<a href="${escapeHtml(safeHref)}"${external}>${formatInlineText(label)}</a>`;
}

export function renderInlineMarkdown(text) {
  const rendered = [];
  let cursor = 0;

  while (cursor < text.length) {
    const labelStart = text.indexOf('[',cursor);
    if (labelStart < 0) break;
    const labelEnd = text.indexOf('](',labelStart+1);
    if (labelEnd < 0 || text.slice(labelStart,labelEnd).includes('\n')) break;
    const hrefStart = labelEnd+2;
    const hrefEnd = closingParenthesis(text,hrefStart);
    if (hrefEnd < 0) break;

    rendered.push(formatInlineText(text.slice(cursor,labelStart)));
    rendered.push(renderLink(text.slice(labelStart+1,labelEnd),text.slice(hrefStart,hrefEnd)));
    cursor = hrefEnd+1;
  }

  rendered.push(formatInlineText(text.slice(cursor)));
  return rendered.join('');
}
