// ─── Record Request Letters Panel ─────────────────────────────────
// Template generator + request tracking with follow-up alerts

const REQUESTS_API = "https://tools.sherlawgroup.com";

const REQUEST_TEMPLATES = {
  "Medical Records": {
    subject: "Request for Medical Records",
    body: (d) => `Dear Records Department,

I am writing on behalf of my client, ${d.clientName}, to request copies of all medical records related to treatment provided at your facility.

Patient Name: ${d.clientName}
Date(s) of Treatment: ${d.dateRange}
Date of Birth: ${d.dob || "[DOB]"}

Please provide:
- Complete medical records including office notes, test results, imaging reports, and discharge summaries
- Itemized billing statements
- Any operative reports or procedure notes

Enclosed please find a signed HIPAA authorization form. Please forward the requested records to our office at your earliest convenience.

If you have any questions, please contact our office at the number below.

Sincerely,
${d.firmName}
${d.attorneyName}
${d.attorneyEmail}`,
  },
  "Police Report": {
    subject: "Request for Traffic Collision Report",
    body: (d) => `Dear Records Division,

I am writing to request a copy of the traffic collision report for the following incident:

Date of Incident: ${d.dateRange}
Location: ${d.location || "[Location]"}
Involved Party: ${d.clientName}
Report Number: ${d.reportNumber || "[Report #]"}

Please forward the report to our office. Payment for any applicable fees is enclosed/will be provided upon notification.

Sincerely,
${d.firmName}
${d.attorneyName}`,
  },
  "Employment Records": {
    subject: "Request for Employment Records",
    body: (d) => `Dear Human Resources Department,

I am writing on behalf of my client, ${d.clientName}, to request copies of employment records including:

- Employment dates and position history
- Wage and salary information
- Records of time missed from work
- Any workers' compensation claims

Employee Name: ${d.clientName}
Dates of Employment: ${d.dateRange}

Enclosed please find a signed authorization from ${d.clientName}. Please forward the requested records to our office.

Sincerely,
${d.firmName}
${d.attorneyName}`,
  },
  "Insurance Records": {
    subject: "Request for Insurance Policy Information",
    body: (d) => `Dear Claims Department,

I am writing regarding a claim involving my client, ${d.clientName}.

Claim Number: ${d.claimNumber || "[Claim #]"}
Date of Loss: ${d.dateRange}

Please provide copies of:
- The complete insurance policy, including all endorsements and declarations pages
- Policy limits information
- Coverage verification

Sincerely,
${d.firmName}
${d.attorneyName}`,
  },
  "Billing Records": {
    subject: "Request for Billing Records",
    body: (d) => `Dear Billing Department,

I am writing on behalf of my client, ${d.clientName}, to request itemized billing records for all services provided.

Patient Name: ${d.clientName}
Date(s) of Service: ${d.dateRange}

Please provide:
- Itemized billing statements for all dates of service
- Explanation of benefits (EOBs)
- Payment history and outstanding balances
- Any lien or balance information

Enclosed please find a signed HIPAA authorization. Please forward records to our office.

Sincerely,
${d.firmName}
${d.attorneyName}`,
  },
};

function renderRequestsPanel() {
  const container = document.getElementById("requests-content");
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="_showRequestGenerator()">Generate Letter</button>
      <button class="btn btn-outline btn-sm" onclick="_fetchRequests()">Refresh Tracker</button>
    </div>
    <div id="request-gen-area"></div>

    <div class="settings-section">
      <h2 style="margin:0 0 12px">Request Tracker</h2>
      <div id="requests-table"><p style="color:var(--text-muted)">Loading...</p></div>
    </div>
  `;
  _fetchRequests();
}

async function _fetchRequests() {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${REQUESTS_API}/api/record-requests`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const items = await resp.json();
    _renderRequestsTable(items);
  } catch (err) {
    document.getElementById("requests-table").innerHTML = `<div class="agent-error">${escapeHtml(err.message)}</div>`;
  }
}

function _renderRequestsTable(items) {
  const el = document.getElementById("requests-table");
  if (!items.length) { el.innerHTML = `<p style="color:var(--text-muted)">No requests tracked yet. Click "Generate Letter" to create one.</p>`; return; }

  const today = new Date(); today.setHours(0,0,0,0);
  const rows = items.map(i => {
    const isOverdue = i.status === "sent" && i.follow_up_date && new Date(i.follow_up_date) < today;
    const statusColor = i.status === "received" ? "#22c55e" : isOverdue ? "#ef4444" : i.status === "sent" ? "#3b82f6" : "#6b7280";
    const displayStatus = isOverdue ? "overdue" : i.status;
    return `
      <tr>
        <td>${escapeHtml(i.request_type || "")}</td>
        <td>${escapeHtml(i.provider_name || "")}</td>
        <td>${i.date_sent || ""}</td>
        <td>${i.follow_up_date || ""}</td>
        <td><span class="deadline-badge" style="background:${statusColor}">${displayStatus}</span></td>
        <td style="display:flex;gap:4px">
          ${i.status === 'draft' ? `<button class="btn btn-sm" onclick="_markRequestSent('${i.id}')" style="padding:1px 6px;font-size:10px">Sent</button>` : ""}
          ${i.status === 'sent' || isOverdue ? `<button class="btn btn-sm" onclick="_markRequestReceived('${i.id}')" style="padding:1px 6px;font-size:10px">Received</button>` : ""}
          <button class="btn btn-sm" onclick="_deleteRequest('${i.id}')" style="padding:1px 6px;font-size:10px;color:var(--text-muted)">X</button>
        </td>
      </tr>`;
  }).join("");

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Type</th><th>Provider</th><th>Sent</th><th>Follow-up</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function _showRequestGenerator() {
  const area = document.getElementById("request-gen-area");
  const cases = typeof loadCases === "function" ? loadCases() : [];
  const types = Object.keys(REQUEST_TEMPLATES);

  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">Generate Request Letter</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:160px"><label>Request Type</label>
          <select id="rq-type">${types.map(t => `<option>${t}</option>`).join("")}</select></div>
        <div class="form-group" style="flex:1;min-width:160px"><label>Case</label>
          <select id="rq-case" onchange="_autoFillRequest()">${cases.map(c => `<option value="${c.id}" data-name="${escapeHtml(c.clientName)}">${escapeHtml(c.clientName)}</option>`).join("")}</select></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:160px"><label>Provider / Agency</label><input type="text" id="rq-provider" placeholder="Name of provider or agency"></div>
        <div class="form-group" style="flex:1;min-width:200px"><label>Provider Address</label><input type="text" id="rq-address" placeholder="Full address"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1"><label>Date Range</label><input type="text" id="rq-daterange" placeholder="e.g., January 2025 - Present"></div>
        <div class="form-group" style="flex:1"><label>Follow-up Date</label><input type="date" id="rq-followup"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="_generateLetter()">Generate Letter</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('request-gen-area').innerHTML=''">Cancel</button>
      </div>
      <div id="rq-letter-output" style="margin-top:12px"></div>
    </div>`;

  // Default follow-up to 30 days from now
  const fu = new Date(); fu.setDate(fu.getDate() + 30);
  document.getElementById("rq-followup").value = fu.toISOString().split("T")[0];
}

function _autoFillRequest() {
  const sel = document.getElementById("rq-case");
  const name = sel?.selectedOptions[0]?.dataset?.name || "";
  // Could auto-fill more fields from case data if available
}

async function _generateLetter() {
  const type = document.getElementById("rq-type")?.value;
  const caseId = document.getElementById("rq-case")?.value;
  const clientName = document.getElementById("rq-case")?.selectedOptions[0]?.dataset?.name || "";
  const provider = document.getElementById("rq-provider")?.value?.trim();
  const address = document.getElementById("rq-address")?.value?.trim();
  const dateRange = document.getElementById("rq-daterange")?.value?.trim();
  const followUp = document.getElementById("rq-followup")?.value;

  const template = REQUEST_TEMPLATES[type];
  if (!template) return;

  const letter = template.body({
    clientName: clientName || "[Client Name]",
    dateRange: dateRange || "[Date Range]",
    firmName: "Sher Law Group",
    attorneyName: "Yelena Shimonova Sher, Esq.",
    attorneyEmail: "yelena@sherlawgroup.com",
  });

  const output = document.getElementById("rq-letter-output");
  output.innerHTML = `
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:20px;margin-top:12px;white-space:pre-wrap;font-family:serif;font-size:14px;line-height:1.6" id="rq-letter-text">${escapeHtml(letter)}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-primary btn-sm" onclick="_saveAndTrackRequest()">Save & Track</button>
      <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('rq-letter-text').innerText).then(()=>showToast('Copied'))">Copy</button>
    </div>`;
}

async function _saveAndTrackRequest() {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  const data = {
    case_id: document.getElementById("rq-case")?.value,
    request_type: document.getElementById("rq-type")?.value,
    provider_name: document.getElementById("rq-provider")?.value?.trim(),
    provider_address: document.getElementById("rq-address")?.value?.trim(),
    follow_up_date: document.getElementById("rq-followup")?.value,
    status: "draft",
    letter_content: document.getElementById("rq-letter-text")?.innerText || "",
  };
  try {
    const resp = await fetch(`${REQUESTS_API}/api/record-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    document.getElementById("request-gen-area").innerHTML = "";
    showToast("Request saved to tracker");
    _fetchRequests();
  } catch (err) { showToast("Save failed: " + err.message, "error"); }
}

async function _markRequestSent(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  await fetch(`${REQUESTS_API}/api/record-requests/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ status: "sent", date_sent: new Date().toISOString().split("T")[0] }),
  });
  _fetchRequests();
}

async function _markRequestReceived(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  await fetch(`${REQUESTS_API}/api/record-requests/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ status: "received" }),
  });
  _fetchRequests();
}

async function _deleteRequest(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  await fetch(`${REQUESTS_API}/api/record-requests/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  _fetchRequests();
}
