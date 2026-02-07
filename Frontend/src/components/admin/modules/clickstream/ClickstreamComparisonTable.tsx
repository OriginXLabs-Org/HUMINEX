import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Minus, Crown, Zap, Shield, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    category: "Core Tracking",
    items: [
      { feature: "Page View Tracking", huminex: true, glassbox: true, fullstory: true },
      { feature: "Click Tracking", huminex: true, glassbox: true, fullstory: true },
      { feature: "Scroll Depth Tracking", huminex: true, glassbox: true, fullstory: true },
      { feature: "Session Recording", huminex: true, glassbox: true, fullstory: true },
      { feature: "IP Geolocation", huminex: true, glassbox: true, fullstory: true },
      { feature: "User Identity Linking", huminex: true, glassbox: true, fullstory: true },
    ],
  },
  {
    category: "Struggle Detection",
    items: [
      { feature: "Rage Click Detection", huminex: true, glassbox: true, fullstory: true },
      { feature: "Dead Click Detection", huminex: true, glassbox: true, fullstory: true },
      { feature: "Form Abandonment Tracking", huminex: true, glassbox: true, fullstory: true },
      { feature: "AI-Powered Analysis", huminex: true, glassbox: true, fullstory: true },
      { feature: "Real-time Alerts", huminex: true, glassbox: true, fullstory: true },
      { feature: "Frustration Score", huminex: true, glassbox: true, fullstory: "partial" },
    ],
  },
  {
    category: "Form Analytics",
    items: [
      { feature: "Field-Level Tracking", huminex: true, glassbox: true, fullstory: true },
      { feature: "Time Spent Per Field", huminex: true, glassbox: true, fullstory: true },
      { feature: "Field Error Rate", huminex: true, glassbox: true, fullstory: true },
      { feature: "Field Abandonment Rate", huminex: true, glassbox: true, fullstory: "partial" },
      { feature: "Form Completion Funnel", huminex: true, glassbox: true, fullstory: true },
      { feature: "Input Validation Insights", huminex: true, glassbox: true, fullstory: "partial" },
    ],
  },
  {
    category: "Advanced Analytics",
    items: [
      { feature: "Conversion Funnels", huminex: true, glassbox: true, fullstory: true },
      { feature: "User Journey Mapping", huminex: true, glassbox: true, fullstory: true },
      { feature: "Heatmaps", huminex: true, glassbox: true, fullstory: true },
      { feature: "A/B Test Integration", huminex: true, glassbox: true, fullstory: true },
      { feature: "Revenue Attribution", huminex: false, glassbox: true, fullstory: true },
      { feature: "Predictive Analytics", huminex: true, glassbox: true, fullstory: "partial" },
    ],
  },
  {
    category: "Data & Privacy",
    items: [
      { feature: "Self-Hosted Option", huminex: true, glassbox: false, fullstory: false },
      { feature: "Full Data Ownership", huminex: true, glassbox: false, fullstory: false },
      { feature: "GDPR Compliance", huminex: true, glassbox: true, fullstory: true },
      { feature: "Data Masking", huminex: true, glassbox: true, fullstory: true },
      { feature: "Privacy Controls", huminex: true, glassbox: true, fullstory: true },
      { feature: "Custom Retention Policies", huminex: true, glassbox: "partial", fullstory: "partial" },
    ],
  },
  {
    category: "Integration & Customization",
    items: [
      { feature: "Native Platform Integration", huminex: true, glassbox: false, fullstory: false },
      { feature: "API Access", huminex: true, glassbox: true, fullstory: true },
      { feature: "Webhook Support", huminex: true, glassbox: true, fullstory: true },
      { feature: "Custom Events", huminex: true, glassbox: true, fullstory: true },
      { feature: "White-Label Option", huminex: true, glassbox: "partial", fullstory: false },
      { feature: "Source Code Access", huminex: true, glassbox: false, fullstory: false },
    ],
  },
];

const renderStatus = (status: boolean | string) => {
  if (status === true) {
    return <Check className="h-5 w-5 text-green-600" />;
  }
  if (status === false) {
    return <X className="h-5 w-5 text-red-500" />;
  }
  if (status === "partial") {
    return <Minus className="h-5 w-5 text-amber-500" />;
  }
  return null;
};

export const ClickstreamComparisonTable = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">HUMINEX ClickStream vs Industry Leaders</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          See how HUMINEX's built-in analytics compares to enterprise solutions like Glassbox and FullStory
        </p>
      </div>

      {/* Pricing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary border-2 relative overflow-hidden">
            <div className="absolute top-0 right-0">
              <Badge className="rounded-none rounded-bl-lg">INCLUDED</Badge>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                HUMINEX ClickStream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">$0</p>
              <p className="text-sm text-muted-foreground">Included with HUMINEX</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>Self-hosted, full data ownership</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>AI-powered insights included</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Glassbox</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$50k+</p>
              <p className="text-sm text-muted-foreground">Per year (enterprise)</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  <span>Session-based pricing</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-red-500" />
                  <span>No self-hosting option</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">FullStory</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$30k+</p>
              <p className="text-sm text-muted-foreground">Per year (business)</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  <span>Session-based pricing</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-red-500" />
                  <span>No self-hosting option</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Feature Comparison */}
      {features.map((category, categoryIdx) => (
        <motion.div
          key={category.category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: categoryIdx * 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{category.category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Feature</TableHead>
                      <TableHead className="text-center w-[120px]">
                        <div className="flex items-center justify-center gap-1">
                          <Crown className="h-4 w-4 text-primary" />
                          HUMINEX
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[120px]">Glassbox</TableHead>
                      <TableHead className="text-center w-[120px]">FullStory</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.items.map((item) => (
                      <TableRow key={item.feature}>
                        <TableCell className="font-medium">{item.feature}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">{renderStatus(item.huminex)}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">{renderStatus(item.glassbox)}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">{renderStatus(item.fullstory)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span>Full Support</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="h-4 w-4 text-amber-500" />
          <span>Partial Support</span>
        </div>
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-red-500" />
          <span>Not Available</span>
        </div>
      </div>

      {/* Key Differentiators */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Why HUMINEX ClickStream?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Data Sovereignty
              </h4>
              <p className="text-sm text-muted-foreground">
                Your data stays in your infrastructure. No third-party data processing or storage concerns.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Zero Additional Cost
              </h4>
              <p className="text-sm text-muted-foreground">
                Included with HUMINEX platform. No per-session pricing that scales unpredictably.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                Native Integration
              </h4>
              <p className="text-sm text-muted-foreground">
                Seamlessly integrated with HUMINEX workflows, users, and operational data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
