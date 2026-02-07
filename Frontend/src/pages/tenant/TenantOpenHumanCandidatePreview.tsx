import React from "react";
import { useSearchParams } from "react-router-dom";
import { Video, Mic, Wifi, Camera, Volume2, ShieldCheck, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TenantOpenHumanCandidatePreview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const candidate = searchParams.get("candidate") || "Candidate";
  const role = searchParams.get("role") || "Technical Role";

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1E3A]">Candidate Interview Preview</h1>
        <p className="text-sm text-[#6B7280] mt-1">Admin simulation of candidate-side OpenHuman experience</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0F1E3A]">{candidate} • {role}</p>
            <p className="text-xs text-[#6B7280] mt-1">Join 5-10 minutes before start. Precheck takes 2-5 minutes.</p>
          </div>
          <Badge className="bg-[#005EEB]/10 text-[#005EEB] border border-[#005EEB]/20">Candidate View Demo</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Live Camera and Interview Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0F1E3A] to-[#1E2D4A] p-4 min-h-[320px] text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm"><Video className="w-4 h-4" /> Candidate Camera</div>
                <Badge className="bg-white/10 text-white border border-white/20">Ready</Badge>
              </div>
              <div className="h-[250px] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-8 h-8 mx-auto mb-2 text-[#00C2FF]" />
                  <p className="text-sm">Camera preview (demo)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">System Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Network", icon: Wifi },
              { label: "Microphone", icon: Mic },
              { label: "Speaker", icon: Volume2 },
              { label: "Camera", icon: Camera },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#005EEB]" />
                    <span className="text-sm text-[#0F1E3A]">{item.label}</span>
                  </div>
                  <Badge className="bg-[#0FB07A]/10 text-[#0FB07A] border border-[#0FB07A]/20">Passed</Badge>
                </div>
              );
            })}
            <Button className="w-full mt-2 gap-2 bg-[#005EEB] hover:bg-[#004ACC]" onClick={() => toast.success("Candidate interview started (demo)")}>
              <PlayCircle className="w-4 h-4" /> Start Interview
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Candidate Notices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#4B5563]">
          <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#005EEB]" /> Your interview is recorded for quality and hiring review.</p>
          <p>Questions are dynamic based on resume, role, and your responses during the interview.</p>
          <p>Behavioral metrics include confidence, speaking clarity, and attention signals.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantOpenHumanCandidatePreview;
