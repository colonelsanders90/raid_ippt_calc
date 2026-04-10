// ---------------------------------------------------------------------------
// Module-level scores cache (populated from API)
// ---------------------------------------------------------------------------
let scores = [];

// ---------------------------------------------------------------------------
// API helpers
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

async function refreshAndRender() {
  const empty = document.getElementById('empty-state');
  empty.textContent = 'Loading…';
  empty.hidden = false;
  document.querySelector('#leaderboard-table tbody').innerHTML = '';

  try {
    scores = await apiFetchScores();
  } catch (err) {
    console.error(err);
    empty.textContent = 'Failed to load scores. Please refresh.';
    return;
  }
  renderLeaderboard();
}

// ---------------------------------------------------------------------------
// Theme management
// ---------------------------------------------------------------------------
const LOGO_DARK  = "assets/images/White RAiD (Reg).svg";
const LOGO_LIGHT = "assets/images/Black RAiD (Reg).svg";

function getEffectiveTheme() {
  const manual = document.documentElement.dataset.theme;
  if (manual) return manual;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const logo   = document.getElementById("header-logo");
  const toggle = document.getElementById("theme-toggle");
  logo.src     = theme === "light" ? LOGO_LIGHT : LOGO_DARK;
  toggle.textContent = theme === "light" ? "☾" : "☀";
  toggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
}

// Initialise from saved preference (or follow system)
(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
  } else {
    const sys = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const toggle = document.getElementById("theme-toggle");
    toggle.textContent = sys === "light" ? "☾" : "☀";
    toggle.setAttribute("aria-label", sys === "light" ? "Switch to dark mode" : "Switch to light mode");
  }
})();

document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = getEffectiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("theme", next);
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    const sys = e.matches ? "light" : "dark";
    const logo   = document.getElementById("header-logo");
    const toggle = document.getElementById("theme-toggle");
    logo.src = sys === "light" ? LOGO_LIGHT : LOGO_DARK;
    toggle.textContent = sys === "light" ? "☾" : "☀";
  }
});

const AGE_GROUP_LABELS = [
  "Group 1: Under 22", "Group 2: 22–24", "Group 3: 25–27", "Group 4: 28–30", "Group 5: 31–33", "Group 6: 34–36",
  "Group 7: 37–39", "Group 8: 40–42", "Group 9: 43–45", "Group 10: 46–48", "Group 11: 49–51", "Group 12: 52–54", "Group 13: 55–57", "Group 14: 58–60",
];

let currentView = "overall"; // "overall" | "age-group"

// ---------------------------------------------------------------------------
// SAF ranks (SSOT)
// ---------------------------------------------------------------------------
const SAF_RANKS = [
  "ME1T","ME1","ME2","ME3","ME4T","ME4A","ME4","ME5","ME6","ME7","ME8",
  "REC","PTE","LCP","CPL","CFC","SCT",
  "3SG","2SG","1SG","SSG","MSG",
  "3WO","2WO","1WO","MWO","SWO","CWO",
  "OCT",
  "2LT","LTA","CPT","MAJ","LTC","SLTC","COL","BG","MG",
];

function secsToMMSS(secs) {
  const s = Number(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function mmssToSecs(str) {
  const m = String(str).match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : NaN;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Slider ↔ text input — bidirectional sync
// ---------------------------------------------------------------------------
function setSliderFill(slider) {
  const min = Number(slider.min);
  const max = Number(slider.max);
  const pct = ((Number(slider.value) - min) / (max - min)) * 100;
  slider.style.setProperty("--fill", `${pct}%`);
}

function bindNumericSlider(sliderId, displayId) {
  const slider  = document.getElementById(sliderId);
  const display = document.getElementById(displayId);

  const fromSlider = () => {
    display.value = slider.value;
    setSliderFill(slider);
  };

  const fromDisplay = () => {
    const v = parseInt(display.value, 10);
    if (isNaN(v)) return;
    slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), v));
    setSliderFill(slider);
  };

  display.addEventListener("blur", () => { display.value = slider.value; });
  slider.addEventListener("input", fromSlider);
  display.addEventListener("input", fromDisplay);
  fromSlider();
}

function bindRunSlider(sliderId, displayId) {
  const slider  = document.getElementById(sliderId);
  const display = document.getElementById(displayId);

  const fromSlider = () => {
    display.value = secsToMMSS(slider.value);
    setSliderFill(slider);
  };

  const fromDisplay = () => {
    const secs = mmssToSecs(display.value);
    if (isNaN(secs)) return;
    slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), secs));
    setSliderFill(slider);
    display.value = secsToMMSS(slider.value);
  };

  slider.addEventListener("input", fromSlider);
  display.addEventListener("change", fromDisplay);
  display.addEventListener("blur",   fromDisplay);
  fromSlider();
}

bindNumericSlider("age-slider",     "age-display");
bindNumericSlider("pushups-slider", "pushups-display");
bindNumericSlider("situps-slider",  "situps-display");
bindRunSlider    ("run-slider",     "run-display");

document.getElementById("score-form").addEventListener("reset", () => {
  setTimeout(() => {
    bindNumericSlider("age-slider",     "age-display");
    bindNumericSlider("pushups-slider", "pushups-display");
    bindNumericSlider("situps-slider",  "situps-display");
    bindRunSlider    ("run-slider",     "run-display");
    ["rank-error", "name-error"].forEach(id => {
      document.getElementById(id).textContent = "";
    });
  }, 0);
});

function escHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------------------------------------------------------------------------
// Row builder
// ---------------------------------------------------------------------------
const rankIcon  = ["🥇", "🥈", "🥉"];
const awardCls  = { Gold: "gold", Silver: "silver", Pass: "pass", Fail: "fail" };

function buildRow(s, rank) {
  const rankCell   = rankIcon[rank] ?? rank + 1;
  const displayName = s.rank
    ? `<span class="entry-rank">${escHtml(s.rank)}</span> ${escHtml(s.name)}`
    : escHtml(s.name);
  return `
    <tr>
      <td class="rank">${rankCell}</td>
      <td>${displayName}</td>
      <td><strong>${s.total}</strong></td>
      <td><span class="badge ${awardCls[s.award] || ""}">${s.award}</span></td>
      <td>${s.pushups} <span class="pts">(${s.puPts})</span></td>
      <td>${s.situps} <span class="pts">(${s.suPts})</span></td>
      <td>${s.run} <span class="pts">(${s.runPts})</span></td>
      <td>${s.gender === "F" ? "F" : "M"} / ${s.age}</td>
      <td class="date-col">${formatDate(s.createdAt)}</td>
      <td><button class="btn-delete" data-id="${s.id}" title="Remove">&#x2715;</button></td>
    </tr>`;
}

// ---------------------------------------------------------------------------
// Award pie chart
// ---------------------------------------------------------------------------
const AWARD_COLORS = {
  Gold:   "#ffd700",
  Silver: "#c0c0c0",
  Pass:   "#008ED0",
  Fail:   "#f85149",
};

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx, cy, r, startAngle, endAngle) {
  if (Math.abs(endAngle - startAngle) >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
  }
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function renderAwardChart() {
  const counts = { Gold: 0, Silver: 0, Pass: 0, Fail: 0 };
  for (const s of scores) {
    if (counts[s.award] !== undefined) counts[s.award]++;
  }
  const total = scores.length;

  const svg    = document.getElementById("awards-chart");
  const legend = document.getElementById("chart-legend");

  if (total === 0) {
    svg.innerHTML = `<circle class="chart-empty-bg" cx="100" cy="100" r="80"/>
      <text class="chart-empty-text" x="100" y="106" text-anchor="middle" font-size="13" font-family="Outfit,sans-serif">No data</text>`;
    legend.innerHTML = "";
    return;
  }

  const cx = 100, cy = 100, r = 80;
  let startAngle = -90;
  let paths = "";
  let legendHtml = "";

  for (const [award, count] of Object.entries(counts)) {
    if (count === 0) continue;
    const pct      = (count / total) * 100;
    const sweep    = (count / total) * 360;
    const endAngle = startAngle + sweep;
    const color    = AWARD_COLORS[award];

    paths += `<path d="${pieSlicePath(cx, cy, r, startAngle, endAngle)}" fill="${color}" />`;

    legendHtml += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${color}"></span>
        <span class="legend-label">${award}</span>
        <span class="legend-stat">${count} <span class="legend-pct">(${pct.toFixed(1)}%)</span></span>
      </div>`;

    startAngle = endAngle;
  }

  paths += `<circle class="chart-hole" cx="${cx}" cy="${cy}" r="38" />`;
  paths += `<text class="chart-label-sm" x="${cx}" y="${cy - 5}" text-anchor="middle"
      font-size="11" font-family="Outfit,sans-serif">Total</text>
    <text class="chart-label-lg" x="${cx}" y="${cy + 13}" text-anchor="middle"
      font-size="18" font-weight="600" font-family="Outfit,sans-serif">${total}</text>`;

  svg.innerHTML = paths;
  legend.innerHTML = legendHtml;
}

// ---------------------------------------------------------------------------
// Render leaderboard
// ---------------------------------------------------------------------------
function renderLeaderboard() {
  const tbody = document.querySelector("#leaderboard-table tbody");
  const empty = document.getElementById("empty-state");

  renderAwardChart();

  if (scores.length === 0) {
    tbody.innerHTML = "";
    empty.textContent = "No scores yet. Add the first entry above.";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  if (currentView === "overall") {
    const sorted = [...scores].sort((a, b) => b.total - a.total);
    tbody.innerHTML = sorted.map((s, i) => buildRow(s, i)).join("");
    return;
  }

  // --- By Age Group ---
  const groups = {};
  for (const s of scores) {
    const ag = getAgeGroup(s.age);
    if (!groups[ag]) groups[ag] = [];
    groups[ag].push(s);
  }

  const html = Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)
    .map((ag) => {
      const members = [...groups[ag]].sort((a, b) => b.total - a.total);
      const groupHeader = `
        <tr class="group-header">
          <td colspan="10">${AGE_GROUP_LABELS[ag]}</td>
        </tr>`;
      return groupHeader + members.map((s, i) => buildRow(s, i)).join("");
    })
    .join("");

  tbody.innerHTML = html;
}

// ---------------------------------------------------------------------------
// View toggle (overall / age-group)
// ---------------------------------------------------------------------------
document.querySelector(".view-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  currentView = btn.dataset.view;
  document.querySelectorAll(".toggle-btn").forEach((b) =>
    b.classList.toggle("active", b === btn)
  );
  renderLeaderboard();
});

// ---------------------------------------------------------------------------
// Page navigation
// ---------------------------------------------------------------------------
document.querySelector(".page-nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;
  const page = btn.dataset.page;
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b === btn)
  );
  document.querySelectorAll(".page").forEach((p) =>
    p.classList.toggle("hidden", p.id !== `${page}-page`)
  );
});

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------
document.getElementById("score-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const rank = fd.get("rank").trim().toUpperCase();
  const name = fd.get("name").trim();

  const rankErr = document.getElementById("rank-error");
  if (!SAF_RANKS.includes(rank)) {
    rankErr.textContent = "Please select a valid SAF rank.";
    document.getElementById("rank").focus();
    return;
  }
  rankErr.textContent = "";

  const nameErr = document.getElementById("name-error");
  if (!/^[A-Za-z\s'\-]+$/.test(name)) {
    nameErr.textContent = "Name must contain letters only (no numbers).";
    document.getElementById("name").focus();
    return;
  }
  nameErr.textContent = "";

  const gender  = fd.get("gender");
  const age     = parseInt(document.getElementById("age-slider").value, 10);
  const pushups = parseInt(document.getElementById("pushups-slider").value, 10);
  const situps  = parseInt(document.getElementById("situps-slider").value, 10);
  const runSecs = parseInt(document.getElementById("run-slider").value, 10);
  const runStr  = secsToMMSS(runSecs);
  const { puPts, suPts, runPts, total } = computeScore(gender, age, pushups, situps, runSecs);

  const entry = {
    rank, name, gender, age, pushups, situps,
    run: runStr, puPts, suPts, runPts, total,
    award: getAward(total),
  };

  const btn = e.target.querySelector('.btn-primary');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await apiAddScore(entry);
    await refreshAndRender();
    e.target.reset();
    // Switch to leaderboard page
    document.querySelectorAll(".nav-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.page === "leaderboard")
    );
    document.querySelectorAll(".page").forEach((p) =>
      p.classList.toggle("hidden", p.id !== "leaderboard-page")
    );
  } catch (err) {
    console.error(err);
    alert('Failed to save score. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add to Leaderboard';
  }
});

// ---------------------------------------------------------------------------
// Delete row (admin-gated)
// ---------------------------------------------------------------------------
document.querySelector("#leaderboard-table tbody").addEventListener("click", async (e) => {
  if (!e.target.matches(".btn-delete")) return;
  const id    = Number(e.target.dataset.id);
  const entry = scores.find((s) => s.id === id);
  if (!entry) return;
  const label = entry.rank ? `${entry.rank} ${entry.name}` : entry.name;
  if (!confirm(`Remove ${label} from the leaderboard?`)) return;

  const password = prompt('Enter admin password:');
  if (password === null) return; // cancelled

  try {
    await apiDeleteScore(id, password);
    await refreshAndRender();
  } catch (err) {
    if (err.status === 401) {
      alert('Incorrect admin password.');
    } else {
      console.error(err);
      alert('Failed to delete entry. Please try again.');
    }
  }
});

// Initial load
refreshAndRender();
