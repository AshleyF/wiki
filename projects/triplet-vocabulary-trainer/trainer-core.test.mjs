import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXTENDED_PATTERNS,
  calibrationOffsetSeconds,
  calibratedVisualTime,
  consistentCalibrationOffset,
  commitPracticeMisses,
  createPracticeScore,
  expirePracticeHits,
  expirePracticeTargets,
  midiPracticeHitAccepted,
  practiceAccuracy,
  practiceTimingWindowSeconds,
  practiceTimingWindows,
  practiceTouchExceededThreshold,
  randomChoiceWithEmphasis,
  randomExtendedPatternPair,
  randomTripletMasks,
  recoveryHitTarget,
  recoveryPulseRoles,
  rolesForExtendedBar,
  rolesForKickVocabulary,
  rolesForKickVocabulary2,
  rolesForTripletMasks,
  trainerPlaybackPlan,
  tripletMasksForRoles,
  updateAuditionQueue,
  scorePracticeTap
} from './trainer-core.js';

test('extended vocabulary builds each four-triplet bar from its two pattern groups', () => {
  assert.deepEqual(EXTENDED_PATTERNS.map(pattern => pattern.join('')),[
    'ABBABA','ABAABA','AABABA','RABABB','RABABA','RABAAB','RBAABB','RBABBA','RBAABA'
  ]);
  assert.deepEqual(randomExtendedPatternPair([0,2,3,8],() => .99),[2,8]);
  assert.deepEqual(rolesForExtendedBar([0,3]),[
    'A','B','B','A','B','A','R','A','B','A','B','B'
  ]);
  assert.throws(() => randomExtendedPatternPair([0,1,2]),/each group/);
});

test('triplet masks become sounded A strokes and ghosted B strokes', () => {
  assert.deepEqual(rolesForTripletMasks(['000','101','111']),[
    'B','B','B','A','B','A','A','A','A'
  ]);
  assert.deepEqual(tripletMasksForRoles(['B','B','B','A','B','A','A','A','A']),['000','101','111']);
});

test('kick vocabulary keeps ghost strokes beneath the landing and main-pattern rest', () => {
  assert.deepEqual(
    rolesForKickVocabulary(['A','B','A','A','B','B']),
    ['A','B','A','A','B','B','S','B','B','B','B','B']
  );
});

test('second kick vocabulary fills the opening grid with ghosts and replaces the pattern downbeat with snare', () => {
  assert.deepEqual(
    rolesForKickVocabulary2(['A','B','A','A','B','B']),
    ['K','B','B','B','B','B','S','B','A','A','B','B']
  );
});

test('recovery uses quarter-note pulses and mode-sized re-entry targets', () => {
  assert.deepEqual(recoveryPulseRoles(12),[
    'A','R','R','A','R','R','A','R','R','A','R','R'
  ]);
  assert.deepEqual(tripletMasksForRoles(recoveryPulseRoles(12)),['100','100','100','100']);
  assert.equal(recoveryHitTarget(6),2);
  assert.equal(recoveryHitTarget(9),3);
  assert.equal(recoveryHitTarget(12),4);
});

test('rests do not become missed practice targets', () => {
  const expectedHits = [
    { time:1,matched:false,expired:false },
    { time:4,matched:false,expired:false }
  ];
  assert.equal(expirePracticeTargets(expectedHits,10,{ early:.05,late:.1 }),2);
  assert.equal(expirePracticeTargets(expectedHits,20,{ early:.05,late:.1 }),0);
});

test('twelve random cells are independently selected from the enabled set', () => {
  const values = [.01,.99,.01,.99,.99,.01,.01,.99,.99,.01,.99,.01];
  assert.deepEqual(randomTripletMasks(['001','110'],12,() => values.shift()),[
    '001','110','001','110','110','001','001','110','110','001','110','001'
  ]);
});

test('an emphasized choice receives exactly half of the random range', () => {
  assert.equal(randomChoiceWithEmphasis(['A','B','C'],'B',() => .49),'B');
  const values = [.5,.99];
  assert.equal(randomChoiceWithEmphasis(['A','B','C'],'B',() => values.shift()),'C');
  assert.equal(randomChoiceWithEmphasis(['A'],'A',() => .99),'A');
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

test('expired trailing targets can remain provisional until the next attempt', () => {
  const score = createPracticeScore();
  scorePracticeTap(score,[{ time:1 }],1,.08);
  const trailing = [{ time:2 },{ time:2.2 }];
  const deferred = expirePracticeTargets(trailing,2.4,.08);
  assert.equal(deferred,2);
  assert.deepEqual({ hits:score.hits,misses:score.misses,streak:score.streak },{ hits:1,misses:0,streak:1 });
  commitPracticeMisses(score,deferred);
  assert.deepEqual({ hits:score.hits,misses:score.misses,streak:score.streak },{ hits:1,misses:2,streak:0 });
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

test('latency calibration uses a robust median and stays within its safe range', () => {
  assert.equal(calibrationOffsetSeconds([.14,.15,.16,.145,.9]),.15);
  assert.ok(Math.abs(calibrationOffsetSeconds([.1,.2])-.15) < 1e-12);
  assert.equal(calibrationOffsetSeconds([-.05]),0);
  assert.equal(calibrationOffsetSeconds([]),0);
});

test('calibrated visuals follow the saved audible-latency offset', () => {
  assert.equal(calibratedVisualTime(4,.25),4.25);
  assert.equal(calibratedVisualTime(4,-.1),4);
  assert.equal(calibratedVisualTime(4,.8),4.5);
});

test('implicit calibration requires three consistently offset recovery hits', () => {
  assert.equal(consistentCalibrationOffset([.18,.19]),null);
  assert.equal(consistentCalibrationOffset([.18,.19,.17],.04),.18);
  assert.equal(consistentCalibrationOffset([.18,.29,.17],.04),null);
  assert.equal(consistentCalibrationOffset([.4,.2,.21,.19],.04),.2);
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

test('touch classification distinguishes a tap from a scrolling drag', () => {
  assert.equal(practiceTouchExceededThreshold(100,100,110,110),false);
  assert.equal(practiceTouchExceededThreshold(100,100,118,100),true);
  assert.equal(practiceTouchExceededThreshold(100,100,90,85),true);
});

test('metronome-only playback suppresses drums without stopping the cursor pulse', () => {
  assert.deepEqual(trainerPlaybackPlan({
    role:'A',step:0,kickVocabulary:false,drumsEnabled:false,metronomeEnabled:true
  }),{ pattern:false,grooveHat:false,metronome:true });
  assert.deepEqual(trainerPlaybackPlan({
    role:'K',step:0,kickVocabulary:true,drumsEnabled:false,metronomeEnabled:true
  }),{ pattern:false,grooveHat:false,metronome:true });
  assert.deepEqual(trainerPlaybackPlan({
    role:'K',step:0,kickVocabulary:true,drumsEnabled:true,metronomeEnabled:true
  }),{ pattern:true,grooveHat:true,metronome:false });
  assert.deepEqual(trainerPlaybackPlan({
    role:'B',step:1,kickVocabulary:false,drumsEnabled:true,metronomeEnabled:true
  }),{ pattern:true,grooveHat:false,metronome:false });
});

test('card auditions queue in click order and cap the sequence at three patterns', () => {
  assert.deepEqual(updateAuditionQueue([],{ activeSlot:2,slot:0 }),{ action:'queued',queue:[0] });
  assert.deepEqual(updateAuditionQueue([0],{ activeSlot:2,slot:1 }),{ action:'queued',queue:[0,1] });
  assert.deepEqual(updateAuditionQueue([0,1],{ activeSlot:2,slot:0 }),{ action:'removed',queue:[1] });
  assert.deepEqual(updateAuditionQueue([0,1],{ activeSlot:2,slot:2 }),{ action:'stop',queue:[0,1] });
  assert.deepEqual(updateAuditionQueue([0,1],{ activeSlot:2,slot:3 }),{ action:'full',queue:[0,1] });
});
