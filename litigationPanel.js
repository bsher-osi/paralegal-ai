// ─── Litigation Tracker Panel ──────────────────────────────────────
// Timeline view of litigation events per case, with CRUD against
// the /api/litigation-events backend.

const LITIGATION_API = "";

let _litEventsCache = [];
let _litSelectedCaseId = "";

// ─── Stage filter ─────────────────────────────────────────────────

const LIT_STAGES = new Set([
  "litigation_filed",
  "litigation_served",
  "litigation_answered",
  "discovery",
  "resolution",
]);

function _isLitigationCase(c) {
  const s = c.litigationStatus || c.stage || "";
  if (s === "pre_lit") return false;
  if (LIT_STAGES.has(s)) return true;
  if (s.startsWith("litigation_")) return true;
  return false;
}

// ─── Event type config ────────────────────────────────────────────

const LIT_EVENT_TYPES = [
  { id: "complaint_filed", label: "Complaint Filed", color: "#ef4444" },
  { id: "served",          label: "Served",          color: "#dc2626" },
  { id: "answer",          label: "Answer",          color: "#b91c1c" },
  { id: "disclosure",      label: "Disclosure",      color: "#3b82f6" },
  { id: "deposition",      label: "Deposition",      color: "#8b5cf6" },
  { id: "arbitration",     label: "Arbitration",     color: "#f59e0b" },
  { id: "mediation",       label: "Mediation",       color: "#7c3aed" },
];

const _litColorMap = Object.fromEntries(LIT_EVENT_TYPES.map(t => [t.id, t.color]));
const _litLabelMap = Object.fromEntries(LIT_EVENT_TYPES.map(t => [t.id, t.label]));

const LIT_TITLE_SUGGESTIONS = {
  complaint_filed: "Complaint Filed",
  served:          "Defendant Served",
  answer:          "Answer Filed",
  disclosure:      "Disclosure Sent",
  deposition:      "Deposition Scheduled",
  arbitration:     "Arbitration Hearing",
  mediation:       "Mediation Session",
};

const LIT_STATUS_LABELS = {
  complaint_filed: "Filing date, Court, Case number",
  served:          "Service date, Process server, Affidavit received",
  answer:          "Answer date, Defense attorney",
  disclosure:      "Type (Initial/Supplemental/Expert), Date sent, Date received",
  deposition:      "Type (Client/Defendant/Expert), Date, Location, Prep status",
  arbitration:     "Date, Arbitrator, Memorandum status",
  mediation:       "Date, Mediator, Memorandum status",
};

// ─── Status formatting helpers ────────────────────────────────────

function _litStatusBadge(status) {
  const colors = { pending: "#f59e0b", completed: "#22c55e" };
  const color = colors[status] || "#6b7280";
  return `<span class="deadline-badge" style="background:${color}">${status || "pending"}</span>`;
}

function _litStagePretty(stage) {
  const map = {
    litigation_filed: "Filed",
    litigation_served: "Served",
    litigation_answered: "Answer Filed",
    discovery: "Discovery",
    resolution: "Resolution",
  };
  return map[stage] || stage || "—";
}

// ─── Render entry point ───────────────────────────────────────────

function renderLitigationPanel() {
  const container = document.getElementById("litigation-content");
  if (!container) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const litCases = cases.filter(_isLitigationCase);

  if (!litCases.length) {
    container.innerHTML = `<p style="color:var(--text-muted)">No cases currently in litigation.</p>`;
    return;
  }

  const caseOpts = litCases
    .map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`)
    .join("");

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <select id="lit-case-select" onchange="_onLitCaseChange()"
        style="padding:6px 10px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);min-width:220px">
        <option value="">-- Select Case --</option>
        ${caseOpts}
      </select>
      <button class="btn btn-primary btn-sm" onclick="_showAddLitEvent()" id="lit-add-btn" style="display:none">+ Add Event</button>
      <button class="btn btn-outline btn-sm" onclick="_fetchLitEvents()" id="lit-refresh-btn" style="display:none">Refresh</button>
    </div>
    <div id="lit-overview-card"></div>
    <div id="lit-form-area"></div>
    <div id="lit-timeline">
      <p style="color:var(--text-muted)">Select a case to view its litigation timeline.</p>
    </div>
  `;
}

// ─── Case selection ───────────────────────────────────────────────

function _onLitCaseChange() {
  const sel = document.getElementById("lit-case-select");
  _litSelectedCaseId = sel?.value || "";

  document.getElementById("lit-add-btn").style.display = _litSelectedCaseId ? "" : "none";
  document.getElementById("lit-refresh-btn").style.display = _litSelectedCaseId ? "" : "none";
  document.getElementById("lit-form-area").innerHTML = "";

  if (!_litSelectedCaseId) {
    document.getElementById("lit-overview-card").innerHTML = "";
    document.getElementById("lit-timeline").innerHTML =
      `<p style="color:var(--text-muted)">Select a case to view its litigation timeline.</p>`;
    return;
  }

  _renderLitOverview();
  _fetchLitEvents();
}

// ─── Case overview card ───────────────────────────────────────────

function _renderLitOverview() {
  const el = document.getElementById("lit-overview-card");
  if (!el) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const c = cases.find(x => x.id === _litSelectedCaseId);
  if (!c) { el.innerHTML = ""; return; }

  el.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;font-size:15px;margin-bottom:10px">${escapeHtml(c.clientName)} — Case Overview</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:13px">
        <div><span style="color:var(--text-muted)">Case Number:</span> <strong>${escapeHtml(c.caseNumber || "—")}</strong></div>
        <div><span style="color:var(--text-muted)">County:</span> <strong>${escapeHtml(c.county || "—")}</strong></div>
        <div><span style="color:var(--text-muted)">Defendant Attorney:</span> <strong>${escapeHtml(c.defendantAttorney || "—")}</strong></div>
        <div><span style="color:var(--text-muted)">Def. Atty Email:</span> <strong>${escapeHtml(c.defendantAttorneyEmail || "—")}</strong></div>
        <div><span style="color:var(--text-muted)">Arbitrator:</span> <strong>${escapeHtml(c.arbitratorName || "—")}</strong></div>
        <div><span style="color:var(--text-muted)">Status:</span> <strong>${_litStagePretty(c.litigationStatus || c.stage)}</strong></div>
      </div>
    </div>
  `;
}

// ─── Fetch events ─────────────────────────────────────────────────

async function _fetchLitEvents() {
  const el = document.getElementById("lit-timeline");
  if (!el || !_litSelectedCaseId) return;

  el.innerHTML = `<p style="color:var(--text-muted)">Loading timeline...</p>`;

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(
      `${LITIGATION_API}/api/litigation-events?caseId=${encodeURIComponent(_litSelectedCaseId)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _litEventsCache = await resp.json();
    _renderLitTimeline(el);
  } catch (err) {
    el.innerHTML = `<div class="agent-error">Could not load events: ${escapeHtml(err.message)}</div>`;
  }
}

// ─── Render timeline ──────────────────────────────────────────────

function _renderLitTimeline(container) {
  if (!_litEventsCache.length) {
    container.innerHTML = `<p style="color:var(--text-muted)">No events yet. Click "+ Add Event" to create the first timeline entry.</p>`;
    return;
  }

  // Sort chronologically
  const sorted = [..._litEventsCache].sort(
    (a, b) => new Date(a.event_date || a.date || 0) - new Date(b.event_date || b.date || 0)
  );

  const cards = sorted.map((evt, idx) => {
    const evtType = evt.event_type || evt.type || "";
    const color = _litColorMap[evtType] || "#6b7280";
    const label = _litLabelMap[evtType] || evtType;
    const dateStr = _litFormatDate(evt.event_date || evt.date);
    const status = evt.status || "pending";

    return `
      <div style="display:flex;gap:12px;position:relative">
        <!-- Timeline line + dot -->
        <div style="display:flex;flex-direction:column;align-items:center;min-width:20px">
          <div style="width:12px;height:12px;border-radius:50%;background:${color};flex-shrink:0;margin-top:4px;border:2px solid var(--bg-primary);box-shadow:0 0 0 2px ${color}"></div>
          ${idx < sorted.length - 1 ? `<div style="width:2px;flex:1;background:var(--border);margin:4px 0"></div>` : ""}
        </div>
        <!-- Date column -->
        <div style="min-width:90px;padding-top:2px;font-size:12px;color:var(--text-muted);flex-shrink:0">${dateStr}</div>
        <!-- Card -->
        <div style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ${color};border-radius:6px;padding:12px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
            <div>
              <div style="font-weight:600;font-size:14px;margin-bottom:2px">${escapeHtml(evt.title || label)}</div>
              <span class="deadline-badge" style="background:${color};font-size:10px">${label}</span>
              ${_litStatusBadge(status)}
            </div>
            <button class="btn btn-sm" onclick="_deleteLitEvent('${evt.id}')"
              style="padding:2px 8px;font-size:11px;color:var(--text-muted);flex-shrink:0" title="Delete">X</button>
          </div>
          ${evt.details ? `<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);white-space:pre-wrap">${escapeHtml(evt.details)}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `<div style="padding-left:4px">${cards}</div>`;
}

function _litFormatDate(d) {
  if (!d) return "—";
  const dt = new Date(d + (d.includes("T") ? "" : "T00:00:00"));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Add event form ───────────────────────────────────────────────

function _showAddLitEvent() {
  const area = document.getElementById("lit-form-area");
  if (!area) return;

  const typeOpts = LIT_EVENT_TYPES
    .map(t => `<option value="${t.id}">${t.label}</option>`)
    .join("");

  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">Add Litigation Event</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:160px">
          <label>Event Type *</label>
          <select id="lit-evt-type" onchange="_litAutoTitle()">
            ${typeOpts}
          </select>
        </div>
        <div class="form-group" style="flex:2;min-width:200px">
          <label>Title *</label>
          <input type="text" id="lit-evt-title" placeholder="Event title">
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:140px">
          <label>Event Date *</label>
          <input type="date" id="lit-evt-date">
        </div>
        <div class="form-group" style="flex:1;min-width:140px">
          <label>Status</label>
          <select id="lit-evt-status">
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Details</label>
        <textarea id="lit-evt-details" rows="3" placeholder="${escapeHtml(LIT_STATUS_LABELS[LIT_EVENT_TYPES[0].id])}" style="width:100%;resize:vertical"></textarea>
        <div id="lit-detail-hint" style="font-size:11px;color:var(--text-muted);margin-top:2px">
          Suggested: ${escapeHtml(LIT_STATUS_LABELS[LIT_EVENT_TYPES[0].id])}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="_submitLitEvent()">Save</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('lit-form-area').innerHTML=''">Cancel</button>
      </div>
    </div>
  `;

  // Set auto-title for the default selection
  _litAutoTitle();
}

function _litAutoTitle() {
  const typeVal = document.getElementById("lit-evt-type")?.value;
  const titleInput = document.getElementById("lit-evt-title");
  const detailsEl = document.getElementById("lit-evt-details");
  const hintEl = document.getElementById("lit-detail-hint");

  if (titleInput && (!titleInput.value || Object.values(LIT_TITLE_SUGGESTIONS).includes(titleInput.value))) {
    titleInput.value = LIT_TITLE_SUGGESTIONS[typeVal] || "";
  }
  if (detailsEl) {
    detailsEl.placeholder = LIT_STATUS_LABELS[typeVal] || "";
  }
  if (hintEl) {
    hintEl.textContent = "Suggested: " + (LIT_STATUS_LABELS[typeVal] || "");
  }
}

// ─── Submit event ─────────────────────────────────────────────────

async function _submitLitEvent() {
  const evtType = document.getElementById("lit-evt-type")?.value;
  const title = document.getElementById("lit-evt-title")?.value?.trim();
  const date = document.getElementById("lit-evt-date")?.value?.trim();
  const details = document.getElementById("lit-evt-details")?.value?.trim();
  const status = document.getElementById("lit-evt-status")?.value || "pending";

  if (!title || !date) {
    showToast("Title and date are required", "error");
    return;
  }

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${LITIGATION_API}/api/litigation-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        case_id: _litSelectedCaseId,
        event_type: evtType,
        title,
        event_date: date,
        details,
        status,
      }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    document.getElementById("lit-form-area").innerHTML = "";
    showToast("Event added");
    _fetchLitEvents();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
}

// ─── Delete event ─────────────────────────────────────────────────

async function _deleteLitEvent(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${LITIGATION_API}/api/litigation-events/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    showToast("Event deleted");
    _fetchLitEvents();
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}
