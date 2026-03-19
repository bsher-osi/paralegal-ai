// ─── Lien & Specials Tracking Panel ───────────────────────────────
// Medical bills table with running totals + AI extraction from PDFs

const SPECIALS_API = "https://tools.sherlawgroup.com";

function renderLiensPanel() {
  const container = document.getElementById("liens-content");
  if (!container) return;
  const cases = typeof loadCases === "function" ? loadCases() : [];

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <select id="liens-case-filter" onchange="_fetchSpecials()" style="padding:6px 10px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)">
        <option value="">All Cases</option>
        ${cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`).join("")}
      </select>
      <button class="btn btn-primary btn-sm" onclick="_showAddSpecial()">+ Add Entry</button>
      <button class="btn btn-outline btn-sm" onclick="_showExtractBill()">Upload Bill (AI Extract)</button>
    </div>
    <div id="add-special-area"></div>
    <div id="specials-table"><p style="color:var(--text-muted)">Loading...</p></div>
  `;
  _fetchSpecials();
}

async function _fetchSpecials() {
  const caseId = document.getElementById("liens-case-filter")?.value || "";
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  const url = caseId ? `${SPECIALS_API}/api/specials?caseId=${caseId}` : `${SPECIALS_API}/api/specials`;
  try {
    const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const items = await resp.json();
    _renderSpecialsTable(items);
  } catch (err) {
    document.getElementById("specials-table").innerHTML = `<div class="agent-error">${escapeHtml(err.message)}</div>`;
  }
}

function _renderSpecialsTable(items) {
  const el = document.getElementById("specials-table");
  if (!items.length) { el.innerHTML = `<p style="color:var(--text-muted)">No specials entries yet.</p>`; return; }

  let totalBilled = 0, totalAdj = 0, totalLien = 0, totalBal = 0;
  items.forEach(i => {
    totalBilled += Number(i.billed_amount) || 0;
    totalAdj += Number(i.adjusted_amount) || 0;
    totalLien += Number(i.lien_amount) || 0;
    totalBal += Number(i.balance) || 0;
  });

  const rows = items.map(i => `
    <tr>
      <td>${escapeHtml(i.provider || "")}</td>
      <td>${i.date_of_service || ""}</td>
      <td>${escapeHtml(i.description || "")}</td>
      <td style="text-align:right">$${_fmt(i.billed_amount)}</td>
      <td style="text-align:right">$${_fmt(i.adjusted_amount)}</td>
      <td>${escapeHtml(i.paid_by || "")}</td>
      <td style="text-align:right">$${_fmt(i.lien_amount)}</td>
      <td style="text-align:right">$${_fmt(i.balance)}</td>
      <td><span class="deadline-badge" style="background:${i.status === 'resolved' ? '#22c55e' : i.status === 'lien' ? '#ef4444' : '#f59e0b'}">${i.status}</span></td>
      <td><button class="btn btn-sm" onclick="_deleteSpecial('${i.id}')" style="padding:1px 6px;font-size:10px;color:var(--text-muted)">X</button></td>
    </tr>`).join("");

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>
          <th>Provider</th><th>Date</th><th>Description</th><th>Billed</th><th>Adjusted</th><th>Paid By</th><th>Lien</th><th>Balance</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">
          <td colspan="3">Totals</td>
          <td style="text-align:right">$${_fmt(totalBilled)}</td>
          <td style="text-align:right">$${_fmt(totalAdj)}</td>
          <td></td>
          <td style="text-align:right">$${_fmt(totalLien)}</td>
          <td style="text-align:right">$${_fmt(totalBal)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
    </div>`;
}

function _fmt(n) { return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function _showAddSpecial() {
  const area = document.getElementById("add-special-area");
  const cases = typeof loadCases === "function" ? loadCases() : [];
  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">Add Medical Bill / Lien</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:160px"><label>Case</label>
          <select id="sp-case">${cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`).join("")}</select></div>
        <div class="form-group" style="flex:1;min-width:160px"><label>Provider</label><input type="text" id="sp-provider" placeholder="Hospital, clinic..."></div>
        <div class="form-group" style="flex:1;min-width:120px"><label>Date of Service</label><input type="date" id="sp-dos"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1"><label>Description</label><input type="text" id="sp-desc" placeholder="ER visit, MRI, etc."></div>
        <div class="form-group" style="flex:1"><label>Billed ($)</label><input type="number" id="sp-billed" step="0.01" value="0"></div>
        <div class="form-group" style="flex:1"><label>Adjusted ($)</label><input type="number" id="sp-adj" step="0.01" value="0"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1"><label>Paid By</label><input type="text" id="sp-paidby" placeholder="Insurance, patient..."></div>
        <div class="form-group" style="flex:1"><label>Lien ($)</label><input type="number" id="sp-lien" step="0.01" value="0"></div>
        <div class="form-group" style="flex:1"><label>Balance ($)</label><input type="number" id="sp-balance" step="0.01" value="0"></div>
        <div class="form-group" style="flex:1"><label>Status</label>
          <select id="sp-status"><option>outstanding</option><option>lien</option><option>resolved</option></select></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="_submitSpecial()">Save</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('add-special-area').innerHTML=''">Cancel</button>
      </div>
    </div>`;
}

async function _submitSpecial(prefill) {
  const data = prefill || {
    case_id: document.getElementById("sp-case")?.value,
    provider: document.getElementById("sp-provider")?.value?.trim(),
    date_of_service: document.getElementById("sp-dos")?.value,
    description: document.getElementById("sp-desc")?.value?.trim(),
    billed_amount: parseFloat(document.getElementById("sp-billed")?.value) || 0,
    adjusted_amount: parseFloat(document.getElementById("sp-adj")?.value) || 0,
    paid_by: document.getElementById("sp-paidby")?.value?.trim(),
    lien_amount: parseFloat(document.getElementById("sp-lien")?.value) || 0,
    balance: parseFloat(document.getElementById("sp-balance")?.value) || 0,
    status: document.getElementById("sp-status")?.value || "outstanding",
  };
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`${SPECIALS_API}/api/specials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    document.getElementById("add-special-area").innerHTML = "";
    showToast("Entry saved");
    _fetchSpecials();
  } catch (err) { showToast("Save failed: " + err.message, "error"); }
}

async function _deleteSpecial(id) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  await fetch(`${SPECIALS_API}/api/specials/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  _fetchSpecials();
}

function _showExtractBill() {
  const area = document.getElementById("add-special-area");
  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">Extract from Bill (AI)</div>
      <div class="form-group"><label>Paste bill text or upload content</label>
        <textarea id="bill-text" rows="6" placeholder="Paste the text content of a medical bill or EOB here..."></textarea></div>
      <button class="btn btn-primary btn-sm" onclick="_extractBill()">Extract with AI</button>
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('add-special-area').innerHTML=''">Cancel</button>
    </div>`;
}

async function _extractBill() {
  const text = document.getElementById("bill-text")?.value?.trim();
  if (!text) { showToast("Paste bill text first", "error"); return; }
  const apiKey = localStorage.getItem("claude_api_key");
  if (!apiKey) { showToast("Set Claude API key in Settings", "error"); return; }

  showToast("Extracting...");
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "x-api-key": apiKey,
        "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1024,
        system: "Extract medical billing data from the provided text. Return ONLY a JSON object with these fields: provider (string), date_of_service (YYYY-MM-DD), description (string), billed_amount (number), adjusted_amount (number), paid_by (string), lien_amount (number), balance (number). If a field is unknown, use empty string or 0.",
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await resp.json();
    const raw = data.content?.[0]?.text || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const extracted = JSON.parse(match[0]);
    _showAddSpecial();
    if (extracted.provider) document.getElementById("sp-provider").value = extracted.provider;
    if (extracted.date_of_service) document.getElementById("sp-dos").value = extracted.date_of_service;
    if (extracted.description) document.getElementById("sp-desc").value = extracted.description;
    if (extracted.billed_amount) document.getElementById("sp-billed").value = extracted.billed_amount;
    if (extracted.adjusted_amount) document.getElementById("sp-adj").value = extracted.adjusted_amount;
    if (extracted.paid_by) document.getElementById("sp-paidby").value = extracted.paid_by;
    if (extracted.lien_amount) document.getElementById("sp-lien").value = extracted.lien_amount;
    if (extracted.balance) document.getElementById("sp-balance").value = extracted.balance;
    showToast("Extracted — review and save");
  } catch (err) { showToast("Extraction failed: " + err.message, "error"); }
}
