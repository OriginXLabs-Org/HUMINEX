import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NetworkBackground } from "@/components/NetworkBackground";
import huminexLogo from "@/assets/huminex-mark.svg";
import { ArrowLeft, Building2, Users } from "lucide-react";

const Auth = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <NetworkBackground />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img src={huminexLogo} alt="HUMINEX" className="h-16 w-16" />
            <div>
              <span className="text-2xl font-heading font-bold text-foreground">HUMINEX</span>
              <span className="block text-primary font-heading font-semibold text-sm">Portal Access</span>
            </div>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
              Choose Your Portal
            </h1>
            <p className="text-muted-foreground text-sm">Select one option to continue.</p>
          </div>

          <div className="space-y-4">
            <Link to="/portal/login" className="block">
              <Button variant="hero" className="w-full justify-start gap-3 h-14">
                <Users className="h-5 w-5" />
                Employee Portal
              </Button>
            </Link>
            <Link to="/tenant/login" className="block">
              <Button variant="outline" className="w-full justify-start gap-3 h-14">
                <Building2 className="h-5 w-5" />
                Employer Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
