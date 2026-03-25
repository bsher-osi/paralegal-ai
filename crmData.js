// crmData.js — CRM / Intake Board data management
// Uses localStorage as the default store; can sync to SharePoint Lists via graphClient.js

const CRM_STORAGE_KEY = "paralegal_crm_cases";

const CASE_STAGES = [
  { id: "intake", label: "New Intake", color: "#6366f1" },
  { id: "fee_agreement_sent", label: "Fee Agmt Sent", color: "#a855f7" },
  { id: "fee_agreement_signed", label: "Agmt Signed", color: "#7c3aed" },
  { id: "lor_sent", label: "LOR Sent", color: "#8b5cf6" },
  { id: "records_collection", label: "Collecting Records", color: "#3b82f6" },
  { id: "treatment", label: "Client Treating", color: "#0ea5e9" },
  { id: "demand_prep", label: "Demand Prep", color: "#f59e0b" },
  { id: "demand_sent", label: "Demand Sent", color: "#f97316" },
  { id: "negotiation", label: "Negotiation", color: "#8b5cf6" },
  { id: "litigation_filed", label: "Filed", color: "#ef4444" },
  { id: "litigation_served", label: "Served", color: "#dc2626" },
  { id: "litigation_answered", label: "Answer Filed", color: "#b91c1c" },
  { id: "discovery", label: "Discovery", color: "#991b1b" },
  { id: "resolution", label: "Resolution", color: "#7c3aed" },
  { id: "settled", label: "Settled", color: "#22c55e" },
  { id: "disbursed", label: "Disbursed", color: "#64748b" },
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

function renderKanbanBoard() {
  const board = document.getElementById("kanban-board");
  if (!board) return;

  // Update the header buttons to include import options
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

  const grouped = getCasesByStage();

  board.innerHTML = CASE_STAGES.map(
    (stage) => `
    <div class="kanban-column" data-stage="${stage.id}">
      <div class="kanban-column-header" style="border-top: 3px solid ${stage.color}">
        <span class="kanban-column-title">${stage.label}</span>
        <span class="kanban-column-count">${(grouped[stage.id] || []).length}</span>
      </div>
      <div class="kanban-cards" data-stage="${stage.id}"
           ondragover="handleDragOver(event)" ondrop="handleDrop(event)">
        ${(grouped[stage.id] || [])
          .map(
            (c) => `
          <div class="kanban-card" draggable="true" data-case-id="${c.id}"
               ondragstart="handleDragStart(event)" onclick="openCaseDetail('${c.id}')">
            <div class="kanban-card-type">${c.caseType}</div>
            <div class="kanban-card-name">${c.clientName}</div>
            <div class="kanban-card-date">${c.dateOfIncident ? "Incident: " + c.dateOfIncident : ""}</div>
            ${c.estimatedValue ? `<div class="kanban-card-value">${c.estimatedValue}</div>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `
  ).join("");
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
      <button class="modal-tab" onclick="_switchTab(this,'tab-litigation')">Litigation</button>
      <button class="modal-tab" onclick="_switchTab(this,'tab-notes')">Notes</button>
    </div>
    <form id="case-edit-form" onsubmit="saveCaseEdit(event, '${c.id}')">
      <div id="tab-client" class="tab-pane active">
        <div class="form-grid">
          <div class="form-group"><label>Client Name</label><input name="clientName" value="${escapeHtml(c.clientName || "")}" required /></div>
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
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin-bottom:8px">AT-FAULT INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Insurance Company</label><input name="insuranceCompany" value="${escapeHtml(c.insuranceCompany || "")}" list="az-insurers-modal" /></div>
          <div class="form-group"><label>Claim Number</label><input name="claimNumber" value="${escapeHtml(c.claimNumber || "")}" /></div>
          <div class="form-group"><label>Adjuster Name</label><input name="adjusterName" value="${escapeHtml(c.adjusterName || "")}" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="adjusterEmail" value="${escapeHtml(c.adjusterEmail || "")}" /></div>
          <div class="form-group"><label>Adjuster Fax</label><input name="adjusterFax" value="${escapeHtml(c.adjusterFax || "")}" /></div>
          <div class="form-group"><label>Insured (Driver)</label><input name="insuredName" value="${escapeHtml(c.insuredName || "")}" /></div>
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin:16px 0 8px">CLIENT'S AUTO INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Insurance Company</label><input name="clientInsuranceCompany" value="${escapeHtml(c.clientInsuranceCompany || "")}" list="az-insurers-modal" /></div>
          <div class="form-group"><label>Claim Number</label><input name="clientClaimNumber" value="${escapeHtml(c.clientClaimNumber || "")}" /></div>
          <div class="form-group"><label>Adjuster Name</label><input name="clientAdjusterName" value="${escapeHtml(c.clientAdjusterName || "")}" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="clientAdjusterEmail" value="${escapeHtml(c.clientAdjusterEmail || "")}" /></div>
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin:16px 0 8px">HEALTH INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Carrier</label><input name="healthInsuranceCarrier" value="${escapeHtml(c.healthInsuranceCarrier || "")}" /></div>
          <div class="form-group"><label>Policy Number</label><input name="healthInsurancePolicyNum" value="${escapeHtml(c.healthInsurancePolicyNum || "")}" /></div>
        </div>
        <datalist id="az-insurers-modal">${(typeof AZ_INSURERS_LIST !== 'undefined' ? AZ_INSURERS_LIST : []).map(n => `<option value="${n}">`).join('')}</datalist>
      </div>
      <div id="tab-litigation" class="tab-pane">
        <div class="form-grid">
          <div class="form-group"><label>Litigation Status</label>
            <select name="litigationStatus">
              ${["pre_lit","filed","served","answered","discovery","arbitration","mediation"].map(s => `<option value="${s}" ${s === (c.litigationStatus || "pre_lit") ? "selected" : ""}>${s.replace("_"," ")}</option>`).join("")}
            </select>
          </div>
          <div class="form-group"><label>Case Number</label><input name="caseNumber" value="${escapeHtml(c.caseNumber || "")}" /></div>
          <div class="form-group"><label>County</label><input name="county" value="${escapeHtml(c.county || "Maricopa")}" /></div>
          <div class="form-group"><label>Defendant Attorney</label><input name="defendantAttorney" value="${escapeHtml(c.defendantAttorney || "")}" /></div>
          <div class="form-group"><label>Def. Attorney Email</label><input name="defendantAttorneyEmail" value="${escapeHtml(c.defendantAttorneyEmail || "")}" /></div>
          <div class="form-group"><label>Arbitrator</label><input name="arbitratorName" value="${escapeHtml(c.arbitratorName || "")}" /></div>
        </div>
      </div>
      <div id="tab-notes" class="tab-pane">
        <div class="form-group full-width"><label>Notes</label><textarea name="notes" rows="6">${escapeHtml(c.notes || "")}</textarea></div>
        ${c.caseValueRange ? `<div style="margin-top:12px;padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)"><div style="font-weight:600;font-size:13px;margin-bottom:4px">AI Case Valuation</div><div style="font-size:13px;color:var(--text-secondary)">${escapeHtml(c.caseValueRange)}</div></div>` : ""}
      </div>
      <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
        <button type="submit" class="btn btn-primary">Save Changes</button>
        ${c.stage === "intake" ? `<button type="button" class="btn btn-accent" style="background:#a855f7" onclick="showFeeAgreementPreview('${c.id}')">Send Fee Agreement</button>` : ""}
        ${c.stage === "fee_agreement_sent" ? `<button type="button" class="btn btn-accent" style="background:#22c55e" onclick="markAgreementSigned('${c.id}')">Agreement Signed</button>` : ""}
        ${c.stage === "fee_agreement_sent" && c.docusignEnvelopeId ? `<button type="button" class="btn btn-outline" onclick="checkAgreementStatus('${c.id}')">Check Signature</button>` : ""}
        <button type="button" class="btn btn-outline" onclick="generateDraftForCase('${c.id}')">Draft with AI</button>
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
  updateCase(caseId, data);
  closeCaseModal();
  renderKanbanBoard();
  showToast("Case updated successfully");
}

function confirmDeleteCase(caseId) {
  if (confirm("Are you sure you want to delete this case? This cannot be undone.")) {
    deleteCase(caseId);
    closeCaseModal();
    renderKanbanBoard();
    showToast("Case deleted");
  }
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
          <div class="form-group"><label>Client Name *</label><input name="clientName" required /></div>
          <div class="form-group"><label>Case Type *</label><select name="caseType">${CASE_TYPES.map((t) => `<option>${t}</option>`).join("")}</select></div>
          <div class="form-group"><label>Phone</label><input name="phone" /></div>
          <div class="form-group"><label>Email</label><input name="email" type="email" /></div>
          <div class="form-group"><label>Date of Birth</label><input name="dob" type="date" /></div>
          <div class="form-group"><label>Address</label><input name="address" /></div>
          <div class="form-group"><label>Date of Incident *</label><input name="dateOfIncident" type="date" required /></div>
          <div class="form-group"><label>SOL</label><input name="statuteOfLimitations" type="date" /></div>
          <div class="form-group"><label>Referral Source</label><input name="referralSource" /></div>
          <div class="form-group"><label>Driver's License</label><input name="driverLicense" /></div>
        </div>
      </div>
      <div id="ntab-insurance" class="tab-pane">
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin-bottom:8px">AT-FAULT INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Insurance Company</label><input name="insuranceCompany" list="az-insurers-new" /></div>
          <div class="form-group"><label>Claim Number</label><input name="claimNumber" /></div>
          <div class="form-group"><label>Adjuster Name</label><input name="adjusterName" /></div>
          <div class="form-group"><label>Adjuster Email</label><input name="adjusterEmail" /></div>
          <div class="form-group"><label>Insured (Driver)</label><input name="insuredName" /></div>
          <div class="form-group"><label>Adjuster Fax</label><input name="adjusterFax" /></div>
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--text-muted);margin:16px 0 8px">CLIENT'S INSURANCE</div>
        <div class="form-grid">
          <div class="form-group"><label>Auto Insurance</label><input name="clientInsuranceCompany" list="az-insurers-new" /></div>
          <div class="form-group"><label>Health Insurance</label><input name="healthInsuranceCarrier" /></div>
        </div>
        <datalist id="az-insurers-new">${AZ_INSURERS_LIST.map(n => `<option value="${n}">`).join('')}</datalist>
      </div>
      <div id="ntab-notes" class="tab-pane">
        <div class="form-group full-width"><label>Description *</label><textarea name="description" rows="3" required></textarea></div>
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
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
        <strong>Webhook URL:</strong> Set this in Attorney Share webhook settings:<br>
        <code style="background:var(--bg-card);padding:4px 8px;border-radius:4px;font-size:12px;user-select:all">https://tools.sherlawgroup.com/api/attorney-share/webhook</code>
      </p>
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
        New referrals will automatically appear in the <strong>New Intake</strong> column when Attorney Share sends them via webhook.
      </p>

      <div class="settings-section" style="margin-bottom:12px">
        <h3 style="margin:0 0 8px">Recent Attorney Share Referrals</h3>
        <div id="attyshare-cases"><p style="color:var(--text-muted)">Loading...</p></div>
      </div>

      <div class="settings-section">
        <h3 style="margin:0 0 8px">Manual Import (paste JSON)</h3>
        <div class="form-group">
          <textarea id="attyshare-json" rows="4" placeholder='{"clientName": "...", "caseType": "Auto Accident", ...}'></textarea>
        </div>
        <button class="btn btn-outline btn-sm" onclick="_importAttorneyShareJson()">Import JSON</button>
      </div>
    `;
    _loadAttorneyShareCases();
  } else {
    statusEl.innerHTML = `<div style="background:var(--bg-card);padding:8px 12px;border-radius:6px;font-size:13px;color:var(--text-muted)">Attorney Share API not connected — set ATTORNEY_SHARE_API_KEY on the server</div>`;
    bodyEl.innerHTML = `
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
        To connect: add your Attorney Share API key (starts with <code>attshr_</code>) as an environment variable on the server.
      </p>

      <div class="settings-section">
        <h3 style="margin:0 0 8px">Manual Import</h3>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">
          Paste referral data as JSON to create a case manually.
        </p>
        <div class="form-group">
          <textarea id="attyshare-json" rows="8" placeholder='{"clientName": "John Doe", "caseType": "Auto Accident", "phone": "555-1234", "email": "john@email.com", "dateOfIncident": "2026-03-01", "description": "Rear-end collision..."}'></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="_importAttorneyShareJson()">Import</button>
          <button class="btn btn-outline" onclick="closeCaseModal()">Cancel</button>
        </div>
      </div>
    `;
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

// Tab switching for case modal
function _switchTab(btn, tabId) {
  btn.closest(".modal-tabs").querySelectorAll(".modal-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  btn.closest(".modal-box").querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
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
