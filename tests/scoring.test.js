/**
 * IPPT Scoring Logic — Node.js test suite
 * Run: node tests/scoring.test.js
 */

const fs = require("fs");
const vm = require("vm");

// Wrap source in an IIFE so `const` declarations are in scope for the return
const src = fs.readFileSync(__dirname + "/../data/scoring-tables.js", "utf8");
const wrapped = `(function() { ${src}
  return { getAgeGroup, getRepsPoints, getRunPoints, getAward, computeScore,
           MALE_REPS, MALE_RUN, FEMALE_REPS, FEMALE_RUN };
})()`;

const {
  getAgeGroup,
  getRepsPoints,
  getRunPoints,
  getAward,
  computeScore,
  MALE_REPS,
  MALE_RUN,
  FEMALE_REPS,
  FEMALE_RUN,
} = vm.runInNewContext(wrapped, {});

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function expect(description, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    console.error(`      expected: ${expected}`);
    console.error(`      got:      ${actual}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${name}`);
  console.log("─".repeat(name.length));
}

// ---------------------------------------------------------------------------
// getAgeGroup
// ---------------------------------------------------------------------------
section("getAgeGroup(age)");
expect("age 0  → group 0 (under 22)",   getAgeGroup(0),  0);
expect("age 18 → group 0 (under 22)",   getAgeGroup(18), 0);
expect("age 21 → group 0 (under 22)",   getAgeGroup(21), 0);
expect("age 22 → group 1 (22–24)",      getAgeGroup(22), 1);
expect("age 24 → group 1 (22–24)",      getAgeGroup(24), 1);
expect("age 25 → group 2 (25–27)",      getAgeGroup(25), 2);
expect("age 27 → group 2 (25–27)",      getAgeGroup(27), 2);
expect("age 28 → group 3 (28–30)",      getAgeGroup(28), 3);
expect("age 30 → group 3 (28–30)",      getAgeGroup(30), 3);
expect("age 31 → group 4 (31–33)",      getAgeGroup(31), 4);
expect("age 45 → group 8 (43–45)",      getAgeGroup(45), 8);
expect("age 55 → group 12 (55–57)",     getAgeGroup(55), 12);
expect("age 58 → group 13 (58–60)",     getAgeGroup(58), 13);
expect("age 60 → group 13 (58–60)",     getAgeGroup(60), 13);
expect("age 61 → group 13 (capped)",    getAgeGroup(61), 13);
expect("age 99 → group 13 (capped)",    getAgeGroup(99), 13);

// ---------------------------------------------------------------------------
// getRepsPoints — Male table
// ---------------------------------------------------------------------------
section("getRepsPoints(reps, ageGroup, MALE_REPS)");
expect("0 reps, any age → 0",            getRepsPoints(0,  0,  MALE_REPS), 0);
expect("60 reps, age grp 0 → 25",        getRepsPoints(60, 0,  MALE_REPS), 25);
expect("60 reps, age grp 13 → 25",       getRepsPoints(60, 13, MALE_REPS), 25);
expect("15 reps, age grp 0 (<22) → 1",   getRepsPoints(15, 0,  MALE_REPS), 1);
expect("15 reps, age grp 1 (22–24) → 2", getRepsPoints(15, 1,  MALE_REPS), 2);
expect("15 reps, age grp 13 (58–60) → 12",getRepsPoints(15, 13, MALE_REPS), 12);
expect("30 reps, age grp 0 → 13",        getRepsPoints(30, 0,  MALE_REPS), 13);
expect("30 reps, age grp 3 (28–30) → 15",getRepsPoints(30, 3,  MALE_REPS), 15);
expect("30 reps, age grp 13 (58–60) → 21",getRepsPoints(30, 13, MALE_REPS), 21);
// Clamping: reps above 60 should give max points
expect("reps 100 clamped to 60 → 25",    getRepsPoints(100, 0, MALE_REPS), 25);
// Boundary: reps just below a threshold
expect("14 reps, age grp 0 → 0",         getRepsPoints(14, 0,  MALE_REPS), 0);
expect("15 reps, age grp 0 → 1",         getRepsPoints(15, 0,  MALE_REPS), 1); // min to score for <22

// ---------------------------------------------------------------------------
// getRunPoints — Male table
// ---------------------------------------------------------------------------
section("getRunPoints(seconds, ageGroup, MALE_RUN)");
// Faster than fastest row → max points
expect("8:00 (480s) age grp 0 → 50",   getRunPoints(480,  0,  MALE_RUN), 50);
// Exact row hits
expect("8:30 (510s) age grp 0 → 50",   getRunPoints(510,  0,  MALE_RUN), 50);
expect("8:30 (510s) age grp 13 → 50",  getRunPoints(510,  13, MALE_RUN), 50);
expect("8:40 (520s) age grp 0 → 49",   getRunPoints(520,  0,  MALE_RUN), 49);
expect("8:50 (530s) age grp 0 → 48",   getRunPoints(530,  0,  MALE_RUN), 48);
// Between rows → rounds up to next slower row
expect("8:31 age grp 0 → 49 (falls into 8:40 band)", getRunPoints(511, 0, MALE_RUN), 49);
expect("9:45 (585s) age grp 0 → 42",   getRunPoints(585,  0,  MALE_RUN), 42); // 9:50 row
expect("10:00 (600s) age grp 0 → 41",  getRunPoints(600,  0,  MALE_RUN), 41);
expect("10:00 (600s) age grp 3 → 45",  getRunPoints(600,  3,  MALE_RUN), 45);
expect("18:20 (1100s) age grp 13 → 1", getRunPoints(1100, 13, MALE_RUN), 1);
expect("18:20 (1100s) age grp 0 → 0",  getRunPoints(1100, 0,  MALE_RUN), 0);
// Slower than all rows → 0
expect("20:00 (1200s) age grp 0 → 0",  getRunPoints(1200, 0,  MALE_RUN), 0);
expect("20:00 (1200s) age grp 13 → 0", getRunPoints(1200, 13, MALE_RUN), 0);

// ---------------------------------------------------------------------------
// getAward
// ---------------------------------------------------------------------------
section("getAward(total)");
expect("100 → Gold",   getAward(100), "Gold");
expect("85  → Gold",   getAward(85),  "Gold");
expect("84  → Silver", getAward(84),  "Silver");
expect("75  → Silver", getAward(75),  "Silver");
expect("74  → Pass",   getAward(74),  "Pass");
expect("51  → Pass",   getAward(51),  "Pass");
expect("50  → Fail",   getAward(50),  "Fail");
expect("0   → Fail",   getAward(0),   "Fail");

// ---------------------------------------------------------------------------
// computeScore — integration
// ---------------------------------------------------------------------------
section("computeScore(gender, age, pushups, situps, runSeconds)");

// Perfect score: male age 22, max reps, fastest run
{
  const r = computeScore("M", 22, 60, 60, 510);
  expect("perfect male: puPts=25",    r.puPts,  25);
  expect("perfect male: suPts=25",    r.suPts,  25);
  expect("perfect male: runPts=50",   r.runPts, 50);
  expect("perfect male: total=100",   r.total,  100);
}

// Age-adjusted: male age 30 (group 3), 30 reps each, 13:00 run
{
  // 30 reps, group 3 → 15 (from MALE_REPS[30][3])
  // 13:00 = 780s, group 3 → MALE_RUN row 780 → [27,28,29,31,...][3] = 31
  const r = computeScore("M", 30, 30, 30, 780);
  expect("male age 30, 30 reps: puPts=15",  r.puPts,  15);
  expect("male age 30, 30 reps: suPts=15",  r.suPts,  15);
  expect("male age 30, 13:00 run: runPts=31", r.runPts, 31);
  expect("male age 30 total=61",             r.total,  61);
}

// Older age group benefits: male age 55 (group 12), same 30 reps, same run
{
  // 30 reps, group 12 → MALE_REPS[30][12] = 20
  // 780s, group 12 → MALE_RUN row 780 → [27,28,29,31,32,33,34,35,35,36,36,37,37,38][12] = 37
  const r = computeScore("M", 55, 30, 30, 780);
  expect("male age 55, 30 reps: puPts=20",    r.puPts,  20);
  expect("male age 55, 30 reps: suPts=20",    r.suPts,  20);
  expect("male age 55, 13:00 run: runPts=37", r.runPts, 37);
  expect("male age 55 total=77",              r.total,  77);
}

// Under-22: male age 20, 15 reps each (minimum to score), 16:00 run (very slow)
{
  // 15 reps, group 0 → 1
  // 960s (16:00), group 0 → MALE_RUN row 960 → [1,...][0] = 1
  const r = computeScore("M", 20, 15, 15, 960);
  expect("male age 20, 15 reps: puPts=1",    r.puPts,  1);
  expect("male age 20, 15 reps: suPts=1",    r.suPts,  1);
  expect("male age 20, 16:00 run: runPts=1", r.runPts, 1);
  expect("male age 20 total=3",              r.total,  3);
}

// Zero effort: 0 reps, too slow to score
{
  const r = computeScore("M", 25, 0, 0, 9999);
  expect("0 reps, DNF: total=0", r.total, 0);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
