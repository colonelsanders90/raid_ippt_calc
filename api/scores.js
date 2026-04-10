import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id         SERIAL PRIMARY KEY,
      rank       VARCHAR(10)  NOT NULL,
      name       VARCHAR(100) NOT NULL,
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

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, rank, name, gender, age, pushups, situps, run,
               pu_pts  AS "puPts",
               su_pts  AS "suPts",
               run_pts AS "runPts",
               total, award,
               created_at AS "createdAt"
        FROM scores
        ORDER BY total DESC
      `;
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { rank, name, gender, age, pushups, situps, run,
              puPts, suPts, runPts, total, award } = req.body;
      const [row] = await sql`
        INSERT INTO scores
          (rank, name, gender, age, pushups, situps, run,
           pu_pts, su_pts, run_pts, total, award)
        VALUES
          (${rank}, ${name}, ${gender}, ${age}, ${pushups}, ${situps}, ${run},
           ${puPts}, ${suPts}, ${runPts}, ${total}, ${award})
        RETURNING id, rank, name, gender, age, pushups, situps, run,
                  pu_pts  AS "puPts",
                  su_pts  AS "suPts",
                  run_pts AS "runPts",
                  total, award,
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
