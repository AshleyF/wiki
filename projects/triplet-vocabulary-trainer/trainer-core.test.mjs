import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPracticeScore,
  expirePracticeHits,
  midiPracticeHitAccepted,
  practiceAccuracy,
  practiceTimingWindowSeconds,
  practiceTimingWindows,
  practiceTouchExceededThreshold,
  randomTripletMasks,
  rolesForTripletMasks,
  scorePracticeTap
} from './trainer-core.js';

test('triplet masks become sounded A strokes and ghosted B strokes', () => {
  assert.deepEqual(rolesForTripletMasks(['000','101','111']),[
    'B','B','B','A','B','A','A','A','A'
  ]);
});

test('twelve random cells are independently selected from the enabled set', () => {
  const values = [.01,.99,.01,.99,.99,.01,.01,.99,.99,.01,.99,.01];
  assert.deepEqual(randomTripletMasks(['001','110'],12,() => values.shift()),[
    '001','110','001','110','110','001','001','110','110','001','110','001'
  ]);
});

test('a tap matches the closest unclaimed expected stroke', () => {
  const score = createPracticeScore();
  const expected = [{ time:1 },{ time:1.2 }];
  const result = scorePracticeTap(score,expected,1.04,.08);
  assert.equal(result.kind,'hit');
  assert.equal(result.expected,expected[0]);
  assert.deepEqual({ hits:score.hits,misses:score.misses,streak:score.streak },{ hits:1,misses:0,streak:1 });
});

test('extra taps and expired strokes count as misses', () => {
  const score = createPracticeScore();
  const expected = [{ time:1 }];
  assert.equal(scorePracticeTap(score,expected,.7,.08).kind,'miss');
  assert.equal(expirePracticeHits(score,expected,1.09,.08),1);
  assert.equal(score.misses,2);
  assert.equal(practiceAccuracy(score),0);
});

test('best streak survives a miss while a fresh score resets it', () => {
  const score = createPracticeScore();
  scorePracticeTap(score,[{ time:1 }],1,.08);
  scorePracticeTap(score,[{ time:2 }],2,.08);
  scorePracticeTap(score,[],3,.08);
  assert.equal(score.streak,0);
  assert.equal(score.bestStreak,2);
  assert.equal(createPracticeScore().bestStreak,0);
});

test('the tolerance scales with tempo but remains bounded', () => {
  assert.equal(practiceTimingWindowSeconds(.1),.045);
  assert.equal(practiceTimingWindowSeconds(.2),.06999999999999999);
  assert.equal(practiceTimingWindowSeconds(.5),.12);
});

test('practice timing allows more latency after the beat than anticipation before it', () => {
  const window = practiceTimingWindows(.2);
  assert.ok(window.late > window.early);
  assert.ok(window.late < .12);
  const score = createPracticeScore();
  assert.equal(scorePracticeTap(score,[{ time:1 }],1+window.late-.001,window).kind,'hit');
  assert.equal(scorePracticeTap(score,[{ time:2 }],2-window.early-.001,window).kind,'miss');
});

test('MIDI practice filtering ignores feet and low-velocity ghost strokes independently', () => {
  const options = { ghostVelocity:16,normalVelocity:64 };
  assert.equal(midiPracticeHitAccepted(36,110,options),false);
  assert.equal(midiPracticeHitAccepted(44,110,options),false);
  assert.equal(midiPracticeHitAccepted(38,39,options),false);
  assert.equal(midiPracticeHitAccepted(38,40,options),true);
  assert.equal(midiPracticeHitAccepted(36,110,{ ...options,ignoreFeet:false }),true);
  assert.equal(midiPracticeHitAccepted(38,20,{ ...options,ignoreGhosts:false }),true);
});

test('touches stay latched through a small wiggle and release after a deliberate drag', () => {
  assert.equal(practiceTouchExceededThreshold(100,100,110,110),false);
  assert.equal(practiceTouchExceededThreshold(100,100,118,100),true);
  assert.equal(practiceTouchExceededThreshold(100,100,90,85),true);
});
