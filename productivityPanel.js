// productivityPanel.js — Dashboard: 3 rows of monthly case counts (12 months)

function renderProductivityPanel() {
  const container = document.getElementById("productivity-content");
  if (!container) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];

  // Build array of last 12 months: [{ label:"Apr '25", year:2025, month:3 }, ...]
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      year:  d.getFullYear(),
      month: d.getMonth(), // 0-indexed
    });
  }

  // Helper: which bucket does a date string fall into?
  function bucket(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return `${d.getFullYear()}-${d.getMonth()}`;
  }

  // Row 1 — Incoming: counted by createdAt
  const incomingMap = {};
  cases.forEach(c => {
    const b = bucket(c.createdAt || c.created_at);
    if (b) incomingMap[b] = (incomingMap[b] || 0) + 1;
  });

  // Row 2 — Signed: stage is fee_agreement_signed or any later stage
  // Proxy: updatedAt when the case was last touched at that stage
  const SIGNED_STAGES = new Set([
    "fee_agreement_signed","open_claims","lor_sent","client_treating",
    "lien_search","collecting_records","demand_prep","demand_sent",
    "negotiations","send_acceptance","settled","closed",
  ]);
  const signedMap = {};
  cases.filter(c => SIGNED_STAGES.has(c.stage)).forEach(c => {
    const b = bucket(c.updatedAt || c.updated_at);
    if (b) signedMap[b] = (signedMap[b] || 0) + 1;
  });

  // Row 3 — Closed: settled or closed stage
  const closedMap = {};
  cases.filter(c => c.stage === "settled" || c.stage === "closed").forEach(c => {
    const b = bucket(c.updatedAt || c.updated_at);
    if (b) closedMap[b] = (closedMap[b] || 0) + 1;
  });

  const rows = [
    { label: "Incoming Cases",   map: incomingMap, color: "#6366f1" },
    { label: "Agreement Signed", map: signedMap,   color: "#22c55e" },
    { label: "Closed Cases",     map: closedMap,   color: "#f59e0b" },
  ];

  container.innerHTML = `
    <div style="max-width:860px;padding:4px 0">
      ${rows.map(row => {
        const counts = months.map(m => row.map[`${m.year}-${m.month}`] || 0);
        const max    = Math.max(...counts, 1);
        const total  = counts.reduce((a, b) => a + b, 0);

        return `
          <div style="margin-bottom:32px">
            <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px">
              <span style="font-size:15px;font-weight:700;color:var(--text-primary)">${row.label}</span>
              <span style="font-size:13px;color:var(--text-muted)">${total} over last 12 months</span>
            </div>
            <div style="display:flex;align-items:flex-end;gap:6px;height:80px">
              ${months.map((m, i) => {
                const count  = counts[i];
                const height = count === 0 ? 3 : Math.max(8, Math.round((count / max) * 72));
                const isNow  = m.year === now.getFullYear() && m.month === now.getMonth();
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0">
                    <span style="font-size:11px;font-weight:600;color:${count ? 'var(--text-primary)' : 'transparent'}">${count || ""}</span>
                    <div style="width:100%;height:${height}px;background:${count ? row.color : 'var(--border)'};border-radius:3px 3px 0 0;opacity:${isNow ? 1 : 0.7};transition:opacity .15s"
                         title="${m.label}: ${count}"></div>
                    <span style="font-size:10px;color:${isNow ? 'var(--text-primary)' : 'var(--text-muted)'};font-weight:${isNow ? 700 : 400};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center">${m.label}</span>
                  </div>`;
              }).join("")}
            </div>
          </div>`;
      }).join("")}
    </div>
  `;
}
