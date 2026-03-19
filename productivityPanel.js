// ─── Paralegal Productivity Panel ─────────────────────────────────
// Task tracking (localStorage) + dashboard with stats

const TASK_STORAGE_KEY = "paralegal_tasks";

function _loadTasks() {
  try { return JSON.parse(localStorage.getItem(TASK_STORAGE_KEY)) || []; } catch { return []; }
}
function _saveTasks(tasks) { localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks)); }

function renderProductivityPanel() {
  const container = document.getElementById("productivity-content");
  if (!container) return;

  const tasks = _loadTasks();
  const cases = typeof loadCases === "function" ? loadCases() : [];

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="_showAddTask()">+ Add Task</button>
      <select id="prod-filter" onchange="_renderTaskBoard()" style="padding:4px 8px;border-radius:6px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)">
        <option value="all">All Cases</option>
        ${cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`).join("")}
      </select>
    </div>
    <div id="add-task-area"></div>

    <div class="settings-section" style="margin-bottom:16px">
      <h2 style="margin:0 0 8px">Dashboard</h2>
      <div id="prod-stats">${_renderStats(tasks)}</div>
    </div>

    <div id="task-board">${_renderTaskColumns(tasks, "all")}</div>
  `;
}

function _renderStats(tasks) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const monthAgo = new Date(now - 30 * 86400000);
  const doneThisWeek = tasks.filter(t => t.status === "done" && new Date(t.updated_at) >= weekAgo).length;
  const doneThisMonth = tasks.filter(t => t.status === "done" && new Date(t.updated_at) >= monthAgo).length;
  const pending = tasks.filter(t => t.status !== "done").length;
  const overdue = tasks.filter(t => t.status !== "done" && t.due_date && new Date(t.due_date) < now).length;

  return `
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;text-align:center;padding:12px;background:var(--bg-card);border-radius:8px">
        <div style="font-size:24px;font-weight:700;color:var(--success)">${doneThisWeek}</div>
        <div style="font-size:12px;color:var(--text-muted)">Done This Week</div>
      </div>
      <div style="flex:1;min-width:120px;text-align:center;padding:12px;background:var(--bg-card);border-radius:8px">
        <div style="font-size:24px;font-weight:700;color:var(--accent)">${doneThisMonth}</div>
        <div style="font-size:12px;color:var(--text-muted)">Done This Month</div>
      </div>
      <div style="flex:1;min-width:120px;text-align:center;padding:12px;background:var(--bg-card);border-radius:8px">
        <div style="font-size:24px;font-weight:700;color:#f59e0b">${pending}</div>
        <div style="font-size:12px;color:var(--text-muted)">Pending</div>
      </div>
      <div style="flex:1;min-width:120px;text-align:center;padding:12px;background:var(--bg-card);border-radius:8px">
        <div style="font-size:24px;font-weight:700;color:var(--danger)">${overdue}</div>
        <div style="font-size:12px;color:var(--text-muted)">Overdue</div>
      </div>
    </div>
  `;
}

function _renderTaskColumns(tasks, filterCaseId) {
  const filtered = filterCaseId === "all" ? tasks : tasks.filter(t => t.case_id === filterCaseId);
  const cols = [
    { key: "todo", label: "To Do", color: "var(--text-muted)" },
    { key: "in_progress", label: "In Progress", color: "#f59e0b" },
    { key: "done", label: "Done", color: "var(--success)" },
  ];

  return `<div style="display:flex;gap:12px;flex-wrap:wrap">${cols.map(col => {
    const items = filtered.filter(t => t.status === col.key);
    return `
      <div style="flex:1;min-width:220px">
        <div style="font-weight:700;margin-bottom:8px;color:${col.color}">${col.label} (${items.length})</div>
        ${items.length ? items.map(t => _renderTaskCard(t)).join("") : `<p style="color:var(--text-muted);font-size:12px">No tasks</p>`}
      </div>`;
  }).join("")}</div>`;
}

function _renderTaskCard(t) {
  const now = new Date(); now.setHours(0,0,0,0);
  const overdue = t.status !== "done" && t.due_date && new Date(t.due_date) < now;
  const priorities = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  const nextStatus = t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : null;

  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;${overdue ? 'border-left:3px solid var(--danger)' : ''}">
      <div style="font-weight:600;font-size:13px">${escapeHtml(t.description)}</div>
      <div style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap">
        ${t.priority ? `<span class="deadline-badge" style="background:${priorities[t.priority] || '#6b7280'}">${t.priority}</span>` : ""}
        ${t.due_date ? `<span style="font-size:11px;color:${overdue ? 'var(--danger)' : 'var(--text-muted)'}">${t.due_date}</span>` : ""}
        <span style="margin-left:auto;display:flex;gap:4px">
          ${nextStatus ? `<button class="btn btn-sm" onclick="_moveTask('${t.id}','${nextStatus}')" style="padding:1px 6px;font-size:10px">${nextStatus === 'done' ? 'Done' : 'Start'}</button>` : ""}
          <button class="btn btn-sm" onclick="_deleteTask('${t.id}')" style="padding:1px 6px;font-size:10px;color:var(--text-muted)">X</button>
        </span>
      </div>
    </div>`;
}

function _renderTaskBoard() {
  const filter = document.getElementById("prod-filter")?.value || "all";
  const board = document.getElementById("task-board");
  if (board) board.innerHTML = _renderTaskColumns(_loadTasks(), filter);
}

function _showAddTask() {
  const area = document.getElementById("add-task-area");
  if (!area) return;
  const cases = typeof loadCases === "function" ? loadCases() : [];
  area.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:2;min-width:200px">
          <label>Description *</label>
          <input type="text" id="task-desc" placeholder="What needs to be done?">
        </div>
        <div class="form-group" style="flex:1;min-width:120px">
          <label>Due Date</label>
          <input type="date" id="task-due">
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1">
          <label>Case</label>
          <select id="task-case"><option value="">-- None --</option>${cases.map(c => `<option value="${c.id}">${escapeHtml(c.clientName)}</option>`).join("")}</select>
        </div>
        <div class="form-group" style="flex:1">
          <label>Priority</label>
          <select id="task-priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="_addTask()">Add</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('add-task-area').innerHTML=''">Cancel</button>
      </div>
    </div>`;
}

function _addTask() {
  const desc = document.getElementById("task-desc")?.value?.trim();
  if (!desc) { showToast("Description required", "error"); return; }
  const tasks = _loadTasks();
  tasks.push({
    id: crypto.randomUUID(), description: desc, status: "todo",
    case_id: document.getElementById("task-case")?.value || "",
    due_date: document.getElementById("task-due")?.value || "",
    priority: document.getElementById("task-priority")?.value || "medium",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  _saveTasks(tasks);
  document.getElementById("add-task-area").innerHTML = "";
  renderProductivityPanel();
}

function _moveTask(id, newStatus) {
  const tasks = _loadTasks();
  const t = tasks.find(t => t.id === id);
  if (t) { t.status = newStatus; t.updated_at = new Date().toISOString(); }
  _saveTasks(tasks);
  renderProductivityPanel();
}

function _deleteTask(id) {
  _saveTasks(_loadTasks().filter(t => t.id !== id));
  renderProductivityPanel();
}
