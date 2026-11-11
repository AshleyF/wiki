import assert from 'node:assert/strict';
import test from 'node:test';
import { DRUM_HIDDEN_TRIPLET_SPELLINGS, classifySingleInstrumentNotation, renderedTupletBracketCenter, singleLineDrumKey, singleLineDrumStaveOptions, translateDrumNoteStemToX } from './drum-notation-core.js';

test('reduced triplet spellings consume exactly three source slots', () => {
  for (const [mask,spelling] of Object.entries(DRUM_HIDDEN_TRIPLET_SPELLINGS)) {
    assert.equal(spelling.events.reduce((sum,event) => sum+event.slots,0),3,mask);
  }
});

test('core vocabulary cells retain the wiki engraving', () => {
  assert.deepEqual(DRUM_HIDDEN_TRIPLET_SPELLINGS['100'].events,[{ step:0,slots:3,duration:'4' }]);
  assert.deepEqual(DRUM_HIDDEN_TRIPLET_SPELLINGS['101'].events,[{ step:0,slots:2,duration:'4' },{ step:2,slots:1,duration:'8' }]);
  assert.equal(DRUM_HIDDEN_TRIPLET_SPELLINGS['010'].extendThroughLastDuration,true);
  assert.equal(DRUM_HIDDEN_TRIPLET_SPELLINGS['010'].events.at(-1).centerStem,true);
  assert.equal(DRUM_HIDDEN_TRIPLET_SPELLINGS['110'].events.at(-1).rest,true);
});

test('middle-only triplets align their stem with the rendered bracket center', () => {
  const attributes = new Map();
  const element = {
    getAttribute:name => attributes.get(name) || null,
    setAttribute:(name,value) => attributes.set(name,value)
  };
  const note = { getStemX:() => 201.5,getSVGElement:() => element };
  assert.equal(translateDrumNoteStemToX(note,187.25),-14.25);
  assert.equal(attributes.get('transform'),'translate(-14.25 0)');

  const rect = (x,width) => ({
    tagName:'rect',
    getAttribute:name => name === 'x' ? String(x) : name === 'width' ? String(width) : null
  });
  assert.equal(renderedTupletBracketCenter({ children:[rect(156,21),rect(197,21),rect(156,1),rect(218,1)] }),187.5);
});

test('single-line notation ignores hidden playback rows', () => {
  const rows = {
    sn:['x','_','x'],
    ph:['~>','.','.'],
    cr:['.','.','.']
  };
  const layout = classifySingleInstrumentNotation(
    rows,
    ['R','.','L'],
    token => token === 'x'
  );
  assert.deepEqual(layout,{ singleLine:true,row:'sn',handSeparated:true });
});

test('one visible hit on another instrument forces a full staff', () => {
  const rows = { sn:['x','x'],cr:['.','x'] };
  const layout = classifySingleInstrumentNotation(rows,['R','L'],token => token === 'x');
  assert.deepEqual(layout,{ singleLine:false,row:null,handSeparated:false });
});

test('incomplete sticking keeps a single instrument on the line', () => {
  const rows = { sn:['x','x'] };
  const layout = classifySingleInstrumentNotation(rows,['R','.'],token => token === 'x');
  assert.deepEqual(layout,{ singleLine:true,row:'sn',handSeparated:false });
});

test('shared single-line geometry places hands on opposite sides', () => {
  assert.deepEqual(singleLineDrumStaveOptions(),{ num_lines:1 });
  assert.equal(singleLineDrumKey(),'f/5');
  assert.equal(singleLineDrumKey('R'),'g/5');
  assert.equal(singleLineDrumKey('L'),'e/5');
  assert.equal(singleLineDrumKey('.','X2'),'f/5/X2');
});
