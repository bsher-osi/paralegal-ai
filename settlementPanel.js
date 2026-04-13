// â”€â”€â”€ Settlement Distribution Sheet Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Full SDS form: generates a signed DOCX via DocuSign anchor tabs

function _sdsVal(id) {
  return parseFloat(document.getElementById(id)?.value) || 0;
}

function _fmtS(n) {
  return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderSettlementPanel() {
  const container = document.getElementById("settlement-content");
  if (!container) return;
  const cases = typeof loadCases === "function" ? loadCases() : [];

  // Build attorney options from FIRM_ATTORNEYS (defined in demandPanel.js)
  let attorneyOptHtml = `<option value="">-- Select Attorney --</option>`;
  if (typeof FIRM_ATTORNEYS === "object") {
    for (const [firm, attorneys] of Object.entries(FIRM_ATTORNEYS)) {
      attorneyOptHtml += `<optgroup label="${escapeHtml(firm)}">`;
      for (const atty of attorneys) {
        attorneyOptHtml += `<option value="${escapeHtml(atty.name)}">${escapeHtml(atty.name)}</option>`;
      }
      attorneyOptHtml += `</optgroup>`;
    }
  }

  container.innerHTML = `
    <!-- Case Selector -->
    <div class="form-group" style="margin-bottom:20px">
      <label>Select Case</label>
      <select id="sds-case-select" onchange="prefillSettlementFromCase(this.value)"
        style="padding:8px 12px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);min-width:260px;width:100%">
        <option value="">-- Select a Case --</option>
        ${cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName || "")}${c.claimNumber ? " â€” " + escapeHtml(c.claimNumber) : ""}</option>`).join("")}
      </select>
    </div>

    <!-- Settlement Amount -->
    <div class="demand-section-title">I. Settlement Amount</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div class="form-group" style="flex:1;min-width:200px">
        <label>Total Settlement Amount ($) *</label>
        <input type="number" id="sds-settlement-amount" step="0.01" min="0" placeholder="0.00"
          oninput="_recalcSDS()" style="font-size:16px;padding:8px">
      </div>
      <div class="form-group" style="flex:2;min-width:260px">
        <label>Breakdown Description (e.g. "$12,861.49 liability + $5,300 Med-Pay")</label>
        <input type="text" id="sds-settlement-breakdown" placeholder="Optional breakdown description"
          oninput="_recalcSDS()">
      </div>
    </div>

    <!-- Attorney Fees -->
    <div class="demand-section-title">D. Attorney Fees</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <div class="form-group" style="flex:1;min-width:220px">
        <label>Fee Percentage</label>
        <div style="display:flex;gap:16px;padding-top:6px;flex-wrap:wrap;align-items:center">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--text-primary)">
            <input type="radio" name="sds-fee-pct" value="0.333" checked onchange="_recalcSDS()">
            Pre-Litigation (33.3%)
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--text-primary)">
            <input type="radio" name="sds-fee-pct" value="0.40" onchange="_recalcSDS()">
            Litigation (40%)
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--text-primary)">
            <input type="radio" name="sds-fee-pct" value="other" onchange="_recalcSDS()">
            Other:
          </label>
          <input type="number" id="sds-fee-pct-other" step="0.1" min="0" max="100" placeholder="%" style="width:70px;padding:4px 8px;border-radius:4px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);font-size:13px" oninput="document.querySelector('input[name=sds-fee-pct][value=other]').checked=true;_recalcSDS()">
          <span style="font-size:12px;color:var(--text-muted)">%</span>
        </div>
        <div style="margin-top:6px;font-size:13px;color:var(--text-muted)">
          Calculated fee: <span id="sds-fee-calc-label" style="color:var(--text-primary);font-weight:600">$0.00</span>
        </div>
      </div>
      <div class="form-group" style="flex:1;min-width:200px">
        <label>Override Amount ($) <span style="font-size:11px;color:var(--text-muted)">(leave blank to use %)</span></label>
        <input type="number" id="sds-fee-override" step="0.01" min="0" placeholder="e.g. 5250.00"
          oninput="_recalcSDS()">
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">If filled, this overrides the percentage.</div>
      </div>
      <div class="form-group" style="flex:1;min-width:240px">
        <label>Original Fee Amount (before reduction) ($)</label>
        <input type="number" id="sds-fee-original" step="0.01" min="0" placeholder="e.g. 6053.83"
          oninput="_recalcSDS()">
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Used in document: "Reduced from $X"</div>
      </div>
    </div>

    <!-- Legal Costs -->
    <div class="demand-section-title">C. Legal Costs</div>
    <div class="form-group" style="max-width:300px">
      <label>Legal Costs ($)</label>
      <input type="number" id="sds-legal-costs" step="0.01" min="0" placeholder="0.00" oninput="_recalcSDS()">
    </div>

    <!-- Medical Bills -->
    <div class="demand-section-title">A. Medical Bills</div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button type="button" class="btn btn-outline" onclick="_sdsAddMedRow()">+ Add Provider</button>
      <button type="button" class="btn btn-outline" id="sds-load-specials-btn"
        onclick="_loadSpecialsIntoMedBills(document.getElementById('sds-case-select')?.value)">
        Load from Specials
      </button>
    </div>
    <div style="overflow-x:auto">
      <table id="sds-med-table" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="border-bottom:1px solid var(--border);color:var(--text-muted)">
            <th style="text-align:left;padding:6px 8px;width:40%">Provider</th>
            <th style="text-align:right;padding:6px 8px;width:20%">Original Amount ($)</th>
            <th style="text-align:right;padding:6px 8px;width:20%">Final / Negotiated ($)</th>
            <th style="padding:6px 8px;width:20%;text-align:center">Actions</th>
          </tr>
        </thead>
        <tbody id="sds-med-tbody">
          <!-- rows injected by _sdsAddMedRow() -->
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--border);font-weight:700">
            <td style="padding:6px 8px">Total Medical Bills</td>
            <td style="text-align:right;padding:6px 8px" id="sds-med-orig-total">$0.00</td>
            <td style="text-align:right;padding:6px 8px" id="sds-med-final-total">$0.00</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Health Insurance Reimbursement -->
    <div class="demand-section-title">B. Health Insurance Reimbursement</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button type="button" class="btn btn-outline" onclick="_sdsAddHiRow()">+ Add Insurer</button>
    </div>
    <div style="overflow-x:auto">
      <table id="sds-hi-table" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="border-bottom:1px solid var(--border);color:var(--text-muted)">
            <th style="text-align:left;padding:6px 8px;width:60%">Insurer Name</th>
            <th style="text-align:right;padding:6px 8px;width:20%">Amount ($)</th>
            <th style="padding:6px 8px;width:20%;text-align:center">Actions</th>
          </tr>
        </thead>
        <tbody id="sds-hi-tbody">
          <!-- rows injected -->
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--border);font-weight:700">
            <td style="padding:6px 8px">Total Health Insurance</td>
            <td style="text-align:right;padding:6px 8px" id="sds-hi-total">$0.00</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Med-Pay -->
    <div class="demand-section-title">IV. Med-Pay Proceeds</div>
    <div class="form-group" style="max-width:300px">
      <label>Med-Pay Proceeds to Client ($)</label>
      <input type="number" id="sds-medpay" step="0.01" min="0" placeholder="0.00" value="0" oninput="_recalcSDS()">
    </div>

    <!-- Document Details -->
    <div class="demand-section-title">Document Details</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div class="form-group" style="flex:1;min-width:180px">
        <label>Client Name *</label>
        <input type="text" id="sds-client-name" placeholder="GLENETTA HAYWARD" oninput="_recalcSDS()">
      </div>
      <div class="form-group" style="flex:1;min-width:160px">
        <label>Date of Loss *</label>
        <input type="text" id="sds-date-of-loss" placeholder="5/10/25" oninput="_recalcSDS()">
      </div>
      <div class="form-group" style="flex:1;min-width:260px">
        <label>Attorney</label>
        <select id="sds-attorney" oninput="_recalcSDS()">${attorneyOptHtml}</select>
      </div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div class="form-group" style="flex:2;min-width:240px">
        <label>Client Email (for DocuSign) *</label>
        <input type="email" id="sds-client-email" placeholder="client@example.com">
      </div>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="sds-is-lawsuit" onchange="_sdsToggleLawsuit()">
        <span>Is Lawsuit Filed?</span>
      </label>
    </div>
    <div id="sds-lawsuit-fields" style="display:none;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);margin-bottom:12px">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px">
          <label>County</label>
          <input type="text" id="sds-county" placeholder="Maricopa">
        </div>
        <div class="form-group" style="flex:2;min-width:220px">
          <label>Case Number</label>
          <input type="text" id="sds-case-number" placeholder="CV2025-029108">
        </div>
      </div>
    </div>

    <!-- Live Summary Card -->
    <div id="sds-summary-card" style="margin-top:24px"></div>

    <!-- Result Area -->
    <div id="sds-result-area" style="margin-top:16px"></div>

    <!-- Generate Button -->
    <div style="margin-top:20px">
      <button type="button" class="btn btn-primary" style="width:100%;background:#6366f1;font-size:15px;padding:12px"
        onclick="_generateSDS()">
        Generate Distribution Sheet
      </button>
    </div>
  `;

  // Add one empty medical row and one empty HI row by default
  _sdsAddMedRow();
  _sdsAddHiRow();
  _recalcSDS();
}

// â”€â”€â”€ Toggle lawsuit fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _sdsToggleLawsuit() {
  const checked = document.getElementById("sds-is-lawsuit")?.checked;
  const fields = document.getElementById("sds-lawsuit-fields");
  if (fields) fields.style.display = checked ? "block" : "none";
}

// â”€â”€â”€ Dynamic table rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let _sdsMedRowIdx = 0;

function _sdsAddMedRow(provider = "", originalAmt = "", finalAmt = "") {
  const tbody = document.getElementById("sds-med-tbody");
  if (!tbody) return;
  const idx = _sdsMedRowIdx++;
  const tr = document.createElement("tr");
  tr.dataset.idx = idx;
  tr.innerHTML = `
    <td style="padding:4px 6px">
      <input type="text" class="sds-med-provider" value="${escapeHtml(provider)}" placeholder="Provider name"
        oninput="_recalcSDS()"
        style="width:100%;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;padding:4px 6px">
    </td>
    <td style="padding:4px 6px">
      <input type="number" class="sds-med-orig" step="0.01" min="0" value="${originalAmt}" placeholder="0.00"
        oninput="_recalcSDS()"
        style="width:100%;text-align:right;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;padding:4px 6px">
    </td>
    <td style="padding:4px 6px">
      <input type="number" class="sds-med-final" step="0.01" min="0" value="${finalAmt}" placeholder="0.00"
        oninput="_recalcSDS()"
        style="width:100%;text-align:right;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;padding:4px 6px">
    </td>
    <td style="padding:4px 6px;text-align:center">
      <button type="button" class="btn btn-outline" style="padding:2px 8px;font-size:12px"
        onclick="this.closest('tr').remove();_recalcSDS()">Remove</button>
    </td>
  `;
  tbody.appendChild(tr);
  _recalcSDS();
}

let _sdsHiRowIdx = 0;

function _sdsAddHiRow(insurer = "", amount = "") {
  const tbody = document.getElementById("sds-hi-tbody");
  if (!tbody) return;
  const idx = _sdsHiRowIdx++;
  const tr = document.createElement("tr");
  tr.dataset.idx = idx;
  tr.innerHTML = `
    <td style="padding:4px 6px">
      <input type="text" class="sds-hi-name" value="${escapeHtml(insurer)}" placeholder="Insurer name (e.g. BCBS)"
        oninput="_recalcSDS()"
        style="width:100%;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;padding:4px 6px">
    </td>
    <td style="padding:4px 6px">
      <input type="number" class="sds-hi-amount" step="0.01" min="0" value="${amount}" placeholder="0.00"
        oninput="_recalcSDS()"
        style="width:100%;text-align:right;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;padding:4px 6px">
    </td>
    <td style="padding:4px 6px;text-align:center">
      <button type="button" class="btn btn-outline" style="padding:2px 8px;font-size:12px"
        onclick="this.closest('tr').remove();_recalcSDS()">Remove</button>
    </td>
  `;
  tbody.appendChild(tr);
  _recalcSDS();
}

// â”€â”€â”€ Prefill from Case â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function prefillSettlementFromCase(caseId) {
  if (!caseId) return;
  const cases = typeof loadCases === "function" ? loadCases() : [];
  const c = cases.find(x => x.id === caseId);
  if (!c) return;

  // Sync the case dropdown to the selected case
  const caseSelect = document.getElementById("sds-case-select");
  if (caseSelect) caseSelect.value = caseId;

  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null && val !== "") el.value = val; };

  setVal("sds-client-name", c.clientName || "");
  setVal("sds-date-of-loss", c.dateOfLoss || c.dateOfIncident || "");
  setVal("sds-client-email", c.email || "");
  setVal("sds-case-number", c.claimNumber || "");

  if (c.settlementAmount) {
    setVal("sds-settlement-amount", c.settlementAmount);
  }

  // Litigation check
  const litigationStages = ["litigation_filed", "litigation_discovery", "litigation_motions", "trial_prep", "trial"];
  const isLit = litigationStages.includes(c.stage);
  const lawsuitCb = document.getElementById("sds-is-lawsuit");
  if (lawsuitCb) {
    lawsuitCb.checked = isLit;
    _sdsToggleLawsuit();
  }
  if (isLit) {
    setVal("sds-county", c.county || "Maricopa");
  }

  // Attorney: try to match from case data, otherwise default to first real option
  const attySelect = document.getElementById("sds-attorney");
  if (attySelect) {
    let matched = false;
    if (c.attorney) {
      const opts = Array.from(attySelect.options);
      const match = opts.find(o => o.value && c.attorney.toLowerCase().includes(o.value.toLowerCase().split(",")[0].toLowerCase()));
      if (match) { attySelect.value = match.value; matched = true; }
    }
    if (!matched) {
      // Default to first non-empty option (Yelena Shimonova Sher, Esq.)
      const firstReal = Array.from(attySelect.options).find(o => o.value);
      if (firstReal) attySelect.value = firstReal.value;
    }
  }

  _recalcSDS();

  // Scroll to top of panel
  document.getElementById("settlement-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// â”€â”€â”€ Load Specials into Med Bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function _loadSpecialsIntoMedBills(caseId) {
  if (!caseId) { if (typeof showToast === "function") showToast("Select a case first", "error"); return; }
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch(`/api/specials?caseId=${encodeURIComponent(caseId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const items = await resp.json();

    // Clear existing rows
    const tbody = document.getElementById("sds-med-tbody");
    if (tbody) tbody.innerHTML = "";
    _sdsMedRowIdx = 0;

    if (!items.length) {
      if (typeof showToast === "function") showToast("No specials found for this case", "error");
      _sdsAddMedRow();
      return;
    }

    for (const item of items) {
      const provider = item.provider || "";
      const origAmt = (Number(item.billed_amount) || 0).toFixed(2);
      const lien = Number(item.lien_amount) || 0;
      const reductionReceived = Number(item.reduction_received) || 0;
      const finalAmt = Math.max(0, lien - reductionReceived).toFixed(2);
      _sdsAddMedRow(provider, origAmt, finalAmt);
    }

    if (typeof showToast === "function") showToast(`Loaded ${items.length} provider(s) from specials`);
    _recalcSDS();
  } catch (err) {
    if (typeof showToast === "function") showToast(`Failed to load specials: ${err.message}`, "error");
  }
}

// â”€â”€â”€ Live Recalc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _recalcSDS() {
  const settlement = _sdsVal("sds-settlement-amount");

  // Attorney fees
  const feeRadio = document.querySelector('input[name="sds-fee-pct"]:checked');
  let feePct = feeRadio ? parseFloat(feeRadio.value) : 0.333;
  if (feeRadio?.value === "other") {
    const otherPct = parseFloat(document.getElementById("sds-fee-pct-other")?.value) || 0;
    feePct = otherPct / 100;
  }
  const feeOverride = _sdsVal("sds-fee-override");
  const attorneyFees = feeOverride > 0 ? feeOverride : settlement * feePct;
  const feeLabel = feeOverride > 0 ? "Override" : (feePct >= 0.4 ? "40%" : feePct === 0.333 ? "33.3%" : `${(feePct * 100).toFixed(1)}%`);

  // Update calculated fee display
  const feeCalcEl = document.getElementById("sds-fee-calc-label");
  if (feeCalcEl) feeCalcEl.textContent = `$${_fmtS(attorneyFees)}`;

  const legalCosts = _sdsVal("sds-legal-costs");
  const medPay = _sdsVal("sds-medpay");

  // Sum medical bills
  let totalMedOrig = 0, totalMedFinal = 0;
  document.querySelectorAll("#sds-med-tbody tr").forEach(row => {
    totalMedOrig += parseFloat(row.querySelector(".sds-med-orig")?.value) || 0;
    totalMedFinal += parseFloat(row.querySelector(".sds-med-final")?.value) || 0;
  });
  const medOrigEl = document.getElementById("sds-med-orig-total");
  const medFinalEl = document.getElementById("sds-med-final-total");
  if (medOrigEl) medOrigEl.textContent = `$${_fmtS(totalMedOrig)}`;
  if (medFinalEl) medFinalEl.textContent = `$${_fmtS(totalMedFinal)}`;

  // Sum health insurance
  let totalHI = 0;
  document.querySelectorAll("#sds-hi-tbody tr").forEach(row => {
    totalHI += parseFloat(row.querySelector(".sds-hi-amount")?.value) || 0;
  });
  const hiTotalEl = document.getElementById("sds-hi-total");
  if (hiTotalEl) hiTotalEl.textContent = `$${_fmtS(totalHI)}`;

  const totalDeductions = attorneyFees + legalCosts + totalMedFinal + totalHI;
  const settlementProceeds = settlement - totalDeductions;
  const netToClient = settlementProceeds + medPay;

  // Render summary card
  const summaryEl = document.getElementById("sds-summary-card");
  if (!summaryEl) return;

  summaryEl.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px">
      <div style="font-weight:700;font-size:17px;margin-bottom:16px;color:var(--text-primary)">Settlement Distribution Summary</div>
      <div style="display:flex;flex-direction:column;gap:8px;max-width:480px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">Settlement Amount</span>
          <span style="font-weight:600;color:var(--text-primary)">$${_fmtS(settlement)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:var(--text-muted)">âˆ’ Attorney Fees (${escapeHtml(feeLabel)})</span>
          <span style="color:#ef4444">-$${_fmtS(attorneyFees)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:var(--text-muted)">âˆ’ Legal Costs</span>
          <span style="color:#ef4444">-$${_fmtS(legalCosts)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:var(--text-muted)">âˆ’ Total Medical Bills</span>
          <span style="color:#ef4444">-$${_fmtS(totalMedFinal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">âˆ’ Health Insurance Reimbursement</span>
          <span style="color:#ef4444">-$${_fmtS(totalHI)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0">
          <span style="color:var(--text-muted);font-weight:600">= Settlement Proceeds to Client</span>
          <span style="font-weight:700;color:var(--text-primary)">$${_fmtS(settlementProceeds)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:2px solid var(--border)">
          <span style="color:var(--text-muted)">+ Med-Pay Proceeds</span>
          <span style="color:var(--success,#22c55e)">+$${_fmtS(medPay)}</span>
        </div>
      </div>
      <div style="margin-top:16px;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;font-weight:600">NET PROCEEDS TO CLIENT</div>
        <div style="font-size:32px;font-weight:700;color:#fff">$${_fmtS(netToClient)}</div>
      </div>
    </div>`;
}

// â”€â”€â”€ Generate SDS Document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function _generateSDS() {
  // Collect + validate
  const clientName = (document.getElementById("sds-client-name")?.value || "").trim();
  const settlement = _sdsVal("sds-settlement-amount");
  const clientEmail = (document.getElementById("sds-client-email")?.value || "").trim();
  const dateOfLoss = (document.getElementById("sds-date-of-loss")?.value || "").trim();
  const attorney = (document.getElementById("sds-attorney")?.value || "").trim();
  const breakdownDesc = (document.getElementById("sds-settlement-breakdown")?.value || "").trim();
  const legalCosts = _sdsVal("sds-legal-costs");
  const medPay = _sdsVal("sds-medpay");
  const isLawsuit = document.getElementById("sds-is-lawsuit")?.checked || false;
  const county = (document.getElementById("sds-county")?.value || "").trim();
  const caseNumber = (document.getElementById("sds-case-number")?.value || "").trim();
  const caseId = (document.getElementById("sds-case-select")?.value || "").trim();

  const errors = [];
  if (!clientName) errors.push("Client Name");
  if (!settlement) errors.push("Settlement Amount");
  if (!clientEmail) errors.push("Client Email");
  if (!dateOfLoss) errors.push("Date of Loss");
  if (errors.length) {
    if (typeof showToast === "function") showToast(`Required: ${errors.join(", ")}`, "error");
    return;
  }

  // Attorney fees
  const feeRadio = document.querySelector('input[name="sds-fee-pct"]:checked');
  let feePct = feeRadio ? parseFloat(feeRadio.value) : 0.333;
  if (feeRadio?.value === "other") {
    feePct = (parseFloat(document.getElementById("sds-fee-pct-other")?.value) || 0) / 100;
  }
  const feeOverride = _sdsVal("sds-fee-override");
  const feeOriginal = _sdsVal("sds-fee-original");
  const attorneyFees = feeOverride > 0 ? feeOverride : settlement * feePct;
  const feePctLabel = feePct >= 0.4 ? "40%" : feePct === 0.333 ? "33.3%" : `${(feePct * 100).toFixed(1)}%`;

  // Medical bills
  const medBills = [];
  document.querySelectorAll("#sds-med-tbody tr").forEach(row => {
    const provider = row.querySelector(".sds-med-provider")?.value?.trim() || "";
    const origAmt = parseFloat(row.querySelector(".sds-med-orig")?.value) || 0;
    const finalAmt = parseFloat(row.querySelector(".sds-med-final")?.value) || 0;
    if (provider || finalAmt) {
      medBills.push({ provider, originalAmount: origAmt, finalAmount: finalAmt });
    }
  });

  // Health insurance
  const healthInsurance = [];
  document.querySelectorAll("#sds-hi-tbody tr").forEach(row => {
    const insurer = row.querySelector(".sds-hi-name")?.value?.trim() || "";
    const amount = parseFloat(row.querySelector(".sds-hi-amount")?.value) || 0;
    if (insurer || amount) {
      healthInsurance.push({ insurer, amount });
    }
  });

  const totalMedFinal = medBills.reduce((s, b) => s + b.finalAmount, 0);
  const totalHI = healthInsurance.reduce((s, h) => s + h.amount, 0);
  const totalDeductions = attorneyFees + legalCosts + totalMedFinal + totalHI;
  const settlementProceeds = settlement - totalDeductions;
  const netToClient = settlementProceeds + medPay;

  const payload = {
    clientName, dateOfLoss, attorney,
    settlementAmount: settlement,
    settlementBreakdown: breakdownDesc,
    feePct: feePct * 100,
    feePctLabel,
    attorneyFees,
    feeOriginal: feeOriginal > 0 ? feeOriginal : null,
    legalCosts,
    medBills,
    healthInsurance,
    totalDeductions,
    settlementProceeds,
    medPay,
    netToClient,
    isLawsuit,
    county,
    caseNumber,
    clientEmail,
    caseId: caseId || null,
  };

  const resultArea = document.getElementById("sds-result-area");
  if (resultArea) resultArea.innerHTML = `<div style="padding:12px;color:var(--text-muted)">Generating document...</div>`;

  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch("/api/settlement-distribution/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const filename = data.filename;

    if (resultArea) {
      resultArea.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:20px;margin-top:8px">
          <div style="font-weight:700;margin-bottom:12px;color:var(--text-primary)">Document Generated</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <a href="/api/case-documents/download/${encodeURIComponent(filename)}" target="_blank" class="btn btn-outline">
              Download DOCX
            </a>
            <button type="button" class="btn btn-primary" style="background:#6366f1"
              onclick="_sendSDSDocuSign('${escapeHtml(filename)}','${escapeHtml(clientEmail)}','${escapeHtml(clientName)}','${escapeHtml(caseId)}')">
              Send via DocuSign
            </button>
          </div>
        </div>`;
    }

    if (typeof showToast === "function") showToast("Distribution sheet generated successfully");
  } catch (err) {
    if (resultArea) resultArea.innerHTML = `<div class="agent-error" style="margin-top:8px">${escapeHtml(err.message)}</div>`;
    if (typeof showToast === "function") showToast(`Generation failed: ${err.message}`, "error");
  }
}

// â”€â”€â”€ Send via DocuSign â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function _sendSDSDocuSign(filename, clientEmail, clientName, caseId) {
  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    if (typeof showToast === "function") showToast("Invalid client email address", "error");
    return;
  }

  const resultArea = document.getElementById("sds-result-area");
  const btn = resultArea?.querySelector("button[onclick*='_sendSDSDocuSign']");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch("/api/esign/send-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        filename,
        signerEmail: clientEmail,
        signerName: clientName,
        emailSubject: "Settlement Distribution Sheet for Signature â€” Sher Law Group",
        caseId: caseId || null,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();

    // Upload to OneDrive if available
    if (typeof _uploadDemandToOneDrive === "function") {
      try {
        const fileResp = await fetch(`/api/download/${encodeURIComponent(filename)}`);
        if (fileResp.ok) {
          const blob = await fileResp.blob();
          const file = new File([blob], filename, { type: blob.type });
          await _uploadDemandToOneDrive(file, clientName).catch(err =>
            console.warn("[sds] OneDrive upload skipped:", err.message)
          );
        }
      } catch (odErr) {
        console.warn("[sds] OneDrive upload skipped:", odErr.message);
      }
    }

    // Move case to negotiations stage
    if (caseId && typeof moveCaseToStage === "function") {
      moveCaseToStage(caseId, "negotiations");
      if (typeof renderKanbanBoard === "function") renderKanbanBoard();
    }

    if (resultArea) {
      resultArea.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid #22c55e;border-radius:10px;padding:20px;margin-top:8px">
          <div style="color:#22c55e;font-weight:700;margin-bottom:6px">Sent via DocuSign</div>
          <div style="color:var(--text-muted);font-size:13px">Envelope ID: ${escapeHtml(data.envelopeId || "")}</div>
          <div style="color:var(--text-muted);font-size:13px;margin-top:4px">Sent to: ${escapeHtml(clientEmail)}</div>
          ${caseId ? `<div style="color:var(--text-muted);font-size:13px;margin-top:4px">Case moved to Negotiations.</div>` : ""}
        </div>`;
    }

    if (typeof showToast === "function") showToast("Settlement sheet sent for signature via DocuSign");
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = "Send via DocuSign"; }
    if (typeof showToast === "function") showToast(`DocuSign send failed: ${err.message}`, "error");
  }
}
