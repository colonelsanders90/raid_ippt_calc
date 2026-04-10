// ---------------------------------------------------------------------------
// API layer — all fetch calls to /api/scores
// ---------------------------------------------------------------------------

async function apiFetchScores() {
  const res = await fetch('/api/scores');
  if (!res.ok) throw new Error('Failed to fetch scores');
  return res.json();
}

async function apiAddScore(entry) {
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to add score');
  return res.json();
}

async function apiDeleteScore(id, password) {
  const res = await fetch(`/api/scores/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Password': password },
  });
  if (res.status === 401) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error('Failed to delete score');
  return res.json();
}
