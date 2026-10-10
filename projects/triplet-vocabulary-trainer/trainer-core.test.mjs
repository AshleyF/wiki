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
  fatBeatsVelocityProfile,
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
  rideCompingTimekeeper,
  rideCompingVelocityProfile,
  rolesForExtendedBar,
  rolesForFatBeats,
  rolesForKickVocabulary,
  rolesForKickVocabulary12,
  rolesForKickVocabulary2,
  rolesForRideVocabulary,
  rolesForTripletMasks,
  scorePracticeTap,
  systematicPatternCombinations,
  systematicPatternStep,
  trainerEventPosition,
  trainerResumeEventNumber,
  trainerPlaybackPlan,
  choosePatternAvoiding,
  tripletMasksForRoles,
  updateAuditionQueue
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

test('systematic order enumerates each eligible mode combination and wraps', () => {
  assert.deepEqual(systematicPatternCombinations('vocabulary',{ melodyIndexes:[0,2,8] }),['0','2','8']);
  assert.deepEqual(systematicPatternCombinations('kick',{ melodyIndexes:[0,1] }),['0','1']);
  assert.deepEqual(systematicPatternCombinations('kick2',{ melodyIndexes:[0,1] }),['0','1']);
  assert.deepEqual(systematicPatternCombinations('extended',{ extendedIndexes:[0,2,3,8] }),[
    [0,3],[0,8],[2,3],[2,8]
  ]);
  assert.deepEqual(systematicPatternCombinations('kick12',{ melodyIndexes:[0,1,2] }),[
    [0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]
  ]);
  assert.deepEqual(systematicPatternCombinations('ride',{ melodyIndexes:[0,2] }),[
    [0,0],[0,2],[2,0],[2,2]
  ]);
  assert.equal(systematicPatternCombinations('extended',{ extendedIndexes:[0,1,2,3,4,5,6,7,8] }).length,18);
  assert.equal(systematicPatternCombinations('fat',{ extendedIndexes:[0,1,2,3,4,5,6,7,8] }).length,18);
  assert.equal(systematicPatternCombinations('kick12',{ melodyIndexes:[0,1,2,3,4,5,6,7,8] }).length,81);
  assert.equal(systematicPatternCombinations('ride',{ melodyIndexes:[0,1,2,3,4,5,6,7,8] }).length,81);
  assert.deepEqual(systematicPatternCombinations('triplets',{ melodyIndexes:[0,1] }),[]);
  assert.deepEqual(systematicPatternStep([[0,0],[0,1]],0),{ pattern:[0,0],nextIndex:1 });
  assert.deepEqual(systematicPatternStep([[0,0],[0,1]],1),{ pattern:[0,1],nextIndex:0 });
});

test('triplet masks become sounded A strokes and ghosted B strokes', () => {
  assert.deepEqual(rolesForTripletMasks(['000','101','111']),[
    'B','B','B','A','B','A','A','A','A'
  ]);
  assert.deepEqual(tripletMasksForRoles(['B','B','B','A','B','A','A','A','A']),['000','101','111']);
});

test('fat beats apply the extended melody to kick while leaving non-melody slots silent', () => {
  assert.deepEqual(rolesForFatBeats([1,7]),[
    'K','R','R','R','R','R','R','R','R','R','R','R',
    'A','R','A','A','R','A','R','R','A','R','R','A'
  ]);
  assert.deepEqual(rolesForFatBeats([1,7],{ leadIn:false }),[
    'A','R','A','A','R','A','R','R','A','R','R','A'
  ]);
});

test('ride vocabulary joins two independent melodies and turns the ghost layer into silence', () => {
  assert.deepEqual(rolesForRideVocabulary(
    ['A','B','A','A','B','B'],
    ['A','A','B','A','B','A']
  ),[
    'A','R','A','A','R','R','A','A','R','A','R','A'
  ]);
  assert.deepEqual(rolesForRideVocabulary(
    ['A','B','A','A','B','B'],
    ['A','A','B','A','B','A'],
    { intro:'quarters' }
  ),[
    'A','R','R','A','R','R','A','R','R','A','R','R',
    'A','R','A','A','R','R','A','A','R','A','R','A'
  ]);
  assert.deepEqual(rolesForRideVocabulary(
    ['A','B','A','A','B','B'],
    ['A','A','B','A','B','A'],
    { intro:'spang' }
  ),[
    'A','R','R','A','R','A','A','R','R','A','R','A',
    'A','R','A','A','R','R','A','A','R','A','R','A'
  ]);
  assert.deepEqual(
    Array.from({ length:12 },(_,step) => rideCompingTimekeeper(step)),
    [
      { kick:true,pedalHat:false },
      { kick:false,pedalHat:false },
      { kick:false,pedalHat:false },
      { kick:true,pedalHat:true },
      { kick:false,pedalHat:false },
      { kick:false,pedalHat:false },
      { kick:true,pedalHat:false },
      { kick:false,pedalHat:false },
      { kick:false,pedalHat:false },
      { kick:true,pedalHat:true },
      { kick:false,pedalHat:false },
      { kick:false,pedalHat:false }
    ]
  );
  assert.deepEqual(
    rideCompingVelocityProfile({ ghost:16,normal:64,accent:111 }),
    { kick:6,ride:99,pedalHat:64 }
  );
  assert.deepEqual(
    rideCompingVelocityProfile({ ghost:0,normal:127,accent:127 }),
    { kick:0,ride:127,pedalHat:127 }
  );
});

test('fat beats keep the kick normal while moderating the halftime snare', () => {
  assert.deepEqual(
    fatBeatsVelocityProfile({ normal:64,accent:111 }),
    { kick:64,snare:88 }
  );
  assert.deepEqual(
    fatBeatsVelocityProfile({ normal:127,accent:127 }),
    { kick:127,snare:127 }
  );
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

test('combined kick vocabulary joins Kick 1 and Kick 2 pattern halves', () => {
  assert.deepEqual(
    rolesForKickVocabulary12(
      ['A','B','A','A','B','B'],
      ['A','A','B','A','B','A']
    ),
    ['A','B','A','A','B','B','S','A','B','A','B','A']
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

test('repeat count traverses each card the requested number of times before advancing', () => {
  assert.deepEqual(trainerEventPosition(0,6,3,3),{
    step:0,slot:0,repetition:0,cardBoundary:false,eventsPerCard:18
  });
  assert.deepEqual(trainerEventPosition(12,6,3,3),{
    step:0,slot:0,repetition:2,cardBoundary:false,eventsPerCard:18
  });
  assert.deepEqual(trainerEventPosition(18,6,3,3),{
    step:0,slot:1,repetition:0,cardBoundary:true,eventsPerCard:18
  });
  assert.deepEqual(trainerEventPosition(6,6,3,1),{
    step:0,slot:1,repetition:0,cardBoundary:true,eventsPerCard:6
  });
  assert.deepEqual(trainerEventPosition(47,6,3,8),{
    step:5,slot:0,repetition:7,cardBoundary:false,eventsPerCard:48
  });
  assert.deepEqual(trainerEventPosition(95,6,3,16),{
    step:5,slot:0,repetition:15,cardBoundary:false,eventsPerCard:96
  });
});

test('pausing resumes at the first event that has not sounded', () => {
  assert.equal(trainerResumeEventNumber(8,10.8,10.05,.1),1);
  assert.equal(trainerResumeEventNumber(8,10.8,10.71,.1),8);
  assert.equal(trainerResumeEventNumber(0,10.8,10.05,.1),0);
});

test('pattern choice avoids an adjacent duplicate when another pattern exists', () => {
  assert.equal(choosePatternAvoiding('A',['A','B'],['A'],() => 0),'B');
  assert.deepEqual(
    choosePatternAvoiding(['100','100'],[['100','100'],['100','101']], [['100','100']],() => 0),
    ['100','101']
  );
  assert.equal(choosePatternAvoiding('A',['A'],['A'],() => 0),'A');
});

test('rests do not become missed practice targets', () => {
  const expectedHits = [
    { time:1,matched:false,expired:false },
    { time:4,matched:false,expired:false }
  ];
  assert.equal(expirePracticeTargets(expectedHits,10,{ early:.05,late:.1 }),2);
  assert.equal(expirePracticeTargets(expectedHits,20,{ early:.05,late:.1 }),0);
});

test('random cells avoid adjacent duplicates when another mask is enabled', () => {
  assert.deepEqual(randomTripletMasks(['001','110'],6,() => .01),[
    '001','110','001','110','001','110'
  ]);
  assert.deepEqual(randomTripletMasks(['001'],3,() => .01),['001','001','001']);
  assert.deepEqual(
    randomTripletMasks(['001','010','100'],2,() => .01,null,{ before:'001',after:'001' }),
    ['010','100']
  );
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

test('an embedded ride timekeeper avoids doubling the optional metronome', () => {
  assert.deepEqual(trainerPlaybackPlan({
    role:'A',step:3,embeddedTimekeeper:true,drumsEnabled:true,metronomeEnabled:true
  }),{ pattern:true,grooveHat:false,metronome:false });
  assert.deepEqual(trainerPlaybackPlan({
    role:'A',step:3,embeddedTimekeeper:true,drumsEnabled:false,metronomeEnabled:true
  }),{ pattern:false,grooveHat:false,metronome:true });
});

test('card auditions queue in click order and cap the sequence at three patterns', () => {
  assert.deepEqual(updateAuditionQueue([],{ activeSlot:2,slot:0 }),{ action:'queued',queue:[0] });
  assert.deepEqual(updateAuditionQueue([0],{ activeSlot:2,slot:1 }),{ action:'queued',queue:[0,1] });
  assert.deepEqual(updateAuditionQueue([0,1],{ activeSlot:2,slot:0 }),{ action:'removed',queue:[1] });
  assert.deepEqual(updateAuditionQueue([0,1],{ activeSlot:2,slot:2 }),{ action:'stop',queue:[0,1] });
  assert.deepEqual(updateAuditionQueue([0,1],{ activeSlot:2,slot:3 }),{ action:'full',queue:[0,1] });
});
