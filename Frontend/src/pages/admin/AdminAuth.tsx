import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { platformClient as platform } from "@/integrations/platform/client";
import { getEntraConfigError } from "@/integrations/auth/entra";
import { huminexApi } from "@/integrations/api/client";
import huminexLogo from "@/assets/huminex-mark.svg";
import { AlertTriangle, ArrowLeft, Loader2, Shield } from "lucide-react";

const ADMIN_ROLES = new Set(["admin", "super_admin", "director"]);
const INTERNAL_ADMIN_EMAIL = "originxlabs@gmail.com";
const STRONG_AUTH_METHODS = new Set(["mfa", "fido", "rsa", "otp", "wia", "hwk", "x509"]);
const ADMIN_AUDIT_STORAGE_KEY = "huminex_admin_auth_audit";
const HOSTED_DOMAIN_PATTERN = /(^|\.)gethuminex\.com$/i;
const ADMIN_REDIRECT_URI =
  HOSTED_DOMAIN_PATTERN.test(window.location.hostname)
    ? new URL("/admin/login", window.location.origin).toString()
    : (
      (import.meta.env.VITE_AZURE_AD_ADMIN_REDIRECT_URI as string | undefined)
      ?? (import.meta.env.VITE_AZURE_AD_REDIRECT_URI as string | undefined)
      ?? window.location.origin
    );
const LOCAL_BYPASS_ENABLED =
  import.meta.env.DEV === true &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  String(import.meta.env.VITE_ENABLE_LOCAL_INTERNAL_ADMIN_BYPASS ?? "true").toLowerCase() !== "false";

function hasStrongEntraVerification(userMetadata: Record<string, unknown> | undefined): boolean {
  const raw = userMetadata?.auth_methods;
  if (!Array.isArray(raw)) return false;
  const authMethods = raw.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase());
  return authMethods.some((method) => STRONG_AUTH_METHODS.has(method));
}

type AdminAuditStatus = "attempt" | "blocked" | "success" | "failure";

const AdminAuth = () => {
  const [loading, setLoading] = useState(false);
  const [entraConfigError, setEntraConfigError] = useState<string | null>(null);
  const navigate = useNavigate();

  const captureAdminAudit = async (status: AdminAuditStatus, reason: string): Promise<void> => {
    const auditRecord = {
      timestamp: new Date().toISOString(),
      portal: "internal_admin",
      status,
      reason,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
    };

    try {
      const raw = localStorage.getItem(ADMIN_AUDIT_STORAGE_KEY);
      const entries = raw ? (JSON.parse(raw) as unknown[]) : [];
      const nextEntries = Array.isArray(entries) ? entries.slice(-99) : [];
      nextEntries.push(auditRecord);
      localStorage.setItem(ADMIN_AUDIT_STORAGE_KEY, JSON.stringify(nextEntries));
    } catch {
      // Best-effort local audit buffer.
    }

    try {
      await platform.functions.invoke("admin-auth-audit", { body: auditRecord });
    } catch {
      // Best-effort remote audit event.
    }
  };

  useEffect(() => {
    setEntraConfigError(getEntraConfigError());

    const syncSession = async () => {
      const { data: { session } } = await platform.auth.getSession();
      if (!session?.user) return;

      try {
        const sessionEmail = (session.user.email || "").toLowerCase();
        if (sessionEmail !== INTERNAL_ADMIN_EMAIL || !hasStrongEntraVerification(session.user.user_metadata)) {
          await captureAdminAudit("blocked", "session_failed_internal_checks");
          await platform.auth.clearLocalSession();
          return;
        }

        const me = await huminexApi.me();
        const role = (me.role || "").toLowerCase();
        const profileEmail = (me.email || "").toLowerCase();
        if (profileEmail === INTERNAL_ADMIN_EMAIL && ADMIN_ROLES.has(role)) {
          await captureAdminAudit("success", "session_restored");
          navigate("/admin", { replace: true });
        } else {
          await captureAdminAudit("blocked", "session_role_or_profile_mismatch");
          await platform.auth.clearLocalSession();
        }
      } catch {
        // Ignore and stay on login page.
      }
    };

    syncSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const configError = getEntraConfigError();
      if (configError && !LOCAL_BYPASS_ENABLED) {
        await captureAdminAudit("blocked", "entra_config_missing");
        toast.error(configError);
        return;
      }

      await captureAdminAudit("attempt", "interactive_login_started");
      const loginResult = LOCAL_BYPASS_ENABLED
        ? await platform.auth.enableLocalInternalAdminBypassSession()
        : await platform.auth.signInWithPassword({
            email: INTERNAL_ADMIN_EMAIL,
            password: "microsoft-entra",
            portal: "admin",
            redirectUri: ADMIN_REDIRECT_URI,
          });
      const { data, error } = loginResult;

      if (error) {
        await captureAdminAudit("failure", "entra_auth_failed");
        toast.error(error.message || "Unable to authenticate with Microsoft Entra");
        return;
      }

      if ((data as { redirecting?: boolean } | null)?.redirecting) {
        await captureAdminAudit("attempt", "redirect_login_in_progress");
        toast.info("Redirecting to Microsoft sign-in...");
        return;
      }

      const signedInEmail = (data?.user?.email ?? "").toLowerCase();
      if (signedInEmail !== INTERNAL_ADMIN_EMAIL) {
        await captureAdminAudit("blocked", "signed_in_email_not_internal");
        await platform.auth.clearLocalSession();
        toast.error("Access denied. This portal is restricted to HUMINEX internal admin identity.");
        return;
      }

      if (!hasStrongEntraVerification(data?.user?.user_metadata)) {
        await captureAdminAudit("blocked", "mfa_or_passkey_missing");
        await platform.auth.clearLocalSession();
        toast.error("Access denied. Azure Authenticator/Passkey (MFA) verification is required for Admin access.");
        return;
      }

      if (!LOCAL_BYPASS_ENABLED) {
        const me = await huminexApi.me();
        const role = (me.role || "").toLowerCase();
        const profileEmail = (me.email || "").toLowerCase();
        if (profileEmail !== INTERNAL_ADMIN_EMAIL) {
          await captureAdminAudit("blocked", "profile_email_mismatch");
          await platform.auth.clearLocalSession();
          toast.error("Access denied. Internal admin profile verification failed.");
          return;
        }

        if (!ADMIN_ROLES.has(role)) {
          await captureAdminAudit("blocked", "missing_admin_role");
          await platform.auth.clearLocalSession();
          toast.error("Access denied. Azure admin role privileges are required.");
          return;
        }
      }

      await captureAdminAudit("success", "interactive_login_completed");
      toast.success("Welcome to HUMINEX Admin Portal");
      navigate("/admin", { replace: true });
    } catch (err) {
      await captureAdminAudit("failure", "unexpected_exception");
      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md mx-4">
        <Link to="/" className="inline-flex items-center gap-2 text-[#6B8A8E] hover:text-[#4FF2F2] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img src={huminexLogo} alt="HUMINEX" className="h-16 w-16" />
            <div>
              <span className="text-2xl font-heading font-bold text-white">HUMINEX</span>
              <span className="block text-[#4FF2F2] text-sm">Admin Portal</span>
            </div>
          </Link>
        </div>

        <div className="bg-[#0F1A2A] border border-[#1E3A4A] rounded-2xl p-8 shadow-2xl shadow-[#00A6A6]/5">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-[#00363D] to-[#0E3A40] mb-4 ring-2 ring-[#00A6A6]/20">
              <Shield className="h-8 w-8 text-[#4FF2F2]" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-white mb-2">HUMINEX Global Admin</h1>
            <p className="text-[#6B8A8E] text-sm">Microsoft Entra secured access</p>
          </div>

          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-semibold text-red-300">Danger: Internal Use Only</p>
                <p className="text-xs text-red-200/90">
                  OriginX Labs / HUMINEX internal admin portal. All access attempts are captured and logged.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-[#1E3A4A] bg-[#0A0F1C] px-4 py-3 text-xs text-[#A0B4B8]">
            Employer Admin access is separate and available via <span className="font-semibold text-white">/tenant/login</span>.
          </div>

          {LOCAL_BYPASS_ENABLED && (
            <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Local Bypass Active</p>
              <p className="mt-1 text-xs text-amber-100/90">
                Localhost testing mode is enabled. Microsoft Entra popup is bypassed only in local dev.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {entraConfigError && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                {entraConfigError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#00363D] to-[#00A6A6] hover:from-[#00A6A6] hover:to-[#4FF2F2] text-white rounded-xl font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Continue with Huminex"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
