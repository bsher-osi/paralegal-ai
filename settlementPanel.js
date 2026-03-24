// ─── Settlement Distribution Sheet Panel ─────────────────────────────
// Calculates attorney fees, medical lien totals, and net-to-client

const SETTLEMENT_API = "https://tools.sherlawgroup.com";

function _fmtS(n) { return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function renderSettlementPanel() {
  const container = document.getElementById("settlement-content");
  if (!container) return;
  const cases = typeof loadCases === "function" ? loadCases() : [];

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <select id="stl-case-select" onchange="_onSettlementCaseChange()" style="padding:6px 10px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);min-width:220px">
        <option value="">-- Select Case --</option>
        ${cases.map(c => `<option value="${c.id}" data-settlement="${c.settlementAmount || ""}">${escapeHtml(c.clientName)}</option>`).join("")}
      </select>
    </div>

    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
      <div class="form-group" style="flex:1;min-width:180px">
        <label>Settlement Amount ($)</label>
        <input type="number" id="stl-amount" step="0.01" value="0" oninput="_recalcSettlement()" style="font-size:16px;padding:8px">
      </div>
      <div class="form-group" style="flex:1;min-width:220px">
        <label>Fee Structure</label>
        <div style="display:flex;gap:12px;padding-top:6px">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--text-primary)">
            <input type="radio" name="stl-fee-type" value="0.333" checked onchange="_recalcSettlement()"> Pre-Litigation (33.3%)
          </label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--text-primary)">
            <input type="radio" name="stl-fee-type" value="0.40" onchange="_recalcSettlement()"> Litigation (40%)
          </label>
        </div>
      </div>
      <div class="form-group" style="flex:1;min-width:180px">
        <label>Legal Costs ($)</label>
        <input type="number" id="stl-costs" step="0.01" value="0" oninput="_recalcSettlement()" style="font-size:16px;padding:8px">
      </div>
    </div>

    <div id="stl-provider-table"><p style="color:var(--text-muted)">Select a case to load providers.</p></div>

    <div id="stl-summary-card"></div>

    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="_saveDistribution()">Save Distribution</button>
      <button class="btn btn-outline btn-sm" onclick="_exportSettlementCSV()">Export CSV</button>
      <button class="btn btn-outline btn-sm" onclick="_saveSettlementToCase()">Save to Case</button>
    </div>
  `;
}

async function _onSettlementCaseChange() {
  const sel = document.getElementById("stl-case-select");
  const caseId = sel?.value;
  if (!caseId) {
    document.getElementById("stl-provider-table").innerHTML = `<p style="color:var(--text-muted)">Select a case to load providers.</p>`;
    document.getElementById("stl-summary-card").innerHTML = "";
    return;
  }

  // Pre-fill settlement amount from case data
  const opt = sel.options[sel.selectedIndex];
  const existingAmount = opt?.dataset?.settlement;
  if (existingAmount) {
    document.getElementById("stl-amount").value = existingAmount;
  }

  await _fetchSettlementProviders(caseId);
  _recalcSettlement();
}

async function _fetchSettlementProviders(caseId) {
  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  const tableEl = document.getElementById("stl-provider-table");
  tableEl.innerHTML = `<p style="color:var(--text-muted)">Loading providers...</p>`;

  try {
    const resp = await fetch(`${SETTLEMENT_API}/api/specials?caseId=${caseId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const items = await resp.json();
    _renderSettlementProviderTable(items);
    _recalcSettlement();
  } catch (err) {
    tableEl.innerHTML = `<div class="agent-error">${escapeHtml(err.message)}</div>`;
  }
}

function _renderSettlementProviderTable(items) {
  const el = document.getElementById("stl-provider-table");
  if (!items.length) {
    el.innerHTML = `<p style="color:var(--text-muted)">No providers / specials found for this case.</p>`;
    return;
  }

  let totalBilled = 0, totalLien = 0, totalReqd = 0, totalRecvd = 0, totalFinal = 0;

  const rows = items.map((item, idx) => {
    const billed = Number(item.billed_amount) || 0;
    const lien = Number(item.lien_amount) || 0;
    const reductionReq = Number(item.reduction_requested) || 0;
    const reductionRecv = Number(item.reduction_received) || 0;
    const finalAmt = lien - reductionRecv;

    totalBilled += billed;
    totalLien += lien;
    totalReqd += reductionReq;
    totalRecvd += reductionRecv;
    totalFinal += finalAmt;

    return `
      <tr data-special-id="${item.id}" data-provider="${escapeHtml(item.provider || "")}">
        <td>${escapeHtml(item.provider || "")}</td>
        <td style="text-align:right">$${_fmtS(billed)}</td>
        <td style="text-align:right">$${_fmtS(lien)}</td>
        <td style="text-align:right">
          <input type="number" class="stl-reduction-req" data-idx="${idx}" step="0.01" value="${reductionReq}" oninput="_recalcSettlement()" style="width:100px;text-align:right;padding:3px 6px;border-radius:4px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)">
        </td>
        <td style="text-align:right">
          <input type="number" class="stl-reduction-recv" data-idx="${idx}" step="0.01" value="${reductionRecv}" oninput="_onReductionChange(this)" style="width:100px;text-align:right;padding:3px 6px;border-radius:4px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)">
        </td>
        <td style="text-align:right;font-weight:600" class="stl-final-amt">$${_fmtS(finalAmt)}</td>
      </tr>`;
  }).join("");

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table" id="stl-table">
        <thead><tr>
          <th>Provider</th><th>Billed Amount</th><th>Lien Amount</th><th>Reduction Requested</th><th>Reduction Received</th><th>Final Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">
          <td>Totals</td>
          <td style="text-align:right" id="stl-tot-billed">$${_fmtS(totalBilled)}</td>
          <td style="text-align:right" id="stl-tot-lien">$${_fmtS(totalLien)}</td>
          <td style="text-align:right" id="stl-tot-reqd">$${_fmtS(totalReqd)}</td>
          <td style="text-align:right" id="stl-tot-recvd">$${_fmtS(totalRecvd)}</td>
          <td style="text-align:right" id="stl-tot-final">$${_fmtS(totalFinal)}</td>
        </tr></tfoot>
      </table>
    </div>`;
}

function _onReductionChange(input) {
  // Recalculate the final amount for this row
  const row = input.closest("tr");
  const lienText = row.cells[2].textContent.replace(/[$,]/g, "");
  const lien = parseFloat(lienText) || 0;
  const recv = parseFloat(input.value) || 0;
  const finalCell = row.querySelector(".stl-final-amt");
  if (finalCell) finalCell.textContent = `$${_fmtS(lien - recv)}`;
  _recalcSettlement();
}

function _recalcSettlement() {
  const grossSettlement = parseFloat(document.getElementById("stl-amount")?.value) || 0;
  const feeRadio = document.querySelector('input[name="stl-fee-type"]:checked');
  const feeRate = feeRadio ? parseFloat(feeRadio.value) : 0.333;
  const legalCosts = parseFloat(document.getElementById("stl-costs")?.value) || 0;

  const attorneyFees = grossSettlement * feeRate;

  // Sum final amounts from table
  let totalMedical = 0;
  const table = document.getElementById("stl-table");
  if (table) {
    const rows = table.querySelectorAll("tbody tr");
    let totalBilled = 0, totalLien = 0, totalReqd = 0, totalRecvd = 0;
    totalMedical = 0;

    rows.forEach(row => {
      const billedText = row.cells[1].textContent.replace(/[$,]/g, "");
      const lienText = row.cells[2].textContent.replace(/[$,]/g, "");
      const billed = parseFloat(billedText) || 0;
      const lien = parseFloat(lienText) || 0;
      const reqd = parseFloat(row.querySelector(".stl-reduction-req")?.value) || 0;
      const recv = parseFloat(row.querySelector(".stl-reduction-recv")?.value) || 0;
      const finalAmt = lien - recv;

      totalBilled += billed;
      totalLien += lien;
      totalReqd += reqd;
      totalRecvd += recv;
      totalMedical += finalAmt;

      const finalCell = row.querySelector(".stl-final-amt");
      if (finalCell) finalCell.textContent = `$${_fmtS(finalAmt)}`;
    });

    // Update footer totals
    const setTot = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = `$${_fmtS(val)}`; };
    setTot("stl-tot-billed", totalBilled);
    setTot("stl-tot-lien", totalLien);
    setTot("stl-tot-reqd", totalReqd);
    setTot("stl-tot-recvd", totalRecvd);
    setTot("stl-tot-final", totalMedical);
  }

  const netToClient = grossSettlement - attorneyFees - legalCosts - totalMedical;

  const feeLabel = feeRate >= 0.4 ? "40%" : "33.3%";

  const summaryEl = document.getElementById("stl-summary-card");
  if (!summaryEl) return;

  summaryEl.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-top:20px">
      <div style="font-weight:700;font-size:18px;margin-bottom:16px;color:var(--text-primary)">Settlement Distribution Summary</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
        <div style="text-align:center;padding:16px;background:var(--bg-surface,#1a1a2e);border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Gross Settlement</div>
          <div style="font-size:28px;font-weight:700;color:var(--text-primary);margin-top:4px">$${_fmtS(grossSettlement)}</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--bg-surface,#1a1a2e);border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Attorney Fees (${escapeHtml(feeLabel)})</div>
          <div style="font-size:28px;font-weight:700;color:#ef4444;margin-top:4px">-$${_fmtS(attorneyFees)}</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--bg-surface,#1a1a2e);border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Legal Costs</div>
          <div style="font-size:28px;font-weight:700;color:#ef4444;margin-top:4px">-$${_fmtS(legalCosts)}</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--bg-surface,#1a1a2e);border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Total Medical Liens/Bills</div>
          <div style="font-size:28px;font-weight:700;color:#ef4444;margin-top:4px">-$${_fmtS(totalMedical)}</div>
        </div>
      </div>
      <div style="margin-top:20px;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;text-align:center">
        <div style="font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px">Net to Client</div>
        <div style="font-size:36px;font-weight:700;color:#fff;margin-top:4px">$${_fmtS(netToClient)}</div>
      </div>
    </div>`;
}

// ─── Save Distribution rows to API ─────────────────────────────────

async function _saveDistribution() {
  const caseId = document.getElementById("stl-case-select")?.value;
  if (!caseId) { showToast("Select a case first", "error"); return; }

  const table = document.getElementById("stl-table");
  if (!table) { showToast("No provider data to save", "error"); return; }

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const grossSettlement = parseFloat(document.getElementById("stl-amount")?.value) || 0;
  const feeRadio = document.querySelector('input[name="stl-fee-type"]:checked');
  const feeRate = feeRadio ? parseFloat(feeRadio.value) : 0.333;
  const legalCosts = parseFloat(document.getElementById("stl-costs")?.value) || 0;

  const rows = table.querySelectorAll("tbody tr");
  let saved = 0, errors = 0;

  for (const row of rows) {
    const specialId = row.dataset.specialId;
    const provider = row.dataset.provider;
    const lienText = row.cells[2].textContent.replace(/[$,]/g, "");
    const lienAmount = parseFloat(lienText) || 0;
    const reductionReq = parseFloat(row.querySelector(".stl-reduction-req")?.value) || 0;
    const reductionRecv = parseFloat(row.querySelector(".stl-reduction-recv")?.value) || 0;
    const finalAmount = lienAmount - reductionRecv;

    const payload = {
      case_id: caseId,
      special_id: specialId,
      provider: provider,
      gross_settlement: grossSettlement,
      fee_rate: feeRate,
      legal_costs: legalCosts,
      lien_amount: lienAmount,
      reduction_requested: reductionReq,
      reduction_received: reductionRecv,
      final_amount: finalAmount,
    };

    try {
      const resp = await fetch(`${SETTLEMENT_API}/api/settlement-distributions`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      saved++;
    } catch {
      errors++;
    }
  }

  if (errors) {
    showToast(`Saved ${saved} rows, ${errors} failed`, "error");
  } else {
    showToast(`Distribution saved (${saved} rows)`);
  }
}

// ─── Export CSV ─────────────────────────────────────────────────────

function _exportSettlementCSV() {
  const table = document.getElementById("stl-table");
  if (!table) { showToast("No data to export", "error"); return; }

  const grossSettlement = parseFloat(document.getElementById("stl-amount")?.value) || 0;
  const feeRadio = document.querySelector('input[name="stl-fee-type"]:checked');
  const feeRate = feeRadio ? parseFloat(feeRadio.value) : 0.333;
  const legalCosts = parseFloat(document.getElementById("stl-costs")?.value) || 0;
  const attorneyFees = grossSettlement * feeRate;

  const csvRows = [];
  csvRows.push("Provider,Billed Amount,Lien Amount,Reduction Requested,Reduction Received,Final Amount");

  let totalFinal = 0;
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach(row => {
    const provider = (row.dataset.provider || "").replace(/"/g, '""');
    const billed = row.cells[1].textContent.replace(/[$,]/g, "").trim();
    const lien = row.cells[2].textContent.replace(/[$,]/g, "").trim();
    const reqd = row.querySelector(".stl-reduction-req")?.value || "0";
    const recv = row.querySelector(".stl-reduction-recv")?.value || "0";
    const finalText = row.querySelector(".stl-final-amt")?.textContent.replace(/[$,]/g, "").trim() || "0";
    totalFinal += parseFloat(finalText) || 0;
    csvRows.push(`"${provider}",${billed},${lien},${reqd},${recv},${finalText}`);
  });

  csvRows.push("");
  csvRows.push(`"Totals",,,,,"${totalFinal.toFixed(2)}"`);
  csvRows.push("");
  csvRows.push("Settlement Summary");
  csvRows.push(`"Gross Settlement","${grossSettlement.toFixed(2)}"`);
  csvRows.push(`"Attorney Fees (${feeRate >= 0.4 ? '40%' : '33.3%'})","${attorneyFees.toFixed(2)}"`);
  csvRows.push(`"Legal Costs","${legalCosts.toFixed(2)}"`);
  csvRows.push(`"Total Medical Liens/Bills","${totalFinal.toFixed(2)}"`);
  csvRows.push(`"Net to Client","${(grossSettlement - attorneyFees - legalCosts - totalFinal).toFixed(2)}"`);

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `settlement-distribution-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV exported");
}

// ─── Save to Case (update localStorage case record) ────────────────

function _saveSettlementToCase() {
  const caseId = document.getElementById("stl-case-select")?.value;
  if (!caseId) { showToast("Select a case first", "error"); return; }

  const grossSettlement = parseFloat(document.getElementById("stl-amount")?.value) || 0;
  const feeRadio = document.querySelector('input[name="stl-fee-type"]:checked');
  const feeRate = feeRadio ? parseFloat(feeRadio.value) : 0.333;
  const legalCosts = parseFloat(document.getElementById("stl-costs")?.value) || 0;
  const attorneyFees = grossSettlement * feeRate;

  // Sum final amounts
  let totalMedical = 0;
  const table = document.getElementById("stl-table");
  if (table) {
    table.querySelectorAll("tbody tr").forEach(row => {
      const lienText = row.cells[2].textContent.replace(/[$,]/g, "");
      const recv = parseFloat(row.querySelector(".stl-reduction-recv")?.value) || 0;
      totalMedical += (parseFloat(lienText) || 0) - recv;
    });
  }

  const netToClient = grossSettlement - attorneyFees - legalCosts - totalMedical;

  if (typeof updateCase === "function") {
    updateCase(caseId, {
      settlementAmount: grossSettlement,
      legalFees: attorneyFees,
      legalCosts: legalCosts,
      netToClient: netToClient,
    });
    showToast("Case updated with settlement data");
  } else {
    showToast("updateCase not available", "error");
  }
}
