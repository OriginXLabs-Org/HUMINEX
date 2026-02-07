import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { StatsSection } from "@/components/StatsSection";
import { AboutSection } from "@/components/AboutSection";
import { PillarsSection } from "@/components/PillarsSection";
import { DemoVideoSection } from "@/components/DemoVideoSection";
import { WhyChooseSection } from "@/components/WhyChooseSection";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PricingSection } from "@/components/PricingSection";
import { EnhancedTestimonialsSection } from "@/components/EnhancedTestimonialsSection";
import { Footer } from "@/components/Footer";
import { QuoteModal } from "@/components/QuoteModal";

const Index = () => {
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(0);

  const openHumanCandidates = [
    { name: "Aarav Mehta", role: "Junior Engineer", score: 7.8, confidence: 7.4 },
    { name: "Nisha Rao", role: "Solutions Architect", score: 8.9, confidence: 8.6 },
    { name: "Dev Khanna", role: "Backend Developer", score: 7.2, confidence: 7.0 },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveCandidate((prev) => (prev + 1) % openHumanCandidates.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [openHumanCandidates.length]);

  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HUMINEX",
    description:
      "AI-powered workforce operating system for payroll, HR, finance, enterprise operations, and startup growth. One platform from hire to retire.",
    url: "https://www.gethuminex.com",
    applicationCategory: "BusinessApplication",
    logo: "https://www.gethuminex.com/logo.png",
    sameAs: ["https://www.linkedin.com/company/originx-labs"],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-XXX-XXX-XXXX",
      contactType: "customer service",
      email: "hello@gethuminex.com",
    },
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is HUMINEX?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "HUMINEX is an AI-powered workforce operating system that unifies payroll, HR, recruitment, finance, compliance, and enterprise operations from hire to retire.",
        },
      },
      {
        "@type": "Question",
        name: "Is HUMINEX suitable for startups and enterprises?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. HUMINEX supports startup-grade speed with enterprise-grade governance, automation, and scalability.",
        },
      },
      {
        "@type": "Question",
        name: "What recruiting capabilities are coming soon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Agentic interview live panel, ATS-format resume screening, and instant interview feedback with detection insights are coming soon.",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>HUMINEX | Payroll, HR, Finance & Enterprise Workforce OS</title>
        <meta
          name="description"
          content="HUMINEX is the all-in-one AI-powered platform for payroll, HR, finance, recruitment, ATS screening, compliance, and enterprise operations. Built for startups and enterprises from hire to retire."
        />
        <meta
          name="keywords"
          content="payroll software, HR software, finance automation, enterprise HRMS, startup HR platform, one stop business solution, hire to retire software, ATS resume screening, agentic interview panel, workforce operating system"
        />
        <link rel="canonical" href="https://www.gethuminex.com" />

        <meta property="og:title" content="HUMINEX | AI Payroll, HR, Finance & Enterprise Platform" />
        <meta
          property="og:description"
          content="One-stop workforce platform for payroll, HR, finance, recruitment, compliance, and operations from hire to retire."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.gethuminex.com" />
        <meta property="og:site_name" content="HUMINEX" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="HUMINEX | Payroll, HR, Finance & Enterprise OS" />
        <meta
          name="twitter:description"
          content="AI-powered one-stop solution for payroll, HR, finance, ATS hiring, and enterprise operations."
        />

        <script type="application/ld+json">{JSON.stringify(softwareStructuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(faqStructuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header onQuoteClick={() => setQuoteModalOpen(true)} />
        <main className="pt-16 lg:pt-18">
          <article>
            <HeroSection onQuoteClick={() => setQuoteModalOpen(true)} />

            <section aria-labelledby="stats-heading">
              <StatsSection />
            </section>

            <section aria-labelledby="about-heading">
              <AboutSection />
            </section>

            <section aria-labelledby="pillars-heading">
              <PillarsSection />
            </section>

            <section aria-labelledby="demo-heading">
              <DemoVideoSection />
            </section>

            <section className="container mx-auto px-4 lg:px-8 py-14">
              <div className="rounded-3xl border border-[#005EEB]/20 bg-[radial-gradient(circle_at_top_right,_rgba(0,94,235,0.2),_rgba(15,30,58,0.95)_45%)] text-white p-8 md:p-10 overflow-hidden relative">
                <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#00C2FF]/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-16 w-60 h-60 rounded-full bg-[#0FB07A]/20 blur-3xl" />

                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9ED0FF] mb-3">OpenHuman • Interview Studio</p>
                    <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
                      Live HUMINEX Agentic Interviews with dynamic scoring intelligence
                    </h2>
                    <p className="text-white/80 max-w-2xl mb-6">
                      OpenHuman runs role-aware interview flows, evaluates confidence and technical depth in real time, and generates instant hiring scorecards with replay-ready artifacts.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 rounded-full bg-white/10 text-xs border border-white/20">2 Agentic Panelists</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/10 text-xs border border-white/20">Live Candidate Scoring</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/10 text-xs border border-white/20">Resume + Transcript Intelligence</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold">OpenHuman Live Preview</p>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-[#0FB07A]/20 border border-[#0FB07A]/30">Live</span>
                    </div>

                    <div className="rounded-xl bg-[#0F1E3A]/80 border border-white/10 p-4 mb-4">
                      <p className="text-xs text-white/70">Active Candidate</p>
                      <p className="text-lg font-semibold mt-1">{openHumanCandidates[activeCandidate].name}</p>
                      <p className="text-sm text-[#9ED0FF]">{openHumanCandidates[activeCandidate].role}</p>
                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-white/70 mb-1">
                            <span>Interview Score</span>
                            <span>{openHumanCandidates[activeCandidate].score}/10</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#00C2FF] to-[#005EEB] transition-all duration-700" style={{ width: `${openHumanCandidates[activeCandidate].score * 10}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-white/70 mb-1">
                            <span>Confidence</span>
                            <span>{openHumanCandidates[activeCandidate].confidence}/10</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#0FB07A] to-[#00C2FF] transition-all duration-700" style={{ width: `${openHumanCandidates[activeCandidate].confidence * 10}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      {openHumanCandidates.map((candidate, idx) => (
                        <div
                          key={candidate.name}
                          className={`rounded-lg border p-2 transition-all duration-500 ${
                            idx === activeCandidate ? "border-[#00C2FF]/80 bg-[#00C2FF]/15" : "border-white/10 bg-white/5"
                          }`}
                        >
                          <p className="text-[11px] text-white/80 truncate">{candidate.name.split(" ")[0]}</p>
                          <p className="text-xs font-semibold">{candidate.score}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="why-choose-heading">
              <WhyChooseSection />
            </section>

            <section aria-labelledby="comparison-heading">
              <ComparisonTable />
            </section>

            <section id="pricing" aria-labelledby="pricing-heading">
              <PricingSection />
            </section>

            <section aria-labelledby="testimonials-heading">
              <EnhancedTestimonialsSection />
            </section>
          </article>
        </main>
        <Footer />
        <QuoteModal open={quoteModalOpen} onOpenChange={setQuoteModalOpen} />
      </div>
    </>
  );
};

export default Index;
