# RAiD IPPT Calculator & Leaderboard

Unit IPPT leaderboard and score calculator for regulars, NSFs, and NSmen from partner units. Vanilla HTML/CSS/JS SPA on Vercel with Neon Postgres.

---

## Features

- **Leaderboard** — Overall, By Age Group, and By Branch views (collapsible sections)
- **Calculator** — live score estimator with next-point hints and award progress bars
- **Submit Score** — form with SAF rank autocomplete and branch/sub-unit selection
- **Award targets** — Gold (85), Silver (75), Pass (51) with $300/$200 cash incentive display
- **Dark/light theme** — follows system preference, manually overridable
- **Mobile responsive** — priority columns on small screens
- **Admin deletes** — password-gated via `X-Admin-Password` header

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, ES6+ — no framework, no bundler |
| Backend | Vercel Serverless Functions (ESM) |
| Database | Neon Postgres via `@neondatabase/serverless` |

---

## Project Structure

```
├── api/
│   ├── scores.js          # GET (list) + POST (add) with server-side validation
│   └── scores/[id].js     # DELETE — admin-gated
├── assets/images/         # Dark/light mode logos
├── css/
│   ├── base.css           # Theme variables, reset
│   ├── layout.css         # Header, nav, cards
│   ├── form.css           # Inputs, sliders, button
│   ├── table.css          # Table, badges, branch pill, mobile hiding
│   ├── chart.css          # Award distribution pie chart
│   └── calculator.css     # Score block, station cards, target rows
├── js/
│   ├── scoring-tables.js  # IPPT lookup tables (male/female reps + run)
│   ├── scoring.js         # Pure scoring functions — no DOM, no API
│   ├── sliders.js         # Slider ↔ display input sync, MM:SS formatting
│   ├── theme.js           # Theme toggle and system preference sync
│   ├── api.js             # Fetch wrappers for GET, POST, DELETE
│   ├── leaderboard.js     # Table, chart, form, view toggle, delete
│   └── calculator.js      # Live estimation, safety quotes, next-point hints
├── scripts/seed.mjs       # Mock data seeder — POSTs to the live API
├── tests/
│   ├── scoring.test.cjs        # 87 tests — scoring functions
│   └── api-validation.test.cjs # 137 tests — validation, format utils, hints
├── vercel.json            # Security headers
└── index.html             # SPA shell — all three page views
```

---

## Getting Started

**Prerequisites:** Node.js 18+, Vercel account, Neon Postgres database.

```bash
npm install -g vercel
vercel dev        # serves static files + API at http://localhost:3000
```

> You can also open `index.html` directly for frontend-only work — API calls will fail without `vercel dev`.

### Environment Variables

Set in Vercel dashboard → Settings → Environment Variables:

| Variable | Description |
|---|---|
| `POSTGRES_URL` | Neon connection string |
| `ADMIN_PASSWORD` | Password to delete leaderboard entries |
| `ALLOWED_ORIGIN` | Production URL e.g. `https://raid-ippt-calc.vercel.app` — restricts CORS |

For local dev: `vercel env pull .env.local`

### Tests

```bash
npm test   # runs both test suites — 224 tests total
```

### Seed Mock Data

```bash
node scripts/seed.mjs https://your-project.vercel.app        # 15 entries (default)
node scripts/seed.mjs https://your-project.vercel.app 30     # custom count
```

---

## API Reference

### `GET /api/scores`
Returns all entries ordered by total score descending.

### `POST /api/scores`
Adds a new entry. All fields validated server-side before any DB write.

```json
{
  "rank": "CPT", "name": "Tan Wei Ming", "branch": "Cyber",
  "gender": "M", "age": 28, "pushups": 50, "situps": 50, "run": "9:30",
  "puPts": 24, "suPts": 24, "runPts": 47, "total": 95, "award": "Gold"
}
```

| Field | Rule |
|---|---|
| `rank` | Valid SAF rank from allowlist |
| `name` | Letters, spaces, hyphens, apostrophes — max 100 chars |
| `gender` | `M` or `F` |
| `branch` | `ACUBE`, `Cloud`, `Cyber`, `IKC2`, `MDT`, `RDO`, `P4B`, or `HQ RAiD` |
| `age` | Integer 16–100 |
| `pushups` / `situps` | Integer 0–60 |
| `run` | `MM:SS` format |
| `puPts` / `suPts` | Integer 0–25 |
| `runPts` | Integer 0–50 |
| `total` | Integer 0–100 |
| `award` | `Gold`, `Silver`, `Pass`, or `Fail` |

Returns `201` with inserted row, or `400` with `{ "error": "<reason>" }`.

### `DELETE /api/scores/:id`
Requires `X-Admin-Password` header. Returns `200 { deleted: true }`, `401`, or `404`.

---

## Scoring

Computed in `js/scoring.js` against tables in `js/scoring-tables.js`.

| Station | Max |
|---|---|
| Push-ups | 25 |
| Sit-ups | 25 |
| 2.4km Run | 50 |
| **Total** | **100** |

14 age bands (Under-22 → 58–60). Older groups score more points for the same performance.

| Award | Threshold |
|---|---|
| Gold | ≥ 85 · $300 |
| Silver | ≥ 75 · $200 |
| Pass | ≥ 51 |
| Fail | < 51 |

---

## Database

```sql
CREATE TABLE IF NOT EXISTS scores (
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

Table is created automatically on first request. To reset: `TRUNCATE scores RESTART IDENTITY;` in the Neon SQL editor.

---

## Security

- **SQL injection** — Neon tagged template literals; no string concatenation near queries
- **XSS** — `escHtml()` applied to all server data before DOM insertion
- **Input validation** — all POST fields type-checked, range-checked, and allowlisted server-side
- **CORS** — `ALLOWED_ORIGIN` env var restricts cross-origin requests to your domain
- **Security headers** — `CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` via `vercel.json`
- **Admin auth** — delete password checked against env var, never in source
- **Dependencies** — 0 known vulnerabilities (`npm audit`)
