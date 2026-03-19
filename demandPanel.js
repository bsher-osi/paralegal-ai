// ─── Demand Letter Panel ──────────────────────────────────────────
// Renders the full demand letter form and handles submission to the
// Demands Flask API, job polling, and CRM case pre-fill.

const DEMANDS_API_BASE = "https://tools.sherlawgroup.com";

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
          Generate & Email Demand Letter
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

  _setDemandField("client_name", c.clientName || "");
  _setDemandField("email_demand", c.email || "");
  _setDemandField("date_of_loss", c.dateOfIncident || "");

  const ctx = document.getElementById("demand-case-context");
  if (ctx) {
    ctx.innerHTML = `
      <div style="background:var(--bg-card);padding:12px;border-radius:6px;margin-bottom:12px;border-left:3px solid var(--accent)">
        <div style="font-weight:600;font-size:13px">${escapeHtml(c.clientName)} &mdash; ${escapeHtml(c.caseType)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${escapeHtml((c.description || "").slice(0, 200))}</div>
        ${c.estimatedValue ? `<div style="font-size:12px;color:var(--success);margin-top:4px">Estimated: ${escapeHtml(c.estimatedValue)}</div>` : ""}
      </div>
    `;
  }
  showToast("Pre-filled from case: " + c.clientName);
}

function _setDemandField(name, value) {
  const el = document.querySelector(`#demand-form [name="${name}"]`);
  if (el) el.value = value;
}

// ─── Submission ───────────────────────────────────────────────────

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
  btn.textContent = "Submitting...";

  const formData = new FormData(form);

  try {
    const resp = await fetch(`${DEMANDS_API_BASE}/api/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
    showToast("Demand queued!");
    showDemandProgress(data.job_id);
  } catch (err) {
    showToast("Submission failed: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate & Email Demand Letter";
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
        area.innerHTML = `
          <div class="demand-progress" style="border-left:3px solid var(--success)">
            <div style="font-weight:600;color:var(--success)">Demand letter generated and emailed!</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:6px">
              Sent to <strong>${escapeHtml(String(r.to || "recipient"))}</strong>
              for ${escapeHtml(r.client_name || "")}
              (Claim ${escapeHtml(r.claim_number || "")})
            </div>
          </div>
        `;
        showToast("Demand letter generated and emailed!");
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
