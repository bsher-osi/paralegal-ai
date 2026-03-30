// ─── SOL Calendar Panel ───────────────────────────────────────────
// Grouped deadline view: 7d / 15d / 30d / 90d / 180d / Beyond
// Groups 7d, 15d, 30d are open by default; others collapsed.

const CALENDAR_API_BASE = "";

let _deadlinesCache = [];

// Which groups are open: key = group id, value = bool
const _groupOpen = { g7: true, g15: true, g30: true, g90: false, g180: false, gbeyond: false };

const GROUPS = [
  { id: "g7",      label: "Within 7 Days",   min: 0,   max: 7   },
  { id: "g15",     label: "8 – 15 Days",      min: 8,   max: 15  },
  { id: "g30",     label: "16 – 30 Days",     min: 16,  max: 30  },
  { id: "g90",     label: "31 – 90 Days",     min: 31,  max: 90  },
  { id: "g180",    label: "91 – 180 Days",    min: 91,  max: 180 },
  { id: "gbeyond", label: "Beyond 180 Days",  min: 181, max: Infinity },
];

// ─── Rendering ────────────────────────────────────────────────────

function renderCalendarPanel() {
  const container = document.getElementById("calendar-content");
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-outline btn-sm" onclick="showAddDeadlineForm()">+ Add Deadline</button>
      <button class="btn btn-outline btn-sm" onclick="syncDeadlinesFromCases()" style="margin-left:auto">↻ Sync SOLs</button>
    </div>
    <div id="add-deadline-form-area"></div>
    <div id="deadlines-groups"></div>
  `;

  syncDeadlinesFromCases();
}

function _renderGroups() {
  const container = document.getElementById("deadlines-groups");
  if (!container) return;

  if (!_deadlinesCache.length) {
    container.innerHTML = `<p style="color:var(--text-muted)">No deadlines yet. Add a case with a SOL date and click Sync.</p>`;
    return;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Annotate
  const items = _deadlinesCache.map(dl => {
    const dlDate   = new Date(dl.date + "T00:00:00");
    const diffDays = Math.ceil((dlDate - today) / (1000 * 60 * 60 * 24));
    return { ...dl, dlDate, diffDays };
  });

  const html = GROUPS.map(g => {
    const members = items
      .filter(dl => dl.diffDays >= g.min && dl.diffDays <= g.max)
      .sort((a, b) => a.diffDays - b.diffDays);

    const isOpen  = _groupOpen[g.id];
    const chevron = isOpen ? "▾" : "▸";
    const countBadge = members.length
      ? `<span class="sol-group-count">${members.length}</span>`
      : `<span class="sol-group-count" style="background:var(--bg-input);color:var(--text-muted)">0</span>`;

    // Urgency accent for the group header
    const maxUrgency = members.length ? members[0].diffDays : 999;
    let accentColor = "var(--slg-teal)";
    if (maxUrgency <= 7)   accentColor = "#ef4444";
    else if (maxUrgency <= 15)  accentColor = "#f97316";
    else if (maxUrgency <= 30)  accentColor = "#eab308";

    const rows = members.map(dl => _deadlineRow(dl)).join("");

    return `
      <div class="sol-group" id="group-${g.id}">
        <div class="sol-group-header" onclick="_toggleGroup('${g.id}')" style="border-left:3px solid ${accentColor}">
          <span class="sol-group-chevron">${chevron}</span>
          <span class="sol-group-label">${g.label}</span>
          ${countBadge}
        </div>
        <div class="sol-group-body" id="gbody-${g.id}" style="display:${isOpen ? 'block' : 'none'}">
          ${members.length ? rows : `<p style="color:var(--text-muted);font-size:13px;padding:10px 16px">No deadlines in this range.</p>`}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

function _toggleGroup(id) {
  _groupOpen[id] = !_groupOpen[id];
  const body    = document.getElementById(`gbody-${id}`);
  const header  = document.querySelector(`#group-${id} .sol-group-header`);
  const chevron = header?.querySelector(".sol-group-chevron");
  if (body)    body.style.display    = _groupOpen[id] ? "block" : "none";
  if (chevron) chevron.textContent   = _groupOpen[id] ? "▾" : "▸";
}

function _deadlineRow(dl) {
  const { dlDate, diffDays } = dl;

  let urgency = "safe";
  if (diffDays <= 7)  urgency = "urgent";
  else if (diffDays <= 30) urgency = "warning";

  const badge    = _typeBadge(dl.type);
  const dateStr  = dlDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const daysLabel = diffDays === 0
    ? `<span style="color:var(--danger);font-weight:700">TODAY</span>`
    : `<span style="color:var(--text-secondary)">${diffDays} day${diffDays!==1?'s':''}</span>`;

  return `
    <div class="deadline-item deadline-${urgency}">
      <div class="deadline-date">${dateStr}</div>
      <div class="deadline-body">
        <div class="deadline-title">${escapeHtml(dl.title)}</div>
        <div class="deadline-meta">
          ${badge}
          ${dl.client_name ? `<span>${escapeHtml(dl.client_name)}</span>` : ""}
          <span class="deadline-days">${daysLabel}</span>
        </div>
        ${dl.notes ? `<div class="deadline-notes">${escapeHtml(dl.notes)}</div>` : ""}
      </div>
      <button class="btn btn-sm" onclick="deleteDeadline('${dl.id}')" style="padding:2px 8px;font-size:11px;color:var(--text-muted)" title="Delete">✕</button>
    </div>
  `;
}

function _typeBadge(type) {
  const labels = { sol: "SOL", sol_90: "90-Day", sol_30: "30-Day", demand_response: "Response", custom: "Custom" };
  const colors  = { sol: "#dc2626", sol_90: "#f59e0b", sol_30: "#ef4444", demand_response: "#3b82f6", custom: "#6b7280" };
  return `<span class="deadline-badge" style="background:${colors[type]||"#6b7280"}">${labels[type]||type}</span>`;
}

// ─── Fetch ────────────────────────────────────────────────────────

async function fetchAndRenderDeadlines() {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CALENDAR_API_BASE}/api/deadlines`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _deadlinesCache = await resp.json();
    _renderGroups();
  } catch (err) {
    const c = document.getElementById("deadlines-groups");
    if (c) c.innerHTML = `<div class="agent-error">Could not load deadlines: ${escapeHtml(err.message)}</div>`;
  }
}

// ─── Sync from CRM Cases ──────────────────────────────────────────

async function syncDeadlinesFromCases() {
  const cases = typeof loadCases === "function" ? loadCases() : [];
  if (!cases.length) { showToast("No cases to sync", "error"); return; }

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CALENDAR_API_BASE}/api/deadlines/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(cases),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _deadlinesCache = await resp.json();
    _renderGroups();
    showToast(`Synced ${_deadlinesCache.length} deadlines`);
  } catch (err) {
    showToast("Sync failed: " + err.message, "error");
  }
}

// ─── Add Deadline Form ────────────────────────────────────────────

function showAddDeadlineForm() {
  const area = document.getElementById("add-deadline-form-area");
  if (!area) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const caseOpts = cases.map(c => `<option value="${c.id}" data-name="${escapeHtml(c.clientName)}">${escapeHtml(c.clientName)}</option>`).join("");

  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">Add Deadline</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:2;min-width:200px">
          <label>Title *</label>
          <input type="text" id="dl-title" placeholder="Filing deadline, deposition, etc.">
        </div>
        <div class="form-group" style="flex:1;min-width:140px">
          <label>Date *</label>
          <input type="date" id="dl-date">
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px">
          <label>Link to Case</label>
          <select id="dl-case">
            <option value="">-- None --</option>
            ${caseOpts}
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:180px">
          <label>Notes</label>
          <input type="text" id="dl-notes" placeholder="Optional notes">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="submitAddDeadline()">Save</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('add-deadline-form-area').innerHTML=''">Cancel</button>
      </div>
    </div>
  `;
}

async function submitAddDeadline() {
  const title = document.getElementById("dl-title")?.value?.trim();
  const date  = document.getElementById("dl-date")?.value?.trim();
  const caseSelect = document.getElementById("dl-case");
  const notes = document.getElementById("dl-notes")?.value?.trim();

  if (!title || !date) { showToast("Title and date are required", "error"); return; }

  const caseId     = caseSelect?.value || "";
  const clientName = caseSelect?.selectedOptions[0]?.dataset?.name || "";

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CALENDAR_API_BASE}/api/deadlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ title, date, case_id: caseId, client_name: clientName, notes, type: "custom" }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    document.getElementById("add-deadline-form-area").innerHTML = "";
    showToast("Deadline added");
    fetchAndRenderDeadlines();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
}

// ─── Delete ───────────────────────────────────────────────────────

async function deleteDeadline(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    await fetch(`${CALENDAR_API_BASE}/api/deadlines/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    fetchAndRenderDeadlines();
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}
