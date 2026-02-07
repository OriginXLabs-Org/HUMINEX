import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Home, LifeBuoy, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Page Not Found | HUMINEX</title>
        <meta
          name="description"
          content="The page you are looking for does not exist. Return to HUMINEX to explore payroll, HR, finance, and enterprise operations from hire to retire."
        />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://www.gethuminex.com/404" />
      </Helmet>

      <main className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.14),transparent_35%),radial-gradient(circle_at_80%_80%,hsl(var(--accent)/0.12),transparent_35%)]" />
        <div className="relative z-10 max-w-2xl w-full rounded-3xl border border-primary/20 bg-card/90 backdrop-blur p-8 md:p-10 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">HUMINEX</p>
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-4">404</h1>
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            This route is unavailable. Continue with HUMINEX to manage payroll, HR, finance, recruitment, and enterprise operations from hire to retire.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <Button asChild size="lg" className="justify-start">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="justify-start">
              <Link to="/features">
                <SearchCheck className="h-4 w-4 mr-2" />
                Explore Features
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="justify-start">
              <Link to="/pricing">
                <ArrowLeft className="h-4 w-4 mr-2" />
                View Pricing
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="justify-start">
              <Link to="/contact">
                <LifeBuoy className="h-4 w-4 mr-2" />
                Contact HUMINEX
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">Live site: https://www.gethuminex.com</p>
        </div>
      </main>
    </>
  );
};

export default NotFound;
