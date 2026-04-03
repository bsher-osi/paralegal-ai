// faxPanel.js — Standalone Fax tool panel
// Renders a full fax form: select case → auto-fills recipient info,
// compose message, attach file, send via /api/fax/send

function renderFaxPanel() {
  const container = document.getElementById("fax-content");
  if (!container) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const caseOpts = cases
    .map(c => `<option value="${c.id}">${escapeHtml(c.clientName || "Unknown")} — ${escapeHtml(c.caseType || "")} (${escapeHtml(c.stage || "")})</option>`)
    .join("");

  container.innerHTML = `
    <div style="max-width:680px">

      <!-- Case selector -->
      <div class="settings-section" style="margin-bottom:0">
        <div class="form-group">
          <label>Select Case <span style="color:var(--text-muted);font-weight:400">(auto-fills recipient info)</span></label>
          <select id="fax-panel-case" onchange="prefillFaxFromCase(this.value)" style="width:100%">
            <option value="">— No case / manual entry —</option>
            ${caseOpts}
          </select>
        </div>

        <!-- Case context banner (populated by prefillFaxFromCase) -->
        <div id="fax-case-banner" style="display:none;background:var(--bg-card);border-left:3px solid var(--accent);border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px"></div>
      </div>

      <hr style="border-color:var(--border);margin:16px 0">

      <!-- Recipient -->
      <div class="settings-section">
        <h3 style="margin:0 0 12px;font-size:14px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">Recipient</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="form-group" style="flex:1;min-width:200px">
            <label>Fax Number <span style="color:#ef4444">*</span></label>
            <input id="fax-panel-number" type="tel" placeholder="4805551234"
              style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:14px;box-sizing:border-box">
          </div>
          <div class="form-group" style="flex:1;min-width:200px">
            <label>Recipient Name</label>
            <input id="fax-panel-toname" type="text" placeholder="e.g. Allstate — Jane Smith"
              style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:14px;box-sizing:border-box">
          </div>
        </div>
        <div class="form-group">
          <label>Subject</label>
          <input id="fax-panel-subject" type="text" placeholder="Re: Claim #..."
            style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:14px;box-sizing:border-box">
        </div>
      </div>

      <hr style="border-color:var(--border);margin:16px 0">

      <!-- Message -->
      <div class="settings-section">
        <h3 style="margin:0 0 12px;font-size:14px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">Cover Sheet Message</h3>
        <div class="form-group">
          <textarea id="fax-panel-message" rows="7" placeholder="Type the body of your fax cover sheet here…"
            style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:14px;box-sizing:border-box;resize:vertical;font-family:inherit"></textarea>
        </div>
        <!-- Quick message templates -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          <span style="font-size:12px;color:var(--text-muted);align-self:center">Quick insert:</span>
          ${[
            ["Demand Package", "Please find enclosed our client's demand package for your review and response within 30 days. Please contact our office with any questions."],
            ["LOR", "Please be advised that this office represents the above-referenced claimant. Please direct all future correspondence to our office."],
            ["Records Request", "Please provide copies of all records, reports, and documentation related to the above claim number at your earliest convenience."],
            ["Follow-up", "This fax is a follow-up to our previous correspondence. Please respond at your earliest convenience."],
          ].map(([label, text]) =>
            `<button type="button" onclick="document.getElementById('fax-panel-message').value=${JSON.stringify(text)}"
              class="btn btn-outline" style="font-size:11px;padding:3px 8px">${label}</button>`
          ).join("")}
        </div>
      </div>

      <hr style="border-color:var(--border);margin:16px 0">

      <!-- Attachment -->
      <div class="settings-section">
        <h3 style="margin:0 0 12px;font-size:14px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">Attachment (PDF)</h3>

        <!-- From case documents -->
        <div class="form-group" id="fax-panel-docs-group" style="display:none">
          <label>Attach saved document</label>
          <select id="fax-panel-doc-select"
            style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:13px">
            <option value="">— Cover sheet only —</option>
          </select>
        </div>

        <!-- Or upload new -->
        <div class="form-group">
          <label>Or upload a file</label>
          <div style="display:flex;align-items:center;gap:10px">
            <label class="btn btn-outline" style="cursor:pointer;margin:0;font-size:13px">
              📎 Choose File
              <input type="file" id="fax-panel-file" accept=".pdf,.doc,.docx,.png,.jpg" style="display:none"
                onchange="_faxPanelFileChosen(this)">
            </label>
            <span id="fax-panel-filename" style="font-size:13px;color:var(--text-muted)">No file chosen</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
            PDF recommended. File uploads to server first, then faxed.
          </div>
        </div>
      </div>

      <hr style="border-color:var(--border);margin:16px 0">

      <!-- Send button + status -->
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button id="fax-panel-send-btn" onclick="_sendFaxFromPanel()"
          class="btn btn-primary" style="padding:10px 28px;font-size:15px">
          📠 Send Fax
        </button>
        <div id="fax-panel-status" style="font-size:13px"></div>
      </div>

      <!-- Fax log -->
      <div id="fax-panel-log" style="margin-top:24px"></div>

    </div>
  `;
}

/**
 * Pre-fill all fax fields from a case object.
 * Called from case selector onchange, or from openFaxForCase().
 */
async function prefillFaxFromCase(caseId) {
  // Update the dropdown if we were called programmatically
  const sel = document.getElementById("fax-panel-case");
  if (sel && sel.value !== caseId) sel.value = caseId;

  const banner = document.getElementById("fax-case-banner");

  if (!caseId) {
    if (banner) { banner.style.display = "none"; banner.innerHTML = ""; }
    _faxPanelLoadDocs(null);
    return;
  }

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const c = cases.find(x => x.id === caseId);
  if (!c) return;

  const get = (...keys) => { for (const k of keys) if (c[k]) return c[k]; return ""; };

  // Fax number — prefer adjuster fax, fall back to adjuster email domain
  const faxNum = get("adjusterFax", "adjuster_fax").replace(/\D/g, "");
  const toName = [
    get("adjusterName", "adjuster_name"),
    get("insuranceCompany", "insurance_company"),
  ].filter(Boolean).join(" — ");
  const claimNum = get("claimNumber", "claim_number");
  const subject = `Re: ${c.clientName || ""}${claimNum ? " — Claim #" + claimNum : ""}`;

  _faxSetField("fax-panel-number",  faxNum);
  _faxSetField("fax-panel-toname",  toName);
  _faxSetField("fax-panel-subject", subject);

  // Context banner
  if (banner) {
    const insurer  = get("insuranceCompany", "insurance_company");
    const adjEmail = get("adjusterEmail", "adjuster_email");
    const dol      = get("dateOfIncident", "date_of_incident");
    banner.style.display = "block";
    banner.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px">${escapeHtml(c.clientName || "")} — ${escapeHtml(c.caseType || "")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;color:var(--text-muted)">
        ${insurer   ? `<span>🏢 ${escapeHtml(insurer)}</span>` : ""}
        ${claimNum  ? `<span>📋 ${escapeHtml(claimNum)}</span>` : ""}
        ${faxNum    ? `<span>📠 ${faxNum.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}</span>` : "<span style='color:#f59e0b'>⚠ No fax number on file</span>"}
        ${adjEmail  ? `<span>📧 ${escapeHtml(adjEmail)}</span>` : ""}
        ${dol       ? `<span>📅 DOL: ${escapeHtml(dol)}</span>` : ""}
      </div>
    `;
  }

  // Load case documents into attachment dropdown
  _faxPanelLoadDocs(caseId);
}

async function _faxPanelLoadDocs(caseId) {
  const group  = document.getElementById("fax-panel-docs-group");
  const select = document.getElementById("fax-panel-doc-select");
  if (!group || !select) return;

  if (!caseId) { group.style.display = "none"; return; }

  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const r = await fetch(`${typeof API_BASE !== "undefined" ? API_BASE : ""}/api/case-documents?caseId=${encodeURIComponent(caseId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) return;
    const docs = await r.json();
    const opts = docs.filter(d => { try { return JSON.parse(d.metadata || "{}").filename; } catch { return false; } });
    if (!opts.length) { group.style.display = "none"; return; }

    select.innerHTML = `<option value="">— Cover sheet only —</option>` +
      opts.map(d => {
        let fn = ""; try { fn = JSON.parse(d.metadata).filename; } catch {}
        return `<option value="${escapeHtml(fn)}">${escapeHtml(d.title || fn)}</option>`;
      }).join("");
    group.style.display = "block";
  } catch { group.style.display = "none"; }
}

function _faxSetField(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.value = value;
}

function _faxPanelFileChosen(input) {
  const label = document.getElementById("fax-panel-filename");
  if (label) label.textContent = input.files[0]?.name || "No file chosen";
}

async function _sendFaxFromPanel() {
  const toFax   = (document.getElementById("fax-panel-number")?.value || "").replace(/\D/g, "");
  const toName  = document.getElementById("fax-panel-toname")?.value || "";
  const subject = document.getElementById("fax-panel-subject")?.value || "Fax from Sher Law Group";
  const message = document.getElementById("fax-panel-message")?.value || "";
  const caseId  = document.getElementById("fax-panel-case")?.value || "";
  const statusEl = document.getElementById("fax-panel-status");
  const btn      = document.getElementById("fax-panel-send-btn");
  const logEl    = document.getElementById("fax-panel-log");

  if (toFax.length < 10) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444">Enter a valid 10-digit fax number.</span>`;
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  if (statusEl) statusEl.innerHTML = `<span style="color:var(--text-muted)">Queuing fax…</span>`;

  const token = typeof getIdToken === "function" ? await getIdToken() : null;

  // If a new file was chosen, upload it first
  let filename = document.getElementById("fax-panel-doc-select")?.value || "";
  const fileInput = document.getElementById("fax-panel-file");
  if (fileInput?.files[0]) {
    try {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--text-muted)">Uploading file…</span>`;
      const form = new FormData();
      form.append("file", fileInput.files[0]);
      form.append("caseId", caseId || "fax-upload");
      form.append("title", fileInput.files[0].name);
      const uploadResp = await fetch(`${typeof API_BASE !== "undefined" ? API_BASE : ""}/api/case-documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (uploadResp.ok) {
        const uploadData = await uploadResp.json();
        filename = uploadData.filename || filename;
      }
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444">Upload failed: ${escapeHtml(err.message)}</span>`;
      if (btn) { btn.disabled = false; btn.textContent = "📠 Send Fax"; }
      return;
    }
  }

  try {
    const resp = await fetch(`${typeof API_BASE !== "undefined" ? API_BASE : ""}/api/fax/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ caseId, toFax, toName, subject, message, filename }),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || `HTTP ${resp.status}`);

    const fmtNum = toFax.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    if (statusEl) statusEl.innerHTML = `<span style="color:#22c55e">✅ Fax sent to ${escapeHtml(fmtNum)}</span>`;
    showToast(`📠 Fax sent to ${fmtNum}`, "success");

    // Add to log
    if (logEl) {
      const now = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const entry = document.createElement("div");
      entry.style.cssText = "background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px";
      entry.innerHTML = `
        <div style="display:flex;justify-content:space-between">
          <span style="font-weight:600">📠 ${escapeHtml(fmtNum)} — ${escapeHtml(toName || subject)}</span>
          <span style="color:var(--text-muted)">${now}</span>
        </div>
        ${filename ? `<div style="color:var(--text-muted);font-size:12px;margin-top:2px">📎 ${escapeHtml(filename)}</div>` : ""}
      `;
      if (logEl.children.length === 0) {
        const header = document.createElement("div");
        header.style.cssText = "font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px";
        header.textContent = "Sent this session";
        logEl.prepend(header);
      }
      logEl.appendChild(entry);
    }

    // Clear file input
    if (fileInput) { fileInput.value = ""; }
    const fnLabel = document.getElementById("fax-panel-filename");
    if (fnLabel) fnLabel.textContent = "No file chosen";

  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444">Error: ${escapeHtml(err.message)}</span>`;
  }

  if (btn) { btn.disabled = false; btn.textContent = "📠 Send Fax"; }
}
