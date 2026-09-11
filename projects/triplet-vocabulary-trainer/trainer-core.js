export const TRIPLET_MASKS = Object.freeze(['000','001','010','011','100','101','110','111']);
export const EXTENDED_PATTERNS = Object.freeze([
  Object.freeze(['A','B','B','A','B','A']),
  Object.freeze(['A','B','A','A','B','A']),
  Object.freeze(['A','A','B','A','B','A']),
  Object.freeze(['R','A','B','A','B','B']),
  Object.freeze(['R','A','B','A','B','A']),
  Object.freeze(['R','A','B','A','A','B']),
  Object.freeze(['R','B','A','A','B','B']),
  Object.freeze(['R','B','A','B','B','A']),
  Object.freeze(['R','B','A','A','B','A'])
]);
export function randomChoiceWithEmphasis(choices,emphasized = null,random = Math.random) {
  if (!choices.length) throw new Error('At least one choice must be enabled.');
  if (!choices.includes(emphasized) || choices.length === 1) {
    return choices[Math.floor(random()*choices.length)];
  }
  if (random() < .5) return emphasized;
  const alternatives = choices.filter(choice => choice !== emphasized);
  return alternatives[Math.floor(random()*alternatives.length)];
}

export function randomExtendedPatternPair(enabledIndexes,random = Math.random,emphasized = null) {
  const firstHalf = enabledIndexes.filter(index => index >= 0 && index < 3);
  const secondHalf = enabledIndexes.filter(index => index >= 3 && index < EXTENDED_PATTERNS.length);
  if (!firstHalf.length || !secondHalf.length) throw new Error('Extended mode needs at least one pattern in each group.');
  return [
    randomChoiceWithEmphasis(firstHalf,emphasized,random),
    randomChoiceWithEmphasis(secondHalf,emphasized,random)
  ];
}

export function rolesForExtendedBar(patternIndexes) {
  return patternIndexes.flatMap(index => EXTENDED_PATTERNS[index]);
}

export function rolesForTripletMasks(masks) {
  return masks.flatMap(mask => [...mask].map(bit => bit === '1' ? 'A' : 'B'));
}

export function recoveryPulseRoles(stepCount) {
  return Array.from({ length:stepCount },(_,step) => step%3 === 0 ? 'A' : 'R');
}

export function shouldQueueRecovery(lastSuccessfulHitTime,now,quarterNoteSeconds,tripletCount = 4) {
  const elapsed = Number(now)-Number(lastSuccessfulHitTime);
  const threshold = Number(quarterNoteSeconds)*Number(tripletCount);
  return Number.isFinite(elapsed) && Number.isFinite(threshold) && threshold > 0 && elapsed >= threshold;
}

export function randomTripletMasks(enabledMasks,count,random = Math.random,emphasized = null) {
  if (!enabledMasks.length) throw new Error('At least one triplet must be enabled.');
  return Array.from({ length:count },() => randomChoiceWithEmphasis(enabledMasks,emphasized,random));
}

export function createPracticeScore() {
  return { hits:0,misses:0,streak:0,bestStreak:0,totalAbsoluteError:0 };
}

export function practiceTimingWindowSeconds(subdivisionSeconds) {
  return Math.max(.045,Math.min(.12,Number(subdivisionSeconds)*.35));
}

export function practiceTimingWindows(subdivisionSeconds) {
  const symmetricWindow = practiceTimingWindowSeconds(subdivisionSeconds);
  const totalWindow = Math.min(.21,symmetricWindow*2+.02);
  return {
    early: totalWindow/3,
    late: totalWindow*2/3
  };
}

function timingWindows(windowSeconds) {
  if (typeof windowSeconds === 'number') return { early:windowSeconds,late:windowSeconds };
  return {
    early:Number(windowSeconds?.early) || 0,
    late:Number(windowSeconds?.late) || 0
  };
}

export function midiPracticeHitAccepted(note,velocity,{ ignoreFeet = true,ignoreGhosts = true,ghostVelocity = 16,normalVelocity = 64 } = {}) {
  if (ignoreFeet && [35,36,44].includes(Number(note))) return false;
  const ghostCutoff = (Number(ghostVelocity)+Number(normalVelocity))/2;
  if (ignoreGhosts && Number(velocity) < ghostCutoff) return false;
  return Number(velocity) > 0;
}

export function practiceTouchExceededThreshold(startX,startY,currentX,currentY,threshold = 18) {
  return Math.hypot(Number(currentX)-Number(startX),Number(currentY)-Number(startY)) >= threshold;
}

export function practiceAccuracy(score) {
  const attempts = score.hits+score.misses;
  return attempts ? (score.hits/attempts)*100 : 100;
}

export function expirePracticeTargets(expectedHits,now,windowSeconds) {
  const { late } = timingWindows(windowSeconds);
  let expired = 0;
  expectedHits.forEach(expected => {
    if (expected.matched || expected.expired || now <= expected.time+late) return;
    expected.expired = true;
    expired += 1;
  });
  return expired;
}

export function commitPracticeMisses(score,count) {
  const misses = Math.max(0,Math.floor(Number(count) || 0));
  if (!misses) return 0;
  score.misses += misses;
  score.streak = 0;
  return misses;
}

export function expirePracticeHits(score,expectedHits,now,windowSeconds) {
  return commitPracticeMisses(score,expirePracticeTargets(expectedHits,now,windowSeconds));
}

export function scorePracticeTap(score,expectedHits,time,windowSeconds) {
  const { early,late } = timingWindows(windowSeconds);
  let closest = null;
  let closestError = Infinity;
  expectedHits.forEach(expected => {
    if (expected.matched || expected.expired) return;
    const error = time-expected.time;
    if (error >= -early && error <= late && Math.abs(error) < Math.abs(closestError)) {
      closest = expected;
      closestError = error;
    }
  });

  if (!closest) {
    score.misses += 1;
    score.streak = 0;
    return { kind:'miss',errorSeconds:null,expected:null };
  }

  closest.matched = true;
  score.hits += 1;
  score.streak += 1;
  score.bestStreak = Math.max(score.bestStreak,score.streak);
  score.totalAbsoluteError += Math.abs(closestError);
  return { kind:'hit',errorSeconds:closestError,expected:closest };
}
