// ─── Deadline Calendar Panel ──────────────────────────────────────
// Displays case deadlines from the backend API, with sync from CRM
// and manual deadline creation.

const CALENDAR_API_BASE = "https://tools.sherlawgroup.com";

let _deadlinesCache = [];
let _calendarFilter = 180; // active day-range filter (null = show all)
let _calendarSort   = "asc"; // "asc" | "desc"

// ─── Rendering ────────────────────────────────────────────────────

function renderCalendarPanel() {
  const container = document.getElementById("calendar-content");
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-primary btn-sm" onclick="syncDeadlinesFromCases()">↻ Sync SOLs</button>
      <button class="btn btn-outline btn-sm" onclick="showAddDeadlineForm()">+ Add Deadline</button>
      <button class="btn btn-outline btn-sm" onclick="fetchAndRenderDeadlines()">Refresh</button>
    </div>

    <!-- Filter bar -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12px;color:var(--text-muted);margin-right:2px">Filter:</span>
      ${[7,15,30,90,180].map(d => `
        <button id="cal-filter-${d}" class="btn btn-sm cal-filter-btn ${_calendarFilter===d?'cal-filter-active':''}"
          onclick="_setCalFilter(${d})">${d} days</button>
      `).join("")}
      <button id="cal-filter-null" class="btn btn-sm cal-filter-btn ${_calendarFilter===null?'cal-filter-active':''}"
        onclick="_setCalFilter(null)">All</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-muted)">Sort:</span>
      <button class="btn btn-sm btn-outline" onclick="_toggleCalSort()" title="Toggle sort order" id="cal-sort-btn">
        ${_calendarSort==="asc" ? "↑ Soonest" : "↓ Latest"}
      </button>
    </div>

    <div id="add-deadline-form-area"></div>
    <div id="deadlines-list">
      <p style="color:var(--text-muted)">Loading deadlines...</p>
    </div>
  `;

  // Auto-sync SOLs from cases every time the calendar is opened
  syncDeadlinesFromCases();
}

function _setCalFilter(days) {
  _calendarFilter = days;
  // Update button styles
  [7,15,30,90,180].forEach(d => {
    const btn = document.getElementById(`cal-filter-${d}`);
    if (btn) btn.classList.toggle("cal-filter-active", days === d);
  });
  const allBtn = document.getElementById("cal-filter-null");
  if (allBtn) allBtn.classList.toggle("cal-filter-active", days === null);

  const list = document.getElementById("deadlines-list");
  if (list) _renderDeadlinesList(list);
}

function _toggleCalSort() {
  _calendarSort = _calendarSort === "asc" ? "desc" : "asc";
  const btn = document.getElementById("cal-sort-btn");
  if (btn) btn.textContent = _calendarSort === "asc" ? "↑ Soonest" : "↓ Latest";
  const list = document.getElementById("deadlines-list");
  if (list) _renderDeadlinesList(list);
}

async function fetchAndRenderDeadlines() {
  const list = document.getElementById("deadlines-list");
  if (!list) return;

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CALENDAR_API_BASE}/api/deadlines`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _deadlinesCache = await resp.json();
    _renderDeadlinesList(list);
  } catch (err) {
    list.innerHTML = `<div class="agent-error">Could not load deadlines: ${escapeHtml(err.message)}</div>`;
  }
}

function _renderDeadlinesList(container) {
  if (!_deadlinesCache.length) {
    container.innerHTML = `<p style="color:var(--text-muted)">No deadlines yet. Click "Sync SOLs" to auto-generate from cases, or add one manually.</p>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Annotate with diffDays
  let items = _deadlinesCache.map(dl => {
    const dlDate  = new Date(dl.date + "T00:00:00");
    const diffDays = Math.ceil((dlDate - today) / (1000 * 60 * 60 * 24));
    return { ...dl, dlDate, diffDays };
  });

  // Apply filter
  if (_calendarFilter !== null) {
    items = items.filter(dl => dl.diffDays >= 0 && dl.diffDays <= _calendarFilter);
  }

  if (!items.length) {
    container.innerHTML = `<p style="color:var(--text-muted)">No deadlines within the selected range.</p>`;
    return;
  }

  // Apply sort
  items.sort((a, b) => _calendarSort === "asc"
    ? a.diffDays - b.diffDays
    : b.diffDays - a.diffDays);

  const html = items.map(dl => {
    const { dlDate, diffDays } = dl;
    const isPast = diffDays < 0;

    let urgency = "safe";
    if (diffDays < 0)   urgency = "past";
    else if (diffDays <= 15)  urgency = "urgent";
    else if (diffDays <= 30)  urgency = "warning";

    const badge    = _typeBadge(dl.type);
    const dateStr  = dlDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const daysLabel = isPast
      ? `<span style="color:var(--danger);font-weight:600">${Math.abs(diffDays)} days ago</span>`
      : diffDays === 0
        ? `<span style="color:var(--danger);font-weight:600">TODAY</span>`
        : `<span>${diffDays} days</span>`;

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
  }).join("");

  container.innerHTML = html;
}

function _typeBadge(type) {
  const labels = {
    sol: "SOL", sol_90: "90-Day", sol_30: "30-Day",
    demand_response: "Response", custom: "Custom",
  };
  const colors = {
    sol: "#dc2626", sol_90: "#f59e0b", sol_30: "#ef4444",
    demand_response: "#3b82f6", custom: "#6b7280",
  };
  const label = labels[type] || type;
  const color  = colors[type] || "#6b7280";
  return `<span class="deadline-badge" style="background:${color}">${label}</span>`;
}

// ─── Sync from CRM Cases ──────────────────────────────────────────

async function syncDeadlinesFromCases() {
  const cases = typeof loadCases === "function" ? loadCases() : [];
  if (!cases.length) {
    showToast("No cases in CRM to sync", "error");
    return;
  }

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CALENDAR_API_BASE}/api/deadlines/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(cases),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _deadlinesCache = await resp.json();
    const list = document.getElementById("deadlines-list");
    if (list) _renderDeadlinesList(list);
    showToast(`Synced ${_deadlinesCache.length} deadlines from ${cases.length} cases`);
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

  if (!title || !date) {
    showToast("Title and date are required", "error");
    return;
  }

  const caseId     = caseSelect?.value || "";
  const clientName = caseSelect?.selectedOptions[0]?.dataset?.name || "";

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CALENDAR_API_BASE}/api/deadlines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
