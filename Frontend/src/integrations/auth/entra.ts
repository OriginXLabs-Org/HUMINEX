import { BrowserCacheLocation, PublicClientApplication, type AuthenticationResult, type PopupRequest, type RedirectRequest } from "@azure/msal-browser";

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
const defaultRedirectUri = (import.meta.env.VITE_AZURE_AD_REDIRECT_URI as string | undefined) ?? window.location.origin;
const adminRedirectUri = (import.meta.env.VITE_AZURE_AD_ADMIN_REDIRECT_URI as string | undefined) ?? defaultRedirectUri;
const tenantRedirectUri = (import.meta.env.VITE_AZURE_AD_TENANT_REDIRECT_URI as string | undefined) ?? defaultRedirectUri;

export type EntraPortal = "admin" | "tenant" | "default";
export type EntraLoginMode = "popup" | "redirect";

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
  if (!isConfigured(defaultRedirectUri)) missing.push("VITE_AZURE_AD_REDIRECT_URI");

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
    redirectUri: defaultRedirectUri,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ["openid", "profile", "email", apiScope],
  prompt: "select_account",
  domainHint: "organizations",
};

let instance: PublicClientApplication | null = null;
let initialized = false;
let redirectHandled = false;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInteractionStatusKey(key: string): boolean {
  return key.toLowerCase().includes("interaction.status");
}

function clearInteractionKeys(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isInteractionStatusKey(key)) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    storage.removeItem(key);
  }
}

function hasInteractionKeys(storage: Storage): boolean {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isInteractionStatusKey(key)) {
      return true;
    }
  }
  return false;
}

function hasAnyInteractionInProgress(): boolean {
  try {
    return hasInteractionKeys(window.sessionStorage) || hasInteractionKeys(window.localStorage);
  } catch {
    return false;
  }
}

function clearAnyInteractionInProgress(): void {
  try {
    clearInteractionKeys(window.sessionStorage);
    clearInteractionKeys(window.localStorage);
  } catch {
    // Best effort; continue.
  }
}

async function waitForInteractionToSettle(timeoutMs = 4000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!hasAnyInteractionInProgress()) {
      return true;
    }
    await sleep(200);
  }

  return !hasAnyInteractionInProgress();
}

function resolveRedirectUri(portal: EntraPortal): string {
  if (portal === "admin") return adminRedirectUri;
  if (portal === "tenant") return tenantRedirectUri;
  return defaultRedirectUri;
}

export async function getMsalInstance(): Promise<PublicClientApplication> {
  const msal = getInstance();
  if (!initialized) {
    await msal.initialize();
    initialized = true;
  }
  if (!redirectHandled) {
    try {
      const redirectResult = await msal.handleRedirectPromise();
      if (redirectResult?.account) {
        msal.setActiveAccount(redirectResult.account);
      } else if (hasAnyInteractionInProgress()) {
        // Recover from stale interaction flags left in storage after interrupted redirects.
        clearAnyInteractionInProgress();
      }
    } catch {
      // Best-effort recovery from stale state.
      clearAnyInteractionInProgress();
    } finally {
      redirectHandled = true;
    }
  }
  return msal;
}

export async function startMicrosoftRedirectLogin(
  loginHint?: string,
  options?: { portal?: EntraPortal; redirectUri?: string }
): Promise<void> {
  const configError = getEntraConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const msal = await getMsalInstance();
  const portal = options?.portal ?? "default";
  const request: RedirectRequest = {
    ...loginRequest,
    redirectUri: options?.redirectUri ?? resolveRedirectUri(portal),
    ...(loginHint ? { loginHint } : {}),
  };

  await msal.loginRedirect(request);
}

export async function loginWithMicrosoft(
  loginHint?: string,
  options?: { portal?: EntraPortal; redirectUri?: string; mode?: EntraLoginMode }
): Promise<AuthenticationResult> {
  if (options?.mode === "redirect") {
    await startMicrosoftRedirectLogin(loginHint, options);
    throw new Error("entra_redirect_in_progress");
  }

  if (loginInFlight) {
    return loginInFlight;
  }

  loginInFlight = (async () => {
  const configError = getEntraConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const msal = await getMsalInstance();
  const portal = options?.portal ?? "default";
  const request: PopupRequest = {
    ...loginRequest,
    redirectUri: options?.redirectUri ?? resolveRedirectUri(portal),
    ...(loginHint ? { loginHint } : {}),
  };

    // Avoid false positives from stale MSAL interaction state on refresh/retry.
    const settled = await waitForInteractionToSettle(1500);
    if (!settled) {
      clearAnyInteractionInProgress();
      await sleep(200);
    }
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

        const settled = await waitForInteractionToSettle();
        if (!settled) {
          clearAnyInteractionInProgress();
          await sleep(250);
        }

        try {
          authResult = await msal.loginPopup(request);
        } catch (retryError) {
          if (isInteractionInProgressError(retryError)) {
            throw new Error("Microsoft sign-in is still in progress. Please wait a moment and try again.");
          }
          throw retryError;
        }
      } else {
        throw error;
      }
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
