import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL);

const CORRECT_SCHEMA = `
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
  )`;

async function ensureTable() {
  // Check whether the table exists and whether branch is positioned correctly
  // (after name, before gender — i.e. ordinal_position < gender's position).
  const cols = await sql`
    SELECT column_name, ordinal_position
    FROM   information_schema.columns
    WHERE  table_name = 'scores'
    ORDER  BY ordinal_position
  `;

  if (cols.length === 0) {
    // Table doesn't exist yet — create it with the correct schema.
    await sql.unsafe(CORRECT_SCHEMA);
    return;
  }

  const pos = Object.fromEntries(cols.map(c => [c.column_name, c.ordinal_position]));
  const needsFix = !pos.branch || pos.branch > pos.gender;

  if (!needsFix) return; // Schema is already correct.

  // Branch is missing or in the wrong position.
  // If the table is empty it is safe to drop and recreate.
  const [{ n }] = await sql`SELECT COUNT(*) AS n FROM scores`;
  if (parseInt(n) === 0) {
    await sql`DROP TABLE scores`;
    await sql.unsafe(CORRECT_SCHEMA);
  } else {
    // Table has data — fall back to ALTER so we don't lose rows.
    // Column order will be wrong visually, but all queries use column names.
    await sql`ALTER TABLE scores ADD COLUMN IF NOT EXISTS branch VARCHAR(30) DEFAULT 'HQ RAiD'`;
  }
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
