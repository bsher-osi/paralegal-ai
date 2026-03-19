// ─── Legal Research Panel ─────────────────────────────────────────
// AI-powered legal research using Claude API (client-side)

function renderResearchPanel() {
  const container = document.getElementById("research-content");
  if (!container) return;

  container.innerHTML = `
    <div class="settings-section">
      <h2 style="margin:0 0 12px">Legal Research Assistant</h2>
      <div class="form-group">
        <label>Legal Question</label>
        <textarea id="research-question" rows="4" placeholder="e.g., What is the statute of limitations for medical malpractice in Arizona? What are the notice requirements?"></textarea>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:160px">
          <label>Jurisdiction</label>
          <select id="research-jurisdiction">
            <option value="Arizona" selected>Arizona</option>
            <option value="California">California</option>
            <option value="Nevada">Nevada</option>
            <option value="Federal">Federal</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:160px">
          <label>Area of Law</label>
          <select id="research-area">
            <option value="Personal Injury" selected>Personal Injury</option>
            <option value="Medical Malpractice">Medical Malpractice</option>
            <option value="Auto Accident">Auto Accident</option>
            <option value="Premises Liability">Premises Liability</option>
            <option value="Workers Compensation">Workers Compensation</option>
            <option value="Insurance Law">Insurance Law</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="_doResearch()" id="research-btn">Research</button>
    </div>

    <div id="research-output"></div>
  `;
}

async function _doResearch() {
  const question = document.getElementById("research-question")?.value?.trim();
  if (!question) { showToast("Enter a legal question", "error"); return; }

  const jurisdiction = document.getElementById("research-jurisdiction").value;
  const area = document.getElementById("research-area").value;
  const btn = document.getElementById("research-btn");
  const output = document.getElementById("research-output");

  const apiKey = localStorage.getItem("claude_api_key");
  if (!apiKey) { showToast("Set your Claude API key in Settings first", "error"); return; }

  btn.disabled = true;
  btn.textContent = "Researching...";
  output.innerHTML = `<div class="agent-loading"><div class="loading-spinner"></div><span>Researching — this may take a moment...</span></div>`;

  const systemPrompt = `You are a legal research assistant for a personal injury law firm. You provide thorough, well-cited legal research.

IMPORTANT: Structure your response with these exact markdown headings:
## Relevant Statutes
## Case Law
## Key Legal Principles
## Practical Application
## Important Caveats

Be specific with statute numbers and case citations. Note that you are an AI and this is not legal advice — always recommend verification with official sources.`;

  const userPrompt = `Jurisdiction: ${jurisdiction}
Area of Law: ${area}

Research Question: ${question}`;

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
        model: "claude-sonnet-4-20250514",
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

    output.innerHTML = `
      <div class="settings-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 style="margin:0">Research Results</h2>
          <button class="btn btn-outline btn-sm" onclick="_copyResearch()">Copy</button>
        </div>
        <div id="research-text" class="research-output-text">${_markdownToHtml(text)}</div>
      </div>
    `;
  } catch (err) {
    output.innerHTML = `<div class="agent-error">Research failed: ${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Research";
  }
}

function _copyResearch() {
  const el = document.getElementById("research-text");
  if (el) {
    navigator.clipboard.writeText(el.innerText).then(() => showToast("Copied to clipboard"));
  }
}

function _markdownToHtml(md) {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^## (.+)$/gm, '<h3 style="color:var(--accent);margin:16px 0 8px">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-card);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:16px">$1</li>')
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}
