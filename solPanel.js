// ─── Statute of Limitations Panel ─────────────────────────────────
// SOL calculator + dashboard showing all cases sorted by urgency

const SOL_RULES = {
  AZ: {
    "Auto Accident": 2, "Slip & Fall": 2, "Medical Malpractice": 2,
    "Wrongful Death": 2, "Product Liability": 2, "Dog Bite": 1,
    "Workplace Injury": 1, "Other": 2,
  },
};

function renderSolPanel() {
  const container = document.getElementById("sol-content");
  if (!container) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];

  container.innerHTML = `
    <div class="settings-section">
      <h2 style="margin:0 0 12px">SOL Calculator</h2>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:140px">
          <label>State</label>
          <select id="sol-state"><option value="AZ" selected>Arizona</option></select>
        </div>
        <div class="form-group" style="flex:1;min-width:160px">
          <label>Case Type</label>
          <select id="sol-case-type">
            ${Object.keys(SOL_RULES.AZ).map(t => `<option>${t}</option>`).join("")}
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:140px">
          <label>Date of Incident</label>
          <input type="date" id="sol-incident-date">
        </div>
        <button class="btn btn-primary btn-sm" onclick="_calcSol()" style="height:36px">Calculate</button>
      </div>
      <div id="sol-result"></div>
    </div>

    <div class="settings-section">
      <h2 style="margin:0 0 12px">Case SOL Dashboard</h2>
      <div id="sol-dashboard">${_renderSolDashboard(cases)}</div>
    </div>
  `;
}

function _calcSol() {
  const state = document.getElementById("sol-state").value;
  const caseType = document.getElementById("sol-case-type").value;
  const incident = document.getElementById("sol-incident-date").value;
  const resultEl = document.getElementById("sol-result");
  if (!incident) { resultEl.innerHTML = `<p style="color:var(--danger)">Enter a date of incident</p>`; return; }

  const years = (SOL_RULES[state] || SOL_RULES.AZ)[caseType] || 2;
  const incDate = new Date(incident + "T00:00:00");
  const solDate = new Date(incDate);
  solDate.setFullYear(solDate.getFullYear() + years);

  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.ceil((solDate - today) / (1000*60*60*24));
  const urgency = diffDays < 0 ? "past" : diffDays <= 30 ? "urgent" : diffDays <= 90 ? "warning" : "safe";
  const colors = { past: "var(--text-muted)", urgent: "var(--danger)", warning: "#f59e0b", safe: "var(--success)" };
  const label = diffDays < 0 ? `${Math.abs(diffDays)} days past` : diffDays === 0 ? "TODAY" : `${diffDays} days remaining`;

  resultEl.innerHTML = `
    <div style="margin-top:12px;padding:12px;border-radius:8px;background:var(--bg-card);border-left:4px solid ${colors[urgency]}">
      <strong>${caseType}</strong> in ${state} &mdash; ${years}-year statute<br>
      <span style="font-size:18px;font-weight:700;color:${colors[urgency]}">
        SOL: ${solDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </span>
      <span style="margin-left:12px">${label}</span>
    </div>
  `;
}

function _renderSolDashboard(cases) {
  if (!cases.length) return `<p style="color:var(--text-muted)">No cases in CRM.</p>`;

  const today = new Date(); today.setHours(0,0,0,0);

  const rows = cases
    .filter(c => c.statuteOfLimitations)
    .map(c => {
      const sol = new Date(c.statuteOfLimitations + "T00:00:00");
      const diff = Math.ceil((sol - today) / (1000*60*60*24));
      return { ...c, solDate: sol, diffDays: diff };
    })
    .sort((a, b) => a.diffDays - b.diffDays);

  if (!rows.length) return `<p style="color:var(--text-muted)">No cases with SOL dates set.</p>`;

  return rows.map(r => {
    const urgency = r.diffDays < 0 ? "past" : r.diffDays <= 30 ? "urgent" : r.diffDays <= 90 ? "warning" : "safe";
    const dLabel = r.diffDays < 0 ? `${Math.abs(r.diffDays)}d ago` : r.diffDays === 0 ? "TODAY" : `${r.diffDays}d`;
    return `
      <div class="deadline-item deadline-${urgency}">
        <div class="deadline-date">${r.solDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        <div class="deadline-body">
          <div class="deadline-title">${escapeHtml(r.clientName)}</div>
          <div class="deadline-meta">
            <span class="deadline-badge" style="background:${urgency === 'past' ? '#6b7280' : urgency === 'urgent' ? '#ef4444' : urgency === 'warning' ? '#f59e0b' : '#22c55e'}">${r.caseType}</span>
            <span>${r.stage}</span>
            <span class="deadline-days">${dLabel}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}
