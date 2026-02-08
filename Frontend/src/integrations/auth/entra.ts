import { BrowserCacheLocation, PublicClientApplication, type AuthenticationResult, type PopupRequest } from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_AZURE_AD_TENANT_ID as string | undefined;
const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID as string | undefined;
const apiScope = (import.meta.env.VITE_AZURE_AD_API_SCOPE as string | undefined) ?? "api://huminex-api/access_as_user";
const redirectUri = (import.meta.env.VITE_AZURE_AD_REDIRECT_URI as string | undefined) ?? window.location.origin;

function isConfigured(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 && !normalized.startsWith("YOUR_") && normalized !== "REPLACE_ME";
}

export const hasRequiredMsalConfig = isConfigured(tenantId) && isConfigured(clientId);

export function getEntraConfigError(): string | null {
  const missing: string[] = [];
  if (!isConfigured(tenantId)) missing.push("VITE_AZURE_AD_TENANT_ID");
  if (!isConfigured(clientId)) missing.push("VITE_AZURE_AD_CLIENT_ID");
  if (!isConfigured(apiScope)) missing.push("VITE_AZURE_AD_API_SCOPE");
  if (!isConfigured(redirectUri)) missing.push("VITE_AZURE_AD_REDIRECT_URI");

  if (missing.length === 0) {
    return null;
  }

  return `Microsoft Entra configuration missing in frontend env: ${missing.join(", ")}`;
}

if (!hasRequiredMsalConfig) {
  console.warn("Missing Entra config. Set VITE_AZURE_AD_TENANT_ID and VITE_AZURE_AD_CLIENT_ID.");
}

export const msalConfig = {
  auth: {
    clientId: clientId ?? "",
    authority: `https://login.microsoftonline.com/${tenantId ?? "common"}`,
    redirectUri,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ["openid", "profile", "email", apiScope],
};

let instance: PublicClientApplication | null = null;
let initialized = false;

function getInstance(): PublicClientApplication {
  if (!instance) {
    instance = new PublicClientApplication(msalConfig);
  }
  return instance;
}

export async function getMsalInstance(): Promise<PublicClientApplication> {
  const msal = getInstance();
  if (!initialized) {
    await msal.initialize();
    initialized = true;
  }
  return msal;
}

export async function loginWithMicrosoft(loginHint?: string): Promise<AuthenticationResult> {
  const configError = getEntraConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const msal = await getMsalInstance();
  const request = loginHint ? { ...loginRequest, loginHint } : loginRequest;
  const authResult = await msal.loginPopup(request);

  if (authResult.account) {
    msal.setActiveAccount(authResult.account);
  }

  if (authResult.accessToken) {
    return authResult;
  }

  const account = authResult.account ?? msal.getActiveAccount();
  if (!account) {
    throw new Error("Microsoft login succeeded but no account context found.");
  }

  return msal.acquireTokenSilent({
    scopes: loginRequest.scopes,
    account,
  });
}

export async function logoutMicrosoft(): Promise<void> {
  const msal = await getMsalInstance();
  await msal.logoutPopup({
    postLogoutRedirectUri: window.location.origin,
  });
}
