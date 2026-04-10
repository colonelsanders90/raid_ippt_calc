// ---------------------------------------------------------------------------
// Calculator tab — live score estimation, no data stored
// Depends on: scoring.js, sliders.js
// ---------------------------------------------------------------------------

(function () {
  const TARGETS = [
    { key: 'gold',   threshold: 85 },
    { key: 'silver', threshold: 75 },
    { key: 'pass',   threshold: 51 },
  ];

  // ---------------------------------------------------------------------------
  // Safety encouragement quotes — rotated on each page visit
  // ---------------------------------------------------------------------------
  const QUOTES = [
    "The pain of discipline weighs ounces. The pain of regret weighs tonnes. Train hard.",
    "Your future self is watching you through your memories. Make them proud.",
    "Gold doesn't happen overnight — but it starts today.",
    "Every push-up is a vote for the soldier you want to become.",
    "The only bad workout is the one that didn't happen.",
    "Sweat now, shine on test day.",
    "Run the day before the day runs you.",
    "Progress is progress, no matter how small. Keep moving.",
    "The body achieves what the mind believes. Believe in the gold.",
    "Discipline is the bridge between goals and accomplishment.",
  ];

  const quoteEl = document.getElementById('safety-quote');
  quoteEl.textContent = '\u201c' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '\u201d';

  // ---------------------------------------------------------------------------
  // Score calculation + UI update
  // ---------------------------------------------------------------------------
  function updateCalcResults() {
    const gender  = document.getElementById('calc-gender').value;
    const age     = parseInt(document.getElementById('calc-age-slider').value, 10);
    const pushups = parseInt(document.getElementById('calc-pushups-slider').value, 10);
    const situps  = parseInt(document.getElementById('calc-situps-slider').value, 10);
    const runSecs = parseInt(document.getElementById('calc-run-slider').value, 10);

    const { puPts, suPts, runPts, total } = computeScore(gender, age, pushups, situps, runSecs);
    const award = getAward(total);

    // Total score + award badge
    document.getElementById('calc-total').textContent = total;
    const badge = document.getElementById('calc-award-badge');
    badge.textContent = award;
    badge.className   = 'badge ' + award.toLowerCase();

    // Station breakdown
    document.getElementById('calc-pu-pts').textContent  = puPts  + ' pts';
    document.getElementById('calc-su-pts').textContent  = suPts  + ' pts';
    document.getElementById('calc-run-pts').textContent = runPts + ' pts';

    // Award target rows
    for (const t of TARGETS) {
      const pct    = Math.min(total / t.threshold, 1) * 100;
      const away   = t.threshold - total;
      const bar    = document.getElementById('calc-bar-'    + t.key);
      const status = document.getElementById('calc-status-' + t.key);

      bar.style.width = pct + '%';

      if (away <= 0) {
        status.textContent = 'Achieved';
        status.className   = 'calc-status calc-achieved';
      } else {
        status.textContent = away + ' pts away';
        status.className   = 'calc-status calc-away';
      }
    }

    // Incentive display in score block
    const incentiveEl = document.getElementById('calc-incentive-display');
    if (award === 'Gold') {
      incentiveEl.textContent = '💰 $300 incentive';
      incentiveEl.className   = 'calc-incentive-display calc-incentive-gold';
    } else if (award === 'Silver') {
      incentiveEl.textContent = '💰 $200 incentive';
      incentiveEl.className   = 'calc-incentive-display calc-incentive-silver';
    } else {
      incentiveEl.textContent = '';
      incentiveEl.className   = 'calc-incentive-display';
    }
  }

  // ---------------------------------------------------------------------------
  // Bind sliders
  // ---------------------------------------------------------------------------
  bindNumericSlider('calc-age-slider',     'calc-age-display');
  bindNumericSlider('calc-pushups-slider', 'calc-pushups-display');
  bindNumericSlider('calc-situps-slider',  'calc-situps-display');
  bindRunSlider    ('calc-run-slider',     'calc-run-display');

  ['calc-gender', 'calc-age-slider', 'calc-pushups-slider',
   'calc-situps-slider', 'calc-run-slider'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCalcResults);
  });
  document.getElementById('calc-gender').addEventListener('change', updateCalcResults);

  updateCalcResults();
})();
