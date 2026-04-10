/**
 * Seed script — posts mock entries to the live /api/scores endpoint.
 *
 * Usage:
 *   node scripts/seed.mjs https://your-vercel-url.vercel.app
 *
 * The URL argument is required so you can target staging or production.
 */

// ---------------------------------------------------------------------------
// Scoring helpers (mirrors js/scoring.js — no browser globals needed)
// ---------------------------------------------------------------------------

// Inline age-group + run-point lookup so we don't have to import browser files.
// Points are calculated via the same logic as scoring.js but we just POST
// pre-calculated values, so we use a simple approximation table here.
// For accurate points, replace with the real table data.

// ---------------------------------------------------------------------------
// Mock roster
// ---------------------------------------------------------------------------

const RANKS    = ['REC', 'PTE', 'CPL', '3SG', '2SG', '1SG', 'SSG',
                  '2LT', 'LTA', 'CPT', 'MAJ', 'LTC', 'SLTC', 'COL'];
const BRANCHES = ['ACUBE', 'Cloud', 'Cyber', 'IKC2', 'MDT', 'RDO', 'P4B', 'HQ RAiD'];

const NAMES = [
  'Tan Wei Ming', 'Lee Jun Hao', 'Lim Kai Xiang', 'Ng Boon Kiat', 'Chua Zhi Wei',
  'Wong Jia Hao', 'Goh Wei Liang', 'Ong Kah Seng', 'Teo Rui Feng', 'Koh Jun Wei',
  'Seah Beng Kiat', 'Yeo Zhen Yang', 'Phua Jin Long', 'Chew Wei Hao', 'Soh Kai Lin',
  'Ho Xiu Ying',   'Chen Mei Ling', 'Lam Jia Xin',  'Tay Hui Min',  'Sim Sze Ying',
];

// [pushups, situps, runMM, runSS, puPts, suPts, runPts] for male age 22–30
const MALE_SAMPLES = [
  [60, 60,  8, 30, 25, 25, 50],  // Perfect 100
  [55, 55,  9,  0, 25, 25, 49],  // 99
  [50, 50,  9, 30, 24, 24, 47],  // ~95
  [45, 45, 10,  0, 22, 22, 46],  // ~90
  [40, 40, 10, 30, 20, 20, 45],  // ~85 Gold
  [38, 38, 11,  0, 19, 19, 43],  // ~81
  [35, 35, 11, 30, 18, 18, 41],  // ~77 Silver
  [32, 32, 12,  0, 16, 16, 39],  // ~71
  [28, 28, 13,  0, 13, 13, 35],  // ~61 Pass
  [24, 24, 14,  0, 10, 10, 31],  // ~51 borderline Pass
  [20, 20, 15,  0,  6,  6, 26],  // ~38 Fail
  [15, 15, 17,  0,  1,  1, 10],  // ~12 Fail
];

const FEMALE_SAMPLES = [
  [40, 40, 11,  0, 25, 25, 50],  // 100
  [35, 35, 11, 30, 25, 25, 48],
  [30, 30, 12,  0, 23, 23, 46],
  [25, 25, 13,  0, 20, 20, 43],
  [22, 22, 14,  0, 17, 17, 40],
  [18, 18, 15,  0, 12, 12, 35],
  [15, 15, 16,  0,  8,  8, 27],
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getAward(total) {
  if (total >= 85) return 'Gold';
  if (total >= 75) return 'Silver';
  if (total >= 51) return 'Pass';
  return 'Fail';
}

function buildEntry(i) {
  const name   = NAMES[i % NAMES.length];
  const rank   = pick(RANKS);
  const branch = pick(BRANCHES);
  const gender = Math.random() < 0.8 ? 'M' : 'F';
  const age    = randInt(18, 55);
  const sample = pick(gender === 'F' ? FEMALE_SAMPLES : MALE_SAMPLES);

  const [pushups, situps, mm, ss, puPts, suPts, runPts] = sample;
  const run   = `${mm}:${String(ss).padStart(2, '0')}`;
  const total = puPts + suPts + runPts;

  return { rank, name, branch, gender, age, pushups, situps, run, puPts, suPts, runPts, total, award: getAward(total) };
}

// ---------------------------------------------------------------------------
// POST entries
// ---------------------------------------------------------------------------

const BASE_URL = process.argv[2]?.replace(/\/$/, '');
if (!BASE_URL) {
  console.error('Usage: node scripts/seed.mjs <base-url>');
  console.error('  e.g. node scripts/seed.mjs https://raid-ippt-calc.vercel.app');
  process.exit(1);
}

const COUNT = parseInt(process.argv[3] ?? '15', 10);
console.log(`Seeding ${COUNT} entries → ${BASE_URL}/api/scores\n`);

let ok = 0, fail = 0;
for (let i = 0; i < COUNT; i++) {
  const entry = buildEntry(i);
  try {
    const res  = await fetch(`${BASE_URL}/api/scores`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(entry),
    });
    if (res.ok) {
      const row = await res.json();
      console.log(`  ✓ #${row.id}  ${entry.rank} ${entry.name.padEnd(18)} ${entry.award} (${entry.total})`);
      ok++;
    } else {
      const text = await res.text();
      console.error(`  ✗ ${entry.name}: HTTP ${res.status} — ${text}`);
      fail++;
    }
  } catch (e) {
    console.error(`  ✗ ${entry.name}: ${e.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} inserted, ${fail} failed.`);
