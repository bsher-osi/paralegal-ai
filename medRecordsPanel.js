// ─── Medical Record Review Panel ──────────────────────────────────
// Record tracking per case + AI-powered summarization

const MEDREC_API = "https://tools.sherlawgroup.com";

function renderMedRecordsPanel() {
  const container = document.getElementById("medrecords-content");
  if (!container) return;
  const cases = typeof loadCases === "function" ? loadCases() : [];

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <select id="medrec-case-filter" onchange="_fetchMedRecords()" style="padding:6px 10px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)">
        <option value="">All Cases</option>
        ${cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`).join("")}
      </select>
      <button class="btn btn-primary btn-sm" onclick="_showAddMedRecord()">+ Add Record</button>
      <button class="btn btn-outline btn-sm" onclick="_showAiSummary()">Summarize with AI</button>
    </div>
    <div id="medrec-form-area"></div>
    <div id="medrec-table"><p style="color:var(--text-muted)">Loading...</p></div>
    <div id="medrec-ai-area"></div>
  `;
  _fetchMedRecords();
}

async function _fetchMedRecords() {
  const caseId = document.getElementById("medrec-case-filter")?.value || "";
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  const url = caseId ? `${MEDREC_API}/api/medical-records?caseId=${caseId}` : `${MEDREC_API}/api/medical-records`;
  try {
    const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const items = await resp.json();
    _renderMedRecTable(items);
  } catch (err) {
    document.getElementById("medrec-table").innerHTML = `<div class="agent-error">${escapeHtml(err.message)}</div>`;
  }
}

function _renderMedRecTable(items) {
  const el = document.getElementById("medrec-table");
  if (!items.length) { el.innerHTML = `<p style="color:var(--text-muted)">No medical records tracked yet.</p>`; return; }

  const statusColors = { pending: "#f59e0b", received: "#3b82f6", reviewed: "#22c55e" };
  const rows = items.map(i => `
    <tr>
      <td>${escapeHtml(i.provider || "")}</td>
      <td>${escapeHtml(i.record_type || "")}</td>
      <td>${i.date_requested || ""}</td>
      <td>${i.date_received || ""}</td>
      <td><span class="deadline-badge" style="background:${statusColors[i.status] || '#6b7280'}">${i.status}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(i.notes || "")}">${escapeHtml(i.notes || "")}</td>
      <td style="display:flex;gap:4px">
        ${i.status === 'pending' ? `<button class="btn btn-sm" onclick="_updateMedRecStatus('${i.id}','received')" style="padding:1px 6px;font-size:10px">Received</button>` : ""}
        ${i.status === 'received' ? `<button class="btn btn-sm" onclick="_updateMedRecStatus('${i.id}','reviewed')" style="padding:1px 6px;font-size:10px">Reviewed</button>` : ""}
        <button class="btn btn-sm" onclick="_deleteMedRec('${i.id}')" style="padding:1px 6px;font-size:10px;color:var(--text-muted)">X</button>
      </td>
    </tr>`).join("");

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Provider</th><th>Type</th><th>Requested</th><th>Received</th><th>Status</th><th>Notes</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function _showAddMedRecord() {
  const area = document.getElementById("medrec-form-area");
  const cases = typeof loadCases === "function" ? loadCases() : [];
  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">Track Medical Record</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:160px"><label>Case</label>
          <select id="mr-case">${cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`).join("")}</select></div>
        <div class="form-group" style="flex:1;min-width:160px"><label>Provider</label><input type="text" id="mr-provider" placeholder="Hospital, clinic..."></div>
        <div class="form-group" style="flex:1;min-width:140px"><label>Record Type</label>
          <select id="mr-type"><option>Medical Records</option><option>Imaging</option><option>Lab Results</option><option>Billing Records</option><option>Pharmacy</option><option>Other</option></select></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1"><label>Date Requested</label><input type="date" id="mr-requested"></div>
        <div class="form-group" style="flex:1"><label>Date Received</label><input type="date" id="mr-received"></div>
        <div class="form-group" style="flex:1"><label>Notes</label><input type="text" id="mr-notes" placeholder="Optional"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="_submitMedRec()">Save</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('medrec-form-area').innerHTML=''">Cancel</button>
      </div>
    </div>`;
}

async function _submitMedRec() {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  const data = {
    case_id: document.getElementById("mr-case")?.value,
    provider: document.getElementById("mr-provider")?.value?.trim(),
    record_type: document.getElementById("mr-type")?.value,
    date_requested: document.getElementById("mr-requested")?.value,
    date_received: document.getElementById("mr-received")?.value,
    status: document.getElementById("mr-received")?.value ? "received" : "pending",
    notes: document.getElementById("mr-notes")?.value?.trim(),
  };
  try {
    const resp = await fetch(`${MEDREC_API}/api/medical-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    document.getElementById("medrec-form-area").innerHTML = "";
    showToast("Record saved");
    _fetchMedRecords();
  } catch (err) { showToast("Failed: " + err.message, "error"); }
}

async function _updateMedRecStatus(id, status) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  const data = { status };
  if (status === "received") data.date_received = new Date().toISOString().split("T")[0];
  await fetch(`${MEDREC_API}/api/medical-records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  _fetchMedRecords();
}

async function _deleteMedRec(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  await fetch(`${MEDREC_API}/api/medical-records/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  _fetchMedRecords();
}

function _showAiSummary() {
  const area = document.getElementById("medrec-ai-area");
  area.innerHTML = `
    <div class="settings-section" style="margin-top:16px">
      <h2 style="margin:0 0 12px">AI Medical Record Summary</h2>
      <div class="form-group"><label>Paste medical record text</label>
        <textarea id="medrec-ai-text" rows="8" placeholder="Paste the text content of medical records here for AI analysis..."></textarea></div>
      <button class="btn btn-primary btn-sm" onclick="_summarizeMedRecords()" id="medrec-ai-btn">Summarize</button>
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('medrec-ai-area').innerHTML=''">Cancel</button>
      <div id="medrec-ai-output" style="margin-top:12px"></div>
    </div>`;
}

async function _summarizeMedRecords() {
  const text = document.getElementById("medrec-ai-text")?.value?.trim();
  if (!text) { showToast("Paste medical record text", "error"); return; }
  const apiKey = getClaudeApiKey();
  if (!apiKey) { showToast("Set Claude API key in Settings", "error"); return; }

  const btn = document.getElementById("medrec-ai-btn");
  const output = document.getElementById("medrec-ai-output");
  btn.disabled = true; btn.textContent = "Analyzing...";
  output.innerHTML = `<div class="agent-loading"><div class="spinner"></div><span>Analyzing records...</span></div>`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "x-api-key": apiKey,
        "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 4096,
        system: `You are a medical record analyst for a personal injury law firm. Analyze the provided medical records and extract key information in this exact format:

## Diagnoses
## Treatments & Procedures
## Providers & Facilities
## Timeline of Care
## Prognosis & Future Treatment
## Key Findings for Case

Be thorough and accurate. Flag any inconsistencies or gaps in the records.`,
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await resp.json();
    const result = data.content?.[0]?.text || "No response";
    output.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-top:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <strong>Analysis</strong>
          <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('medrec-result-text').innerText).then(()=>showToast('Copied'))">Copy</button>
        </div>
        <div id="medrec-result-text" class="research-output-text">${typeof _markdownToHtml === 'function' ? _markdownToHtml(result) : result.replace(/\n/g,'<br>')}</div>
      </div>`;
  } catch (err) {
    output.innerHTML = `<div class="agent-error">${escapeHtml(err.message)}</div>`;
  } finally { btn.disabled = false; btn.textContent = "Summarize"; }
}
