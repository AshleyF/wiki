import { DRUM_HIDDEN_TRIPLET_SPELLINGS } from './drum-notation-core.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const GLYPH_CENTER_OFFSETS = Object.freeze({
  note:26.967,
  eighthRest:25.998,
  quarterRest:26.475
});

export function reducedTripletGridGeometry(left, right, count, gap = 0) {
  const cellCount = Math.max(1,Math.floor(Number(count) || 1));
  const cellGap = Math.max(0,Number(gap) || 0);
  const cellWidth = (right-left-(cellGap*(cellCount-1)))/cellCount;
  return Array.from({ length:cellCount },(_,cellIndex) => {
    const cellLeft = left+(cellIndex*(cellWidth+cellGap));
    const slotWidth = cellWidth/3;
    return {
      left:cellLeft,
      right:cellLeft+cellWidth,
      center:cellLeft+(cellWidth/2),
      slotWidth,
      slotCenters:Array.from({ length:3 },(_,slotIndex) => cellLeft+((slotIndex+.5)*slotWidth))
    };
  });
}

function appendBracket(svg, left, right, y) {
  const group = document.createElementNS(SVG_NAMESPACE,'g');
  group.classList.add('reduced-triplet-bracket');
  const center = (left+right)/2;
  const gap = 18;
  const path = document.createElementNS(SVG_NAMESPACE,'path');
  path.setAttribute('d',`M${left} ${y+7}V${y}H${center-gap/2} M${center+gap/2} ${y}H${right}V${y+7}`);
  path.setAttribute('fill','none');
  path.setAttribute('stroke','currentColor');
  path.setAttribute('stroke-width','1');
  const number = document.createElementNS(SVG_NAMESPACE,'text');
  number.setAttribute('x',String(center));
  number.setAttribute('y',String(y+4));
  number.setAttribute('text-anchor','middle');
  number.setAttribute('font-family','Arial, sans-serif');
  number.setAttribute('font-size','12');
  number.textContent = '3';
  group.append(path,number);
  svg.append(group);
}

function appendNumber(svg, x, y) {
  const number = document.createElementNS(SVG_NAMESPACE,'text');
  number.classList.add('reduced-triplet-number');
  number.setAttribute('x',String(x));
  number.setAttribute('y',String(y));
  number.setAttribute('text-anchor','middle');
  number.setAttribute('font-family','Arial, sans-serif');
  number.setAttribute('font-size','12');
  number.textContent = '3';
  svg.append(number);
}

function appendAnnotation(svg, text, x, y) {
  const annotation = document.createElementNS(SVG_NAMESPACE,'text');
  annotation.classList.add('reduced-triplet-annotation');
  annotation.setAttribute('x',String(x));
  annotation.setAttribute('y',String(y));
  annotation.setAttribute('text-anchor','middle');
  annotation.setAttribute('font-family','Arial, sans-serif');
  annotation.setAttribute('font-size','9');
  annotation.textContent = text;
  svg.append(annotation);
}

function glyphCenterOffset(event) {
  if (!event.rest) return GLYPH_CENTER_OFFSETS.note;
  return event.duration === '4' ? GLYPH_CENTER_OFFSETS.quarterRest : GLYPH_CENTER_OFFSETS.eighthRest;
}

export function renderReducedTripletSequence({
  Flow,
  target,
  masks,
  width,
  height,
  staveY,
  gridLeft,
  gridRight,
  cellGap = 0,
  clef = false,
  timeSignature = '',
  annotationForStep = null
}) {
  const renderer = new Flow.Renderer(target,Flow.Renderer.Backends.SVG);
  renderer.resize(width,height);
  const context = renderer.getContext();
  const stave = new Flow.Stave(4,staveY,width-8);
  if (clef) stave.addClef('percussion');
  if (timeSignature) stave.addTimeSignature(timeSignature);
  stave.setContext(context).draw();

  const geometry = reducedTripletGridGeometry(gridLeft,gridRight,masks.length,cellGap);
  const cells = masks.map((mask,cellIndex) => {
    const spelling = DRUM_HIDDEN_TRIPLET_SPELLINGS[mask];
    if (!spelling) throw new Error(`Unknown reduced triplet mask: ${mask}`);
    const notes = spelling.events.map((event) => {
      const globalStep = (cellIndex*3)+event.step;
      const note = new Flow.StaveNote({
        clef:'percussion',
        keys:[event.rest ? 'b/4' : 'c/5'],
        duration:`${event.duration}${event.rest ? 'r' : ''}`,
        stem_direction:Flow.StaveNote.STEM_UP
      });
      note.setStave(stave).setContext(context);
      const tickContext = new Flow.TickContext();
      tickContext
        .addTickable(note)
        .preFormat()
        .setX(geometry[cellIndex].slotCenters[event.step]-glyphCenterOffset(event));
      note.setTickContext(tickContext);
      note.reducedTripletEvent = event;
      note.reducedTripletStep = globalStep;
      return note;
    });
    const beamable = notes.filter((note) => !note.reducedTripletEvent.rest && note.reducedTripletEvent.duration === '8');
    return {
      mask,
      notes,
      beam:beamable.length > 1 ? new Flow.Beam(beamable) : null,
      geometry:geometry[cellIndex]
    };
  });

  cells.flatMap((cell) => cell.notes).forEach((note) => note.draw());
  cells.forEach((cell) => cell.beam?.setContext(context).draw());
  const svg = target.querySelector('svg');
  const bracketY = staveY+9;
  cells.forEach((cell,cellIndex) => {
    if (cell.mask === '111') appendNumber(svg,cell.geometry.center,bracketY+4);
    else if (DRUM_HIDDEN_TRIPLET_SPELLINGS[cell.mask].tuplet) {
      appendBracket(svg,cell.geometry.left,cell.geometry.right,bracketY);
    }
    if (typeof annotationForStep === 'function') {
      DRUM_HIDDEN_TRIPLET_SPELLINGS[cell.mask].events.forEach((event) => {
        if (event.rest) return;
        const step = (cellIndex*3)+event.step;
        const annotation = annotationForStep(step,event,cell.mask);
        if (annotation) appendAnnotation(svg,annotation,cell.geometry.slotCenters[event.step],height-12);
      });
    }
  });

  return {
    renderer,
    context,
    stave,
    cells,
    notes:cells.flatMap((cell) => cell.notes)
  };
}
