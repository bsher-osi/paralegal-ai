// ─── SOL Alert Banner ─────────────────────────────────────────────
// Scrolling ticker showing upcoming statute of limitations deadlines

function initSolBanner() {
  _renderSolBanner();
  // Refresh every 5 minutes
  setInterval(_renderSolBanner, 5 * 60 * 1000);
  // Re-render when a case is added/updated
  document.addEventListener("casesUpdated", _renderSolBanner);
}

function _renderSolBanner() {
  const banner = document.getElementById("sol-banner");
  const track  = document.getElementById("sol-ticker-track");
  if (!banner || !track) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const upcoming = cases
    .filter(c => c.statuteOfLimitations)
    .map(c => {
      const sol  = new Date(c.statuteOfLimitations + "T00:00:00");
      const diff = Math.ceil((sol - today) / (1000 * 60 * 60 * 24));
      return { ...c, diffDays: diff, solDate: sol };
    })
    .filter(c => c.diffDays >= 0)   // show ALL upcoming SOLs, any timeframe
    .sort((a, b) => a.diffDays - b.diffDays);

  if (!upcoming.length) {
    banner.style.display = "none";
    return;
  }

  banner.style.display = "block";

  function urgencyColor(days) {
    if (days <= 15)  return "#ef4444";  // red — critical
    if (days <= 30)  return "#f97316";  // orange — urgent
    if (days <= 90)  return "#eab308";  // yellow — warning
    if (days <= 180) return "#0ea5e9";  // blue — watch
    return "#007a85";                    // teal — on radar
  }

  const items = upcoming.map(c => {
    const color   = urgencyColor(c.diffDays);
    const dateStr = c.solDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const dayWord = c.diffDays === 0 ? "TODAY" : c.diffDays === 1 ? "1 day" : `${c.diffDays} days`;
    return `<span class="sol-ticker-item">
      <span class="sol-ticker-dot" style="background:${color}"></span>
      <span style="color:${color};font-weight:600">${escapeHtml(c.clientName)}</span>
      <span style="color:var(--text-secondary)"> — SOL ${dateStr}</span>
      <span class="sol-ticker-badge" style="background:${color}">${dayWord}</span>
    </span><span class="sol-ticker-sep">·</span>`;
  }).join("");

  // Duplicate track content for seamless scroll loop
  track.innerHTML = items + items;

  // Pause on hover
  track.onmouseenter = () => track.style.animationPlayState = "paused";
  track.onmouseleave = () => track.style.animationPlayState = "running";
}

async function sendSolDailyBrief() {
  const btn = document.getElementById("sol-brief-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    // Sync cases to backend first so it has latest data
    const cases = typeof loadCases === "function" ? loadCases() : [];
    await fetch("https://tools.sherlawgroup.com/api/cases/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(cases),
    });
    const resp = await fetch("https://tools.sherlawgroup.com/api/sol/daily-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    showToast(`SOL brief sent — ${data.count} case(s) included`);
  } catch (err) {
    showToast("Failed to send brief: " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Send SOL Brief"; }
  }
}
