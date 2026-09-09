export const TRIPLET_MASKS = Object.freeze(['000','001','010','011','100','101','110','111']);

export function rolesForTripletMasks(masks) {
  return masks.flatMap(mask => [...mask].map(bit => bit === '1' ? 'A' : 'B'));
}

export function randomTripletMasks(enabledMasks,count,random = Math.random) {
  if (!enabledMasks.length) throw new Error('At least one triplet must be enabled.');
  return Array.from({ length:count },() => enabledMasks[Math.floor(random()*enabledMasks.length)]);
}

export function createPracticeScore() {
  return { hits:0,misses:0,streak:0,bestStreak:0,totalAbsoluteError:0 };
}

export function practiceTimingWindowSeconds(subdivisionSeconds) {
  return Math.max(.045,Math.min(.12,Number(subdivisionSeconds)*.35));
}

export function practiceAccuracy(score) {
  const attempts = score.hits+score.misses;
  return attempts ? (score.hits/attempts)*100 : 100;
}

export function expirePracticeHits(score,expectedHits,now,windowSeconds) {
  let expired = 0;
  expectedHits.forEach(expected => {
    if (expected.matched || expected.expired || now <= expected.time+windowSeconds) return;
    expected.expired = true;
    score.misses += 1;
    score.streak = 0;
    expired += 1;
  });
  return expired;
}

export function scorePracticeTap(score,expectedHits,time,windowSeconds) {
  let closest = null;
  let closestError = Infinity;
  expectedHits.forEach(expected => {
    if (expected.matched || expected.expired) return;
    const error = time-expected.time;
    if (Math.abs(error) <= windowSeconds && Math.abs(error) < Math.abs(closestError)) {
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
