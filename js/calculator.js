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
  // Read a numeric display, falling back to its paired slider if the display is empty/invalid.
  function readInt(displayId, sliderId) {
    const v = parseInt(document.getElementById(displayId).value, 10);
    return isNaN(v) ? parseInt(document.getElementById(sliderId).value, 10) : v;
  }

  function updateCalcResults() {
    const gender  = document.getElementById('calc-gender').value;
    const age     = readInt('calc-age-display',     'calc-age-slider');
    const pushups = readInt('calc-pushups-display', 'calc-pushups-slider');
    const situps  = readInt('calc-situps-display',  'calc-situps-slider');

    // For run: parse the display text directly so mid-type partial values don't
    // lock the calculation to the last slider position.
    const runRaw  = mmssToSecs(document.getElementById('calc-run-display').value);
    const runSecs = isNaN(runRaw)
      ? parseInt(document.getElementById('calc-run-slider').value, 10)
      : runRaw;

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

    // Next-point hints
    const ag    = getAgeGroup(age);
    const table = gender === 'F'
      ? { reps: FEMALE_REPS, run: FEMALE_RUN }
      : { reps: MALE_REPS,   run: MALE_RUN   };

    const puNext  = repsToNextPoint(pushups, ag, table.reps);
    const suNext  = repsToNextPoint(situps,  ag, table.reps);
    const runNext = secsToNextRunPoint(runSecs, ag, table.run);

    document.getElementById('calc-hint-pu').textContent  =
      puNext  != null ? `+${puNext} rep${puNext === 1 ? '' : 's'} for next pt`  : 'Max pts';
    document.getElementById('calc-hint-su').textContent  =
      suNext  != null ? `+${suNext} rep${suNext === 1 ? '' : 's'} for next pt`  : 'Max pts';
    document.getElementById('calc-hint-run').textContent =
      runNext != null ? `Cut ${secsToMMSS(runNext)} for next pt` : 'Max pts';

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

  // Sliders — fire on drag
  ['calc-age-slider', 'calc-pushups-slider',
   'calc-situps-slider', 'calc-run-slider'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCalcResults);
  });

  // Gender select
  document.getElementById('calc-gender').addEventListener('change', updateCalcResults);

  // Display inputs — fire when the user types; run also needs change/blur
  // because bindRunSlider only commits on those events
  ['calc-age-display', 'calc-pushups-display', 'calc-situps-display'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCalcResults);
  });
  const runDisplay = document.getElementById('calc-run-display');
  runDisplay.addEventListener('input',  updateCalcResults);
  runDisplay.addEventListener('change', updateCalcResults);
  runDisplay.addEventListener('blur',   updateCalcResults);

  updateCalcResults();
})();
