import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface SEOLandingTemplateProps {
  title: string;
  description: string;
  keywords: string;
  canonicalPath: string;
  h1: string;
  intro: string;
  points: string[];
  useCases: string[];
}

export default function SEOLandingTemplate({
  title,
  description,
  keywords,
  canonicalPath,
  h1,
  intro,
  points,
  useCases,
}: SEOLandingTemplateProps) {
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={`https://www.gethuminex.com${canonicalPath}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://www.gethuminex.com${canonicalPath}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 lg:pt-18">
          <section className="py-16 lg:py-24 bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto px-4 lg:px-8">
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground max-w-4xl mb-6">{h1}</h1>
              <p className="text-lg text-muted-foreground max-w-3xl">{intro}</p>
            </div>
          </section>

          <section className="py-14">
            <div className="container mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-border p-6 bg-card">
                <h2 className="text-2xl font-heading font-bold mb-5">Why HUMINEX</h2>
                <div className="space-y-4">
                  {points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                      <p className="text-muted-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border p-6 bg-card">
                <h2 className="text-2xl font-heading font-bold mb-5">Built for Real Teams</h2>
                <ul className="space-y-3">
                  {useCases.map((item) => (
                    <li key={item} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
                <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-foreground">
                    Coming soon: Agentic Interview Live Panel, ATS-format resume screening, and instant interview feedback with detection insights.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-14 border-t border-border/50">
            <div className="container mx-auto px-4 lg:px-8 text-center">
              <h2 className="text-3xl font-heading font-bold mb-3">Switch to HUMINEX</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Compare HUMINEX with Workday, ADP, and legacy tools. Run payroll, HR, finance, and operations in one platform from hire to retire.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild><Link to="/pricing">View Pricing</Link></Button>
                <Button asChild variant="outline"><Link to="/get-quote">Request Demo</Link></Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
