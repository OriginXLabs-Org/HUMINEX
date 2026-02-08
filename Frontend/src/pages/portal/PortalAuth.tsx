import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { platformClient as platform } from "@/integrations/platform/client";
import { getEntraConfigError } from "@/integrations/auth/entra";
import huminexLogo from "@/assets/huminex-mark.svg";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  UserCircle2,
  Wallet,
  FileText,
  CalendarDays,
  Shield,
  Sparkles,
  TrendingUp,
  Users2,
  Building2,
} from "lucide-react";
import { z } from "zod";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid work email address"),
});
const PORTAL_REDIRECT_URI =
  (import.meta.env.VITE_AZURE_AD_PORTAL_REDIRECT_URI as string | undefined)
  ?? window.location.origin + "/portal/login";

const PortalAuth = () => {
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [entraConfigError, setEntraConfigError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    setEntraConfigError(getEntraConfigError());

    const { data: { subscription } } = platform.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        navigate("/portal");
      }
    });

    platform.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/portal");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const configError = getEntraConfigError();
      if (configError) {
        toast.error(configError);
        return;
      }

      const validated = loginSchema.parse({ email: formData.email });

      const { error } = await platform.auth.signInWithPassword({
        email: validated.email,
        password: "microsoft-entra",
        portal: "default",
        redirectUri: PORTAL_REDIRECT_URI,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Welcome back to HUMINEX Employee Portal!");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[640px] h-[640px] bg-gradient-to-br from-[#005EEB]/15 to-[#00C2FF]/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[640px] h-[640px] bg-gradient-to-tr from-[#0F1E3A]/10 to-[#005EEB]/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#0F1E3A] transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_540px_1fr] gap-6 items-stretch">
          <div className="hidden xl:block bg-gradient-to-br from-[#0F1E3A] to-[#1E2D4A] text-white rounded-2xl p-6 border border-white/10 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9ED0FF] mb-4">HUMINEX • Employee Experience</p>
            <h2 className="text-2xl font-bold mb-3">Everything an employee needs in one workspace</h2>
            <p className="text-sm text-white/80 mb-6">
              Access payslips, benefits, insurance, profile, hierarchy, announcements, and company documents from one clean employee portal.
            </p>
            <div className="space-y-3">
              {[
                "Role-aligned visibility with secure access controls",
                "Monthly payslips, tax and finance cards in one place",
                "Benefits, insurance and policy documents always accessible",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm animate-fade-in-up">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#0FB07A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-[#0F1E3A]/5 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#005EEB] via-[#00C2FF] to-[#005EEB]" />

            <div className="text-center mb-8">
              <Link to="/" className="inline-flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#005EEB]/20 rounded-2xl blur-xl scale-150" />
                  <img src={huminexLogo} alt="HUMINEX" className="h-16 w-16 relative z-10" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-[#0F1E3A]">HUMINEX</span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[#005EEB] font-semibold text-sm">Employee Portal</span>
                  </div>
                </div>
              </Link>
            </div>

            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#005EEB]/10 to-[#00C2FF]/10 flex items-center justify-center mx-auto mb-4">
                <UserCircle2 className="w-7 h-7 text-[#005EEB]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0F1E3A] mb-2">Welcome to Employee Portal</h1>
              <p className="text-[#6B7280] text-sm">
                For employees, managers, HR, finance, and leadership users.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6 text-xs text-[#6B7280]">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0FB07A]" />
                <span>Secure Login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#005EEB]" />
                <span>Personalized View</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {entraConfigError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {entraConfigError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#0F1E3A] text-sm font-medium">Work Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] group-focus-within:text-[#005EEB] transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-[#005EEB] focus:ring-[#005EEB]/20 transition-all"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#005EEB] hover:bg-[#0047B3] text-white rounded-xl font-medium shadow-lg shadow-[#005EEB]/20 transition-all hover:shadow-xl hover:shadow-[#005EEB]/30"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in to Huminex...
                  </>
                ) : (
                  "Continue with Huminex"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
              <p className="text-center text-xs text-[#9CA3AF]">
                Looking for the{" "}
                <Link to="/tenant/login" className="text-[#6B7280] hover:text-[#005EEB] transition-colors">
                  Employer Portal
                </Link>
                ?
              </p>
            </div>

            <p className="text-center text-xs text-[#9CA3AF] mt-6">
              By continuing, you agree to our{" "}
              <a href="#" className="text-[#6B7280] hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-[#6B7280] hover:underline">Privacy Policy</a>
            </p>
          </div>

          <div className="hidden xl:block bg-gradient-to-br from-white to-[#F3F7FF] rounded-2xl p-6 border border-[#005EEB]/15 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-[#005EEB] mb-4">Employee Insights</p>
            <h2 className="text-xl font-bold text-[#0F1E3A] mb-3">Live cards for everyday employee tasks</h2>
            <p className="text-sm text-[#6B7280] mb-5">
              Built to be simple and fast for day-to-day usage with clear cards and mobile-friendly navigation.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-3 animate-fade-in-up">
                <Wallet className="w-5 h-5 text-[#005EEB]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F1E3A]">Payroll & Payslips</p>
                  <p className="text-xs text-[#6B7280]">Month and year wise salary details and downloads</p>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-3 animate-fade-in-up">
                <FileText className="w-5 h-5 text-[#8B5CF6]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F1E3A]">Documents & Benefits</p>
                  <p className="text-xs text-[#6B7280]">Insurance, benefits and company documents access</p>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-3 animate-fade-in-up">
                <CalendarDays className="w-5 h-5 text-[#0FB07A]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F1E3A]">Attendance & Leave</p>
                  <p className="text-xs text-[#6B7280]">Quick leave apply and attendance summaries</p>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-3 animate-fade-in-up">
                <TrendingUp className="w-5 h-5 text-[#FFB020]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F1E3A]">Performance & Growth</p>
                  <p className="text-xs text-[#6B7280]">Role-aligned dashboards and growth visibility</p>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-3 animate-fade-in-up">
                <Users2 className="w-5 h-5 text-[#0F1E3A]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F1E3A]">Hierarchy & Team Map</p>
                  <p className="text-xs text-[#6B7280]">Manager chain and team context visibility</p>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-3 animate-fade-in-up">
                <Building2 className="w-5 h-5 text-[#005EEB]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F1E3A]">One Company Workspace</p>
                  <p className="text-xs text-[#6B7280]">Unified employee experience powered by HUMINEX</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        portalType="employee"
      />
    </div>
  );
};

export default PortalAuth;
