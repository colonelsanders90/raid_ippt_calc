// ---------------------------------------------------------------------------
// IPPT scoring logic — depends on MALE_REPS, MALE_RUN, FEMALE_REPS,
// FEMALE_RUN loaded from data/scoring-tables.js
// ---------------------------------------------------------------------------

function getAgeGroup(age) {
  if (age < 22) return 0;
  if (age > 60) return 13;
  return Math.floor((age - 22) / 3) + 1;
}

function getRepsPoints(reps, ageGroup, table) {
  const r = Math.max(0, Math.min(reps, table.length - 1));
  return table[r][ageGroup];
}

function getRunPoints(runSeconds, ageGroup, table) {
  for (const [t, pts] of table) {
    if (t >= runSeconds) return pts[ageGroup];
  }
  return 0;
}

function getAward(total) {
  if (total >= 85) return "Gold";
  if (total >= 75) return "Silver";
  if (total >= 51) return "Pass";
  return "Fail";
}

function computeScore(gender, age, pushups, situps, runSeconds) {
  const ag    = getAgeGroup(age);
  const table = gender === "F"
    ? { reps: FEMALE_REPS, run: FEMALE_RUN }
    : { reps: MALE_REPS,   run: MALE_RUN   };
  const puPts  = getRepsPoints(pushups, ag, table.reps);
  const suPts  = getRepsPoints(situps,  ag, table.reps);
  const runPts = getRunPoints(runSeconds, ag, table.run);
  return { puPts, suPts, runPts, total: puPts + suPts + runPts };
}
