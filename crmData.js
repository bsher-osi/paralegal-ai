// crmData.js — CRM / Intake Board data management
// Uses localStorage as the default store; can sync to SharePoint Lists via graphClient.js

const CRM_STORAGE_KEY = "paralegal_crm_cases";

const CASE_STAGES = [
  { id: "intake", label: "New Intake", color: "#6366f1" },
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
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Save Changes</button>
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
