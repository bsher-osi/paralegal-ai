// crmData.js — CRM / Intake Board data management
// Uses localStorage as the default store; can sync to SharePoint Lists via graphClient.js

const CRM_STORAGE_KEY = "paralegal_crm_cases";

const CASE_STAGES = [
  { id: "intake", label: "New Intake", color: "#6366f1" },
  { id: "review", label: "Under Review", color: "#f59e0b" },
  { id: "active", label: "Active Case", color: "#10b981" },
  { id: "negotiation", label: "Negotiation", color: "#8b5cf6" },
  { id: "settled", label: "Settled / Closed", color: "#64748b" },
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
  return updateCase(caseId, { stage: newStage });
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
      dateOfIncident: "2026-02-28",
      description: "Rear-end collision at intersection of Main St and 5th Ave. Client reports neck and back pain.",
      assignedTo: "",
      statuteOfLimitations: "2028-02-28",
      estimatedValue: "",
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
      <h2>${c.clientName}</h2>
      <button class="btn-icon" onclick="closeCaseModal()">&times;</button>
    </div>
    <form id="case-edit-form" onsubmit="saveCaseEdit(event, '${c.id}')">
      <div class="form-grid">
        <div class="form-group">
          <label>Client Name</label>
          <input name="clientName" value="${escapeHtml(c.clientName || "")}" required />
        </div>
        <div class="form-group">
          <label>Case Type</label>
          <select name="caseType">
            ${CASE_TYPES.map((t) => `<option ${t === c.caseType ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input name="phone" value="${escapeHtml(c.phone || "")}" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input name="email" type="email" value="${escapeHtml(c.email || "")}" />
        </div>
        <div class="form-group">
          <label>Date of Incident</label>
          <input name="dateOfIncident" type="date" value="${c.dateOfIncident || ""}" />
        </div>
        <div class="form-group">
          <label>Statute of Limitations</label>
          <input name="statuteOfLimitations" type="date" value="${c.statuteOfLimitations || ""}" />
        </div>
        <div class="form-group">
          <label>Estimated Value</label>
          <input name="estimatedValue" value="${escapeHtml(c.estimatedValue || "")}" />
        </div>
        <div class="form-group">
          <label>Stage</label>
          <select name="stage">
            ${CASE_STAGES.map((s) => `<option value="${s.id}" ${s.id === c.stage ? "selected" : ""}>${s.label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-group full-width">
        <label>Description</label>
        <textarea name="description" rows="3">${escapeHtml(c.description || "")}</textarea>
      </div>
      <div class="form-group full-width">
        <label>Notes</label>
        <textarea name="notes" rows="3">${escapeHtml(c.notes || "")}</textarea>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Save Changes</button>
        <button type="button" class="btn btn-outline" onclick="generateDraftForCase('${c.id}')">Draft Document with AI</button>
        <button type="button" class="btn btn-danger" onclick="confirmDeleteCase('${c.id}')">Delete Case</button>
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
    <form id="new-case-form" onsubmit="submitNewCase(event)">
      <div class="form-grid">
        <div class="form-group">
          <label>Client Name *</label>
          <input name="clientName" required />
        </div>
        <div class="form-group">
          <label>Case Type *</label>
          <select name="caseType">
            ${CASE_TYPES.map((t) => `<option>${t}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input name="phone" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input name="email" type="email" />
        </div>
        <div class="form-group">
          <label>Date of Incident</label>
          <input name="dateOfIncident" type="date" />
        </div>
        <div class="form-group">
          <label>Statute of Limitations</label>
          <input name="statuteOfLimitations" type="date" />
        </div>
      </div>
      <div class="form-group full-width">
        <label>Description *</label>
        <textarea name="description" rows="3" required></textarea>
      </div>
      <div class="form-group full-width">
        <label>Notes</label>
        <textarea name="notes" rows="2"></textarea>
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
  addCase(data);
  closeCaseModal();
  renderKanbanBoard();
  showToast("New case created");
}

// ─── Utility ─────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
