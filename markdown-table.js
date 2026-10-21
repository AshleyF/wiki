function splitTableRow(line) {
  const source = line.trim();
  if (!source.includes('|')) return null;

  let start = source.startsWith('|') ? 1 : 0;
  let end = source.length;
  if (source.endsWith('|') && !source.endsWith('\\|')) end -= 1;

  const cells = [];
  let cell = '';
  let inCode = false;
  let escaped = false;
  let foundSeparator = false;
  for (let index = start; index < end; index += 1) {
    const character = source[index];
    if (escaped) {
      cell += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '`') {
      inCode = !inCode;
      cell += character;
      continue;
    }
    if (character === '|' && !inCode) {
      cells.push(cell.trim());
      cell = '';
      foundSeparator = true;
      continue;
    }
    cell += character;
  }
  if (escaped) cell += '\\';
  cells.push(cell.trim());
  return foundSeparator || source.startsWith('|') || source.endsWith('|') ? cells : null;
}

function delimiterAlignment(cell) {
  if (!/^:?-{3,}:?$/.test(cell)) return null;
  if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
  if (cell.endsWith(':')) return 'right';
  return 'left';
}

function normalizedCells(cells,columnCount) {
  return Array.from({ length:columnCount },(_,index) => cells[index] || '');
}

export function renderMarkdownTable(lines,startIndex,renderInline) {
  if (startIndex + 1 >= lines.length) return null;
  const headers = splitTableRow(lines[startIndex]);
  const delimiterCells = splitTableRow(lines[startIndex + 1]);
  if (!headers || !delimiterCells || headers.length !== delimiterCells.length) return null;
  const alignments = delimiterCells.map(delimiterAlignment);
  if (alignments.some((alignment) => !alignment)) return null;

  const rows = [];
  let nextIndex = startIndex + 2;
  while (nextIndex < lines.length && lines[nextIndex].trim()) {
    const cells = splitTableRow(lines[nextIndex]);
    if (!cells) break;
    rows.push(normalizedCells(cells,headers.length));
    nextIndex += 1;
  }

  const cellHtml = (tag,value,index) => {
    const scope = tag === 'th' ? ' scope="col"' : '';
    return `<${tag}${scope} class="wiki-table-align-${alignments[index]}">${renderInline(value)}</${tag}>`;
  };
  const head = headers.map((value,index) => cellHtml('th',value,index)).join('');
  const body = rows.map((row) => `<tr>${row.map((value,index) => cellHtml('td',value,index)).join('')}</tr>`).join('');
  return {
    html:`<div class="wiki-table-scroll"><table class="wiki-table"><thead><tr>${head}</tr></thead>${body ? `<tbody>${body}</tbody>` : ''}</table></div>`,
    nextIndex
  };
}

