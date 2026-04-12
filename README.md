# RAiD IPPT Calculator & Leaderboard

A unit leaderboard and IPPT score calculator for regulars, NSFs, and NSmen from partner units. Built as a vanilla HTML/CSS/JS SPA, deployed on Vercel with a Neon Postgres database.

---

## Features

- **Leaderboard** — ranked table of all submitted scores with award badges, sorted by total
- **By Age Group view** — grouped rankings that account for SAF's age-adjusted scoring
- **By Branch view** — rankings grouped by sub-unit, sorted by average score with medal tiers
- **Calculator** — live score estimator: sliders + typed inputs, no data stored
- **Next-point hints** — shows exactly how many more reps or seconds are needed for the next point
- **Award targets** — progress bars showing distance to Gold (85), Silver (75), Pass (51)
- **Cash incentive display** — shows $300 (Gold) or $200 (Silver) when achieved
- **Dark/light theme** — follows system preference, manually overridable
- **Mobile responsive** — optimised column priority on small screens
- **Admin deletes** — password-gated row deletion via `X-Admin-Password` header

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) — no framework, no bundler |
| Backend | Vercel Serverless Functions (ESM) |
| Database | Neon Postgres (serverless) via `@neondatabase/serverless` |
| Hosting | Vercel |

---

## Project Structure

```
raid_ippt_calc/
├── api/
│   ├── scores.js          # GET (list) + POST (add entry) — serverless function
│   └── scores/
│       └── [id].js        # DELETE (admin-gated) — serverless function
│
├── assets/
│   └── images/
│       ├── White RAiD (Reg).svg   # Logo for dark mode
│       └── Black RAiD (Reg).svg   # Logo for light mode
│
├── css/
│   ├── base.css           # CSS custom properties (theme variables), reset, body
│   ├── layout.css         # Header, nav, cards, page layout
│   ├── form.css           # Inputs, selects, sliders, scroller fields, button
│   ├── table.css          # Table, badges, branch pill, group headers, mobile hiding
│   ├── chart.css          # Pie chart SVG and legend
│   └── calculator.css     # Safety card, score block, station cards, award target rows
│
├── js/
│   ├── scoring-tables.js  # Raw IPPT lookup tables (MALE_REPS, MALE_RUN, FEMALE_REPS, FEMALE_RUN)
│   ├── scoring.js         # Pure scoring functions — no DOM, no API
│   ├── sliders.js         # Shared slider ↔ display input sync utilities
│   ├── theme.js           # Dark/light theme toggle, system preference sync
│   ├── api.js             # Fetch wrappers for /api/scores (GET, POST, DELETE)
│   ├── leaderboard.js     # Table render, form submit, delete, pie chart, view toggle
│   └── calculator.js      # Live score estimation, safety quotes, next-point hints
│
├── scripts/
│   └── seed.mjs           # Mock data seeder — POSTs entries to the live API
│
├── tests/
│   └── scoring.test.cjs   # 87 unit tests for all pure scoring functions
│
├── index.html             # Single-page app shell — all three page views
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Vercel](https://vercel.com) account
- A [Neon](https://neon.tech) Postgres database

### Local Development

Vercel's local dev server handles both static files and serverless functions:

```bash
npm install -g vercel
vercel dev
```

Then open `http://localhost:3000`.

> The app is static HTML — you can also open `index.html` directly in a browser for frontend-only work, but API calls will fail without `vercel dev`.

### Environment Variables

Set these in your Vercel project dashboard (Settings → Environment Variables):

| Variable | Description |
|---|---|
| `POSTGRES_URL` | Neon connection string (from the Neon dashboard) |
| `ADMIN_PASSWORD` | Password required to delete leaderboard entries |
| `ALLOWED_ORIGIN` | Your production URL e.g. `https://raid-ippt-calc.vercel.app` — restricts CORS to this origin only |

For local dev, run `vercel env pull .env.local` to pull them down.

### Running Tests

```bash
node tests/scoring.test.cjs
```

87 tests covering `getAgeGroup`, `getRepsPoints`, `getRunPoints`, `getAward`, and `computeScore` across all boundary conditions.

---

## API Reference

### `GET /api/scores`

Returns all leaderboard entries ordered by total score descending.

**Response** `200 OK`
```json
[
  {
    "id": 1,
    "rank": "CPT",
    "name": "Tan Wei Ming",
    "branch": "Cyber",
    "gender": "M",
    "age": 28,
    "pushups": 50,
    "situps": 50,
    "run": "9:30",
    "puPts": 24,
    "suPts": 24,
    "runPts": 47,
    "total": 95,
    "award": "Gold",
    "createdAt": "2026-04-11T08:00:00.000Z"
  }
]
```

---

### `POST /api/scores`

Adds a new leaderboard entry. All fields are validated server-side.

**Request body**
```json
{
  "rank": "CPT",
  "name": "Tan Wei Ming",
  "branch": "Cyber",
  "gender": "M",
  "age": 28,
  "pushups": 50,
  "situps": 50,
  "run": "9:30",
  "puPts": 24,
  "suPts": 24,
  "runPts": 47,
  "total": 95,
  "award": "Gold"
}
```

**Validation rules**
| Field | Rule |
|---|---|
| `rank` | Must be a valid SAF rank from the allowlist |
| `name` | Letters, spaces, hyphens, apostrophes only — max 100 chars |
| `gender` | `M` or `F` |
| `branch` | One of: `ACUBE`, `Cloud`, `Cyber`, `IKC2`, `MDT`, `RDO`, `P4B`, `HQ RAiD` |
| `age` | Integer 16–100 |
| `pushups` / `situps` | Integer 0–60 |
| `run` | `MM:SS` format |
| `puPts` / `suPts` | Integer 0–25 |
| `runPts` | Integer 0–50 |
| `total` | Integer 0–100 |
| `award` | `Gold`, `Silver`, `Pass`, or `Fail` |

**Response** `201 Created` — returns the inserted row.

**Error** `400 Bad Request` — returns `{ "error": "<reason>" }` for validation failures.

---

### `DELETE /api/scores/:id`

Deletes a leaderboard entry. Admin-gated.

**Headers**
```
X-Admin-Password: <your admin password>
```

**Response** `200 OK` — `{ "deleted": true }`

**Errors**
- `401 Unauthorized` — wrong or missing password
- `404 Not Found` — no entry with that ID

---

## Seeding Mock Data

Use the seed script to populate the leaderboard for testing:

```bash
node scripts/seed.mjs https://your-project.vercel.app
```

Optional second argument sets the number of entries (default: 15):

```bash
node scripts/seed.mjs https://your-project.vercel.app 30
```

---

## IPPT Scoring Logic

Scores are computed in `js/scoring.js` against lookup tables in `js/scoring-tables.js`.

| Station | Max points |
|---|---|
| Push-ups | 25 |
| Sit-ups | 25 |
| 2.4km Run | 50 |
| **Total** | **100** |

**Age groups** — 14 bands from Under-22 to 58–60. Older groups have lower pass thresholds, so the same number of reps or the same run time scores more points at higher ages.

**Award thresholds**

| Award | Score |
|---|---|
| Gold | ≥ 85 |
| Silver | ≥ 75 |
| Pass | ≥ 51 |
| Fail | < 51 |

**Cash incentives** — Gold: $300 · Silver: $200 (displayed in Calculator when achieved)

---

## Database Schema

```sql
CREATE TABLE scores (
  id         SERIAL PRIMARY KEY,
  rank       VARCHAR(10)  NOT NULL,
  name       VARCHAR(100) NOT NULL,
  branch     VARCHAR(30)  DEFAULT 'HQ RAiD',
  gender     CHAR(1)      NOT NULL,
  age        INTEGER      NOT NULL,
  pushups    INTEGER      NOT NULL,
  situps     INTEGER      NOT NULL,
  run        VARCHAR(10)  NOT NULL,
  pu_pts     INTEGER      NOT NULL,
  su_pts     INTEGER      NOT NULL,
  run_pts    INTEGER      NOT NULL,
  total      INTEGER      NOT NULL,
  award      VARCHAR(10)  NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);
```

The table is created automatically on first API request. Schema migrations (e.g. adding `branch`) are handled in `ensureTable()` using `information_schema` to detect and fix the live schema safely.

---

## Security

- **SQL injection** — all queries use Neon tagged template literals; no string concatenation
- **XSS** — all server data is passed through `escHtml()` before touching the DOM
- **Input validation** — all POST fields are validated server-side with type, range, and allowlist checks before any DB write
- **Admin auth** — deletes require `X-Admin-Password` matched against a Vercel environment variable; never stored in source
- **Secrets** — `POSTGRES_URL` and `ADMIN_PASSWORD` are Vercel env vars, never in the repository
- **Dependencies** — 0 known vulnerabilities (`npm audit`)

---

## Sub-units

| Branch | Display Name |
|---|---|
| ACUBE | ACUBE |
| Cloud | Cloud |
| Cyber | Cyber |
| IKC2 | IKC2 |
| MDT | MDT |
| RDO | RDO |
| P4B | P4B |
| HQ RAiD | HQ RAiD (Aether, PPCoE, CS) |

NSmen from partner units are welcome to submit scores. Top 5 on the leaderboard at the end of IPPT season will receive prizes.
