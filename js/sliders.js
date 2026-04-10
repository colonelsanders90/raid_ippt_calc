// ---------------------------------------------------------------------------
// Shared slider utilities — used by leaderboard form and calculator
// ---------------------------------------------------------------------------

function secsToMMSS(secs) {
  const s = Number(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function mmssToSecs(str) {
  const m = String(str).match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : NaN;
}

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
    display.classList.remove("input-invalid");
  };

  const fromDisplay = () => {
    // Auto-insert colon when the user types bare digits: "1200" → "12:00", "923" → "9:23"
    const raw    = display.value;
    const digits = raw.replace(/\D/g, '');
    if (!raw.includes(':')) {
      if      (digits.length === 4) display.value = digits.slice(0, 2) + ':' + digits.slice(2);
      else if (digits.length === 3) display.value = digits.slice(0, 1) + ':' + digits.slice(1);
    }

    const secs = mmssToSecs(display.value);
    if (isNaN(secs)) {
      display.classList.add("input-invalid");
      return;
    }
    display.classList.remove("input-invalid");
    slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), secs));
    setSliderFill(slider);
    display.value = secsToMMSS(slider.value);
  };

  // Block any character that isn't a digit or colon
  display.addEventListener("keydown", (e) => {
    if (e.key.length === 1 && !/[\d:]/.test(e.key)) e.preventDefault();
  });

  slider.addEventListener("input", fromSlider);
  display.addEventListener("input", fromDisplay);
  display.addEventListener("change", fromDisplay);
  display.addEventListener("blur",   fromDisplay);
  fromSlider();
}
