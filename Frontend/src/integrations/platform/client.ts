import { huminexApi } from "@/integrations/api/client";
import { getMsalInstance, loginRequest, loginWithMicrosoft, logoutMicrosoft } from "@/integrations/auth/entra";

export type AuthUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AuthUser;
};

type ApiResult<T> = { data: T; error: null; count?: number | null };
type AuthListener = (event: string, session: AuthSession | null) => void;
type EntraAuthContext = {
  authMethods: string[];
  authStrength?: string;
};

const SESSION_STORAGE_KEY = "huminex_api_session";
const INTERNAL_ADMIN_EMAIL = "originxlabs@gmail.com";
const LOCAL_BYPASS_ENABLED =
  import.meta.env.DEV === true &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  String(import.meta.env.VITE_ENABLE_LOCAL_INTERNAL_ADMIN_BYPASS ?? "true").toLowerCase() !== "false";

class QueryBuilder implements PromiseLike<ApiResult<any>> {
  private readonly payload: ApiResult<any>;

  constructor(payload: ApiResult<any> = { data: [], error: null, count: 0 }) {
    this.payload = payload;
  }

  select(): this { return this; }
  insert(value?: unknown): this { this.payload.data = value ?? []; return this; }
  update(value?: unknown): this { this.payload.data = value ?? []; return this; }
  delete(): this { return this; }
  upsert(value?: unknown): this { this.payload.data = value ?? []; return this; }

  eq(): this { return this; }
  neq(): this { return this; }
  gt(): this { return this; }
  gte(): this { return this; }
  lt(): this { return this; }
  lte(): this { return this; }
  like(): this { return this; }
  ilike(): this { return this; }
  in(): this { return this; }
  is(): this { return this; }
  or(): this { return this; }
  not(): this { return this; }
  match(): this { return this; }
  contains(): this { return this; }
  overlaps(): this { return this; }
  textSearch(): this { return this; }
  order(): this { return this; }
  limit(): this { return this; }
  range(): this { return this; }

  single(): this {
    if (Array.isArray(this.payload.data)) {
      this.payload.data = this.payload.data[0] ?? null;
    }
    return this;
  }

  maybeSingle(): this { return this.single(); }

  then<TResult1 = ApiResult<any>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.payload).then(onfulfilled, onrejected);
  }
}

const listeners = new Set<AuthListener>();

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function saveStoredSession(session: AuthSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem("huminex_user_id", session.user.id);
    localStorage.setItem("huminex_user_email", session.user.email);
  } catch {
    // Ignore storage errors in private mode environments.
  }
}

function notify(event: string, session: AuthSession | null): void {
  for (const listener of listeners) {
    listener(event, session);
  }
}

function buildLocalInternalAdminSession(): AuthSession {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    access_token: "local-internal-admin-bypass-token",
    refresh_token: "local-internal-admin-bypass-refresh",
    expires_at: nowSeconds + 4 * 3600,
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      email: INTERNAL_ADMIN_EMAIL,
      user_metadata: {
        full_name: "Local Internal Admin",
        role: "admin",
        tenant_id: "11111111-1111-1111-1111-111111111111",
        auth_methods: ["mfa"],
        auth_strength: "local_bypass",
        local_bypass: true,
      },
    },
  };
}

function normalizeStringArrayClaim(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase());
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.toLowerCase()];
  }
  return [];
}

async function buildSessionFromApiToken(
  accessToken: string,
  refreshToken: string,
  expiresAtUtc: string,
  entraAuthContext?: EntraAuthContext
): Promise<AuthSession> {
  const profile = await huminexApi.me(accessToken);
  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(new Date(expiresAtUtc).getTime() / 1000),
    user: {
      id: profile.userId,
      email: profile.email,
      user_metadata: {
        full_name: profile.name,
        role: profile.role,
        tenant_id: profile.tenantId,
        auth_methods: entraAuthContext?.authMethods ?? [],
        auth_strength: entraAuthContext?.authStrength ?? "",
      },
    },
  };
  localStorage.setItem("huminex_tenant_role", profile.role);
  localStorage.setItem("huminex_tenant_id", profile.tenantId);
  return session;
}

const auth = {
  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback);
    const timer = setTimeout(() => callback("INITIAL_SESSION", readStoredSession()), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            clearTimeout(timer);
            listeners.delete(callback);
          },
        },
      },
    };
  },
  async getSession() {
    let session = readStoredSession();
    if (!session) {
      try {
        const msal = await getMsalInstance();
        const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
        if (account) {
          const token = await msal.acquireTokenSilent({
            scopes: loginRequest.scopes,
            account,
          });
          session = await buildSessionFromApiToken(token.accessToken, token.idToken, token.expiresOn?.toISOString() ?? new Date(Date.now() + 3600_000).toISOString());
          saveStoredSession(session);
        }
      } catch {
        // No active Entra session.
      }
    }
    return { data: { session }, error: null };
  },
  async getUser() {
    const session = readStoredSession();
    return { data: { user: session?.user ?? null }, error: null };
  },
  async signInWithPassword(payload: { email: string; password: string }) {
    if (
      LOCAL_BYPASS_ENABLED &&
      payload.email.trim().toLowerCase() === INTERNAL_ADMIN_EMAIL
    ) {
      const session = buildLocalInternalAdminSession();
      saveStoredSession(session);
      notify("SIGNED_IN", session);
      return { data: { session, user: session.user }, error: null };
    }

    try {
      const result = await loginWithMicrosoft(payload.email);
      const claims = (result.idTokenClaims ?? {}) as Record<string, unknown>;
      const authMethods = normalizeStringArrayClaim(claims.amr);
      const authStrength = typeof claims.acrs === "string"
        ? claims.acrs
        : Array.isArray(claims.acrs) && claims.acrs.length > 0 && typeof claims.acrs[0] === "string"
          ? claims.acrs[0]
          : "";

      const session = await buildSessionFromApiToken(
        result.accessToken,
        result.idToken,
        result.expiresOn?.toISOString() ?? new Date(Date.now() + 3600_000).toISOString(),
        { authMethods, authStrength }
      );
      saveStoredSession(session);
      notify("SIGNED_IN", session);
      return { data: { session, user: session.user }, error: null };
    } catch (error: any) {
      return { data: { session: null, user: null }, error };
    }
  },
  async signUp(payload: { email: string; password: string; options?: unknown }) {
    void payload;
    return {
      data: { session: null, user: null },
      error: new Error("Self-service sign-up is disabled. Submit onboarding and wait for Entra invite/role assignment."),
    };
  },
  async signOut() {
    try {
      await logoutMicrosoft();
    } catch {
      // Ignore popup cancel errors.
    }
    saveStoredSession(null);
    notify("SIGNED_OUT", null);
    return { error: null };
  },
  async enableLocalInternalAdminBypassSession() {
    if (!LOCAL_BYPASS_ENABLED) {
      return { data: { session: null, user: null }, error: new Error("Local internal admin bypass is disabled.") };
    }

    const session = buildLocalInternalAdminSession();
    saveStoredSession(session);
    notify("SIGNED_IN", session);
    return { data: { session, user: session.user }, error: null };
  },
  async updateUser(_: unknown) {
    const session = readStoredSession();
    return { data: { user: session?.user ?? null }, error: null };
  },
  async resetPasswordForEmail(_: string, __?: unknown) {
    return { data: {}, error: null };
  },
  admin: {
    async createUser(_: unknown) {
      const session = readStoredSession();
      return { data: { user: session?.user ?? null }, error: null };
    },
  },
};

const functionsApi = {
  async invoke(name: string, payload?: unknown) {
    if (name === "generate-invoice-pdf") {
      return { data: { url: "https://www.gethuminex.com/sample-invoice.pdf" }, error: null };
    }
    if (name === "admin-auth-audit") {
      try {
        const body = (payload as { body?: {
          portal: string;
          status: "attempt" | "blocked" | "success" | "failure";
          reason: string;
          path?: string;
          userAgent?: string;
        } })?.body;
        if (body) {
          const data = await huminexApi.logAdminAuthAudit(body);
          return { data, error: null };
        }
      } catch (error: any) {
        return { data: null, error };
      }
      return { data: null, error: new Error("Missing admin-auth-audit payload.body") };
    }
    return { data: { ok: true, name }, error: null };
  },
};

const storageApi = {
  from(_bucket: string) {
    return {
      async upload() { return { data: { path: "mock/path" }, error: null }; },
      async download() { return { data: new Blob(["mock"]), error: null }; },
      async remove() { return { data: [], error: null }; },
      getPublicUrl(path: string) { return { data: { publicUrl: `https://www.gethuminex.com/assets/${path}` } }; },
    };
  },
};

function createChannel() {
  return {
    on() { return this; },
    subscribe() { return this; },
    unsubscribe() { return this; },
  };
}

const noopAsync = async <T>(data: T): Promise<ApiResult<T>> => ({ data, error: null });

export const platformClient: any = {
  auth,
  functions: functionsApi,
  storage: storageApi,
  from: (_table: string) => new QueryBuilder(),
  rpc: async (fnName: string) => {
    if (fnName === "generate_client_id") {
      return noopAsync(`HMX-${Date.now()}`);
    }
    return noopAsync(null);
  },
  channel: (_name: string) => createChannel(),
  removeChannel: (_channel: unknown) => void 0,
};
