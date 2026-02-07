import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const Pricing = () => {
  return (
    <>
      <Helmet>
        <title>HUMINEX Pricing - Startup Friendly Workforce OS</title>
        <meta
          name="description"
          content="HUMINEX startup-friendly pricing for payroll, HR, compliance, and OpenHuman AI hiring. Transparent plans, no hidden fees, India-compliant billing and GST-ready invoicing."
        />
        <meta
          name="keywords"
          content="HUMINEX pricing, payroll software pricing, HR software pricing India, enterprise HRMS pricing, Razorpay subscription billing, GST invoice automation"
        />
        <link rel="canonical" href="https://www.gethuminex.com/pricing" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "HUMINEX Workforce Operating System",
            description: "Workforce OS for payroll, HR, finance, compliance and AI interviews",
            brand: {
              "@type": "Brand",
              name: "HUMINEX"
            },
            offers: [
              {
                "@type": "Offer",
                name: "Startup",
                price: "199",
                priceCurrency: "INR",
                availability: "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                name: "Growth",
                price: "349",
                priceCurrency: "INR",
                availability: "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                name: "Enterprise",
                price: "499",
                priceCurrency: "INR",
                availability: "https://schema.org/InStock"
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-16 lg:pt-18">
          <section className="py-12 lg:py-16 bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground mb-6">
                One Workforce OS. Simple, Transparent Pricing.
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Manage payroll, people, compliance, and AI hiring - without hidden fees or long-term lock-ins.
              </p>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-green-500/10 text-green-700 dark:text-green-300 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                30-day free trial - No credit card required
              </div>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button asChild>
                  <a href="/get-quote">Get Started</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#plans">Compare Plans</a>
                </Button>
              </div>
            </div>
          </section>

          <section id="plans" className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-heading font-bold text-center mb-8">Pricing Plans</h2>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border bg-card p-6">
                  <p className="text-green-600 font-semibold mb-2">Startup</p>
                  <p className="text-muted-foreground mb-3">For early teams getting started</p>
                  <p className="text-3xl font-bold mb-1">₹199</p>
                  <p className="text-sm text-muted-foreground mb-3">/ employee / month</p>
                  <p className="text-sm mb-4"><strong>Best for:</strong> 5-50 employees</p>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>Employee & org management</li>
                    <li>Payroll processing</li>
                    <li>Payslips & salary reports</li>
                    <li>Leave & attendance</li>
                    <li>Statutory compliance (basic)</li>
                    <li>Email support</li>
                  </ul>
                  <p className="text-xs mt-4 text-foreground">Perfect for founders who want payroll done right from Day 1.</p>
                </div>

                <div className="rounded-2xl border-2 border-primary bg-card p-6">
                  <p className="text-blue-600 font-semibold mb-2">Growth</p>
                  <p className="text-muted-foreground mb-3">For scaling teams</p>
                  <p className="text-3xl font-bold mb-1">₹349</p>
                  <p className="text-sm text-muted-foreground mb-3">/ employee / month</p>
                  <p className="text-sm mb-4"><strong>Best for:</strong> 50-300 employees</p>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>Everything in Startup</li>
                    <li>Advanced payroll rules</li>
                    <li>Multi-location payroll</li>
                    <li>Approval workflows</li>
                    <li>Audit logs</li>
                    <li>API access</li>
                    <li>Priority support</li>
                  </ul>
                  <p className="text-xs mt-4 text-foreground">Built for teams scaling fast without breaking processes.</p>
                </div>

                <div className="rounded-2xl border bg-card p-6">
                  <p className="text-purple-600 font-semibold mb-2">Enterprise</p>
                  <p className="text-muted-foreground mb-3">For large & regulated organizations</p>
                  <p className="text-lg font-semibold mb-1">Custom pricing (annual contract)</p>
                  <p className="text-sm text-muted-foreground mb-3">Starts at ₹499 / employee / month</p>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>All Growth features</li>
                    <li>Enterprise SSO (Entra ID)</li>
                    <li>Custom workflows & policies</li>
                    <li>SLA (99.9%)</li>
                    <li>Dedicated onboarding & support</li>
                    <li>Compliance customization</li>
                  </ul>
                  <p className="text-xs mt-4 text-foreground">Designed for enterprises that need security, scale, and reliability.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-8 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-heading font-bold mb-4">AI Add-Ons (OpenHuman Interviews)</h2>
              <p className="text-muted-foreground mb-4">AI is priced separately to keep your payroll costs predictable.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-5">
                  <p className="font-semibold mb-2">AI Credits</p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>₹500 = 50 AI credits</li>
                    <li>1 interview = 1 credit</li>
                    <li>Resume screening = 0.5 credit</li>
                  </ul>
                </div>
                <div className="rounded-xl border bg-card p-5">
                  <p className="font-semibold mb-2">Alternative Usage</p>
                  <p className="text-sm text-muted-foreground">₹129 per AI interview</p>
                  <p className="text-xs mt-3 text-foreground">Pay only for what you use.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-8">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-heading font-bold mb-4">Free Trial</h2>
              <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <li>30 days full access</li>
                <li>No credit card required</li>
                <li>Trial watermark</li>
                <li>Limited AI credits included</li>
              </ul>
              <p className="mt-6 text-sm">
                <strong>No setup fees. No hidden charges. Cancel anytime.</strong> Annual plans get up to 20% discount.
              </p>
            </div>
          </section>

          <section className="py-10 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-heading font-bold mb-4">HUMINEX vs Competitors</h2>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-left">Platform</th>
                      <th className="px-4 py-3 text-left">Pricing Model</th>
                      <th className="px-4 py-3 text-left">Typical Cost</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t"><td className="px-4 py-3">Keka</td><td className="px-4 py-3">Per employee</td><td className="px-4 py-3">₹300-₹500</td><td className="px-4 py-3">India-focused</td></tr>
                    <tr className="border-t"><td className="px-4 py-3">Zoho People</td><td className="px-4 py-3">Per user + modules</td><td className="px-4 py-3">₹200-₹600</td><td className="px-4 py-3">Fragmented</td></tr>
                    <tr className="border-t"><td className="px-4 py-3">Rippling</td><td className="px-4 py-3">Per employee + add-ons</td><td className="px-4 py-3">$8-$20</td><td className="px-4 py-3">US-focused</td></tr>
                    <tr className="border-t"><td className="px-4 py-3">Workday</td><td className="px-4 py-3">Enterprise contract</td><td className="px-4 py-3">$$$$</td><td className="px-4 py-3">Heavy & slow</td></tr>
                    <tr className="border-t bg-primary/5"><td className="px-4 py-3 font-semibold">HUMINEX</td><td className="px-4 py-3 font-semibold">Per employee + AI add-on</td><td className="px-4 py-3 font-semibold">₹199-₹499</td><td className="px-4 py-3 font-semibold">Unified Workforce OS</td></tr>
                  </tbody>
                </table>
              </div>
              <ul className="mt-4 text-sm text-muted-foreground space-y-1">
                <li>One platform (not 10 modules)</li>
                <li>Startup-friendly pricing</li>
                <li>AI interviews included (add-on)</li>
                <li>Azure-grade security</li>
              </ul>
            </div>
          </section>

          <section className="py-10">
            <div className="container mx-auto px-4 space-y-6">
              <h2 className="text-2xl font-heading font-bold">Billing & Invoicing Highlights</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-5">
                  <p className="font-semibold mb-2">Simple subscription model</p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>Per employee per month billing</li>
                    <li>30-day free trial with no card</li>
                    <li>Transparent monthly and annual plans</li>
                  </ul>
                </div>
                <div className="rounded-xl border bg-card p-5">
                  <p className="font-semibold mb-2">India-ready invoicing</p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>GST-ready invoice generation</li>
                    <li>Automated PDF invoice delivery</li>
                    <li>Razorpay-powered subscription billing</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Pricing;
