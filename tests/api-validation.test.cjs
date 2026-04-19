/**
 * Tests for:
 *   - validatePost   (api/scores.js)   — server-side input validation
 *   - secsToMMSS     (js/sliders.js)   — seconds → "MM:SS"
 *   - mmssToSecs     (js/sliders.js)   — "MM:SS" → seconds
 *   - repsToNextPoint    (js/scoring.js) — next-point hint for reps
 *   - secsToNextRunPoint (js/scoring.js) — next-point hint for run
 *
 * Run: node tests/api-validation.test.cjs
 */

const fs = require("fs");
const vm = require("vm");

// ---------------------------------------------------------------------------
// Load validatePost from api/scores.js
// Strip the ESM import/export lines that can't run in vm, keep the pure logic.
// ---------------------------------------------------------------------------
// Extract only the constants and validatePost — skip async functions and ESM syntax.
const rawScores = fs.readFileSync(__dirname + "/../api/scores.js", "utf8");

// Pull out just the three Sets and the validatePost function by slicing between known markers.
const validationSrc = [
  rawScores.match(/const VALID_RANKS[\s\S]+?(?=\n\nconst VALID_BRANCHES)/)?.[0] ?? "",
  rawScores.match(/const VALID_BRANCHES[\s\S]+?(?=\n\nconst VALID_GENDERS)/)?.[0] ?? "",
  rawScores.match(/const VALID_GENDERS[\s\S]+?(?=\n\nfunction validatePost)/)?.[0] ?? "",
  rawScores.match(/function validatePost[\s\S]+?^\}/m)?.[0] ?? "",
].join("\n");

const { validatePost } = vm.runInNewContext(
  `(function() { ${validationSrc}; return { validatePost }; })()`, {}
);

// ---------------------------------------------------------------------------
// Load secsToMMSS + mmssToSecs from js/sliders.js
// The bind* functions reference document.getElementById but are never called
// at module load time, so no DOM mock is needed.
// ---------------------------------------------------------------------------
const slidersSrc = fs.readFileSync(__dirname + "/../js/sliders.js", "utf8");
const { secsToMMSS, mmssToSecs } = vm.runInNewContext(
  `(function() { ${slidersSrc}; return { secsToMMSS, mmssToSecs }; })()`, {}
);

// ---------------------------------------------------------------------------
// Load scoring functions + tables for next-point hint tests
// ---------------------------------------------------------------------------
const tableSrc   = fs.readFileSync(__dirname + "/../js/scoring-tables.js", "utf8");
const scoringSrc = fs.readFileSync(__dirname + "/../js/scoring.js", "utf8");
const {
  MALE_REPS, MALE_RUN, FEMALE_REPS, FEMALE_RUN,
  getRepsPoints, getRunPoints,
  repsToNextPoint, secsToNextRunPoint,
} = vm.runInNewContext(
  `(function() { ${tableSrc} ${scoringSrc}
    return { MALE_REPS, MALE_RUN, FEMALE_REPS, FEMALE_RUN,
             getRepsPoints, getRunPoints, repsToNextPoint, secsToNextRunPoint }; })()`, {}
);

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function expect(desc, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ ${desc}`);
    console.error(`      expected: ${JSON.stringify(expected)}`);
    console.error(`      got:      ${JSON.stringify(actual)}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${name}`);
  console.log("─".repeat(name.length));
}

// ---------------------------------------------------------------------------
// A valid baseline payload — mutated per test
// ---------------------------------------------------------------------------
function validPayload(overrides = {}) {
  return Object.assign({
    rank: "CPT", name: "Tan Wei Ming", gender: "M", branch: "Cyber",
    age: 28, pushups: 40, situps: 40, run: "10:00",
    puPts: 20, suPts: 20, runPts: 41, total: 81, award: "Gold",
  }, overrides);
}

// ---------------------------------------------------------------------------
// validatePost — happy path
// ---------------------------------------------------------------------------
section("validatePost — valid inputs");
expect("valid male payload → null",   validatePost(validPayload()), null);
expect("valid female payload → null", validatePost(validPayload({ gender: "F" })), null);
expect("all valid ranks accepted — LTC",  validatePost(validPayload({ rank: "LTC" })),  null);
expect("all valid ranks accepted — REC",  validatePost(validPayload({ rank: "REC" })),  null);
expect("all valid ranks accepted — 3SG",  validatePost(validPayload({ rank: "3SG" })),  null);
expect("all valid ranks accepted — MWO",  validatePost(validPayload({ rank: "MWO" })),  null);
expect("all valid branches — ACUBE",   validatePost(validPayload({ branch: "ACUBE" })),   null);
expect("all valid branches — HQ RAiD", validatePost(validPayload({ branch: "HQ RAiD" })), null);
expect("all valid branches — P4B",     validatePost(validPayload({ branch: "P4B" })),     null);
expect("boundary age 16",  validatePost(validPayload({ age: 16 })),  null);
expect("boundary age 100", validatePost(validPayload({ age: 100 })), null);
expect("boundary pushups 0",  validatePost(validPayload({ pushups: 0,  puPts: 0, total: 61 })), null);
expect("boundary pushups 60", validatePost(validPayload({ pushups: 60, puPts: 25, total: 86 })), null);
expect("boundary situps 0",   validatePost(validPayload({ situps: 0,   suPts: 0, total: 61 })), null);
expect("boundary situps 60",  validatePost(validPayload({ situps: 60,  suPts: 25, total: 86 })), null);
expect("run boundary 8:00",  validatePost(validPayload({ run: "8:00" })),  null);
expect("run boundary 30:00", validatePost(validPayload({ run: "30:00" })), null);
expect("award Silver",  validatePost(validPayload({ award: "Silver", total: 75 })), null);
expect("award Pass",    validatePost(validPayload({ award: "Pass",   total: 51 })), null);
expect("award Fail",    validatePost(validPayload({ award: "Fail",   total: 20 })), null);
expect("name with hyphen — O'Brien",   validatePost(validPayload({ name: "O'Brien" })),       null);
expect("name with apostrophe — De-Silva", validatePost(validPayload({ name: "De-Silva" })),   null);
expect("total 0",   validatePost(validPayload({ puPts: 0, suPts: 0, runPts: 0, total: 0, pushups: 0, situps: 0, award: "Fail" })), null);
expect("total 100", validatePost(validPayload({ puPts: 25, suPts: 25, runPts: 50, total: 100, pushups: 60, situps: 60, award: "Gold" })), null);

// ---------------------------------------------------------------------------
// validatePost — rank
// ---------------------------------------------------------------------------
section("validatePost — rank");
expect("missing rank (undefined)",   validatePost(validPayload({ rank: undefined })),  "Invalid rank");
expect("empty rank string",          validatePost(validPayload({ rank: "" })),         "Invalid rank");
expect("lowercase rank",             validatePost(validPayload({ rank: "cpt" })),      "Invalid rank");
expect("unknown rank BRIG",          validatePost(validPayload({ rank: "BRIG" })),     "Invalid rank");
expect("SQL injection in rank",      validatePost(validPayload({ rank: "'; DROP TABLE scores;--" })), "Invalid rank");
expect("number as rank",             validatePost(validPayload({ rank: 123 })),        "Invalid rank");

// ---------------------------------------------------------------------------
// validatePost — name
// ---------------------------------------------------------------------------
section("validatePost — name");
expect("missing name (undefined)",   validatePost(validPayload({ name: undefined })),  "Invalid name");
expect("empty name",                 validatePost(validPayload({ name: "" })),         "Invalid name");
expect("name with digits",           validatePost(validPayload({ name: "Tan123" })),   "Invalid name");
expect("name with <script> tag",     validatePost(validPayload({ name: "<script>alert(1)</script>" })), "Invalid name");
expect("name with SQL injection",    validatePost(validPayload({ name: "'; DROP TABLE scores;--" })),   "Invalid name");
expect("name exceeding 100 chars",   validatePost(validPayload({ name: "A".repeat(101) })), "Invalid name");
expect("name exactly 100 chars → ok", validatePost(validPayload({ name: "A".repeat(100) })), null);
expect("name with @ symbol",         validatePost(validPayload({ name: "john@doe" })), "Invalid name");
expect("number as name",             validatePost(validPayload({ name: 999 })),        "Invalid name");

// ---------------------------------------------------------------------------
// validatePost — gender
// ---------------------------------------------------------------------------
section("validatePost — gender");
expect("gender 'X' rejected",        validatePost(validPayload({ gender: "X" })),       "Invalid gender");
expect("lowercase 'm' rejected",     validatePost(validPayload({ gender: "m" })),       "Invalid gender");
expect("empty gender rejected",      validatePost(validPayload({ gender: "" })),        "Invalid gender");
expect("undefined gender rejected",  validatePost(validPayload({ gender: undefined })), "Invalid gender");
expect("numeric gender rejected",    validatePost(validPayload({ gender: 1 })),         "Invalid gender");

// ---------------------------------------------------------------------------
// validatePost — branch
// ---------------------------------------------------------------------------
section("validatePost — branch");
expect("unknown branch rejected",     validatePost(validPayload({ branch: "Signals" })),   "Invalid branch");
expect("empty branch rejected",       validatePost(validPayload({ branch: "" })),          "Invalid branch");
expect("undefined branch rejected",   validatePost(validPayload({ branch: undefined })),   "Invalid branch");
expect("case-sensitive: 'cyber' rejected", validatePost(validPayload({ branch: "cyber" })), "Invalid branch");
expect("SQL injection in branch",     validatePost(validPayload({ branch: "'; DROP TABLE scores;--" })), "Invalid branch");

// ---------------------------------------------------------------------------
// validatePost — age
// ---------------------------------------------------------------------------
section("validatePost — age");
expect("age 15 (below min) rejected", validatePost(validPayload({ age: 15 })),   "Invalid age");
expect("age 101 (above max) rejected",validatePost(validPayload({ age: 101 })),  "Invalid age");
expect("age 0 rejected",              validatePost(validPayload({ age: 0 })),    "Invalid age");
expect("age -1 rejected",             validatePost(validPayload({ age: -1 })),   "Invalid age");
expect("float age rejected",          validatePost(validPayload({ age: 28.5 })), "Invalid age");
expect("string age rejected",         validatePost(validPayload({ age: "28" })), "Invalid age");
expect("undefined age rejected",      validatePost(validPayload({ age: undefined })), "Invalid age");

// ---------------------------------------------------------------------------
// validatePost — pushups / situps
// ---------------------------------------------------------------------------
section("validatePost — pushups & situps");
expect("pushups -1 rejected",         validatePost(validPayload({ pushups: -1 })),  "Invalid pushups");
expect("pushups 61 rejected",         validatePost(validPayload({ pushups: 61 })),  "Invalid pushups");
expect("float pushups rejected",      validatePost(validPayload({ pushups: 30.5 })),"Invalid pushups");
expect("string pushups rejected",     validatePost(validPayload({ pushups: "30" })),"Invalid pushups");
expect("situps -1 rejected",          validatePost(validPayload({ situps: -1 })),   "Invalid situps");
expect("situps 61 rejected",          validatePost(validPayload({ situps: 61 })),   "Invalid situps");
expect("float situps rejected",       validatePost(validPayload({ situps: 30.5 })), "Invalid situps");

// ---------------------------------------------------------------------------
// validatePost — run time format
// ---------------------------------------------------------------------------
section("validatePost — run time");
expect("run '10:00' accepted",        validatePost(validPayload({ run: "10:00" })), null);
expect("run '9:59' accepted",         validatePost(validPayload({ run: "9:59" })),  null);
expect("run '8:00' accepted",         validatePost(validPayload({ run: "8:00" })),  null);
expect("run ':00' rejected",          validatePost(validPayload({ run: ":00" })),   "Invalid run time");
expect("run '10:60' rejected",        validatePost(validPayload({ run: "10:60" })), "Invalid run time");
expect("run '10:5' rejected",         validatePost(validPayload({ run: "10:5" })),  "Invalid run time");
expect("run '1000' (no colon) rejected", validatePost(validPayload({ run: "1000" })), "Invalid run time");
expect("run '' rejected",             validatePost(validPayload({ run: "" })),      "Invalid run time");
expect("run undefined rejected",      validatePost(validPayload({ run: undefined })), "Invalid run time");
expect("run with script tag rejected", validatePost(validPayload({ run: "<script>" })), "Invalid run time");
expect("run number rejected",         validatePost(validPayload({ run: 600 })),     "Invalid run time");

// ---------------------------------------------------------------------------
// validatePost — points and totals
// ---------------------------------------------------------------------------
section("validatePost — points & total");
expect("puPts -1 rejected",    validatePost(validPayload({ puPts: -1 })),   "Invalid puPts");
expect("puPts 26 rejected",    validatePost(validPayload({ puPts: 26 })),   "Invalid puPts");
expect("puPts float rejected", validatePost(validPayload({ puPts: 1.5 })),  "Invalid puPts");
expect("suPts -1 rejected",    validatePost(validPayload({ suPts: -1 })),   "Invalid suPts");
expect("suPts 26 rejected",    validatePost(validPayload({ suPts: 26 })),   "Invalid suPts");
expect("runPts -1 rejected",   validatePost(validPayload({ runPts: -1 })),  "Invalid runPts");
expect("runPts 51 rejected",   validatePost(validPayload({ runPts: 51 })),  "Invalid runPts");
expect("total -1 rejected",    validatePost(validPayload({ total: -1 })),   "Invalid total");
expect("total 101 rejected",   validatePost(validPayload({ total: 101 })),  "Invalid total");
expect("total float rejected",  validatePost(validPayload({ total: 80.5 })), "Invalid total");
expect("award 'Platinum' rejected", validatePost(validPayload({ award: "Platinum" })), "Invalid award");
expect("award '' rejected",         validatePost(validPayload({ award: "" })),         "Invalid award");
expect("award undefined rejected",  validatePost(validPayload({ award: undefined })),  "Invalid award");
expect("award lowercase rejected",  validatePost(validPayload({ award: "gold" })),     "Invalid award");

// ---------------------------------------------------------------------------
// secsToMMSS
// ---------------------------------------------------------------------------
section("secsToMMSS(secs)");
expect("0s   → '0:00'",  secsToMMSS(0),   "0:00");
expect("60s  → '1:00'",  secsToMMSS(60),  "1:00");
expect("65s  → '1:05'",  secsToMMSS(65),  "1:05");
expect("90s  → '1:30'",  secsToMMSS(90),  "1:30");
expect("510s → '8:30'",  secsToMMSS(510), "8:30");
expect("600s → '10:00'", secsToMMSS(600), "10:00");
expect("780s → '13:00'", secsToMMSS(780), "13:00");
expect("599s → '9:59'",  secsToMMSS(599), "9:59");
expect("string '600' coerced → '10:00'", secsToMMSS("600"), "10:00");

// ---------------------------------------------------------------------------
// mmssToSecs
// ---------------------------------------------------------------------------
section("mmssToSecs(str)");
expect("'0:00'  → 0",   mmssToSecs("0:00"),  0);
expect("'1:00'  → 60",  mmssToSecs("1:00"),  60);
expect("'1:05'  → 65",  mmssToSecs("1:05"),  65);
expect("'8:30'  → 510", mmssToSecs("8:30"),  510);
expect("'10:00' → 600", mmssToSecs("10:00"), 600);
expect("'9:59'  → 599", mmssToSecs("9:59"),  599);
expect("'99:59' → 5999",mmssToSecs("99:59"), 5999);
// Invalid inputs → NaN
expect("'' → NaN",           isNaN(mmssToSecs("")),          true);
expect("'10:60' → NaN",      isNaN(mmssToSecs("10:60")),     true);  // seconds ≥ 60
expect("'10:5' → NaN",       isNaN(mmssToSecs("10:5")),      true);  // single-digit seconds
expect("'abc' → NaN",        isNaN(mmssToSecs("abc")),       true);
expect("'1000' → NaN",       isNaN(mmssToSecs("1000")),      true);  // no colon
expect("':30' → NaN",        isNaN(mmssToSecs(":30")),       true);  // empty minutes
expect("null → NaN",         isNaN(mmssToSecs(null)),        true);
expect("undefined → NaN",    isNaN(mmssToSecs(undefined)),   true);
expect("number 600 → NaN",   isNaN(mmssToSecs(600)),         true);

// ---------------------------------------------------------------------------
// repsToNextPoint
// ---------------------------------------------------------------------------
section("repsToNextPoint(reps, ageGroup, table)");

// At max — return null
expect("60 reps, age 0  → null (already max 25)", repsToNextPoint(60, 0,  MALE_REPS), null);
expect("60 reps, age 13 → null (already max 25)", repsToNextPoint(60, 13, MALE_REPS), null);

// Verify return value is consistent with getRepsPoints
// 14 reps age 0 = 0 pts; 15 reps age 0 = 1 pt → need 1 more rep
expect("14 reps age 0 → 1 more rep for first point", repsToNextPoint(14, 0, MALE_REPS), 1);

// The returned delta should actually yield a higher point value
for (const [reps, ag] of [[0,0],[10,0],[20,3],[30,13],[14,0],[25,5]]) {
  const delta = repsToNextPoint(reps, ag, MALE_REPS);
  if (delta !== null) {
    const before = getRepsPoints(reps,         ag, MALE_REPS);
    const after  = getRepsPoints(reps + delta, ag, MALE_REPS);
    expect(
      `repsToNextPoint(${reps}, ${ag}): adding delta gives +pts`,
      after > before,
      true
    );
    // and delta-1 should NOT yield a higher point (it's the minimum delta)
    if (delta > 1) {
      const oneShort = getRepsPoints(reps + delta - 1, ag, MALE_REPS);
      expect(
        `repsToNextPoint(${reps}, ${ag}): delta-1 is not enough`,
        oneShort <= before,
        true
      );
    }
  }
}

// Same for female table
expect("female 50 reps age 0 → null (max 25)", repsToNextPoint(50, 0, FEMALE_REPS), null);
{
  const delta = repsToNextPoint(0, 0, FEMALE_REPS);
  expect("female 0 reps age 0 → positive delta", delta !== null && delta > 0, true);
}

// ---------------------------------------------------------------------------
// secsToNextRunPoint
// ---------------------------------------------------------------------------
section("secsToNextRunPoint(runSeconds, ageGroup, table)");

// At max speed → null
expect("480s (8:00) age 0  → null (already 50 pts)", secsToNextRunPoint(480, 0,  MALE_RUN), null);
expect("510s (8:30) age 0  → null (already 50 pts)", secsToNextRunPoint(510, 0,  MALE_RUN), null);
expect("510s (8:30) age 13 → null (already 50 pts)", secsToNextRunPoint(510, 13, MALE_RUN), null);

// Very slow — already 0 pts, no way to gain (below any threshold)
// 99999s returns 0 pts. The function should return something (the nearest faster threshold).
{
  const delta = secsToNextRunPoint(1200, 0, MALE_RUN); // 20:00 → 0 pts for age 0
  expect("1200s age 0 (0 pts) → some delta or null, not an error", delta === null || typeof delta === 'number', true);
}

// Verify consistency: cutting the returned delta should yield more points
for (const [secs, ag] of [[600,0],[780,0],[900,0],[600,3],[1000,13]]) {
  const delta = secsToNextRunPoint(secs, ag, MALE_RUN);
  if (delta !== null) {
    const before = getRunPoints(secs,        ag, MALE_RUN);
    const after  = getRunPoints(secs - delta, ag, MALE_RUN);
    expect(
      `secsToNextRunPoint(${secs}, ${ag}): cutting delta gives +pts`,
      after > before,
      true
    );
  }
}

// Female run table has different thresholds
{
  const delta = secsToNextRunPoint(900, 0, FEMALE_RUN);
  expect("female run 900s age 0 → delta or null (no error)", delta === null || typeof delta === 'number', true);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
