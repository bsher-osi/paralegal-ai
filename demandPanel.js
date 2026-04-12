// ─── Demand Letter Panel ──────────────────────────────────────────
// Renders the full demand letter form and handles submission to the
// Demands Flask API, job polling, and CRM case pre-fill.

const DEMANDS_API_BASE = "";

const FIRM_ATTORNEYS = {
  "Sher Law Group": [
    { name: "Yelena Shimonova Sher, Esq.", email: "yelena@sherlawgroup.com", title: "Attorney" },
  ],
  "LAW OFFICE OF FRANK A. CARRIZOZA, PLLC": [
    { name: "Frank A. Carrizoza, J.D.", email: "frank@carrizozalaw.com", title: "Attorney At Law" },
    { name: "Lowell Baudouin III, J.D.", email: "lowell@carrizozalaw.com", title: "Attorney At Law" },
    { name: "Yelena Shimonova, J.D., Of Counsel", email: "yelena@carrizozalaw.com", title: "Of Counsel" },
  ],
};

const AZ_AUTO_INSURERS = [
  "ACCC Insurance Company","Allied Property & Casualty Insurance Company","Allstate Fire and Casualty Insurance Company",
  "Allstate Insurance Company","American Access Casualty Company","American Family Connect Property and Casualty Insurance Company",
  "American Family Mutual Insurance Company, S.I.","American National Property and Casualty Company","Amica Mutual Insurance Company",
  "Auto Club Insurance Company of Southern California (AAA)","Auto-Owners Insurance Company","Bristol West Insurance Company",
  "Capital Insurance Group (CIG)","Commerce West Insurance Company (MAPFRE)","Country Mutual Insurance Company",
  "Country Preferred Insurance Company","CSAA Fire & Casualty Insurance Company (AAA)","CSAA General Insurance Company (AAA)",
  "Dairyland Insurance Company (Sentry)","Encompass Insurance Company","Esurance Insurance Company",
  "Farm Bureau Property & Casualty Insurance Company","Farmers Insurance Exchange","Farmers Automobile Insurance Association",
  "Garrison Property and Casualty Insurance Company (USAA)","GEICO Advantage Insurance Company","GEICO Casualty Company",
  "GEICO General Insurance Company","GEICO Indemnity Company","Grange Insurance Association","Hallmark Insurance Company",
  "Hanover American Insurance Company","Hartford Fire Insurance Company","Hartford Underwriters Insurance Company",
  "Horace Mann Insurance Company","Infinity Insurance Company (Kemper)","Kemper Preferred Insurance Company",
  "Liberty Mutual Fire Insurance Company","Merastar Insurance Company (Kemper)","Mercury Casualty Company",
  "Mercury Insurance Company of Arizona","Metropolitan Property and Casualty Insurance Company (MetLife/Foremost)",
  "Mutual of Enumclaw Insurance Company","National General Insurance Company","Nationwide Affinity Insurance Company of America",
  "Nationwide General Insurance Company","Nationwide Mutual Insurance Company","Progressive Advanced Insurance Company",
  "Progressive Classic Insurance Company","Progressive Direct Insurance Company","Progressive Northern Insurance Company",
  "Progressive Northwestern Insurance Company","Safeco Insurance Company of America (Liberty Mutual)","Sentry Insurance Company",
  "State Farm Fire and Casualty Company","State Farm Mutual Automobile Insurance Company","The General (Permanent General Assurance Corporation)",
  "The Travelers Home and Marine Insurance Company","Travelers Property Casualty Insurance Company","United Financial Casualty Company (Progressive)",
  "United Services Automobile Association (USAA)","USAA Casualty Insurance Company","Victoria Fire & Casualty Company (Progressive)",
  "21st Century Centennial Insurance Company","21st Century Premier Insurance Company",
].sort();

// ─── Form rendering ───────────────────────────────────────────────

function renderDemandPanel() {
  const container = document.getElementById("demand-content");
  if (!container) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const caseOpts = cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)} &mdash; ${escapeHtml(c.caseType)}</option>`).join("");
  const firmKeys = Object.keys(FIRM_ATTORNEYS);
  const insurerOpts = AZ_AUTO_INSURERS.map(n => `<option value="${escapeHtml(n)}">`).join("");

  container.innerHTML = `
    <div id="demand-case-context"></div>
    <form id="demand-form" class="agent-form" onsubmit="submitDemand(event)">

      <!-- Case pre-fill -->
      <div class="form-group">
        <label>Link to Case (optional)</label>
        <select id="demand-case-select" onchange="prefillFromCase(this.value)">
          <option value="">-- No case context --</option>
          ${caseOpts}
        </select>
      </div>

      <div class="demand-section-title">Destination</div>
      <div class="form-group">
        <label>Email demand to *</label>
        <input type="email" name="email_demand" required placeholder="adjuster@insurance.com">
      </div>

      <div class="demand-section-title">Law Firm & Attorney</div>
      <div class="demand-radio-row">
        ${firmKeys.map((f, i) => `<label class="demand-radio-chip"><input type="radio" name="firm" value="${escapeHtml(f)}" ${i === 0 ? 'checked' : ''} onchange="populateAttorney()">${escapeHtml(f)}</label>`).join("")}
      </div>
      <div class="form-group">
        <label>Attorney</label>
        <select name="attorney_name" id="demand-attorney-select"></select>
      </div>

      <div class="demand-section-title">Client Information</div>
      <div class="form-group"><label>Client Name *</label><input type="text" name="client_name" required></div>
      <div class="form-group">
        <label>Client's Insurance Company</label>
        <input type="text" name="client_coverage_insurer" list="demand-insurers" placeholder="Start typing...">
        <datalist id="demand-insurers">${insurerOpts}</datalist>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div>
          <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Client Role</label>
          <div class="demand-radio-row" style="margin-top:4px">
            <label class="demand-radio-chip"><input type="radio" name="client_role" value="Driver" checked>Driver</label>
            <label class="demand-radio-chip"><input type="radio" name="client_role" value="Passenger">Passenger</label>
          </div>
        </div>
        <div>
          <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Gender (pronouns)</label>
          <div class="demand-radio-row" style="margin-top:4px">
            <label class="demand-radio-chip"><input type="radio" name="client_gender" value="female">Female</label>
            <label class="demand-radio-chip"><input type="radio" name="client_gender" value="male">Male</label>
            <label class="demand-radio-chip"><input type="radio" name="client_gender" value="neutral" checked>Neutral</label>
          </div>
        </div>
      </div>

      <div class="demand-section-title">Opposing Party & Insurance</div>
      <div class="form-group"><label>Insured / At-Fault Party</label><input type="text" name="insured_name"></div>
      <div class="form-group">
        <label>Insurance Company</label>
        <input type="text" name="insurance_company" list="demand-insurers" placeholder="Start typing...">
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px"><label>Adjuster Name</label><input type="text" name="adjuster_name"></div>
        <div class="form-group" style="flex:1;min-width:180px"><label>Adjuster Email/Fax</label><input type="text" name="email_to"></div>
      </div>

      <div class="demand-section-title">Claim Details</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px"><label>Claim Number</label><input type="text" name="claim_number"></div>
        <div class="form-group" style="flex:1;min-width:180px"><label>Date of Loss</label><input type="date" name="date_of_loss"></div>
      </div>

      <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Claim Type</label>
      <div class="demand-radio-row">
        <label class="demand-radio-chip"><input type="radio" name="claim_type" value="Liability" checked onchange="toggleUmUimExtras()">Liability</label>
        <label class="demand-radio-chip"><input type="radio" name="claim_type" value="Uninsured" onchange="toggleUmUimExtras()">Uninsured (UM)</label>
        <label class="demand-radio-chip"><input type="radio" name="claim_type" value="Underinsured" onchange="toggleUmUimExtras()">Underinsured (UIM)</label>
      </div>
      <div id="demand-um-extras" style="display:none;gap:12px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px">
          <label>UM/UIM Insurance</label>
          <input type="text" name="coverage_insurer" list="demand-insurers">
        </div>
        <div class="form-group" style="flex:1;min-width:180px">
          <label>Coverage Limit ($)</label>
          <input type="text" name="coverage_limit" placeholder="25,000">
        </div>
      </div>

      <div class="demand-section-title">Settlement Request</div>
      <div class="demand-radio-row">
        <label class="demand-radio-chip"><input type="radio" name="settlement_type" value="Hard Policy Limits" checked onchange="toggleCustomAmount()">Hard Policy Limits</label>
        <label class="demand-radio-chip"><input type="radio" name="settlement_type" value="Soft Policy Limits" onchange="toggleCustomAmount()">Soft Policy Limits</label>
        <label class="demand-radio-chip"><input type="radio" name="settlement_type" value="Other" onchange="toggleCustomAmount()">Other Amount</label>
      </div>
      <div class="form-group" id="demand-custom-amount-group" style="display:none">
        <label>Custom Settlement Amount</label>
        <input type="text" name="custom_amount" placeholder="$50,000">
      </div>

      <div class="demand-section-title">Documents</div>
      <div class="form-group">
        <label>Police Report (PDF)</label>
        <div class="demand-file-input"><input type="file" name="police_report" accept=".pdf"></div>
      </div>
      <div class="form-group">
        <label>Medical Exhibits (PDF)</label>
        <div class="demand-file-input"><input type="file" name="demand_exhibits" accept=".pdf"></div>
      </div>
      <div class="form-group">
        <label>Medical Bills Excel (.xlsx) — optional if exhibits contain billing</label>
        <div class="demand-file-input"><input type="file" name="excel_file" accept=".xlsx"></div>
      </div>

      <div class="demand-section-title">Medical Charges (Manual Entry)</div>
      <table class="demand-charges-table" id="demand-charges-table">
        <thead><tr><th>Provider</th><th>Date Start</th><th>Date End</th><th>Charge ($)</th><th></th></tr></thead>
        <tbody id="demand-charges-body">
          <tr>
            <td><input type="text" name="provider[]" placeholder="Provider name"></td>
            <td><input type="date" name="date_start[]"></td>
            <td><input type="date" name="date_end[]"></td>
            <td><input type="text" name="charge[]" placeholder="0.00" oninput="computeChargesTotal()"></td>
            <td><button type="button" class="btn" onclick="removeChargeRow(this)" style="padding:4px 8px;font-size:12px">X</button></td>
          </tr>
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <button type="button" class="btn btn-outline" onclick="addChargeRow()" style="font-size:12px">+ Add Row</button>
        <div class="demand-total">Total: $<span id="demand-charges-total">0.00</span></div>
      </div>

      <div style="margin-top:16px">
        <button type="submit" class="btn btn-primary" id="demand-submit-btn" style="width:100%;padding:12px;font-size:15px">
          Generate Demand Letter
        </button>
      </div>
    </form>

    <div id="demand-progress-area"></div>
  `;

  populateAttorney();
}

// ─── Form behaviors ───────────────────────────────────────────────

function populateAttorney() {
  const firmRadio = document.querySelector('#demand-form input[name="firm"]:checked');
  const select = document.getElementById("demand-attorney-select");
  if (!firmRadio || !select) return;
  const attorneys = FIRM_ATTORNEYS[firmRadio.value] || [];
  select.innerHTML = attorneys.map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</option>`).join("");
}

function toggleUmUimExtras() {
  const ct = document.querySelector('#demand-form input[name="claim_type"]:checked');
  const extras = document.getElementById("demand-um-extras");
  if (extras) extras.style.display = (ct && ct.value !== "Liability") ? "flex" : "none";
}

function toggleCustomAmount() {
  const st = document.querySelector('#demand-form input[name="settlement_type"]:checked');
  const grp = document.getElementById("demand-custom-amount-group");
  if (grp) grp.style.display = (st && st.value === "Other") ? "block" : "none";
}

function addChargeRow() {
  const tbody = document.getElementById("demand-charges-body");
  if (!tbody) return;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" name="provider[]" placeholder="Provider name"></td>
    <td><input type="date" name="date_start[]"></td>
    <td><input type="date" name="date_end[]"></td>
    <td><input type="text" name="charge[]" placeholder="0.00" oninput="computeChargesTotal()"></td>
    <td><button type="button" class="btn" onclick="removeChargeRow(this)" style="padding:4px 8px;font-size:12px">X</button></td>
  `;
  tbody.appendChild(tr);
}

function removeChargeRow(btn) {
  const tbody = document.getElementById("demand-charges-body");
  if (tbody && tbody.rows.length > 1) {
    btn.closest("tr").remove();
    computeChargesTotal();
  }
}

function computeChargesTotal() {
  const inputs = document.querySelectorAll('#demand-form input[name="charge[]"]');
  let total = 0;
  inputs.forEach(inp => { total += parseFloat(inp.value.replace(/[^0-9.]/g, "")) || 0; });
  const el = document.getElementById("demand-charges-total");
  if (el) el.textContent = total.toFixed(2);
}

// ─── CRM pre-fill ─────────────────────────────────────────────────

function prefillFromCase(caseId) {
  if (!caseId) {
    const ctx = document.getElementById("demand-case-context");
    if (ctx) ctx.innerHTML = "";
    return;
  }
  const cases = typeof loadCases === "function" ? loadCases() : [];
  const c = cases.find(x => x.id === caseId);
  if (!c) return;

  // Helper: camelCase or snake_case field lookup
  const get = (...keys) => { for (const k of keys) { if (c[k]) return c[k]; } return ""; };

  // ── Client ──────────────────────────────────────────────────────
  _setDemandField("client_name",           get("clientName", "client_name"));
  _setDemandField("date_of_loss",          get("dateOfIncident", "date_of_incident", "dateOfLoss", "date_of_loss"));
  _setDemandField("client_coverage_insurer", get("clientInsuranceCompany", "client_insurance_company"));

  // ── Opposing insurance ───────────────────────────────────────────
  _setDemandField("insured_name",     get("insuredName", "insured_name"));
  _setDemandField("insurance_company", get("insuranceCompany", "insurance_company"));
  _setDemandField("adjuster_name",    get("adjusterName", "adjuster_name"));
  _setDemandField("claim_number",     get("claimNumber", "claim_number"));

  // email_demand = TO address (adjuster email — where the demand gets sent)
  _setDemandField("email_demand", get("adjusterEmail", "adjuster_email"));
  // email_to = adjuster contact shown in the letter body
  _setDemandField("email_to",     get("adjusterEmail", "adjuster_email", "adjusterFax", "adjuster_fax"));

  // UM/UIM: pre-fill client insurer as coverage_insurer
  _setDemandField("coverage_insurer", get("clientInsuranceCompany", "client_insurance_company"));

  // ── Case context banner ──────────────────────────────────────────
  const adjEmail = get("adjusterEmail", "adjuster_email");
  const claimNum = get("claimNumber", "claim_number");
  const insurer  = get("insuranceCompany", "insurance_company");
  const ctx = document.getElementById("demand-case-context");
  if (ctx) {
    ctx.innerHTML = `
      <div style="background:var(--bg-card);padding:12px;border-radius:6px;margin-bottom:12px;border-left:3px solid var(--accent)">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px">${escapeHtml(c.clientName || "")} — ${escapeHtml(c.caseType || "")}</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-muted)">
          ${insurer  ? `<span>🏢 ${escapeHtml(insurer)}</span>` : ""}
          ${claimNum ? `<span>📋 Claim: ${escapeHtml(claimNum)}</span>` : ""}
          ${adjEmail ? `<span>📧 ${escapeHtml(adjEmail)}</span>` : ""}
          ${c.dateOfIncident ? `<span>📅 DOL: ${escapeHtml(c.dateOfIncident)}</span>` : ""}
          ${c.estimatedValue || c.caseValueRange ? `<span style="color:var(--success)">💰 ${escapeHtml(c.estimatedValue || c.caseValueRange)}</span>` : ""}
        </div>
        ${(c.description || "").trim() ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px;border-top:1px solid var(--border);padding-top:6px">${escapeHtml(c.description.slice(0, 200))}${c.description.length > 200 ? "…" : ""}</div>` : ""}
      </div>
    `;
  }

  const filled = [
    get("adjusterEmail","adjuster_email") && "adjuster email",
    insurer && "insurer",
    claimNum && "claim #",
    get("adjusterName","adjuster_name") && "adjuster name",
    get("insuredName","insured_name") && "insured name",
    get("clientInsuranceCompany","client_insurance_company") && "client insurer",
  ].filter(Boolean);

  showToast(`Pre-filled from ${c.clientName}${filled.length ? ": " + filled.join(", ") : ""}`);
}

function _setDemandField(name, value) {
  const el = document.querySelector(`#demand-form [name="${name}"]`);
  if (el) el.value = value;
}

// ─── Submission ───────────────────────────────────────────────────

// Track the case linked to the current demand generation
let _demandCaseId = "";

async function submitDemand(event) {
  event.preventDefault();
  const form = document.getElementById("demand-form");
  const btn = document.getElementById("demand-submit-btn");
  if (!form || !btn) return;

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  if (!token) {
    showToast("Please sign in first", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Generating...";

  const formData = new FormData(form);

  // Capture and inject case_id from the pre-fill dropdown
  const caseSelect = document.getElementById("demand-case-select");
  _demandCaseId = (caseSelect && caseSelect.value) ? caseSelect.value : "";
  if (_demandCaseId) formData.set("case_id", _demandCaseId);

  try {
    const resp = await fetch(`${DEMANDS_API_BASE}/api/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
    showToast("Demand queued — generating document...");
    showDemandProgress(data.job_id);
  } catch (err) {
    showToast("Submission failed: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Demand Letter";
  }
}

// ─── Job polling ──────────────────────────────────────────────────

function showDemandProgress(jobId) {
  const area = document.getElementById("demand-progress-area");
  if (!area) return;

  area.innerHTML = `
    <div class="demand-progress">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="spinner"></div>
        <div>
          <div style="font-weight:600">Generating demand letter...</div>
          <div style="font-size:12px;color:var(--text-muted)" id="demand-status-text">Queued &mdash; waiting for worker</div>
        </div>
      </div>
      <div class="demand-progress-bar"><div class="demand-progress-bar-fill" id="demand-progress-fill" style="width:10%"></div></div>
    </div>
  `;

  const poll = setInterval(async () => {
    try {
      const token = typeof getIdToken === "function" ? await getIdToken() : null;
      const resp = await fetch(`${DEMANDS_API_BASE}/api/job/${jobId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      const st = document.getElementById("demand-status-text");
      const bar = document.getElementById("demand-progress-fill");

      if (data.status === "queued") {
        if (st) st.textContent = "Queued \u2014 waiting for worker";
        if (bar) bar.style.width = "10%";
      } else if (data.status === "started") {
        if (st) st.textContent = "Processing \u2014 OCR, AI summarization, building document...";
        if (bar) bar.style.width = "50%";
      } else if (data.status === "finished") {
        clearInterval(poll);
        const r = data.result || {};
        showDemandPreview(r);
        showToast("Demand letter ready for review");
      } else if (data.status === "failed") {
        clearInterval(poll);
        area.innerHTML = `<div class="agent-error"><strong>Generation failed:</strong> ${escapeHtml(data.error || "Unknown error")}</div>`;
        showToast("Demand generation failed", "error");
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, 3000);

  setTimeout(() => clearInterval(poll), 600000);
}

function showDemandPreview(r) {
  const area = document.getElementById("demand-progress-area");
  if (!area) return;

  const filename   = r.filename || "";
  const emailTo    = r.email_to || "";
  const clientName = r.client_name || "";
  const claimNum   = r.claim_number || "";
  const insurer    = r.insurer || "";
  const caseId     = r.case_id || _demandCaseId || "";
  const downloadUrl = `/api/case-documents/download/${encodeURIComponent(filename)}`;

  area.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--bg-card);max-width:560px">

      <!-- Header -->
      <div style="background:var(--bg-hover);padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border)">
        <span style="font-size:26px">📄</span>
        <div>
          <div style="font-weight:700;font-size:15px">Demand Letter Generated</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escapeHtml(clientName)}${claimNum ? ` · Claim ${escapeHtml(claimNum)}` : ""}${insurer ? ` · ${escapeHtml(insurer)}` : ""}</div>
        </div>
      </div>

      <!-- Step 1 -->
      <div style="padding:16px 18px;border-bottom:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:8px">Step 1 — Download &amp; Review</div>
        <a href="${downloadUrl}" download
           style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;background:var(--slg-orange);color:#000;font-weight:700;font-size:14px;padding:10px 22px;border-radius:7px">
          ⬇ Download DOCX
        </a>
        <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Open in Word, review and make any edits, then save.</div>
      </div>

      <!-- Step 2 -->
      <div style="padding:16px 18px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:8px">Step 2 — Upload Final &amp; Send</div>
        <div style="margin-bottom:10px">
          <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Send to (email)</label>
          <input id="demand-email-to" type="email" value="${escapeHtml(emailTo)}"
                 placeholder="adjuster@insurance.com"
                 style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-input,var(--bg-hover));color:var(--text-primary);font-size:13px;box-sizing:border-box">
        </div>
        <button id="demand-upload-send-btn"
                style="display:inline-flex;align-items:center;gap:8px;background:#6366f1;color:#fff;font-weight:700;font-size:14px;padding:10px 22px;border-radius:7px;border:none;cursor:pointer">
          ⬆ Upload Edited File &amp; Send
        </button>
      </div>

    </div>
  `;

  document.getElementById("demand-upload-send-btn").addEventListener("click", () => {
    const email = document.getElementById("demand-email-to")?.value?.trim() || emailTo;
    uploadFinalDemand({ emailTo: email, clientName, claimNum, caseId });
  });
}

/**
 * Prompt user to pick their edited file, upload it, email it, and move the case.
 */
function uploadFinalDemand(d) {
  if (!d.emailTo) {
    showToast("Please enter an email address first", "error");
    document.getElementById("demand-email-to")?.focus();
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.docx";
  input.style.display = "none";
  document.body.appendChild(input);

  input.addEventListener("change", async () => {
    const file = input.files[0];
    document.body.removeChild(input);
    if (!file) return;

    const btn = document.getElementById("demand-upload-send-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Uploading..."; }

    const token = typeof getIdToken === "function" ? await getIdToken() : null;

    try {
      // 1. Upload the edited file (stores in UPLOAD_DIR + case_documents)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caseId", d.caseId || "");
      fd.append("title", `Demand Letter – ${d.clientName || "Client"}`);

      const upResp = await fetch("/api/case-documents/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!upResp.ok) throw new Error(`Upload failed: ${upResp.status}`);
      const upData = await upResp.json();

      if (btn) btn.textContent = "Sending email...";

      // 2. Email the file
      const sendResp = await fetch(`${DEMANDS_API_BASE}/api/demand/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          filename:    upData.filename,
          emailTo:     d.emailTo,
          clientName:  d.clientName,
          claimNumber: d.claimNum,
          caseId:      d.caseId,
        }),
      });
      if (!sendResp.ok) { const e = await sendResp.json(); throw new Error(e.error || `HTTP ${sendResp.status}`); }

      // 3. Upload to OneDrive/SharePoint
      if (btn) btn.textContent = "Saving to OneDrive...";
      await _uploadDemandToOneDrive(file, d.clientName).catch(err =>
        console.warn("[demand] OneDrive upload skipped:", err.message)
      );

      // 4. Move case to settlement_dist
      if (d.caseId && typeof moveCaseToStage === "function") {
        moveCaseToStage(d.caseId, "settlement_dist");
        if (typeof renderKanbanBoard === "function") renderKanbanBoard();
      }

      // 5. Show success
      const area = document.getElementById("demand-progress-area");
      if (area) {
        area.innerHTML = `
          <div style="border-left:4px solid var(--success);border-radius:8px;padding:16px 18px;background:var(--bg-card);max-width:560px">
            <div style="font-weight:700;color:var(--success);font-size:15px;margin-bottom:6px">✅ Demand letter sent!</div>
            <div style="font-size:13px;color:var(--text-secondary)">
              Emailed to <strong>${escapeHtml(d.emailTo)}</strong>
              ${d.clientName ? ` for <strong>${escapeHtml(d.clientName)}</strong>` : ""}
              ${d.claimNum   ? ` · Claim ${escapeHtml(d.claimNum)}` : ""}
            </div>
            ${d.caseId ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Case moved to <strong>Settlement Distribution</strong> · Saved to OneDrive</div>` : ""}
          </div>
        `;
      }
      showToast(`Demand sent to ${d.emailTo}!`, "success");
      // Navigate back to the case board
      setTimeout(() => { if (typeof switchPanel === "function") switchPanel("crm"); }, 1500);

    } catch (err) {
      showToast("Failed: " + err.message, "error");
      if (btn) { btn.disabled = false; btn.textContent = "⬆ Upload Edited File & Send"; }
    }
  });

  input.click();
}

/**
 * Upload the demand letter file to OneDrive.
 * Uses uploadFileToDrive (personal OneDrive root) which works without
 * pre-existing folder structure. Falls back gracefully if unavailable.
 */
async function _uploadDemandToOneDrive(file, clientName) {
  const arrayBuffer = await file.arrayBuffer();

  // Preferred: uploadFileToDrive from graphClient.js (simple, reliable)
  if (typeof uploadFileToDrive === "function") {
    await uploadFileToDrive(file.name, arrayBuffer);
    console.log("[demand] Uploaded to OneDrive:", file.name);
    return;
  }

  // Fallback: SharePoint path via getSpDrive (requires folders to exist)
  if (typeof getSpDrive !== "function" || typeof getAccessToken !== "function") {
    throw new Error("No OneDrive upload function available");
  }
  const spd = await getSpDrive();
  const safeClient = (clientName || "Unknown").replace(/[/\\:*?"<>|]/g, "_").trim();
  const token = await getAccessToken();
  const uploadUrl = `https://graph.microsoft.com/v1.0${spd}/root:/Demands/${encodeURIComponent(safeClient)}/${encodeURIComponent(file.name)}:/content`;
  const resp = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: arrayBuffer,
  });
  if (!resp.ok) throw new Error(`OneDrive PUT ${resp.status}`);
  console.log("[demand] Uploaded to SharePoint:", uploadUrl);
}

/**
 * Show a "ready to send" card for a file that's already uploaded (from uploadDemandLetter).
 * Just needs to email + move stage — no re-upload step.
 */
function showUploadedReadyToSend(d) {
  const area = document.getElementById("demand-progress-area");
  if (!area) return;

  area.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--bg-card);max-width:560px">
      <div style="background:var(--bg-hover);padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border)">
        <span style="font-size:26px">📄</span>
        <div>
          <div style="font-weight:700;font-size:15px">Demand Letter Uploaded</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escapeHtml(d.clientName || "")}${d.claimNum ? ` · Claim ${escapeHtml(d.claimNum)}` : ""}${d.insurer ? ` · ${escapeHtml(d.insurer)}` : ""}</div>
        </div>
      </div>
      <div style="padding:16px 18px">
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Send to (email)</label>
          <input id="demand-email-to" type="email" value="${escapeHtml(d.emailTo || "")}"
                 placeholder="adjuster@insurance.com"
                 style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-input,var(--bg-hover));color:var(--text-primary);font-size:13px;box-sizing:border-box">
        </div>
        <button id="demand-upload-send-btn"
                style="display:inline-flex;align-items:center;gap:8px;background:#6366f1;color:#fff;font-weight:700;font-size:14px;padding:10px 22px;border-radius:7px;border:none;cursor:pointer">
          ✅ Send Demand Letter
        </button>
      </div>
    </div>
  `;

  document.getElementById("demand-upload-send-btn").addEventListener("click", async () => {
    const emailTo = document.getElementById("demand-email-to")?.value?.trim() || d.emailTo;
    if (!emailTo) { showToast("Please enter an email address", "error"); return; }

    const btn = document.getElementById("demand-upload-send-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    try {
      const sendResp = await fetch(`${DEMANDS_API_BASE}/api/demand/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ filename: d.filename, emailTo, clientName: d.clientName, claimNumber: d.claimNum, caseId: d.caseId }),
      });
      if (!sendResp.ok) { const e = await sendResp.json(); throw new Error(e.error || `HTTP ${sendResp.status}`); }

      // Upload to OneDrive
      if (btn) btn.textContent = "Saving to OneDrive...";
      if (d.filename) {
        // Fetch the file from server and push to OneDrive
        const fileResp = await fetch(`/api/case-documents/download/${encodeURIComponent(d.filename)}`);
        if (fileResp.ok) {
          const blob = await fileResp.blob();
          const file = new File([blob], d.filename, { type: blob.type });
          await _uploadDemandToOneDrive(file, d.clientName).catch(err =>
            console.warn("[demand] OneDrive upload skipped:", err.message)
          );
        }
      }

      if (d.caseId && typeof moveCaseToStage === "function") {
        moveCaseToStage(d.caseId, "settlement_dist");
        if (typeof renderKanbanBoard === "function") renderKanbanBoard();
      }

      area.innerHTML = `
        <div style="border-left:4px solid var(--success);border-radius:8px;padding:16px 18px;background:var(--bg-card);max-width:560px">
          <div style="font-weight:700;color:var(--success);font-size:15px;margin-bottom:6px">✅ Demand letter sent!</div>
          <div style="font-size:13px;color:var(--text-secondary)">
            Emailed to <strong>${escapeHtml(emailTo)}</strong>
            ${d.clientName ? ` for <strong>${escapeHtml(d.clientName)}</strong>` : ""}
            ${d.claimNum ? ` · Claim ${escapeHtml(d.claimNum)}` : ""}
          </div>
          <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Case moved to <strong>Settlement Distribution</strong> · Saved to OneDrive</div>
        </div>
      `;
      showToast(`Demand sent to ${emailTo}!`, "success");
      // Navigate back to the case board
      setTimeout(() => { if (typeof switchPanel === "function") switchPanel("crm"); }, 1500);
    } catch (err) {
      showToast("Send failed: " + err.message, "error");
      if (btn) { btn.disabled = false; btn.textContent = "✅ Send Demand Letter"; }
    }
  });
}
