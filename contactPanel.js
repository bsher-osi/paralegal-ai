// ─── Client Contact Log Panel ─────────────────────────────────────
// 30-day contact alert dashboard + per-case contact log CRUD

const CONTACT_API_BASE = "https://tools.sherlawgroup.com";

let _contactLogsCache = [];
let _selectedContactCaseId = "";

// ─── Main Render ──────────────────────────────────────────────────

function renderContactPanel() {
  const container = document.getElementById("contact-content");
  if (!container) return;

  container.innerHTML = `
    <h3 style="margin:0 0 12px;color:var(--text-primary)">30-Day Contact Alert Dashboard</h3>
    <div id="contact-alert-dashboard">
      <p style="color:var(--text-muted)">Loading cases...</p>
    </div>

    <h3 style="margin:24px 0 12px;color:var(--text-primary)">Contact Log</h3>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <select id="contact-case-select" onchange="_onContactCaseChange()" style="padding:6px 10px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);min-width:200px">
        <option value="">-- Select a Case --</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="_showAddContactForm()">+ Add Contact</button>
      <button class="btn btn-outline btn-sm" onclick="_fetchContactLogs()">Refresh</button>
    </div>
    <div id="contact-form-area"></div>
    <div id="contact-log-table">
      <p style="color:var(--text-muted)">Select a case to view contact history.</p>
    </div>
  `;

  _populateCaseSelector();
  _renderAlertDashboard();
}

// ─── Alert Dashboard ──────────────────────────────────────────────

function _renderAlertDashboard() {
  const dashboard = document.getElementById("contact-alert-dashboard");
  if (!dashboard) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  if (!cases.length) {
    dashboard.innerHTML = `<p style="color:var(--text-muted)">No cases in CRM.</p>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const caseAlerts = cases.map(c => {
    let daysSince = null;
    let lastDateStr = "Never";
    if (c.lastContactDate) {
      const last = new Date(c.lastContactDate + "T00:00:00");
      daysSince = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      lastDateStr = last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return { ...c, daysSince, lastDateStr };
  });

  // Sort: never-contacted first, then most overdue
  caseAlerts.sort((a, b) => {
    const da = a.daysSince === null ? Infinity : a.daysSince;
    const db = b.daysSince === null ? Infinity : b.daysSince;
    return db - da;
  });

  const rows = caseAlerts.map(c => {
    let urgency, label;
    if (c.daysSince === null || c.daysSince > 60) {
      urgency = "urgent";
      label = c.daysSince === null
        ? `<span style="color:var(--danger);font-weight:600">Never contacted</span>`
        : `<span style="color:var(--danger);font-weight:600">${c.daysSince} days</span>`;
    } else if (c.daysSince > 30) {
      urgency = "warning";
      label = `<span style="color:#f59e0b;font-weight:600">${c.daysSince} days</span>`;
    } else {
      urgency = "safe";
      label = `<span style="color:#22c55e">${c.daysSince} days</span>`;
    }

    return `
      <div class="deadline-item deadline-${urgency}" style="cursor:pointer" onclick="_selectCaseFromDashboard('${c.id}')">
        <div class="deadline-body" style="flex:1">
          <div class="deadline-title">${escapeHtml(c.clientName)}</div>
          <div class="deadline-meta">
            ${c.caseType ? `<span class="deadline-badge" style="background:#6b7280">${escapeHtml(c.caseType)}</span>` : ""}
            <span>Last: ${c.lastDateStr}</span>
            <span class="deadline-days">${label}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  dashboard.innerHTML = rows || `<p style="color:var(--text-muted)">All cases are up to date.</p>`;
}

// ─── Case Selector ────────────────────────────────────────────────

function _populateCaseSelector() {
  const sel = document.getElementById("contact-case-select");
  if (!sel) return;
  const cases = typeof loadCases === "function" ? loadCases() : [];
  sel.innerHTML = `<option value="">-- Select a Case --</option>` +
    cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`).join("");

  if (_selectedContactCaseId) {
    sel.value = _selectedContactCaseId;
  }
}

function _selectCaseFromDashboard(caseId) {
  _selectedContactCaseId = caseId;
  const sel = document.getElementById("contact-case-select");
  if (sel) sel.value = caseId;
  _fetchContactLogs();
}

function _onContactCaseChange() {
  const sel = document.getElementById("contact-case-select");
  _selectedContactCaseId = sel ? sel.value : "";
  if (_selectedContactCaseId) {
    _fetchContactLogs();
  } else {
    const el = document.getElementById("contact-log-table");
    if (el) el.innerHTML = `<p style="color:var(--text-muted)">Select a case to view contact history.</p>`;
  }
}

// ─── Fetch & Render Contact Logs ──────────────────────────────────

async function _fetchContactLogs() {
  const caseId = _selectedContactCaseId;
  const el = document.getElementById("contact-log-table");
  if (!el) return;
  if (!caseId) {
    el.innerHTML = `<p style="color:var(--text-muted)">Select a case to view contact history.</p>`;
    return;
  }

  el.innerHTML = `<p style="color:var(--text-muted)">Loading contact log...</p>`;

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CONTACT_API_BASE}/api/contact-log?caseId=${caseId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _contactLogsCache = await resp.json();
    _renderContactLogTable();
  } catch (err) {
    el.innerHTML = `<div class="agent-error">Could not load contact log: ${escapeHtml(err.message)}</div>`;
  }
}

function _renderContactLogTable() {
  const el = document.getElementById("contact-log-table");
  if (!el) return;

  if (!_contactLogsCache.length) {
    el.innerHTML = `<p style="color:var(--text-muted)">No contact entries for this case yet.</p>`;
    return;
  }

  const methodColors = {
    call: "#3b82f6",
    email: "#8b5cf6",
    in_person: "#22c55e",
    text: "#f59e0b",
  };

  const methodLabels = {
    call: "Call",
    email: "Email",
    in_person: "In-Person",
    text: "Text",
  };

  const rows = _contactLogsCache.map(entry => {
    const color = methodColors[entry.method] || "#6b7280";
    const label = methodLabels[entry.method] || entry.method;
    const dateStr = entry.date
      ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "";
    return `
      <tr>
        <td>${dateStr}</td>
        <td><span class="deadline-badge" style="background:${color}">${escapeHtml(label)}</span></td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(entry.notes || "")}">${escapeHtml(entry.notes || "")}</td>
        <td>${escapeHtml(entry.logged_by || "")}</td>
        <td>
          <button class="btn btn-sm" onclick="_deleteContactLog('${entry.id}')" style="padding:1px 6px;font-size:10px;color:var(--text-muted)" title="Delete">X</button>
        </td>
      </tr>`;
  }).join("");

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Method</th><th>Notes</th><th>Logged By</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ─── Add Contact Form ─────────────────────────────────────────────

function _showAddContactForm() {
  const area = document.getElementById("contact-form-area");
  if (!area) return;

  if (!_selectedContactCaseId) {
    showToast("Select a case first", "error");
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">Log Contact</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:140px">
          <label>Date *</label>
          <input type="date" id="cl-date" value="${today}">
        </div>
        <div class="form-group" style="flex:1;min-width:160px">
          <label>Method *</label>
          <select id="cl-method">
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="in_person">In-Person</option>
            <option value="text">Text</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="cl-notes" rows="3" placeholder="Contact details, follow-ups, etc." style="width:100%;padding:8px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);resize:vertical"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="_submitContact()">Save</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('contact-form-area').innerHTML=''">Cancel</button>
      </div>
    </div>
  `;
}

async function _submitContact() {
  const date = document.getElementById("cl-date")?.value?.trim();
  const method = document.getElementById("cl-method")?.value;
  const notes = document.getElementById("cl-notes")?.value?.trim();

  if (!date || !method) {
    showToast("Date and method are required", "error");
    return;
  }

  const caseId = _selectedContactCaseId;
  if (!caseId) {
    showToast("No case selected", "error");
    return;
  }

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CONTACT_API_BASE}/api/contact-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ case_id: caseId, date, method, notes }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    // Update lastContactDate on the CRM case
    if (typeof updateCase === "function") {
      updateCase(caseId, { lastContactDate: date });
    }

    document.getElementById("contact-form-area").innerHTML = "";
    showToast("Contact logged");
    _fetchContactLogs();
    _renderAlertDashboard();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
}

// ─── Delete Contact Log ───────────────────────────────────────────

async function _deleteContactLog(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${CONTACT_API_BASE}/api/contact-log/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    showToast("Contact entry deleted");
    _fetchContactLogs();
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}
