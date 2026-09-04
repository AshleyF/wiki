export const DRUM_HIDDEN_TRIPLET_SPELLINGS = Object.freeze({
  '000': { tuplet:false, events:[{ rest:true, step:0, slots:3, duration:'4' }] },
  '001': { tuplet:true, events:[{ rest:true, step:0, slots:2, duration:'4' }, { step:2, slots:1, duration:'8' }] },
  '010': { tuplet:true, extendThroughLastDuration:true, events:[{ rest:true, step:0, slots:1, duration:'8' }, { step:1, slots:2, duration:'4' }] },
  '011': { tuplet:true, events:[{ rest:true, step:0, slots:1, duration:'8' }, { step:1, slots:1, duration:'8' }, { step:2, slots:1, duration:'8' }] },
  '100': { tuplet:false, events:[{ step:0, slots:3, duration:'4' }] },
  '101': { tuplet:true, events:[{ step:0, slots:2, duration:'4' }, { step:2, slots:1, duration:'8' }] },
  '110': { tuplet:true, events:[{ step:0, slots:1, duration:'8' }, { step:1, slots:1, duration:'8' }, { rest:true, step:2, slots:1, duration:'8' }] },
  '111': { tuplet:true, events:[{ step:0, slots:1, duration:'8' }, { step:1, slots:1, duration:'8' }, { step:2, slots:1, duration:'8' }] }
});

export function addDrumStepElement(stepElements, step, element) {
  if (!element || !stepElements[step] || stepElements[step].includes(element)) return;
  stepElements[step].push(element);
}

export function renderedDrumStems(target, stemUp = 1, stemDown = -1) {
  return [...target.querySelectorAll('.vf-stem')].map(stemGroup => {
    const coordinates = stemGroup.querySelector('path')?.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
    return {
      element: stemGroup,
      x: coordinates[0],
      direction: coordinates.length >= 4 ? (coordinates[3] < coordinates[1] ? stemUp : stemDown) : null
    };
  }).filter(stem => Number.isFinite(stem.x));
}

export function renderedStemForNote(stems, note) {
  if (typeof note?.getStemX !== 'function') return null;
  const stemX = note.getStemX();
  if (!Number.isFinite(stemX)) return null;
  const direction = note.getStemDirection?.();
  return stems.find(stem => Math.abs(stem.x-stemX) < .75 && (!Number.isFinite(direction) || stem.direction === direction))?.element || null;
}

export function extendHiddenTripletBracket(group, tuplet) {
  if (!group || !tuplet?.wikiExtendThroughLastDuration) return;
  const [firstNote,lastNote] = tuplet.wikiSpellingNotes || [];
  const firstX = Number(firstNote?.getAbsoluteX?.());
  const lastX = Number(lastNote?.getAbsoluteX?.());
  const extension = (lastX-firstX)/2;
  if (!Number.isFinite(extension) || extension <= 0) return;

  const rects = [...group.children].filter(element => element.tagName === 'rect');
  const glyph = [...group.children].find(element => element.tagName === 'path');
  if (rects.length < 4) return;
  const [leftRule,rightRule,,rightHook] = rects;
  const half = extension/2;
  const values = [leftRule.getAttribute('width'),rightRule.getAttribute('x'),rightRule.getAttribute('width'),rightHook.getAttribute('x')].map(Number);
  if (!values.every(Number.isFinite)) return;

  leftRule.setAttribute('width',String(values[0]+half));
  rightRule.setAttribute('x',String(values[1]+half));
  rightRule.setAttribute('width',String(values[2]+half));
  rightHook.setAttribute('x',String(values[3]+extension));
  if (glyph) {
    const transform = glyph.getAttribute('transform');
    glyph.setAttribute('transform',`${transform ? `${transform} ` : ''}translate(${half} 0)`);
  }
  group.classList.add('drum-tuplet-duration-extended');
}
