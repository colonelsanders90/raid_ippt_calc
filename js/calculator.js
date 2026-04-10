// ---------------------------------------------------------------------------
// Calculator tab — live score estimation, no data stored
// Relies on computeScore() and getAward() from scoring-tables.js,
// and on bindNumericSlider / bindRunSlider from leaderboard.js.
// ---------------------------------------------------------------------------

(function () {
  const TARGETS = [
    { key: 'gold',   label: 'Gold',   threshold: 85 },
    { key: 'silver', label: 'Silver', threshold: 75 },
    { key: 'pass',   label: 'Pass',   threshold: 51 },
  ];

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
    badge.className = 'badge ' + award.toLowerCase();

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
        status.className   = 'calc-status';
      }
    }
  }

  // Bind sliders (reuses the globally-defined helpers from leaderboard.js)
  bindNumericSlider('calc-age-slider',     'calc-age-display');
  bindNumericSlider('calc-pushups-slider', 'calc-pushups-display');
  bindNumericSlider('calc-situps-slider',  'calc-situps-display');
  bindRunSlider    ('calc-run-slider',     'calc-run-display');

  // Live update on any input change
  ['calc-gender', 'calc-age-slider', 'calc-pushups-slider',
   'calc-situps-slider', 'calc-run-slider'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCalcResults);
  });
  document.getElementById('calc-gender').addEventListener('change', updateCalcResults);

  // Initial render
  updateCalcResults();
})();
