// auth.js — MSAL authentication (PKCE flow, no backend)
// Uses @azure/msal-browser loaded from CDN in index.html

const msalConfig = {
  auth: {
    clientId: "dc110208-bcd5-4f48-8589-d20599e13b8b",
    authority: "https://login.microsoftonline.com/7b86160b-cb9c-4487-87dc-95c13ca24ac3",
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: [
    "User.Read",
    "Mail.Read",
    "Mail.Send",
    "Calendars.ReadWrite",
    "Files.ReadWrite",
    "Sites.ReadWrite.All",
  ],
};

let msalInstance = null;
let currentAccount = null;

/**
 * Initialize MSAL and handle redirect promise (returning from login).
 */
async function initAuth() {
  msalInstance = new msal.PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // Handle redirect response (if returning from login redirect)
  const response = await msalInstance.handleRedirectPromise();
  if (response) {
    currentAccount = response.account;
  } else {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      currentAccount = accounts[0];
    }
  }

  updateAuthUI();
  return currentAccount;
}

/**
 * Sign in with popup.
 */
async function signIn() {
  try {
    const response = await msalInstance.loginPopup(loginRequest);
    currentAccount = response.account;
    updateAuthUI();
    return currentAccount;
  } catch (error) {
    console.error("Login failed:", error);
    showToast("Sign-in failed: " + error.message, "error");
    return null;
  }
}

/**
 * Sign out.
 */
async function signOut() {
  if (!msalInstance) return;
  try {
    await msalInstance.logoutPopup({ account: currentAccount });
    currentAccount = null;
    updateAuthUI();
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

/**
 * Acquire an access token silently (or via popup if interaction required).
 */
async function getAccessToken() {
  if (!msalInstance || !currentAccount) return null;
  const tokenRequest = { ...loginRequest, account: currentAccount };

  try {
    const response = await msalInstance.acquireTokenSilent(tokenRequest);
    return response.accessToken;
  } catch (error) {
    // If silent fails, try popup
    try {
      const response = await msalInstance.acquireTokenPopup(tokenRequest);
      return response.accessToken;
    } catch (popupError) {
      console.error("Token acquisition failed:", popupError);
      showToast("Session expired — please sign in again.", "error");
      return null;
    }
  }
}

/**
 * Update UI based on auth state.
 */
function updateAuthUI() {
  const signInBtn = document.getElementById("btn-sign-in");
  const signOutBtn = document.getElementById("btn-sign-out");
  const userDisplay = document.getElementById("user-display");
  const appMain = document.getElementById("app-main");
  const authGate = document.getElementById("auth-gate");

  if (currentAccount) {
    if (signInBtn) signInBtn.style.display = "none";
    if (signOutBtn) signOutBtn.style.display = "inline-flex";
    if (userDisplay) userDisplay.textContent = currentAccount.name || currentAccount.username;
    if (appMain) appMain.style.display = "flex";
    if (authGate) authGate.style.display = "none";
  } else {
    if (signInBtn) signInBtn.style.display = "inline-flex";
    if (signOutBtn) signOutBtn.style.display = "none";
    if (userDisplay) userDisplay.textContent = "";
    if (appMain) appMain.style.display = "none";
    if (authGate) authGate.style.display = "flex";
  }
}

/**
 * Get a fresh id_token for use as a Bearer token to backend APIs.
 * Uses acquireTokenSilent so MSAL auto-refreshes expired tokens.
 */
async function getIdToken() {
  if (!msalInstance || !currentAccount) return null;
  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: [msalConfig.auth.clientId + "/.default"],
      account: currentAccount,
    });
    return response.idToken;
  } catch (e) {
    // If silent refresh fails, try popup
    try {
      const response = await msalInstance.acquireTokenPopup({
        scopes: [msalConfig.auth.clientId + "/.default"],
        account: currentAccount,
      });
      return response.idToken;
    } catch (popupError) {
      console.error("Token refresh failed:", popupError);
      showToast("Session expired — please sign in again.", "error");
      return null;
    }
  }
}

function isAuthenticated() {
  return currentAccount !== null;
}

function getCurrentAccount() {
  return currentAccount;
}
