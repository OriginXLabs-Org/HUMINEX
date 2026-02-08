import { BrowserCacheLocation, PublicClientApplication, type AuthenticationResult, type PopupRequest } from "@azure/msal-browser";

const isHostedOnHuminexDomain =
  typeof window !== "undefined" && /(^|\.)gethuminex\.com$/i.test(window.location.hostname);

const hostedFallbackTenantId = isHostedOnHuminexDomain ? "798c33e1-22be-463e-be2f-2920646fa78c" : undefined;
const hostedFallbackClientId = isHostedOnHuminexDomain ? "8585bece-66ed-405c-bfa5-568689345f91" : undefined;
const hostedFallbackApiScope = isHostedOnHuminexDomain
  ? "api://40efefe7-8bc1-4452-9261-8f1973a0b5fa/access_as_user"
  : "api://huminex-api/access_as_user";

const tenantId = (import.meta.env.VITE_AZURE_AD_TENANT_ID as string | undefined) ?? hostedFallbackTenantId;
const clientId = (import.meta.env.VITE_AZURE_AD_CLIENT_ID as string | undefined) ?? hostedFallbackClientId;
const apiScope = (import.meta.env.VITE_AZURE_AD_API_SCOPE as string | undefined) ?? hostedFallbackApiScope;
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
let loginInFlight: Promise<AuthenticationResult> | null = null;

function isInteractionInProgressError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { errorCode?: string; code?: string; message?: string };
  const code = (maybeError.errorCode ?? maybeError.code ?? "").toLowerCase();
  const message = (maybeError.message ?? "").toLowerCase();
  return code === "interaction_in_progress" || message.includes("interaction_in_progress");
}

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
  if (loginInFlight) {
    return loginInFlight;
  }

  loginInFlight = (async () => {
  const configError = getEntraConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const msal = await getMsalInstance();
  const request = loginHint ? { ...loginRequest, loginHint } : loginRequest;
    let authResult: AuthenticationResult;

    try {
      authResult = await msal.loginPopup(request);
    } catch (error) {
      if (isInteractionInProgressError(error)) {
        const existingAccount = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
        if (existingAccount) {
          return msal.acquireTokenSilent({
            scopes: loginRequest.scopes,
            account: existingAccount,
          });
        }
        throw new Error("Microsoft sign-in is already in progress. Close the existing sign-in popup and retry.");
      }
      throw error;
    }

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
  })();

  try {
    return await loginInFlight;
  } finally {
    loginInFlight = null;
  }
}

export async function logoutMicrosoft(): Promise<void> {
  const msal = await getMsalInstance();
  await msal.logoutPopup({
    postLogoutRedirectUri: window.location.origin,
  });
}
