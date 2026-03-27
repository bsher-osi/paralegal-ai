// ─── Fee Agreement Template ───────────────────────────────────────
// Placeholder template for contingency fee agreement.
// Replace with actual firm fee agreement text when available.

const FEE_AGREEMENT_TEMPLATE = `
CONTINGENCY FEE AGREEMENT

THIS AGREEMENT is entered into between:

CLIENT:
  Name:        {{clientName}}
  Date of Birth: {{dob}}
  Address:     {{address}}
  Phone:       {{phone}}
  Email:       {{email}}

and

ATTORNEY:
  Sher Law Group
  Yelena Shimonova Sher, Esq.
  Phoenix, Arizona


1. SCOPE OF REPRESENTATION

The Client hereby retains the Attorney to represent the Client in connection with a claim for personal injury arising from:

  Type of Incident: {{caseType}}
  Date of Incident: {{dateOfIncident}}
  Description:      {{description}}

The Attorney agrees to represent the Client in pursuing all claims related to the above-described incident, including but not limited to claims for bodily injury, pain and suffering, medical expenses, lost wages, and any other damages recoverable under Arizona law.


2. ATTORNEY'S FEES

The Attorney's fee shall be contingent upon recovery and shall be computed as follows:

  (a) Thirty-three and one-third percent (33⅓%) of the gross recovery if the case is resolved prior to the filing of a lawsuit.

  (b) Forty percent (40%) of the gross recovery if a lawsuit is filed.

  (c) If an appeal is taken by either side, the fee shall be forty-five percent (45%) of the gross recovery.

No fee shall be charged unless there is a recovery.


3. COSTS AND EXPENSES

The Client agrees that the Attorney may advance costs and expenses necessary for the prosecution of the claim. Such costs include, but are not limited to: filing fees, service of process fees, deposition costs, expert witness fees, medical record retrieval fees, court reporter fees, and investigation costs.

Costs and expenses shall be reimbursed to the Attorney from the gross recovery before the computation of the attorney's fee. If there is no recovery, the Client shall not be responsible for costs advanced by the Attorney.


4. MEDICAL LIENS AND SUBROGATION

The Client acknowledges that medical providers, health insurance companies, and government entities may assert liens or subrogation rights against any recovery. The Client authorizes the Attorney to negotiate and resolve such liens from the proceeds of any recovery.


5. HIPAA AUTHORIZATION

The Client authorizes the Attorney and the Attorney's staff to obtain medical records, billing records, and other protected health information related to the injuries sustained in the above-described incident. A separate HIPAA Authorization form is attached hereto and incorporated by reference.


6. CLIENT'S RESPONSIBILITIES

The Client agrees to:
  (a) Cooperate fully with the Attorney in the prosecution of the claim;
  (b) Keep the Attorney informed of any changes in address, phone number, or email;
  (c) Attend all scheduled depositions, mediations, and court appearances;
  (d) Not settle the claim or communicate with the opposing party or their insurance company without the Attorney's consent.


7. TERMINATION

Either party may terminate this Agreement at any time upon written notice. If the Client terminates this Agreement after the Attorney has performed substantial work, the Attorney shall be entitled to reasonable compensation for services rendered on a quantum meruit basis.


8. DISPUTE RESOLUTION

Any disputes between the Client and the Attorney regarding fees or the terms of this Agreement shall be submitted to fee arbitration pursuant to the rules of the State Bar of Arizona.


9. ACKNOWLEDGMENTS

The Client acknowledges that:
  (a) The Client has read and understands this Agreement;
  (b) No promises have been made regarding the outcome of the case;
  (c) The Client has the right to consult with another attorney before signing this Agreement;
  (d) The Client has received a copy of this Agreement.


IN WITNESS WHEREOF, the parties have executed this Agreement as of the date indicated below.


_______________________________          Date: _______________
{{clientName}}
Client


_______________________________          Date: _______________
Yelena Shimonova Sher, Esq.
Sher Law Group
Attorney
`;

/**
 * Populate the fee agreement template with case data.
 * @param {Object} caseData — case object from loadCases()
 * @returns {string} — populated agreement text
 */
function populateFeeAgreement(caseData) {
  const replacements = {
    "{{clientName}}": caseData.clientName || "[Client Name]",
    "{{dob}}": caseData.dob || "[Date of Birth]",
    "{{address}}": caseData.address || "[Address]",
    "{{phone}}": caseData.phone || "[Phone]",
    "{{email}}": caseData.email || "[Email]",
    "{{caseType}}": caseData.caseType || "[Case Type]",
    "{{dateOfIncident}}": caseData.dateOfIncident || "[Date of Incident]",
    "{{description}}": caseData.description || "[Description of Incident]",
  };

  let text = FEE_AGREEMENT_TEMPLATE;
  for (const [placeholder, value] of Object.entries(replacements)) {
    text = text.replaceAll(placeholder, value);
  }
  return text.trim();
}

/**
 * Check if DocuSign is configured on the backend (with timeout).
 */
async function _isAdobeSignConfigured() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch(`${API_BASE}/api/esign/status`, {
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return false;
    const data = await resp.json();
    return data?.configured === true;
  } catch {
    return false;
  }
}

/**
 * Show the fee agreement preview in the case modal with Send/Mark actions.
 * @param {string} caseId
 */
async function showFeeAgreementPreview(caseId) {
  const c = loadCases().find(x => x.id === caseId);
  if (!c) return;

  const agreementText = populateFeeAgreement(c);
  const modal = document.getElementById("case-modal");
  const content = document.getElementById("case-modal-content");

  // Check if DocuSign is available
  const adobeReady = await _isAdobeSignConfigured();
  const clientHasEmail = !!(c.email && c.email.includes("@"));

  const sendBtnLabel = adobeReady
    ? "Send via DocuSign"
    : "Mark as Sent (DocuSign not configured)";

  const emailWarning = adobeReady && !clientHasEmail
    ? `<div style="background:var(--warning);color:#000;padding:8px 12px;border-radius:6px;font-size:13px;margin:8px 0">⚠ Client has no email address. Add one in the Client tab before sending via DocuSign.</div>`
    : "";

  content.innerHTML = `
    <div class="modal-header">
      <h2>Fee Agreement — ${escapeHtml(c.clientName)}</h2>
      <button class="btn-icon" onclick="closeCaseModal()">&times;</button>
    </div>
    ${adobeReady ? `<div style="background:#22c55e22;border:1px solid #22c55e;padding:8px 12px;border-radius:6px;font-size:13px;margin:8px 0;color:#22c55e">✓ DocuSign connected — agreement will be sent for e-signature to <strong>${escapeHtml(c.email || "no email")}</strong></div>` : `<div style="background:var(--bg-card);padding:8px 12px;border-radius:6px;font-size:13px;margin:8px 0;color:var(--text-muted)">DocuSign not configured — agreement will be saved locally. Configure in Settings or set env vars on the server.</div>`}
    ${emailWarning}
    <div style="max-height:50vh;overflow-y:auto;background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:24px;margin:8px 0;white-space:pre-wrap;font-family:'Courier New',monospace;font-size:13px;line-height:1.6;color:var(--text-primary)" id="fee-agreement-text">${escapeHtml(agreementText)}</div>
    <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-primary" onclick="_sendFeeAgreement('${c.id}')" id="fee-send-btn" ${adobeReady && !clientHasEmail ? "disabled" : ""}>
        ${sendBtnLabel}
      </button>
      <button class="btn btn-outline" onclick="navigator.clipboard.writeText(document.getElementById('fee-agreement-text').innerText).then(()=>showToast('Copied'))">
        Copy to Clipboard
      </button>
      <button class="btn btn-outline" onclick="openCaseDetail('${c.id}')">
        Back to Case
      </button>
    </div>
  `;

  modal.classList.add("open");
}

/**
 * Send fee agreement — tries DocuSign first, falls back to local save.
 */
async function _sendFeeAgreement(caseId) {
  const c = loadCases().find(x => x.id === caseId);
  if (!c) return;

  const agreementText = populateFeeAgreement(c);
  const btn = document.getElementById("fee-send-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

  let sentViaAdobe = false;

  // Try DocuSign first
  try {
    const adobeReady = await _isAdobeSignConfigured();
    if (adobeReady && c.email) {
      const result = await agentApiFetch("/api/esign/send", {
        method: "POST",
        body: JSON.stringify({
          caseId,
          clientName: c.clientName,
          clientEmail: c.email,
          agreementName: `Fee Agreement — ${c.clientName}`,
          documentContent: agreementText,
        }),
      });

      // Store agreement ID on the case for status checking
      if (result?.envelopeId) {
        updateCase(caseId, { docusignEnvelopeId: result.envelopeId });
        // Register envelope→case mapping on backend so webhook can find it
        try {
          await agentApiFetch("/api/esign/register", {
            method: "POST",
            body: JSON.stringify({ envelopeId: result.envelopeId, caseId }),
          });
        } catch (_) {}
        sentViaAdobe = true;
      }
    }
  } catch (err) {
    console.warn("[feeAgreement] DocuSign failed, falling back to local:", err.message);
  }

  // Fallback: save document locally
  if (!sentViaAdobe) {
    try {
      await agentApiFetch("/api/case-documents", {
        method: "POST",
        body: JSON.stringify({
          caseId,
          title: `Fee Agreement — ${c.clientName}`,
          content: agreementText,
          docType: "fee_agreement",
        }),
      });
    } catch (err) {
      console.warn("[feeAgreement] Failed to save to backend:", err.message);
    }
  }

  // Move case to fee_agreement_sent
  moveCaseToStage(caseId, "fee_agreement_sent");
  renderKanbanBoard();
  closeCaseModal();

  if (sentViaAdobe) {
    showToast(`Fee agreement sent via DocuSign to ${c.email}`, "success");
  } else {
    showToast(`Fee agreement saved for ${c.clientName} (send manually or configure DocuSign)`, "success");
  }
}

/**
 * Mark fee agreement as signed — moves case to fee_agreement_signed.
 */
function markAgreementSigned(caseId) {
  moveCaseToStage(caseId, "fee_agreement_signed");
  renderKanbanBoard();
  closeCaseModal();
  showToast("Agreement signed — case ready for LOR");
}

/**
 * Check DocuSign agreement status (called from case detail or polling).
 */
async function checkAgreementStatus(caseId) {
  const c = loadCases().find(x => x.id === caseId);
  if (!c?.docusignEnvelopeId) {
    showToast("No DocuSign agreement ID for this case", "error");
    return;
  }

  try {
    const result = await agentApiFetch(`/api/esign/status/${c.docusignEnvelopeId}`);
    if (result?.status === "completed") {
      markAgreementSigned(caseId);
      showToast("Fee agreement has been signed!", "success");
    } else {
      showToast(`Agreement status: ${result?.status || "unknown"}`, "info");
    }
  } catch (err) {
    showToast("Failed to check status: " + err.message, "error");
  }
}

/**
 * Poll for completed envelopes and auto-move cases.
 * Called on app load and periodically.
 */
async function pollDocuSignCompletions() {
  try {
    const token = typeof getIdToken === "function" ? await getIdToken() : null;
    const resp = await fetch(`${typeof API_BASE !== 'undefined' ? API_BASE : 'https://tools.sherlawgroup.com'}/api/esign/completed`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) return;
    const completed = await resp.json();
    if (!completed.length) return;

    const cases = loadCases();
    let moved = 0;
    for (const env of completed) {
      // Find case by envelope ID stored in localStorage
      const c = cases.find(x => x.docusignEnvelopeId === env.envelopeId && x.stage === "fee_agreement_sent");
      if (c) {
        moveCaseToStage(c.id, "fee_agreement_signed");
        moved++;
      }
    }
    if (moved > 0) {
      renderKanbanBoard();
      showToast(`${moved} agreement(s) signed — cases updated!`, "success");
    }
  } catch (_) {}
}

// Poll every 30 seconds for signed agreements
setInterval(pollDocuSignCompletions, 30000);
// Also poll on first load (after a short delay)
setTimeout(pollDocuSignCompletions, 3000);
