// graphClient.js — Microsoft Graph API helpers
// All calls use the access token from auth.js

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Generic Graph API call.
 */
async function graphFetch(endpoint, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const url = endpoint.startsWith("http") ? endpoint : `${GRAPH_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Graph API ${response.status}: ${body}`);
  }

  // 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

// ─── User Profile ────────────────────────────────────────────

async function getMyProfile() {
  return graphFetch("/me");
}

// ─── Email ───────────────────────────────────────────────────

async function getRecentEmails(count = 20) {
  return graphFetch(`/me/messages?$top=${count}&$orderby=receivedDateTime desc`);
}

async function sendEmail(to, subject, body) {
  return graphFetch("/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });
}

// ─── Calendar ────────────────────────────────────────────────

async function getUpcomingEvents(days = 14) {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + days * 86400000).toISOString();
  return graphFetch(
    `/me/calendarView?startDateTime=${now}&endDateTime=${future}&$orderby=start/dateTime&$top=50`
  );
}

async function createCalendarEvent(subject, start, end, body = "", attendees = []) {
  return graphFetch("/me/events", {
    method: "POST",
    body: JSON.stringify({
      subject,
      body: { contentType: "HTML", content: body },
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
      attendees: attendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      })),
    }),
  });
}

// ─── OneDrive / SharePoint Files ─────────────────────────────

async function listDriveFiles(folderId = "root") {
  return graphFetch(`/me/drive/${folderId === "root" ? "root" : `items/${folderId}`}/children`);
}

async function uploadFileToDrive(fileName, content, folderId = "root") {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const path =
    folderId === "root"
      ? `/me/drive/root:/${fileName}:/content`
      : `/me/drive/items/${folderId}:/${fileName}:/content`;

  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: content,
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return response.json();
}

// ─── SharePoint Lists (for CRM storage) ─────────────────────

async function getSiteId(sitePath) {
  // sitePath e.g. "contoso.sharepoint.com:/sites/LawFirmCRM"
  return graphFetch(`/sites/${sitePath}`);
}

async function getListItems(siteId, listId) {
  return graphFetch(`/sites/${siteId}/lists/${listId}/items?expand=fields`);
}

async function createListItem(siteId, listId, fields) {
  return graphFetch(`/sites/${siteId}/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

async function updateListItem(siteId, listId, itemId, fields) {
  return graphFetch(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}
