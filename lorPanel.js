// ─── Letter of Representation Panel ──────────────────────────────
// AI-powered LOR generator using Claude API (client-side)

const LOR_API = "https://tools.sherlawgroup.com";

function renderLorPanel() {
  const container = document.getElementById("lor-content");
  if (!container) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const caseOpts = cases.map(c =>
    `<option value="${c.id}">${escapeHtml(c.clientName)} &mdash; ${escapeHtml(c.caseType)}</option>`
  ).join("");

  container.innerHTML = `
    <div class="settings-section">
      <h2 style="margin:0 0 12px">Letter of Representation Generator</h2>

      <div class="form-group">
        <label>Select Case</label>
        <select id="lor-case-select" onchange="_lorPrefillFromCase()">
          <option value="">-- Select a case --</option>
          ${caseOpts}
        </select>
      </div>

      <div style="margin-bottom:12px">
        <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Letter Type</label>
        <div style="display:flex;gap:10px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 14px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);font-size:13px">
            <input type="radio" name="lor-type" value="at-fault" checked onchange="_lorUpdateFields()"> To At-Fault Insurance
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 14px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);font-size:13px">
            <input type="radio" name="lor-type" value="client-auto" onchange="_lorUpdateFields()"> To Client's Auto Insurance
          </label>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:200px">
          <label id="lor-insurance-label">Insurance Company</label>
          <input type="text" id="lor-insurance-company" placeholder="e.g., State Farm">
        </div>
        <div class="form-group" style="flex:1;min-width:180px">
          <label>Claim Number</label>
          <input type="text" id="lor-claim-number" placeholder="Claim #">
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px">
          <label>Adjuster Name</label>
          <input type="text" id="lor-adjuster-name" placeholder="Adjuster name">
        </div>
        <div class="form-group" style="flex:1;min-width:180px">
          <label>Adjuster Email / Fax</label>
          <input type="text" id="lor-adjuster-contact" placeholder="Email or fax number">
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px">
          <label>Client Name</label>
          <input type="text" id="lor-client-name" placeholder="Client full name">
        </div>
        <div class="form-group" style="flex:1;min-width:140px">
          <label>Date of Loss</label>
          <input type="date" id="lor-date-of-loss">
        </div>
      </div>

      <div class="form-group">
        <label>Insured Name (at-fault party)</label>
        <input type="text" id="lor-insured-name" placeholder="Insured / at-fault party name">
      </div>

      <button class="btn btn-primary" onclick="_generateLor()" id="lor-generate-btn" style="width:100%;padding:12px;font-size:15px">
        Generate Letter of Representation
      </button>
    </div>

    <div id="lor-output"></div>
  `;
}

// ─── Case pre-fill ────────────────────────────────────────────────

function _lorPrefillFromCase() {
  const caseId = document.getElementById("lor-case-select")?.value;
  if (!caseId) return;

  const cases = typeof loadCases === "function" ? loadCases() : [];
  const c = cases.find(x => x.id === caseId);
  if (!c) return;

  const lorType = document.querySelector('input[name="lor-type"]:checked')?.value;

  if (lorType === "client-auto") {
    _lorSetField("lor-insurance-company", c.clientInsuranceCompany || "");
    _lorSetField("lor-claim-number", c.clientClaimNumber || "");
    _lorSetField("lor-adjuster-name", c.clientAdjusterName || "");
    _lorSetField("lor-adjuster-contact", c.clientAdjusterEmail || "");
  } else {
    _lorSetField("lor-insurance-company", c.insuranceCompany || "");
    _lorSetField("lor-claim-number", c.claimNumber || "");
    _lorSetField("lor-adjuster-name", c.adjusterName || "");
    _lorSetField("lor-adjuster-contact", c.adjusterEmail || c.adjusterFax || "");
  }

  _lorSetField("lor-client-name", c.clientName || "");
  _lorSetField("lor-date-of-loss", c.dateOfIncident || "");
  _lorSetField("lor-insured-name", c.insuredName || "");

  showToast("Pre-filled from case: " + c.clientName);
}

function _lorUpdateFields() {
  const lorType = document.querySelector('input[name="lor-type"]:checked')?.value;
  const label = document.getElementById("lor-insurance-label");
  if (label) {
    label.textContent = lorType === "client-auto"
      ? "Client's Insurance Company"
      : "Insurance Company";
  }
  // Re-fill fields from selected case if one is chosen
  _lorPrefillFromCase();
}

function _lorSetField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

// ─── Generate LOR via Claude API ──────────────────────────────────

async function _generateLor() {
  const insuranceCompany = document.getElementById("lor-insurance-company")?.value?.trim();
  const claimNumber = document.getElementById("lor-claim-number")?.value?.trim();
  const adjusterName = document.getElementById("lor-adjuster-name")?.value?.trim();
  const adjusterContact = document.getElementById("lor-adjuster-contact")?.value?.trim();
  const clientName = document.getElementById("lor-client-name")?.value?.trim();
  const dateOfLoss = document.getElementById("lor-date-of-loss")?.value;
  const insuredName = document.getElementById("lor-insured-name")?.value?.trim();
  const lorType = document.querySelector('input[name="lor-type"]:checked')?.value;

  if (!clientName) { showToast("Enter the client name", "error"); return; }
  if (!insuranceCompany) { showToast("Enter the insurance company", "error"); return; }

  const apiKey = getClaudeApiKey();
  if (!apiKey) { showToast("Set your Claude API key in Settings first", "error"); return; }

  const btn = document.getElementById("lor-generate-btn");
  const output = document.getElementById("lor-output");

  btn.disabled = true;
  btn.textContent = "Generating...";
  output.innerHTML = `<div class="agent-loading"><div class="spinner"></div><span>Generating letter of representation...</span></div>`;

  const systemPrompt = `You are a legal document drafter for Sher Law Group, an Arizona personal injury law firm. Draft a professional Letter of Representation. The letter should:
- Be addressed to the insurance company/adjuster
- State that Sher Law Group has been retained to represent the client
- Reference the date of loss and claim number
- Request all future correspondence be directed to the firm
- Mention enclosed HIPAA authorization
- Request preservation of evidence
- Include professional letterhead placeholder
- Use formal legal language appropriate for Arizona`;

  const formattedDate = dateOfLoss
    ? new Date(dateOfLoss + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "[Date of Loss]";

  const letterTypeLabel = lorType === "client-auto"
    ? "Letter of Representation to Client's Own Auto Insurance (first-party claim)"
    : "Letter of Representation to At-Fault Party's Insurance (third-party claim)";

  const userPrompt = `Generate a ${letterTypeLabel} with the following details:

Insurance Company: ${insuranceCompany || "[Insurance Company]"}
Adjuster Name: ${adjusterName || "[Adjuster]"}
Adjuster Email/Fax: ${adjusterContact || "[Contact]"}
Client Name: ${clientName}
Date of Loss: ${formattedDate}
Claim Number: ${claimNumber || "[Claim Number]"}
Insured Name: ${insuredName || "[Insured]"}

Firm: Sher Law Group
Attorney: Yelena Shimonova Sher, Esq.
Address: 14500 N. Northsight Blvd., Suite 313, Scottsdale, AZ 85260
Phone: (480) 531-8926
Fax: (480) 531-8927
Email: yelena@sherlawgroup.com

Please output the letter in plain text format ready to be placed on letterhead. Do not use markdown formatting.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
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
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Claude API ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text || "No response";

    // Store generated letter data for save action
    window._lorGeneratedData = {
      caseId: document.getElementById("lor-case-select")?.value || null,
      clientName,
      insuranceCompany,
      claimNumber,
      adjusterName,
      adjusterContact,
      dateOfLoss,
      insuredName,
      lorType,
      letterContent: text,
    };

    output.innerHTML = `
      <div class="settings-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 style="margin:0">Letter of Representation</h2>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="_copyLor()">Copy</button>
            <button class="btn btn-primary btn-sm" onclick="_saveAndTrackLor()">Save & Track</button>
          </div>
        </div>
        <div id="lor-letter-text" style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:24px;white-space:pre-wrap;font-family:'Georgia',serif;font-size:14px;line-height:1.7;color:var(--text-primary)">${escapeHtml(text)}</div>
      </div>
    `;
  } catch (err) {
    output.innerHTML = `<div class="agent-error">Generation failed: ${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Letter of Representation";
  }
}

// ─── Copy ─────────────────────────────────────────────────────────

function _copyLor() {
  const el = document.getElementById("lor-letter-text");
  if (el) {
    navigator.clipboard.writeText(el.innerText).then(() => showToast("Copied to clipboard"));
  }
}

// ─── Save & Track ─────────────────────────────────────────────────

async function _saveAndTrackLor() {
  const d = window._lorGeneratedData;
  if (!d) { showToast("No letter to save", "error"); return; }

  const token = typeof getIdToken === "function" ? await getIdToken() : null;
  if (!token) { showToast("Please sign in first", "error"); return; }

  try {
    // Save as a case document
    const docResp = await fetch(`${LOR_API}/api/case-documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        case_id: d.caseId,
        document_type: "Letter of Representation",
        title: `LOR - ${d.clientName} - ${d.insuranceCompany}`,
        content: d.letterContent,
        metadata: {
          letter_type: d.lorType,
          insurance_company: d.insuranceCompany,
          claim_number: d.claimNumber,
          adjuster_name: d.adjusterName,
          date_of_loss: d.dateOfLoss,
        },
      }),
    });
    if (!docResp.ok) throw new Error(`Save document failed: HTTP ${docResp.status}`);

    // Also create a record request entry to track the LOR
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 14);

    const reqResp = await fetch(`${LOR_API}/api/record-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        case_id: d.caseId,
        request_type: "Letter of Representation",
        provider_name: d.insuranceCompany,
        provider_address: d.adjusterContact || "",
        follow_up_date: followUp.toISOString().split("T")[0],
        status: "draft",
        letter_content: d.letterContent,
      }),
    });
    if (!reqResp.ok) throw new Error(`Save request failed: HTTP ${reqResp.status}`);

    showToast("Letter saved and tracked successfully");
  } catch (err) {
    showToast("Save failed: " + err.message, "error");
  }
}
