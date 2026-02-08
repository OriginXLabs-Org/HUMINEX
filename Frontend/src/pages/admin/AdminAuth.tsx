import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { platformClient as platform } from "@/integrations/platform/client";
import { getEntraConfigError } from "@/integrations/auth/entra";
import { huminexApi } from "@/integrations/api/client";
import huminexLogo from "@/assets/huminex-mark.svg";
import { ArrowLeft, Loader2, Mail, Shield } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid admin email"),
});

const ADMIN_ROLES = new Set(["admin", "super_admin", "director"]);

const AdminAuth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [entraConfigError, setEntraConfigError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setEntraConfigError(getEntraConfigError());

    const syncSession = async () => {
      const { data: { session } } = await platform.auth.getSession();
      if (!session?.user) return;

      try {
        const me = await huminexApi.me();
        const role = (me.role || "").toLowerCase();
        if (ADMIN_ROLES.has(role)) {
          navigate("/admin", { replace: true });
        }
      } catch {
        // Ignore and stay on login page.
      }
    };

    syncSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const configError = getEntraConfigError();
      if (configError) {
        toast.error(configError);
        return;
      }

      const validated = loginSchema.parse({ email });

      const { error } = await platform.auth.signInWithPassword({
        email: validated.email,
        password: "microsoft-entra",
      });

      if (error) {
        toast.error(error.message || "Unable to authenticate with Microsoft Entra");
        return;
      }

      const me = await huminexApi.me();
      const role = (me.role || "").toLowerCase();
      if (!ADMIN_ROLES.has(role)) {
        await platform.auth.signOut();
        toast.error("Access denied. Admin privileges are required.");
        return;
      }

      toast.success("Welcome to HUMINEX Admin Portal");
      navigate("/admin", { replace: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error("Authentication failed. Please try again.");
      }
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

          <form onSubmit={handleLogin} className="space-y-5">
            {entraConfigError && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                {entraConfigError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#A0B4B8]">Admin Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B8A8E] group-focus-within:text-[#4FF2F2] transition-colors" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@gethuminex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-[#0A0F1C] border-[#1E3A4A] text-white placeholder:text-[#4A5A6A] focus:border-[#00A6A6] focus:ring-[#00A6A6]/20 rounded-xl"
                  required
                />
              </div>
            </div>

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
