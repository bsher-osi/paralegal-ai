// crmData.js — CRM / Intake Board data management
// Uses localStorage as the default store; can sync to SharePoint Lists via graphClient.js

const CRM_STORAGE_KEY = "paralegal_crm_cases";

// Color key:
//   Indigo/Violet  = onboarding / intake workflow
//   Blue/Cyan/Teal = active case management & medical
//   Amber/Orange   = demand & negotiation preparation
//   Red            = high-stakes (active negotiations, litigation)
//   Green          = positive milestone (signed, settled, accepted)
//   Slate          = wrapping up / administrative close-out
//   Dark slate     = case closed
const CASE_STAGES = [
  // ── Pre-Lit Row 1 ────────────────────────────────────────────
  { id: "intake",              label: "New Intake",                           color: "#6366f1", tab: "prelit",    row: 1 }, // indigo  – new case
  { id: "fee_agreement_sent",  label: "Fee Agreement Sent",                   color: "#8b5cf6", tab: "prelit",    row: 1 }, // violet  – pending signature
  { id: "fee_agreement_signed",label: "Agreement Signed",                     color: "#22c55e", tab: "prelit",    row: 1 }, // green   – signed ✓
  { id: "open_claims",         label: "Open Claim / Get Police Report",       color: "#0ea5e9", tab: "prelit",    row: 1 }, // sky     – active claim
  { id: "client_treating",     label: "Client Treating",                      color: "#06b6d4", tab: "prelit",    row: 1 }, // cyan    – medical treatment
  { id: "lien_search",         label: "Lien Search",                          color: "#14b8a6", tab: "prelit",    row: 1 }, // teal    – research
  { id: "collecting_records",  label: "Collecting Records",                   color: "#3b82f6", tab: "prelit",    row: 1 }, // blue    – gathering docs
  // ── Pre-Lit Row 2 ────────────────────────────────────────────
  { id: "demand_prep",         label: "Demand Prep",                          color: "#f59e0b", tab: "prelit",    row: 2 }, // amber   – building demand
  { id: "settlement_dist",     label: "Settlement Distribution Sheet",        color: "#f97316", tab: "prelit",    row: 2 }, // orange  – calculating funds
  { id: "negotiations",        label: "Negotiations",                         color: "#ef4444", tab: "prelit",    row: 2 }, // red     – active negotiation
  { id: "send_acceptance",     label: "Send Acceptance",                      color: "#22c55e", tab: "prelit",    row: 2 }, // green   – settled ✓
  { id: "lien_search_post",    label: "Lien Search (Post-Settlement)",        color: "#14b8a6", tab: "prelit",    row: 2 }, // teal    – post-settlement check
  { id: "disperse_funds",      label: "Disperse Funds & Letters to Providers",color: "#64748b", tab: "prelit",    row: 2 }, // slate   – closing out
  { id: "case_closed",         label: "Case Closed",                          color: "#334155", tab: "both",      row: 2 }, // dark    – done
  // ── Litigation Row 1 ─────────────────────────────────────────
  { id: "litigation_filed",    label: "Filed",                                color: "#dc2626", tab: "litigation", row: 1 }, // red     – filed
  { id: "litigation_served",   label: "Served",                               color: "#b91c1c", tab: "litigation", row: 1 }, // red+    – served
  { id: "litigation_answered", label: "Answer Filed",                         color: "#991b1b", tab: "litigation", row: 1 }, // dark red – answered
  // ── Litigation Row 2 ─────────────────────────────────────────
  { id: "discovery",           label: "Discovery",                            color: "#7c3aed", tab: "litigation", row: 2 }, // violet  – complex process
  { id: "resolution",          label: "Resolution",                           color: "#22c55e", tab: "litigation", row: 2 }, // green   – resolved ✓
];

const CASE_TYPES = [
  "Auto Accident",
  "Slip & Fall",
  "Medical Malpractice",
  "Workplace Injury",
  "Product Liability",
  "Wrongful Death",
  "Dog Bite",
  "Other",
];

/**
 * Load all cases from localStorage.
 */
function loadCases() {
  try {
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : getSeedData();
  } catch {
    return getSeedData();
  }
}

/**
 * Save all cases to localStorage.
 */
function saveCases(cases) {
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(cases));
}

/**
 * Add a new case.
 */
function addCase(caseData) {
  const cases = loadCases();
  const newCase = {
    id: "case-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stage: "intake",
    ...caseData,
  };
  cases.push(newCase);
  saveCases(cases);
  return newCase;
}

/**
 * Update an existing case.
 */
function updateCase(caseId, updates) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  cases[idx] = { ...cases[idx], ...updates, updatedAt: new Date().toISOString() };
  saveCases(cases);
  return cases[idx];
}

/**
 * Delete a case.
 */
function deleteCase(caseId) {
  const cases = loadCases().filter((c) => c.id !== caseId);
  saveCases(cases);
}

/**
 * Move a case to a new stage.
 */
function moveCaseToStage(caseId, newStage) {
  const cases = loadCases();
  const c = cases.find(x => x.id === caseId);
  const oldStage = c ? c.stage : "";
  const updated = updateCase(caseId, { stage: newStage });
  // Trigger stage automation if caseAgents.js is loaded
  if (typeof onStageChange === "function" && oldStage !== newStage) {
    onStageChange(caseId, oldStage, newStage);
  }
  return updated;
}

/**
 * Get cases grouped by stage (for Kanban rendering).
 */
function getCasesByStage() {
  const cases = loadCases();
  const grouped = {};
  for (const stage of CASE_STAGES) {
    grouped[stage.id] = cases.filter((c) => c.stage === stage.id);
  }
  return grouped;
}

/**
 * Seed data for demo purposes.
 */
function getSeedData() {
  const seed = [
    {
      id: "case-demo-001",
      clientName: "Maria Garcia",
      caseType: "Auto Accident",
      stage: "intake",
      phone: "(555) 123-4567",
      email: "maria.garcia@email.com",
      dob: "1990-05-15",
      address: "4521 E Baseline Rd, Phoenix, AZ 85042",
      driverLicense: "",
      referralSource: "Dr. Patel",
      dateOfIncident: "2026-02-28",
      description: "Rear-end collision at intersection of Main St and 5th Ave. Client reports neck and back pain.",
      insuranceCompany: "State Farm Mutual Automobile Insurance Company",
      claimNumber: "24-854834589",
      adjusterName: "Sarah Johnson",
      adjusterEmail: "sarah.johnson@statefarm.com",
      adjusterFax: "",
      insuredName: "Michael Smith",
      clientInsuranceCompany: "GEICO General Insurance Company",
      clientClaimNumber: "",
      clientAdjusterName: "",
      clientAdjusterEmail: "",
      healthInsuranceCarrier: "Blue Cross Blue Shield of Arizona",
      healthInsurancePolicyNum: "",
      litigationStatus: "pre_lit",
      caseNumber: "",
      county: "Maricopa",
      defendantAttorney: "",
      defendantAttorneyEmail: "",
      arbitratorName: "",
      assignedTo: "",
      statuteOfLimitations: "2028-02-28",
      estimatedValue: "",
      caseValueRange: "",
      settlementAmount: 0,
      lastContactDate: "2026-03-10",
      notes: "Client referred by Dr. Patel. Initial medical records requested.",
      createdAt: "2026-03-10T09:00:00Z",
      updatedAt: "2026-03-10T09:00:00Z",
    },
    {
      id: "case-demo-002",
      clientName: "James Thompson",
      caseType: "Slip & Fall",
      stage: "review",
      phone: "(555) 234-5678",
      email: "j.thompson@email.com",
      dateOfIncident: "2026-01-15",
      description: "Slipped on icy parking lot at Greenfield Mall. Fractured wrist and hip contusion.",
      assignedTo: "",
      statuteOfLimitations: "2028-01-15",
      estimatedValue: "$75,000",
      notes: "Surveillance footage requested from mall management. Incident report obtained.",
      createdAt: "2026-02-01T14:30:00Z",
      updatedAt: "2026-03-05T10:15:00Z",
    },
    {
      id: "case-demo-003",
      clientName: "Linda Washington",
      caseType: "Medical Malpractice",
      stage: "active",
      phone: "(555) 345-6789",
      email: "lwashington@email.com",
      dateOfIncident: "2025-09-20",
      description: "Misdiagnosis of appendicitis led to rupture and emergency surgery with extended hospital stay.",
      assignedTo: "",
      statuteOfLimitations: "2027-09-20",
      estimatedValue: "$250,000",
      notes: "Expert medical review in progress. Dr. Chen retained as expert witness.",
      createdAt: "2025-10-05T11:00:00Z",
      updatedAt: "2026-03-12T16:45:00Z",
    },
    {
      id: "case-demo-004",
      clientName: "Robert Kim",
      caseType: "Workplace Injury",
      stage: "negotiation",
      phone: "(555) 456-7890",
      email: "rkim@email.com",
      dateOfIncident: "2025-06-10",
      description: "Construction site accident — fell from scaffolding due to missing safety rails. L4-L5 disc herniation.",
      assignedTo: "",
      statuteOfLimitations: "2027-06-10",
      estimatedValue: "$400,000",
      notes: "Demand letter sent 2026-02-15. Insurance adjuster countered at $180K. Mediation scheduled.",
      createdAt: "2025-07-01T08:00:00Z",
      updatedAt: "2026-03-14T13:20:00Z",
    },
  ];
  saveCases(seed);
  return seed;
}

// ─── Kanban Board Rendering ──────────────────────────────────

let _activeBoardTab = "prelit";

function switchBoardTab(tab) {
  _activeBoardTab = tab;
  renderKanbanBoard();
}

function renderKanbanBoard() {
  const board = document.getElementById("kanban-board");
  if (!board) return;

  // Header (only wire once)
  const header = document.querySelector("#panel-crm .panel-header");
  if (header && !header.dataset.importWired) {
    header.dataset.importWired = "1";
    header.innerHTML = `
      <h1>Case Intake Board</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="openNewCaseForm()">+ New Intake</button>
        <button class="btn btn-outline btn-sm" onclick="_showEmailImport()">📧 Import from Email</button>
        <button class="btn btn-outline btn-sm" onclick="_showAttorneyShareImport()">⚖ Attorney Share</button>
      </div>
    `;
  }

  const grouped   = getCasesByStage();
  const allCases  = loadCases();

  // Stages for current tab (include "both" stages in every tab)
  const tabStages = CASE_STAGES.filter(s => s.tab === _activeBoardTab || s.tab === "both");

  const row1 = tabStages.filter(s => s.row === 1);
  const row2 = tabStages.filter(s => s.row === 2);

  // Count per tab for badges
  const prelitIds    = CASE_STAGES.filter(s => s.tab === "prelit" || s.tab === "both").map(s => s.id);
  const litigIds     = CASE_STAGES.filter(s => s.tab === "litigation" || s.tab === "both").map(s => s.id);
  const prelitCount  = allCases.filter(c => prelitIds.includes(c.stage)).length;
  const litigCount   = allCases.filter(c => litigIds.includes(c.stage)).length;

  function renderColumn(stage) {
    const cards = (grouped[stage.id]||[]);
    return `
      <div class="kanban-column" data-stage="${stage.id}">
        <div class="kanban-column-header" style="border-top:3px solid ${stage.color}">
          <span class="kanban-column-title">${stage.label}</span>
          <span class="kanban-column-count">${cards.length}</span>
        </div>
        <div class="kanban-cards" data-stage="${stage.id}"
             ondragover="handleDragOver(event)" ondrop="handleDrop(event)">
          ${cards.map(c => `
            <div class="kanban-card" draggable="true" data-case-id="${c.id}"
                 ondragstart="handleDragStart(event)" onclick="openCaseDetail('${c.id}')">
              <div class="kanban-card-type">${escapeHtml(c.caseType||"")}</div>
              <div class="kanban-card-name">${escapeHtml(c.clientName||"")}</div>
              ${c.statuteOfLimitations ? `<div class="kanban-card-sol">SOL ${new Date(c.statuteOfLimitations+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>` : ""}
            </div>`).join("")}
        </div>
      </div>`;
  }

  board.innerHTML = `
    <div class="board-tab-bar">
      <button class="board-tab-btn ${_activeBoardTab==="prelit"?"active":""}" onclick="switchBoardTab('prelit')">
        Pre-Lit <span class="board-tab-count">${prelitCount}</span>
      </button>
      <button class="board-tab-btn ${_activeBoardTab==="litigation"?"active":""}" onclick="switchBoardTab('litigation')">
        Litigation <span class="board-tab-count">${litigCount}</span>
      </button>
    </div>
    <div class="kanban-rows">
      <div class="kanban-row-wrap">
        <div class="kanban-row-label">Row 1</div>
        <div class="kanban-scroll">${row1.map(renderColumn).join("")}</div>
      </div>
      <div class="kanban-row-wrap">
        <div class="kanban-row-label">Row 2</div>
        <div class="kanban-scroll">${row2.map(renderColumn).join("")}</div>
      </div>
    </div>`;
}

// ─── Drag & Drop ─────────────────────────────────────────────

function handleDragStart(event) {
  event.dataTransfer.setData("text/plain", event.target.dataset.caseId);
  event.target.classList.add("dragging");
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");
  const caseId = event.dataTransfer.getData("text/plain");
  const newStage = event.currentTarget.dataset.stage;
  if (caseId && newStage) {
    moveCaseToStage(caseId, newStage);
    renderKanbanBoard();
    showToast("Case moved to " + CASE_STAGES.find((s) => s.id === newStage)?.label);
  }
}

// ─── Case Detail Modal ───────────────────────────────────────

function openCaseDetail(caseId) {
  const cases = loadCases();
  const c = cases.find((x) => x.id === caseId);
  if (!c) return;

  const modal = document.getElementById("case-modal");
  const content = document.getElementById("case-modal-content");

  content.innerHTML = `
    <div class="modal-header">
      <h2>${escapeHtml(c.clientName)}</h2>
      <button class="btn-icon" onclick="closeCaseModal()">&times;</button>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab active" onclick="_switchTab(this,'tab-client')">Client</button>
      <button class="modal-tab" onclick="_switchTab(this,'tab-insurance')">Insurance</button>
      <button class="modal-tab" onclick="_switchTab(this,'tab-welcome')">Welcome Call</button>
      <button class="modal-tab" onclick="_switchTab(this,'tab-phone')">Phone Notes</button>
      <button class="modal-tab" onclick="_switchTab(this,'tab-notes')">Notes</button>
      <button class="modal-tab" onclick="_switchTab(this,'tab-attachments');loadAttachments('${c.id}')">📎 Attachments</button>
      ${c.stage === "open_claims" ? `<button class="modal-tab lor-tab" onclick="_switchTab(this,'tab-lor')">📨 LOR</button>` : ""}
    </div>
    <form id="case-edit-form" onsubmit="saveCaseEdit(event, '${c.id}')">
      <div id="tab-client" class="tab-pane active">
        <div class="form-grid">
          <div class="form-group"><label>Client Name</label><input name="clientName" value="${escapeHtml(c.clientName || "")}" /></div>
          <div class="form-group"><label>Case Type</label><select name="caseType">${CASE_TYPES.map((t) => `<option ${t === c.caseType ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="form-group"><label>Phone</label><input name="phone" value="${escapeHtml(c.phone || "")}" /></div>
          <div class="form-group"><label>Email</label><input name="email" type="email" value="${escapeHtml(c.email || "")}" /></div>
          <div class="form-group"><label>Date of Birth</label><input name="dob" type="date" value="${c.dob || ""}" /></div>
          <div class="form-group"><label>Address</label><input name="address" value="${escapeHtml(c.address || "")}" /></div>
          <div class="form-group"><label>Driver's License</label><input name="driverLicense" value="${escapeHtml(c.driverLicense || "")}" /></div>
          <div class="form-group"><label>Referral Source</label><input name="referralSource" value="${escapeHtml(c.referralSource || "")}" /></div>
          <div class="form-group"><label>Date of Incident</label><input name="dateOfIncident" type="date" value="${c.dateOfIncident || ""}" /></div>
          <div class="form-group"><label>SOL</label><input name="statuteOfLimitations" type="date" value="${c.statuteOfLimitations || ""}" /></div>
          <div class="form-group"><label>Estimated Value</label><input name="estimatedValue" value="${escapeHtml(c.estimatedValue || "")}" /></div>
          <div class="form-group"><label>Stage</label><select name="stage">${CASE_STAGES.map((s) => `<option value="${s.id}" ${s.id === c.stage ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>
        </div>
        <div class="form-group full-width"><label>Description</label><textarea name="description" rows="2">${escapeHtml(c.description || "")}</textarea></div>
      </div>
      <div id="tab-insurance" class="tab-pane">
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin-bottom:8px">3RD PARTY (AT-FAULT) INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Insurance Company</label><input name="insuranceCompany" value="${escapeHtml(c.insuranceCompany || "")}" list="az-insurers-modal" /></div>
          <div class="form-group"><label>Claim Number</label><input name="claimNumber" value="${escapeHtml(c.claimNumber || "")}" /></div>
          <div class="form-group"><label>Adjuster Name</label><input name="adjusterName" value="${escapeHtml(c.adjusterName || "")}" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="adjusterEmail" value="${escapeHtml(c.adjusterEmail || "")}" type="email" /></div>
          <div class="form-group"><label>Adjuster Fax</label><input name="adjusterFax" value="${escapeHtml(c.adjusterFax || "")}" /></div>
          <div class="form-group"><label>Insured (Driver)</label><input name="insuredName" value="${escapeHtml(c.insuredName || "")}" /></div>
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin:16px 0 8px">1ST PARTY (CLIENT'S) INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Insurance Company</label><input name="clientInsuranceCompany" value="${escapeHtml(c.clientInsuranceCompany || "")}" list="az-insurers-modal" /></div>
          <div class="form-group"><label>Claim Number</label><input name="clientClaimNumber" value="${escapeHtml(c.clientClaimNumber || "")}" /></div>
          <div class="form-group"><label>Adjuster Name</label><input name="clientAdjusterName" value="${escapeHtml(c.clientAdjusterName || "")}" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="clientAdjusterEmail" value="${escapeHtml(c.clientAdjusterEmail || "")}" type="email" /></div>
          <div class="form-group"><label>Adjuster Fax</label><input name="clientAdjusterFax" value="${escapeHtml(c.clientAdjusterFax || "")}" /></div>
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin:16px 0 8px">HEALTH INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Carrier</label><input name="healthInsuranceCarrier" value="${escapeHtml(c.healthInsuranceCarrier || "")}" /></div>
          <div class="form-group"><label>Policy Number</label><input name="healthInsurancePolicyNum" value="${escapeHtml(c.healthInsurancePolicyNum || "")}" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="healthInsuranceEmail" type="email" value="${escapeHtml(c.healthInsuranceEmail || "")}" /></div>
          <div class="form-group"><label>Adjuster Fax</label><input name="healthInsuranceFax" value="${escapeHtml(c.healthInsuranceFax || "")}" /></div>
          <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:20px">
            <input type="checkbox" name="treatmentUnderHealthIns" id="edit-health-ins-check" value="true" ${c.treatmentUnderHealthIns === "true" || c.treatmentUnderHealthIns === true ? "checked" : ""} style="width:16px;height:16px" />
            <label for="edit-health-ins-check" style="margin:0;font-size:13px">Treatment received under health insurance</label>
          </div>
        </div>
        <datalist id="az-insurers-modal">${(typeof AZ_INSURERS_LIST !== 'undefined' ? AZ_INSURERS_LIST : []).map(n => `<option value="${n}">`).join('')}</datalist>
      </div>
      ${c.stage === "open_claims" ? `
      <div id="tab-lor" class="tab-pane">
        ${_buildLorTabHtml(c)}
      </div>` : ""}
      <div id="tab-welcome" class="tab-pane">
        <div class="form-group full-width">
          <label>Welcome Call Notes</label>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Notes from the initial welcome call with the client — intake details, injuries, how accident happened, etc.</div>
          <textarea name="welcomeCallNotes" rows="12" style="font-family:inherit">${escapeHtml(c.welcomeCallNotes || "")}</textarea>
        </div>
      </div>
      <div id="tab-phone" class="tab-pane">
        <div class="form-group full-width">
          <label>Phone Notes</label>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Log of all phone interactions with the client, insurance, medical providers, etc.</div>
          <textarea name="phoneNotes" rows="12" style="font-family:inherit">${escapeHtml(c.phoneNotes || "")}</textarea>
        </div>
      </div>
      <div id="tab-notes" class="tab-pane">
        <div class="form-group full-width"><label>Notes</label><textarea name="notes" rows="6">${escapeHtml(c.notes || "")}</textarea></div>
        ${c.caseValueRange ? `<div style="margin-top:12px;padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)"><div style="font-weight:600;font-size:13px;margin-bottom:4px">AI Case Valuation</div><div style="font-size:13px;color:var(--text-secondary)">${escapeHtml(c.caseValueRange)}</div></div>` : ""}
      </div>
      <div id="tab-attachments" class="tab-pane">
        <div id="attachments-list-${c.id}" style="padding:8px">
          <div class="text-muted" style="font-size:13px">Loading attachments...</div>
        </div>
      </div>
      <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
        <button type="submit" class="btn btn-primary">Save Changes</button>
        ${c.stage === "intake" ? `<button type="button" class="btn btn-accent" style="background:#a855f7" onclick="showFeeAgreementPreview('${c.id}')">Send Fee Agreement</button>` : ""}
        ${c.stage === "fee_agreement_sent" ? `<button type="button" class="btn btn-accent" style="background:#22c55e" onclick="markAgreementSigned('${c.id}')">Agreement Signed</button>` : ""}
        ${c.stage === "fee_agreement_sent" && c.docusignEnvelopeId ? `<button type="button" class="btn btn-outline" onclick="checkAgreementStatus('${c.id}')">Check Signature</button>` : ""}
        ${c.stage === "fee_agreement_signed" ? `<button type="button" class="btn btn-accent" style="background:#6d28d9" onclick="moveCaseToStage('${c.id}','open_claims');renderKanbanBoard();closeCaseModal();showToast('Moved to Open Claim')">Open Claim</button>` : ""}
        ${c.stage === "open_claims" ? `<button type="button" class="btn btn-accent" style="background:var(--slg-orange)" onclick="sendLORs('${c.id}')">📨 Send LORs</button>` : ""}
        ${c.stage === "client_treating" ? `<button type="button" class="btn btn-accent" style="background:#14b8a6" onclick="moveCaseToStage('${c.id}','lien_search');renderKanbanBoard();closeCaseModal();showToast('Moved to Lien Search')">✅ Done Treating</button>` : ""}
        ${c.stage === "lien_search" ? `<button type="button" class="btn btn-accent" style="background:#3b82f6" onclick="moveCaseToStage('${c.id}','collecting_records');renderKanbanBoard();closeCaseModal();showToast('Moved to Collecting Records')">📋 Collect Records</button>` : ""}
        ${c.stage === "negotiations" ? `
          <button type="button" class="btn btn-accent" style="background:#22c55e" onclick="moveCaseToStage('${c.id}','send_acceptance');renderKanbanBoard();closeCaseModal();showToast('Case Settled — moved to Send Acceptance')">✅ Case Settled</button>
          <button type="button" class="btn btn-accent" style="background:#ef4444" onclick="moveCaseToStage('${c.id}','litigation_filed');_activeBoardTab='litigation';renderKanbanBoard();closeCaseModal();showToast('Moved to Litigation')">⚖️ Move to Litigation</button>
        ` : ""}
        <button type="button" class="btn btn-danger" onclick="confirmDeleteCase('${c.id}')">Delete</button>
      </div>
    </form>
  `;

  modal.classList.add("open");
}

function closeCaseModal() {
  document.getElementById("case-modal").classList.remove("open");
}

function saveCaseEdit(event, caseId) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  const updated = updateCase(caseId, data);
  renderKanbanBoard();
  showToast("Case updated successfully");
  // Re-render modal in place so Insurance changes immediately show in LOR tab
  const activeTabId = form.closest(".modal-box")?.querySelector(".tab-pane.active")?.id;
  openCaseDetail(caseId);
  if (activeTabId) {
    const tabPane = document.getElementById(activeTabId);
    const tabBtn  = document.querySelector(`[onclick*="'${activeTabId}'"]`);
    if (tabPane && tabBtn) _switchTab(tabBtn, activeTabId);
  }
  // Async: sync notes (Welcome Call, Phone Notes, Case Notes) to SharePoint in background
  if (updated && typeof syncNotesToSharePoint === "function") {
    syncNotesToSharePoint(updated).catch(err =>
      console.warn("[saveCaseEdit] SharePoint notes sync error:", err.message)
    );
  }
}

function confirmDeleteCase(caseId) {
  const cases = loadCases();
  const c = cases.find(x => x.id === caseId);
  if (!c) return;
  const entered = prompt(`To permanently delete this case, type the client name exactly:\n\n"${c.clientName}"`);
  if (entered === null) return; // cancelled
  if (entered.trim() !== c.clientName.trim()) {
    showToast("Name did not match — case not deleted", "error");
    return;
  }
  deleteCase(caseId);
  closeCaseModal();
  renderKanbanBoard();
  showToast("Case deleted");
}

// ─── New Case Form ───────────────────────────────────────────

function openNewCaseForm() {
  const modal = document.getElementById("case-modal");
  const content = document.getElementById("case-modal-content");

  content.innerHTML = `
    <div class="modal-header">
      <h2>New Client Intake</h2>
      <button class="btn-icon" onclick="closeCaseModal()">&times;</button>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab active" onclick="_switchTab(this,'ntab-client')">Client Info</button>
      <button class="modal-tab" onclick="_switchTab(this,'ntab-insurance')">Insurance</button>
      <button class="modal-tab" onclick="_switchTab(this,'ntab-notes')">Details</button>
    </div>
    <form id="new-case-form" onsubmit="submitNewCase(event)">
      <div id="ntab-client" class="tab-pane active">
        <div class="form-grid">
          <div class="form-group"><label>Client Name</label><input name="clientName" /></div>
          <div class="form-group"><label>Case Type</label><select name="caseType">${CASE_TYPES.map((t) => `<option>${t}</option>`).join("")}</select></div>
          <div class="form-group"><label>Phone</label><input name="phone" /></div>
          <div class="form-group"><label>Email</label><input name="email" type="email" /></div>
          <div class="form-group"><label>Date of Birth</label><input name="dob" type="date" /></div>
          <div class="form-group"><label>Address</label><input name="address" /></div>
          <div class="form-group"><label>Date of Incident</label><input name="dateOfIncident" type="date" /></div>
          <div class="form-group"><label>SOL</label><input name="statuteOfLimitations" type="date" /></div>
          <div class="form-group"><label>Referral Source</label><input name="referralSource" /></div>
          <div class="form-group"><label>Driver's License</label><input name="driverLicense" /></div>
        </div>
      </div>
      <div id="ntab-insurance" class="tab-pane">
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin-bottom:8px">3RD PARTY (AT-FAULT) INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Insurance Company</label><input name="insuranceCompany" list="az-insurers-new" /></div>
          <div class="form-group"><label>Claim Number</label><input name="claimNumber" /></div>
          <div class="form-group"><label>Adjuster Name</label><input name="adjusterName" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="adjusterEmail" type="email" /></div>
          <div class="form-group"><label>Adjuster Fax</label><input name="adjusterFax" /></div>
          <div class="form-group"><label>Insured (Driver)</label><input name="insuredName" /></div>
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin:16px 0 8px">1ST PARTY (CLIENT'S) INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Auto Insurance</label><input name="clientInsuranceCompany" list="az-insurers-new" /></div>
          <div class="form-group"><label>Claim Number</label><input name="clientClaimNumber" /></div>
          <div class="form-group"><label>Adjuster Name</label><input name="clientAdjusterName" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="clientAdjusterEmail" type="email" /></div>
          <div class="form-group"><label>Adjuster Fax</label><input name="clientAdjusterFax" /></div>
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin:16px 0 8px">HEALTH INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Health Insurance Carrier</label><input name="healthInsuranceCarrier" /></div>
          <div class="form-group"><label>Policy Number</label><input name="healthInsurancePolicyNum" /></div>
          <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:20px">
            <input type="checkbox" name="treatmentUnderHealthIns" id="new-health-ins-check" value="true" style="width:16px;height:16px" />
            <label for="new-health-ins-check" style="margin:0;font-size:13px">Treatment received under health insurance</label>
          </div>
        </div>
        <datalist id="az-insurers-new">${AZ_INSURERS_LIST.map(n => `<option value="${n}">`).join('')}</datalist>
      </div>
      <div id="ntab-notes" class="tab-pane">
        <div class="form-group full-width"><label>Description</label><textarea name="description" rows="3"></textarea></div>
        <div class="form-group full-width"><label>Notes</label><textarea name="notes" rows="2"></textarea></div>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Create Case</button>
        <button type="button" class="btn btn-outline" onclick="closeCaseModal()">Cancel</button>
      </div>
    </form>
  `;

  modal.classList.add("open");
}

function submitNewCase(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const newCase = addCase(data);
  closeCaseModal();
  renderKanbanBoard();
  showToast("New case created");
  // Trigger intake automation
  if (typeof onCaseCreate === "function") {
    onCaseCreate(newCase.id);
  }
}

// ─── Import: Email Referral ──────────────────────────────────

function _showEmailImport() {
  const modal = document.getElementById("case-modal");
  const content = document.getElementById("case-modal-content");

  content.innerHTML = `
    <div class="modal-header">
      <h2>Import from Email Referral</h2>
      <button class="btn-icon" onclick="closeCaseModal()">&times;</button>
    </div>
    <div style="padding:0 4px">
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
        Paste the referral email content below. AI will extract client info, case details, and create a new case.
      </p>
      <div class="form-group">
        <label>Email Content</label>
        <textarea id="email-import-text" rows="10" placeholder="Paste the full referral email here..."></textarea>
      </div>
      <div id="email-import-preview" style="margin-top:12px"></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="_parseEmailReferral()" id="email-import-btn">Parse with AI</button>
        <button class="btn btn-outline" onclick="closeCaseModal()">Cancel</button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

async function _parseEmailReferral() {
  const emailText = document.getElementById("email-import-text")?.value?.trim();
  if (!emailText) { showToast("Paste email content first", "error"); return; }

  const apiKey = typeof getClaudeApiKey === "function" ? getClaudeApiKey() : null;
  if (!apiKey) { showToast("Set Claude API key in Settings", "error"); return; }

  const btn = document.getElementById("email-import-btn");
  const preview = document.getElementById("email-import-preview");
  btn.disabled = true; btn.textContent = "Parsing...";
  preview.innerHTML = `<div class="agent-loading"><div class="spinner"></div><span>Extracting case info...</span></div>`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "x-api-key": apiKey,
        "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: typeof CLAUDE_MODEL !== "undefined" ? CLAUDE_MODEL : "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are a legal intake assistant. Extract case information from a referral email. Return ONLY a valid JSON object with these fields (use empty string if unknown):
{
  "clientName": "full name",
  "phone": "phone number",
  "email": "email address",
  "dob": "YYYY-MM-DD or empty",
  "address": "full address",
  "caseType": "one of: Auto Accident, Slip & Fall, Medical Malpractice, Workplace Injury, Product Liability, Wrongful Death, Dog Bite, Other",
  "dateOfIncident": "YYYY-MM-DD or empty",
  "description": "brief description of incident and injuries",
  "referralSource": "referring attorney or source name",
  "notes": "any additional relevant details"
}`,
        messages: [{ role: "user", content: emailText }],
      }),
    });

    const data = await resp.json();
    const raw = data.content?.[0]?.text || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse response");
    const extracted = JSON.parse(match[0]);

    // Show editable confirmation
    preview.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px">
        <div style="font-weight:600;margin-bottom:12px;color:var(--accent)">Extracted — Review & Confirm</div>
        <div class="form-grid">
          <div class="form-group"><label>Client Name</label><input id="ei-name" value="${escapeHtml(extracted.clientName || "")}" /></div>
          <div class="form-group"><label>Case Type</label>
            <select id="ei-type">${CASE_TYPES.map(t => `<option ${t === extracted.caseType ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="form-group"><label>Phone</label><input id="ei-phone" value="${escapeHtml(extracted.phone || "")}" /></div>
          <div class="form-group"><label>Email</label><input id="ei-email" value="${escapeHtml(extracted.email || "")}" /></div>
          <div class="form-group"><label>Date of Incident</label><input type="date" id="ei-doi" value="${extracted.dateOfIncident || ""}" /></div>
          <div class="form-group"><label>Referral</label><input id="ei-ref" value="${escapeHtml(extracted.referralSource || "")}" /></div>
        </div>
        <div class="form-group full-width"><label>Description</label><textarea id="ei-desc" rows="2">${escapeHtml(extracted.description || "")}</textarea></div>
        <div class="form-group full-width"><label>Notes</label><textarea id="ei-notes" rows="2">${escapeHtml(extracted.notes || "")}</textarea></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" onclick="_confirmEmailImport()">Create Case</button>
          <button class="btn btn-outline" onclick="_parseEmailReferral()">Re-parse</button>
        </div>
      </div>
    `;
  } catch (err) {
    preview.innerHTML = `<div class="agent-error">Parse failed: ${escapeHtml(err.message)}</div>`;
  } finally { btn.disabled = false; btn.textContent = "Parse with AI"; }
}

function _confirmEmailImport() {
  const caseData = {
    clientName: document.getElementById("ei-name")?.value?.trim() || "Unknown",
    caseType: document.getElementById("ei-type")?.value || "Other",
    phone: document.getElementById("ei-phone")?.value?.trim() || "",
    email: document.getElementById("ei-email")?.value?.trim() || "",
    dateOfIncident: document.getElementById("ei-doi")?.value || "",
    referralSource: document.getElementById("ei-ref")?.value?.trim() || "",
    description: document.getElementById("ei-desc")?.value?.trim() || "",
    notes: document.getElementById("ei-notes")?.value?.trim() || "",
  };

  const newCase = addCase(caseData);
  closeCaseModal();
  renderKanbanBoard();
  showToast(`Case created for ${caseData.clientName}`);
  if (typeof onCaseCreate === "function") onCaseCreate(newCase.id);
}

// ─── Import: Attorney Share ──────────────────────────────────

async function _showAttorneyShareImport() {
  const modal = document.getElementById("case-modal");
  const content = document.getElementById("case-modal-content");

  content.innerHTML = `
    <div class="modal-header">
      <h2>Attorney Share</h2>
      <button class="btn-icon" onclick="closeCaseModal()">&times;</button>
    </div>
    <div style="padding:0 4px">
      <div id="attyshare-status" style="margin-bottom:12px">
        <div class="agent-loading"><div class="spinner"></div><span>Checking connection...</span></div>
      </div>
      <div id="attyshare-body"></div>
    </div>
  `;
  modal.classList.add("open");

  // Check connection status
  let connected = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch(`${API_BASE}/api/attorney-share/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      connected = data.configured && data.success;
    }
  } catch { /* timeout or network error */ }

  const statusEl = document.getElementById("attyshare-status");
  const bodyEl = document.getElementById("attyshare-body");
  if (!statusEl || !bodyEl) return;

  if (connected) {
    statusEl.innerHTML = `<div style="background:#22c55e22;border:1px solid #22c55e;padding:8px 12px;border-radius:6px;font-size:13px;color:#22c55e">✓ Attorney Share API connected</div>`;
    bodyEl.innerHTML = `
      <div style="margin-bottom:16px">
        <p style="color:var(--text-secondary);font-size:13px;margin:0 0 8px">
          Cases arrive automatically when Attorney Share sends them via webhook.<br>
          <span style="color:var(--text-muted);font-size:12px">
            Attorney Share's API is send-only — there is no pull endpoint. To receive your 3 pending cases,
            go to <strong>Attorney Share → Settings → Webhooks</strong> and set your webhook URL to:<br>
            <code style="font-size:11px;background:var(--bg-card);padding:2px 6px;border-radius:4px;word-break:break-all">https://lens.sherlawgroup.com/api/attorney-share/webhook</code>
          </span>
        </p>
      </div>

      <div id="attyshare-fetch-results" style="margin-bottom:16px"></div>

      <div class="settings-section" style="margin-bottom:12px">
        <h3 style="margin:0 0 8px">Previously Imported</h3>
        <div id="attyshare-cases"><p style="color:var(--text-muted);font-size:13px">Loading...</p></div>
      </div>
    `;
    _loadAttorneyShareCases();
  } else {
    statusEl.innerHTML = `<div style="background:var(--bg-card);padding:8px 12px;border-radius:6px;font-size:13px;color:var(--text-muted)">Attorney Share not connected</div>`;
    bodyEl.innerHTML = `
      <div class="settings-section" style="margin-bottom:12px">
        <h3 style="margin:0 0 8px">Connect Attorney Share</h3>
        <div class="form-group">
          <label>API Key <span style="color:var(--text-muted);font-weight:400">(starts with attshr_)</span></label>
          <input type="password" id="attyshare-api-key" placeholder="attshr_..." autocomplete="off" />
        </div>
        <button class="btn btn-primary btn-sm" onclick="_saveAttorneyShareKey()">Save &amp; Connect</button>
      </div>

      <div class="settings-section">
        <h3 style="margin:0 0 8px">Manual Import</h3>
        <div class="form-group">
          <textarea id="attyshare-json" rows="6" placeholder='{"clientName": "John Doe", "caseType": "Auto Accident", "phone": "555-1234", "email": "john@email.com", "dateOfIncident": "2026-03-01", "description": "Rear-end collision..."}'></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="_importAttorneyShareJson()">Import</button>
          <button class="btn btn-outline" onclick="closeCaseModal()">Cancel</button>
        </div>
      </div>
    `;
  }
}

async function _saveAttorneyShareKey() {
  const key = document.getElementById("attyshare-api-key")?.value?.trim();
  if (!key || !key.startsWith("attshr_")) {
    showToast("Key must start with attshr_", "error");
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/api/attorney-share/set-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key }),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.error || `HTTP ${resp.status}`); }
    showToast("API key saved — reconnecting…");
    _showAttorneyShareImport(); // re-check connection
  } catch (err) {
    showToast("Save failed: " + err.message, "error");
  }
}

async function _loadAttorneyShareCases() {
  const el = document.getElementById("attyshare-cases");
  if (!el) return;
  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch(`${API_BASE}/api/attorney-share/cases`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const cases = await resp.json();
    if (!cases.length) {
      el.innerHTML = `<p style="color:var(--text-muted);font-size:13px">No referrals received yet. Set up the webhook in Attorney Share to start receiving cases.</p>`;
      return;
    }
    el.innerHTML = cases.slice(0, 10).map(c => `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600;font-size:13px">${escapeHtml(c.client_name || "")}</div>
          <div style="font-size:12px;color:var(--text-muted)">${escapeHtml(c.case_type || "")} — ${c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="_importAttyShareCase('${escapeHtml(c.id)}')" style="font-size:11px;padding:2px 8px">Add to Board</button>
      </div>
    `).join("");
  } catch (err) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${escapeHtml(err.message)}</p>`;
  }
}

async function _fetchAttorneyShareCases() {
  const btn = document.getElementById("attyshare-fetch-btn");
  const resultsEl = document.getElementById("attyshare-fetch-results");
  if (!resultsEl) return;
  if (btn) { btn.disabled = true; btn.textContent = "Fetching..."; }
  resultsEl.innerHTML = `<div class="agent-loading"><div class="spinner"></div><span>Fetching from Attorney Share...</span></div>`;

  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch(`${API_BASE}/api/attorney-share/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const data = await resp.json();
    if (!resp.ok) {
      // Show full debug log so we can identify the correct endpoint
      const debugStr = data.debug ? "\n" + data.debug.join(", ") : "";
      throw new Error((data.error || `HTTP ${resp.status}`) + debugStr);
    }

    const referrals = data.referrals || [];
    if (!referrals.length) {
      resultsEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px">No pending referrals found in Attorney Share.</p>`;
      if (btn) { btn.disabled = false; btn.textContent = "⬇ Fetch Cases"; }
      return;
    }

    resultsEl.innerHTML = `
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">${referrals.length} referral(s) found — select to import:</div>
      ${referrals.map((r, i) => `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:13px">${escapeHtml(r.clientName || "Unknown")}</div>
            <div style="font-size:12px;color:var(--text-muted)">
              ${escapeHtml(r.caseType || "")}${r.dateOfIncident ? " · " + escapeHtml(r.dateOfIncident) : ""}
              ${r.referringAttorney ? " · Ref: " + escapeHtml(r.referringAttorney) : ""}
            </div>
            ${r.description ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escapeHtml(r.description.slice(0,80))}${r.description.length>80?"…":""}</div>` : ""}
          </div>
          <button class="btn btn-sm btn-primary" onclick="_importFetchedReferral(${i})" style="white-space:nowrap;margin-left:12px">Import</button>
        </div>
      `).join("")}
      <button class="btn btn-accent btn-sm" onclick="_importAllFetchedReferrals()" style="margin-top:4px">Import All</button>
    `;

    // Store referrals in a temp variable for the import buttons
    window._pendingAttorneyShareReferrals = referrals;
  } catch (err) {
    resultsEl.innerHTML = `<p style="color:#ef4444;font-size:13px">Error: ${escapeHtml(err.message)}</p>`;
  }
  if (btn) { btn.disabled = false; btn.textContent = "⬇ Fetch Cases"; }
}

function _importFetchedReferral(index) {
  const r = (window._pendingAttorneyShareReferrals || [])[index];
  if (!r) return;
  const newCase = addCase({
    clientName: r.clientName || "Unknown",
    caseType: r.caseType || "Other",
    phone: r.phone || "",
    email: r.email || "",
    dateOfIncident: r.dateOfIncident || "",
    description: r.description || "",
    referralSource: "Attorney Share",
    referringAttorney: r.referringAttorney || "",
  });
  renderKanbanBoard();
  showToast(`Imported: ${r.clientName}`);
  if (typeof onCaseCreate === "function") onCaseCreate(newCase.id);
  // Remove from pending list and re-render the button
  window._pendingAttorneyShareReferrals.splice(index, 1);
  // Refresh the fetch results display
  _fetchAttorneyShareCases();
}

function _importAllFetchedReferrals() {
  const referrals = window._pendingAttorneyShareReferrals || [];
  if (!referrals.length) return;
  let count = 0;
  for (const r of referrals) {
    const newCase = addCase({
      clientName: r.clientName || "Unknown",
      caseType: r.caseType || "Other",
      phone: r.phone || "",
      email: r.email || "",
      dateOfIncident: r.dateOfIncident || "",
      description: r.description || "",
      referralSource: "Attorney Share",
      referringAttorney: r.referringAttorney || "",
    });
    if (typeof onCaseCreate === "function") onCaseCreate(newCase.id);
    count++;
  }
  window._pendingAttorneyShareReferrals = [];
  renderKanbanBoard();
  closeCaseModal();
  showToast(`Imported ${count} case(s) from Attorney Share`, "success");
}

function _importAttyShareCase(serverCaseId) {
  // Fetch the case from the server and add to local CRM
  (async () => {
    try {
      const token = typeof getIdToken === "function" ? await getIdToken() : null;
      const resp = await fetch(`${API_BASE}/api/cases/${serverCaseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const sc = await resp.json();

      const caseData = {
        clientName: sc.client_name || "Unknown",
        caseType: sc.case_type || "Other",
        phone: sc.phone || "",
        email: sc.email || "",
        dateOfIncident: sc.date_of_incident || "",
        description: sc.description || "",
        referralSource: "Attorney Share",
        county: sc.county || "",
        notes: sc.notes || "",
      };

      const newCase = addCase(caseData);
      closeCaseModal();
      renderKanbanBoard();
      showToast(`Case added: ${caseData.clientName}`);
      if (typeof onCaseCreate === "function") onCaseCreate(newCase.id);
    } catch (err) {
      showToast("Import failed: " + err.message, "error");
    }
  })();
}

function _importAttorneyShareJson() {
  const raw = document.getElementById("attyshare-json")?.value?.trim();
  if (!raw) { showToast("Paste referral data", "error"); return; }

  try {
    const data = JSON.parse(raw);
    const lead = data.leadContactInfo || {};
    const caseData = {
      clientName: data.clientName || data.client_name || `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Unknown",
      caseType: data.caseType || data.case_type || "Other",
      phone: data.phone || lead.phone || "",
      email: data.email || lead.email || "",
      dob: data.dob || data.dateOfBirth || "",
      dateOfIncident: data.dateOfIncident || data.incidentDate || "",
      description: data.description || data.summary || "",
      referralSource: data.referringAttorney || "Attorney Share",
      notes: data.notes || (data.referralId ? `Attorney Share referral: ${data.referralId}` : ""),
    };

    const newCase = addCase(caseData);
    closeCaseModal();
    renderKanbanBoard();
    showToast(`Case imported for ${caseData.clientName}`);
    if (typeof onCaseCreate === "function") onCaseCreate(newCase.id);
  } catch (err) {
    showToast("Invalid JSON: " + err.message, "error");
  }
}

// ─── Utility ─────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─── LOR Tab ─────────────────────────────────────────────────

function _buildLorTabHtml(c) {
  const lorLog = c.lorSentLog || [];

  function lorRow(key, label, email, fax, sentEntry) {
    const emailOk   = !!email;
    const faxOk     = !!fax;
    const noContact = !emailOk && !faxOk;

    if (sentEntry) {
      return `
        <div class="lor-row lor-row-sent">
          <label class="lor-check-label">
            <input type="checkbox" checked disabled>
            <span>${label}</span>
            <span class="lor-sent-badge">✓ Sent ${new Date(sentEntry.sentAt).toLocaleDateString()} via ${sentEntry.method}</span>
          </label>
        </div>`;
    }

    return `
      <div class="lor-row" id="lor-row-${key}">
        <div class="lor-row-top">
          <label class="lor-check-label">
            <input type="checkbox" id="lor-chk-${key}">
            <span>${label}</span>
          </label>
          <div class="lor-method-inline">
            ${noContact
              ? `<span class="lor-warn-inline">⚠ No email or fax on file</span>`
              : `${emailOk ? `<label class="lor-method-opt"><input type="radio" name="lorMethod-${key}" value="email" checked> Email <span class="lor-contact-val">${escapeHtml(email)}</span></label>` : ""}
                 ${faxOk   ? `<label class="lor-method-opt"><input type="radio" name="lorMethod-${key}" value="fax" ${!emailOk ? "checked" : ""}> Fax <span class="lor-contact-val">${escapeHtml(fax)}</span></label>` : ""}`
            }
          </div>
        </div>
        ${noContact ? `<div class="lor-warn" style="margin-top:6px">Go to the Insurance tab and add an email or fax number for this party.</div>` : ""}
      </div>`;
  }

  const log3p = lorLog.find(l => l.type === "3rd_party");
  const log1p = lorLog.find(l => l.type === "1st_party");
  const logHi = lorLog.find(l => l.type === "health_ins");

  return `
    <div style="margin-bottom:14px">
      <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:3px">Letters of Representation</div>
      <div style="font-size:12px;color:var(--text-muted)">Check the parties to include, confirm email or fax, then click <strong>Send LORs</strong> below.</div>
    </div>
    <div class="lor-list">
      ${lorRow("3rd_party", "3rd Party (At-Fault Insurance)", c.adjusterEmail,       c.adjusterFax,       log3p)}
      ${lorRow("1st_party", "1st Party (Client's Insurance)", c.clientAdjusterEmail, c.clientAdjusterFax, log1p)}
      ${lorRow("health_ins","Medical / Health Insurance",     c.healthInsuranceEmail, c.healthInsuranceFax, logHi)}
    </div>
    <span id="lor-sending-msg" style="font-size:12px;color:var(--text-muted);display:block;margin-top:10px"></span>
  `;
}

async function sendLORs(caseId) {
  const cases = loadCases();
  const c     = cases.find(x => x.id === caseId);
  if (!c) return;

  const types = ["3rd_party", "1st_party", "health_ins"];
  const toSend = [];

  for (const key of types) {
    const chk = document.getElementById(`lor-chk-${key}`);
    if (!chk || !chk.checked || chk.disabled) continue;

    const methodEl = document.querySelector(`input[name="lorMethod-${key}"]:checked`);
    const method   = methodEl ? methodEl.value : null;
    if (!method) { showToast(`Select email or fax for ${key.replace("_"," ")}`, "error"); return; }

    // Resolve contact value
    let contact = "";
    if (key === "3rd_party")  contact = method === "email" ? c.adjusterEmail       : c.adjusterFax;
    if (key === "1st_party")  contact = method === "email" ? c.clientAdjusterEmail : c.clientAdjusterFax;
    if (key === "health_ins") contact = method === "email" ? c.healthInsuranceEmail : c.healthInsuranceFax;

    if (!contact) { showToast(`No ${method} on file for ${key.replace("_"," ")}`, "error"); return; }
    toSend.push({ type: key, method, contact });
  }

  if (!toSend.length) { showToast("Check at least one party to send an LOR to", "error"); return; }

  const msg = document.getElementById("lor-sending-msg");
  if (msg) msg.textContent = "Sending…";

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  try {
    const resp = await fetch("/api/lor/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ case_id: caseId, case_data: c, recipients: toSend }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    // Log sent entries
    const sentAt  = new Date().toISOString();
    const lorLog  = [...(c.lorSentLog || []), ...toSend.map(t => ({ ...t, sentAt }))];
    updateCase(caseId, { lorSentLog: lorLog, stage: "client_treating" });
    renderKanbanBoard();
    closeCaseModal();
    showToast(`LOR${toSend.length > 1 ? "s" : ""} sent — case moved to Client Treating`);
  } catch (err) {
    if (msg) msg.textContent = "";
    showToast("Send failed: " + err.message, "error");
  }
}

// Tab switching for case modal
function _switchTab(btn, tabId) {
  btn.closest(".modal-tabs").querySelectorAll(".modal-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  btn.closest(".modal-box").querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
}

// Load and render case attachments/documents in the Attachments tab
async function loadAttachments(caseId) {
  const container = document.getElementById(`attachments-list-${caseId}`);
  if (!container) return;
  container.innerHTML = `<div class="text-muted" style="font-size:13px">Loading attachments...</div>`;
  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch(`${API_BASE}/api/case-documents?caseId=${encodeURIComponent(caseId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const docs = await resp.json();
    if (!docs || docs.length === 0) {
      container.innerHTML = `<div class="text-muted" style="font-size:13px;padding:8px">No attachments yet.</div>`;
      return;
    }
    const rows = docs.map(doc => {
      const icon = doc.doc_type === "signed_agreement" ? "✅" : doc.doc_type === "fee_agreement" ? "📄" : "📎";
      let filename = "";
      try { filename = JSON.parse(doc.metadata || "{}").filename || ""; } catch (e) {}
      const downloadLink = filename
        ? `<a href="${API_BASE}/api/case-documents/download/${encodeURIComponent(filename)}" target="_blank" class="btn btn-sm btn-outline" style="font-size:12px">Download</a>`
        : "";
      const dateStr = doc.createdAt || doc.created_at || "";
      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border);">
        <span style="font-size:20px">${icon}</span>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${escapeHtml(doc.title || "")}</div>
          <div style="font-size:12px;color:var(--text-muted)">${escapeHtml(doc.status || "")} · ${formattedDate}</div>
        </div>
        ${downloadLink}
      </div>`;
    });
    container.innerHTML = rows.join("");
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);font-size:13px;padding:8px">Failed to load attachments: ${escapeHtml(err.message)}</div>`;
  }
}

// AZ insurers list for datalist in modal
const AZ_INSURERS_LIST = [
  "ACCC Insurance Company","Allstate Insurance Company","American Family Mutual Insurance Company, S.I.",
  "Amica Mutual Insurance Company","Auto-Owners Insurance Company","Bristol West Insurance Company",
  "CSAA Fire & Casualty Insurance Company (AAA)","Dairyland Insurance Company (Sentry)",
  "Encompass Insurance Company","Esurance Insurance Company","Farmers Insurance Exchange",
  "GEICO Advantage Insurance Company","GEICO Casualty Company","GEICO General Insurance Company",
  "GEICO Indemnity Company","Hartford Fire Insurance Company","Infinity Insurance Company (Kemper)",
  "Liberty Mutual Fire Insurance Company","Mercury Insurance Company of Arizona",
  "Nationwide Mutual Insurance Company","Progressive Advanced Insurance Company",
  "Progressive Direct Insurance Company","Safeco Insurance Company of America (Liberty Mutual)",
  "State Farm Fire and Casualty Company","State Farm Mutual Automobile Insurance Company",
  "The Travelers Home and Marine Insurance Company","USAA Casualty Insurance Company",
  "21st Century Centennial Insurance Company",
].sort();
