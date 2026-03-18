// agentTasks.js — Paralegal AI Agent (document drafting via Claude API)
// NOTE: In a production SPA, Claude API calls should go through a backend proxy
// to protect the API key. For this prototype, the key is stored in the browser settings panel.

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const DOCUMENT_TEMPLATES = [
  {
    id: "demand-letter",
    label: "Demand Letter",
    description: "Formal demand letter to insurance company or opposing party",
    systemPrompt: `You are a paralegal AI assistant at a personal injury law firm. Draft a professional demand letter. Include:
- Firm letterhead placeholder
- Date and recipient address block
- Facts of the incident
- Liability analysis
- Summary of injuries and medical treatment
- Itemized damages (medical bills, lost wages, pain & suffering)
- Settlement demand amount
- Deadline to respond (30 days)
- Professional closing
Use formal legal language. Be thorough but concise.`,
  },
  {
    id: "client-intake-memo",
    label: "Client Intake Memo",
    description: "Internal memo summarizing a new client intake",
    systemPrompt: `You are a paralegal AI assistant. Draft an internal client intake memorandum. Include:
- Client information header
- Date of incident and type of case
- Summary of facts as reported by client
- Initial assessment of liability
- Injuries reported and current medical status
- Potential witnesses
- Evidence to preserve or obtain
- Statute of limitations deadline
- Recommended next steps
Use clear, organized formatting with section headers.`,
  },
  {
    id: "medical-records-request",
    label: "Medical Records Request",
    description: "HIPAA-compliant letter requesting medical records",
    systemPrompt: `You are a paralegal AI assistant. Draft a HIPAA-compliant medical records request letter. Include:
- Authorization reference (HIPAA release attached)
- Patient name and date of birth placeholders
- Specific date range for records
- Types of records requested (office notes, imaging, billing, etc.)
- Delivery method and address
- Contact information for follow-up
Use formal, professional language.`,
  },
  {
    id: "settlement-summary",
    label: "Settlement Summary",
    description: "Summary of settlement terms for client review",
    systemPrompt: `You are a paralegal AI assistant. Draft a settlement summary for client review. Include:
- Case caption and parties
- Settlement amount
- Breakdown of distribution (attorney fees, costs, liens, client net)
- Summary of terms and conditions
- Release provisions
- Timeline for payment
- Client signature block
Write clearly so the client can understand all terms.`,
  },
  {
    id: "litigation-timeline",
    label: "Litigation Timeline",
    description: "Chronological timeline of case events",
    systemPrompt: `You are a paralegal AI assistant. Create a detailed litigation timeline. Include:
- Date of incident
- Medical treatment dates and providers
- Key correspondence dates
- Filing deadlines and statute of limitations
- Discovery milestones
- Mediation/negotiation dates
- Trial preparation deadlines
Format as a clear chronological table or list.`,
  },
  {
    id: "custom",
    label: "Custom Prompt",
    description: "Write your own prompt for the AI agent",
    systemPrompt: `You are a paralegal AI assistant at a personal injury law firm. Help the attorney or paralegal with their request. Be thorough, professional, and accurate. If you're unsure about specific legal requirements in a jurisdiction, note that and suggest verifying.`,
  },
];

/**
 * Get the stored Claude API key from settings.
 */
function getClaudeApiKey() {
  return localStorage.getItem("paralegal_claude_api_key") || "";
}

function setClaudeApiKey(key) {
  localStorage.setItem("paralegal_claude_api_key", key);
}

/**
 * Call Claude API to generate a document draft.
 */
async function generateDocument(templateId, caseContext, userInstructions) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    showToast("Please set your Claude API key in Settings first.", "error");
    switchPanel("settings");
    return null;
  }

  const template = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error("Unknown template: " + templateId);

  const userMessage = buildUserMessage(caseContext, userInstructions);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: template.systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  } catch (error) {
    console.error("Claude API error:", error);
    throw error;
  }
}

/**
 * Build user message from case context and instructions.
 */
function buildUserMessage(caseContext, userInstructions) {
  let msg = "";
  if (caseContext) {
    msg += "Case Information:\n";
    msg += `- Client: ${caseContext.clientName || "N/A"}\n`;
    msg += `- Case Type: ${caseContext.caseType || "N/A"}\n`;
    msg += `- Date of Incident: ${caseContext.dateOfIncident || "N/A"}\n`;
    msg += `- Description: ${caseContext.description || "N/A"}\n`;
    if (caseContext.estimatedValue) msg += `- Estimated Value: ${caseContext.estimatedValue}\n`;
    if (caseContext.notes) msg += `- Notes: ${caseContext.notes}\n`;
    if (caseContext.statuteOfLimitations) msg += `- Statute of Limitations: ${caseContext.statuteOfLimitations}\n`;
    msg += "\n";
  }
  msg += userInstructions || "Please draft this document based on the case information above.";
  return msg;
}

// ─── Agent Panel UI ──────────────────────────────────────────

function renderAgentPanel() {
  const panel = document.getElementById("agent-content");
  if (!panel) return;

  const cases = loadCases();

  panel.innerHTML = `
    <div class="agent-form">
      <div class="form-group">
        <label>Select Case</label>
        <select id="agent-case-select">
          <option value="">-- No case context --</option>
          ${cases.map((c) => `<option value="${c.id}">${c.clientName} — ${c.caseType}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Document Type</label>
        <select id="agent-template-select" onchange="handleTemplateChange()">
          ${DOCUMENT_TEMPLATES.map((t) => `<option value="${t.id}">${t.label} — ${t.description}</option>`).join("")}
        </select>
      </div>
      <div class="form-group" id="agent-custom-prompt-group" style="display:none">
        <label>Custom Instructions</label>
        <textarea id="agent-custom-prompt" rows="3" placeholder="Describe what you need the AI to draft..."></textarea>
      </div>
      <div class="form-group">
        <label>Additional Instructions (optional)</label>
        <textarea id="agent-instructions" rows="2" placeholder="e.g., Include details about the surgery on 3/1/2026, demand $150K..."></textarea>
      </div>
      <button class="btn btn-primary" id="agent-generate-btn" onclick="handleGenerate()">
        Generate Draft
      </button>
    </div>
    <div id="agent-output-area" class="agent-output">
      <div class="agent-output-placeholder">
        Select a document type and click <strong>Generate Draft</strong> to get started.
      </div>
    </div>
    <div id="agent-actions" class="agent-actions" style="display:none">
      <button class="btn btn-outline" onclick="copyAgentOutput()">Copy to Clipboard</button>
      <button class="btn btn-outline" onclick="downloadAgentOutput()">Download as .txt</button>
      <button class="btn btn-outline" onclick="emailAgentOutput()">Email Draft</button>
    </div>
  `;
}

function handleTemplateChange() {
  const sel = document.getElementById("agent-template-select");
  const customGroup = document.getElementById("agent-custom-prompt-group");
  if (customGroup) {
    customGroup.style.display = sel.value === "custom" ? "block" : "none";
  }
}

async function handleGenerate() {
  const caseId = document.getElementById("agent-case-select")?.value;
  const templateId = document.getElementById("agent-template-select")?.value;
  const customPrompt = document.getElementById("agent-custom-prompt")?.value || "";
  const instructions = document.getElementById("agent-instructions")?.value || "";
  const outputArea = document.getElementById("agent-output-area");
  const actionsArea = document.getElementById("agent-actions");
  const btn = document.getElementById("agent-generate-btn");

  let caseContext = null;
  if (caseId) {
    const cases = loadCases();
    caseContext = cases.find((c) => c.id === caseId);
  }

  const finalInstructions = templateId === "custom" ? customPrompt + "\n" + instructions : instructions;

  // Show loading
  btn.disabled = true;
  btn.textContent = "Generating...";
  outputArea.innerHTML = `<div class="agent-loading"><div class="spinner"></div> AI is drafting your document...</div>`;
  if (actionsArea) actionsArea.style.display = "none";

  try {
    const result = await generateDocument(templateId, caseContext, finalInstructions);
    if (result) {
      outputArea.innerHTML = `<pre class="agent-result">${escapeHtml(result)}</pre>`;
      if (actionsArea) actionsArea.style.display = "flex";
    }
  } catch (error) {
    outputArea.innerHTML = `<div class="agent-error">Error: ${escapeHtml(error.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Draft";
  }
}

function copyAgentOutput() {
  const text = document.querySelector(".agent-result")?.textContent;
  if (text) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard"));
  }
}

function downloadAgentOutput() {
  const text = document.querySelector(".agent-result")?.textContent;
  if (!text) return;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `draft-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded");
}

async function emailAgentOutput() {
  const text = document.querySelector(".agent-result")?.textContent;
  if (!text) return;

  if (!isAuthenticated()) {
    showToast("Sign in to O365 to send email.", "error");
    return;
  }

  const to = prompt("Send draft to email address:");
  if (!to) return;

  try {
    await sendEmail(to, "Draft Document — Paralegal AI", `<pre>${escapeHtml(text)}</pre>`);
    showToast("Draft sent via email");
  } catch (error) {
    showToast("Failed to send: " + error.message, "error");
  }
}

/**
 * Generate a draft for a specific case (called from case detail modal).
 */
function generateDraftForCase(caseId) {
  closeCaseModal();
  switchPanel("agent");
  // Wait for panel to render, then select the case
  setTimeout(() => {
    const select = document.getElementById("agent-case-select");
    if (select) select.value = caseId;
  }, 100);
}
