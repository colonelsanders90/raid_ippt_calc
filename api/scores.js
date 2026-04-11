import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL);

async function createTable() {
  await sql`
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
    )
  `;
}

async function ensureTable() {
  const cols = await sql`
    SELECT column_name, ordinal_position
    FROM   information_schema.columns
    WHERE  table_name = 'scores'
    ORDER  BY ordinal_position
  `;

  if (cols.length === 0) {
    await createTable();
    return;
  }

  const pos = Object.fromEntries(cols.map(c => [c.column_name, c.ordinal_position]));
  const needsFix = !pos.branch || pos.branch > pos.gender;
  if (!needsFix) return;

  // branch is missing or comes after gender — fix it.
  const [{ n }] = await sql`SELECT COUNT(*) AS n FROM scores`;
  if (parseInt(n) === 0) {
    // Safe to drop and recreate with correct column order.
    await sql`DROP TABLE scores`;
    await createTable();
  } else {
    // Has data — can't reorder, just add the column if missing.
    await sql`ALTER TABLE scores ADD COLUMN IF NOT EXISTS branch VARCHAR(30) DEFAULT 'HQ RAiD'`;
  }
}

const VALID_RANKS = new Set([
  'ME1T','ME1','ME2','ME3','ME4T','ME4A','ME4','ME5','ME6','ME7','ME8',
  'REC','PTE','LCP','CPL','CFC','SCT',
  '3SG','2SG','1SG','SSG','MSG',
  '3WO','2WO','1WO','MWO','SWO','CWO',
  'OCT',
  '2LT','LTA','CPT','MAJ','LTC','SLTC','COL','BG','MG',
]);

const VALID_BRANCHES = new Set([
  'ACUBE','Cloud','Cyber','IKC2','MDT','RDO','P4B','HQ RAiD',
]);

const VALID_GENDERS = new Set(['M', 'F']);

function validatePost({ rank, name, gender, age, pushups, situps, run,
                        puPts, suPts, runPts, total, award, branch }) {
  if (!VALID_RANKS.has(rank))           return 'Invalid rank';
  if (!name || typeof name !== 'string'
      || name.length > 100
      || !/^[A-Za-z\s'\-]+$/.test(name)) return 'Invalid name';
  if (!VALID_GENDERS.has(gender))       return 'Invalid gender';
  if (!VALID_BRANCHES.has(branch))      return 'Invalid branch';
  if (!Number.isInteger(age)     || age < 16     || age > 100)   return 'Invalid age';
  if (!Number.isInteger(pushups) || pushups < 0  || pushups > 60) return 'Invalid pushups';
  if (!Number.isInteger(situps)  || situps < 0   || situps > 60)  return 'Invalid situps';
  if (typeof run !== 'string'
      || !/^\d{1,2}:[0-5]\d$/.test(run)) return 'Invalid run time';
  if (!Number.isInteger(puPts)   || puPts < 0    || puPts > 25)   return 'Invalid puPts';
  if (!Number.isInteger(suPts)   || suPts < 0    || suPts > 25)   return 'Invalid suPts';
  if (!Number.isInteger(runPts)  || runPts < 0   || runPts > 50)  return 'Invalid runPts';
  if (!Number.isInteger(total)   || total < 0    || total > 100)  return 'Invalid total';
  if (!['Gold','Silver','Pass','Fail'].includes(award)) return 'Invalid award';
  return null;
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, rank, name, gender, age, pushups, situps, run,
               pu_pts  AS "puPts",
               su_pts  AS "suPts",
               run_pts AS "runPts",
               total, award, branch,
               created_at AS "createdAt"
        FROM scores
        ORDER BY total DESC
      `;
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { rank, name, gender, age, pushups, situps, run,
              puPts, suPts, runPts, total, award, branch } = req.body;

      const validationError = validatePost({ rank, name, gender, age, pushups, situps, run,
                                             puPts, suPts, runPts, total, award, branch });
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      const [row] = await sql`
        INSERT INTO scores
          (rank, name, gender, age, pushups, situps, run,
           pu_pts, su_pts, run_pts, total, award, branch)
        VALUES
          (${rank}, ${name}, ${gender}, ${age}, ${pushups}, ${situps}, ${run},
           ${puPts}, ${suPts}, ${runPts}, ${total}, ${award}, ${branch ?? 'HQ RAiD'})
        RETURNING id, rank, name, gender, age, pushups, situps, run,
                  pu_pts  AS "puPts",
                  su_pts  AS "suPts",
                  run_pts AS "runPts",
                  total, award, branch,
                  created_at AS "createdAt"
      `;
      return res.status(201).json(row);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
