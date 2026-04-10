// ---------------------------------------------------------------------------
// Leaderboard — rendering, form submission, and delete
// Depends on: scoring.js, sliders.js, api.js
// ---------------------------------------------------------------------------

let scores      = [];
let currentView = "overall";

const AGE_GROUP_LABELS = [
  "Group 1: Under 22", "Group 2: 22–24", "Group 3: 25–27", "Group 4: 28–30",
  "Group 5: 31–33", "Group 6: 34–36", "Group 7: 37–39", "Group 8: 40–42",
  "Group 9: 43–45", "Group 10: 46–48", "Group 11: 49–51", "Group 12: 52–54",
  "Group 13: 55–57", "Group 14: 58–60",
];

const SAF_RANKS = [
  "ME1T","ME1","ME2","ME3","ME4T","ME4A","ME4","ME5","ME6","ME7","ME8",
  "REC","PTE","LCP","CPL","CFC","SCT",
  "3SG","2SG","1SG","SSG","MSG",
  "3WO","2WO","1WO","MWO","SWO","CWO",
  "OCT",
  "2LT","LTA","CPT","MAJ","LTC","SLTC","COL","BG","MG",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function navigateTo(page) {
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === page)
  );
  document.querySelectorAll(".page").forEach((p) =>
    p.classList.toggle("hidden", p.id !== `${page}-page`)
  );
}

// Returns { valid: bool, rankError: string, nameError: string }
function validateForm(rank, name) {
  if (!SAF_RANKS.includes(rank)) {
    return { valid: false, rankError: "Please select a valid SAF rank.", nameError: "" };
  }
  if (!/^[A-Za-z\s'\-]+$/.test(name)) {
    return { valid: false, rankError: "", nameError: "Name must contain letters only (no numbers)." };
  }
  return { valid: true, rankError: "", nameError: "" };
}

// Reads slider/form values and returns a complete entry object (no API call)
function buildEntry(rank, name, gender, age, pushups, situps, runSecs, branch) {
  const { puPts, suPts, runPts, total } = computeScore(gender, age, pushups, situps, runSecs);
  return {
    rank, name, gender, age, pushups, situps, branch,
    run: secsToMMSS(runSecs), puPts, suPts, runPts, total,
    award: getAward(total),
  };
}

// ---------------------------------------------------------------------------
// Row builder
// ---------------------------------------------------------------------------
const rankIcon = ["🥇", "🥈", "🥉"];
const awardCls = { Gold: "gold", Silver: "silver", Pass: "pass", Fail: "fail" };

function buildRow(s, rank) {
  const rankCell    = rankIcon[rank] ?? rank + 1;
  const displayName = s.rank
    ? `<span class="entry-rank">${escHtml(s.rank)}</span> ${escHtml(s.name)}`
    : escHtml(s.name);
  return `
    <tr>
      <td class="rank">${rankCell}</td>
      <td>${displayName}</td>
      <td><strong>${s.total}</strong></td>
      <td><span class="badge ${awardCls[s.award] || ""}">${s.award}</span></td>
      <td><span class="branch-tag">${escHtml(s.branch || 'HQ RAiD')}</span></td>
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
  Gold: "#ffd700", Silver: "#c0c0c0", Pass: "#008ED0", Fail: "#f85149",
};

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx, cy, r, startAngle, endAngle) {
  if (Math.abs(endAngle - startAngle) >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
  }
  const s     = polarToXY(cx, cy, r, startAngle);
  const e     = polarToXY(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function renderAwardChart() {
  const counts = { Gold: 0, Silver: 0, Pass: 0, Fail: 0 };
  for (const s of scores) {
    if (counts[s.award] !== undefined) counts[s.award]++;
  }
  const total  = scores.length;
  const svg    = document.getElementById("awards-chart");
  const legend = document.getElementById("chart-legend");

  if (total === 0) {
    svg.innerHTML = `<circle class="chart-empty-bg" cx="100" cy="100" r="80"/>
      <text class="chart-empty-text" x="100" y="106" text-anchor="middle" font-size="13" font-family="Outfit,sans-serif">No data</text>`;
    legend.innerHTML = "";
    return;
  }

  const cx = 100, cy = 100, r = 80;
  let startAngle = -90, paths = "", legendHtml = "";

  for (const [award, count] of Object.entries(counts)) {
    if (count === 0) continue;
    const pct      = (count / total) * 100;
    const endAngle = startAngle + (count / total) * 360;
    const color    = AWARD_COLORS[award];
    paths     += `<path d="${pieSlicePath(cx, cy, r, startAngle, endAngle)}" fill="${color}" />`;
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

  svg.innerHTML    = paths;
  legend.innerHTML = legendHtml;
}

// ---------------------------------------------------------------------------
// Render leaderboard table (table only — chart is a separate concern)
// ---------------------------------------------------------------------------
function renderTable() {
  const tbody = document.querySelector("#leaderboard-table tbody");
  const empty = document.getElementById("empty-state");

  if (scores.length === 0) {
    tbody.innerHTML   = "";
    empty.textContent = "No scores yet. Add the first entry above.";
    empty.hidden      = false;
    return;
  }

  empty.hidden = true;

  if (currentView === "overall") {
    tbody.innerHTML = [...scores].sort((a, b) => b.total - a.total)
      .map((s, i) => buildRow(s, i)).join("");
    return;
  }

  if (currentView === "branch") {
    // Group by branch, rank branches by average score
    const groups = {};
    for (const s of scores) {
      const b = s.branch || "HQ RAiD";
      if (!groups[b]) groups[b] = [];
      groups[b].push(s);
    }
    const sorted = Object.entries(groups).sort((a, b) => {
      const avgA = a[1].reduce((t, s) => t + s.total, 0) / a[1].length;
      const avgB = b[1].reduce((t, s) => t + s.total, 0) / b[1].length;
      return avgB - avgA;
    });
    tbody.innerHTML = sorted.map(([branch, members], bi) => {
      const avg   = (members.reduce((t, s) => t + s.total, 0) / members.length).toFixed(1);
      const golds = members.filter(s => s.award === "Gold").length;
      const medal = bi === 0 ? "🏆 " : bi === 1 ? "🥈 " : bi === 2 ? "🥉 " : "";
      const info  = `${golds > 0 ? ` &nbsp;·&nbsp; ${golds} Gold` : ""}`;
      const header = `${medal}<strong>${escHtml(branch)}</strong> &nbsp;·&nbsp; ${members.length} member${members.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Avg ${avg}${info}`;
      return `<tr class="group-header"><td colspan="11"><span class="group-chevron">▾</span>${header}</td></tr>`
        + [...members].sort((a, b) => b.total - a.total).map((s, i) => buildRow(s, i)).join("");
    }).join("");
    return;
  }

  // By age group
  const groups = {};
  for (const s of scores) {
    const ag = getAgeGroup(s.age);
    if (!groups[ag]) groups[ag] = [];
    groups[ag].push(s);
  }

  tbody.innerHTML = Object.keys(groups)
    .map(Number).sort((a, b) => a - b)
    .map((ag) => {
      const members = [...groups[ag]].sort((a, b) => b.total - a.total);
      return `<tr class="group-header"><td colspan="11"><span class="group-chevron">▾</span>${AGE_GROUP_LABELS[ag]}</td></tr>`
        + members.map((s, i) => buildRow(s, i)).join("");
    }).join("");
}

// Renders both chart and table — the single entry point for a full UI refresh
function render() {
  renderAwardChart();
  renderTable();
}

// ---------------------------------------------------------------------------
// Load scores from API then re-render
// ---------------------------------------------------------------------------
async function refreshAndRender() {
  const empty = document.getElementById('empty-state');
  empty.textContent = 'Loading…';
  empty.hidden      = false;
  document.querySelector('#leaderboard-table tbody').innerHTML = '';

  try {
    scores = await apiFetchScores();
  } catch (err) {
    console.error(err);
    empty.textContent = 'Failed to load scores. Please refresh.';
    return;
  }
  render();
}

// ---------------------------------------------------------------------------
// Bind submit-page sliders
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Page navigation
// ---------------------------------------------------------------------------
document.querySelector(".page-nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;
  navigateTo(btn.dataset.page);
});

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
  renderTable();
});

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------
document.getElementById("score-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const rank = fd.get("rank").trim().toUpperCase();
  const name = fd.get("name").trim();

  const { valid, rankError, nameError } = validateForm(rank, name);
  document.getElementById("rank-error").textContent = rankError;
  document.getElementById("name-error").textContent = nameError;
  if (!valid) {
    (rankError ? document.getElementById("rank") : document.getElementById("name")).focus();
    return;
  }

  const gender  = fd.get("gender");
  const branch  = fd.get("branch");
  const age     = parseInt(document.getElementById("age-slider").value,    10);
  const pushups = parseInt(document.getElementById("pushups-slider").value, 10);
  const situps  = parseInt(document.getElementById("situps-slider").value,  10);
  const runSecs = parseInt(document.getElementById("run-slider").value,     10);
  const entry   = buildEntry(rank, name, gender, age, pushups, situps, runSecs, branch);

  const btn = e.target.querySelector('.btn-primary');
  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    await apiAddScore(entry);
    await refreshAndRender();
    e.target.reset();
    navigateTo("leaderboard");
  } catch (err) {
    console.error(err);
    alert('Failed to save score. Please try again.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Add to Leaderboard';
  }
});

// ---------------------------------------------------------------------------
// Collapse / expand group header rows
// ---------------------------------------------------------------------------
document.querySelector("#leaderboard-table tbody").addEventListener("click", (e) => {
  const header = e.target.closest("tr.group-header");
  if (!header) return;
  header.classList.toggle("collapsed");
  const isCollapsed = header.classList.contains("collapsed");
  let row = header.nextElementSibling;
  while (row && !row.classList.contains("group-header")) {
    row.classList.toggle("group-row-hidden", isCollapsed);
    row = row.nextElementSibling;
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
  if (password === null) return;

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
