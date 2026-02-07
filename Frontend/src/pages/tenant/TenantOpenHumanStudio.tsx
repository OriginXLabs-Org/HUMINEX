import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Brain,
  Video,
  Mic,
  Sparkles,
  Download,
  FileDown,
  Clock3,
  Gauge,
  PlayCircle,
  PauseCircle,
  Users,
  CheckCircle2,
  CalendarClock,
  Mail,
  Wifi,
  Camera,
  Volume2,
  Scan,
  Search,
  Archive,
  UserRound,
  ExternalLink,
  FileText,
  Filter,
  UserX,
  RefreshCcw,
  Link2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type CandidateStatus = "scheduled" | "completed" | "in_progress" | "archived" | "not_attended";

type InterviewRecord = {
  happenedAt: string;
  score: number;
  round: string;
  summary: string;
  transcriptRef: string;
  videoRef: string;
  analysis: {
    technical: number;
    communication: number;
    behavioral: number;
    confidence: number;
    eyeContact: number;
  };
};

type CandidateRecord = {
  id: string;
  name: string;
  email: string;
  position: string;
  category: "Engineering" | "Data" | "Security" | "Product";
  experienceYears: number;
  nextInterviewAt: string;
  status: CandidateStatus;
  resumeFileName: string;
  resumeType: "pdf" | "doc" | "docx";
  resumeUrl?: string;
  inviteIssuedAt?: string;
  inviteExpiresAt?: string;
  interviews: InterviewRecord[];
};

const scoringTimeline = [
  { minute: "00:30", score: 6.8, topic: "Introduction" },
  { minute: "02:00", score: 7.4, topic: "Architecture fundamentals" },
  { minute: "04:30", score: 8.1, topic: "System design" },
  { minute: "07:00", score: 7.7, topic: "Scenario-based debugging" },
  { minute: "09:20", score: 8.4, topic: "Leadership and tradeoffs" },
];

const artifacts = [
  { label: "Session Recording", detail: "video/openhuman-session-2026-02-07.mp4" },
  { label: "Transcript", detail: "text/interview-transcript-2026-02-07.txt" },
  { label: "Question Trail", detail: "json/dynamic-question-graph.json" },
  { label: "Scoring Packet", detail: "pdf/final-evaluation-report.pdf" },
];

const initialCandidates: CandidateRecord[] = [
  {
    id: "cand-1",
    name: "Aarav Mehta",
    email: "aarav.mehta@candidate.dev",
    position: "Senior Engineer",
    category: "Engineering",
    experienceYears: 6,
    nextInterviewAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    status: "scheduled",
    resumeFileName: "Aarav_Mehta_Resume.pdf",
    resumeType: "pdf",
    inviteIssuedAt: new Date().toISOString(),
    inviteExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    interviews: [],
  },
  {
    id: "cand-2",
    name: "Nisha Rao",
    email: "nisha.rao@candidate.dev",
    position: "Solutions Architect",
    category: "Engineering",
    experienceYears: 11,
    nextInterviewAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    resumeFileName: "Nisha_Rao_Architect.docx",
    resumeType: "docx",
    interviews: [
      {
        happenedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        score: 8.6,
        round: "Technical + Behavioral",
        summary: "Strong system design depth with excellent stakeholder communication.",
        transcriptRef: "transcript/nisha-rao-round1.txt",
        videoRef: "recordings/nisha-rao-round1.mp4",
        analysis: {
          technical: 9.1,
          communication: 8.4,
          behavioral: 8.5,
          confidence: 8.7,
          eyeContact: 8.2,
        },
      },
    ],
  },
  {
    id: "cand-3",
    name: "Dev Khanna",
    email: "dev.khanna@candidate.dev",
    position: "Junior Backend Developer",
    category: "Data",
    experienceYears: 2,
    nextInterviewAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled",
    resumeFileName: "Dev_Khanna_Junior.pdf",
    resumeType: "pdf",
    inviteIssuedAt: new Date().toISOString(),
    inviteExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    interviews: [],
  },
  {
    id: "cand-4",
    name: "Ishita Verma",
    email: "ishita.verma@candidate.dev",
    position: "Security Engineer",
    category: "Security",
    experienceYears: 5,
    nextInterviewAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    resumeFileName: "Ishita_Verma_Security.doc",
    resumeType: "doc",
    interviews: [
      {
        happenedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        score: 7.9,
        round: "Technical",
        summary: "Good security fundamentals; needs stronger cloud threat modeling details.",
        transcriptRef: "transcript/ishita-verma-round1.txt",
        videoRef: "recordings/ishita-verma-round1.mp4",
        analysis: {
          technical: 8.1,
          communication: 7.7,
          behavioral: 7.6,
          confidence: 7.8,
          eyeContact: 7.2,
        },
      },
    ],
  },
  {
    id: "cand-5",
    name: "Rohan Das",
    email: "rohan.das@candidate.dev",
    position: "Platform Engineer",
    category: "Engineering",
    experienceYears: 4,
    nextInterviewAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: "not_attended",
    resumeFileName: "Rohan_Das_Platform.pdf",
    resumeType: "pdf",
    inviteIssuedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    inviteExpiresAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    interviews: [],
  },
];

const precheckSteps = [
  { key: "network", label: "Network stability", icon: Wifi },
  { key: "audio", label: "Microphone and speaker test", icon: Volume2 },
  { key: "video", label: "Camera and lighting check", icon: Camera },
  { key: "screen", label: "Environment screenshot quality", icon: Scan },
] as const;

const toDateTimeInputValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const isOlderThan30Days = (dateStr: string) => {
  const eventDate = new Date(dateStr).getTime();
  return Date.now() - eventDate > 30 * 24 * 60 * 60 * 1000;
};

const withArchiveStatus = (candidate: CandidateRecord): CandidateRecord => {
  if (candidate.status === "completed" && candidate.interviews[0] && isOlderThan30Days(candidate.interviews[0].happenedAt)) {
    return { ...candidate, status: "archived" };
  }
  return candidate;
};

const TenantOpenHumanStudio: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [questionMode, setQuestionMode] = useState<"dynamic" | "fixed">("dynamic");
  const [isLive, setIsLive] = useState(true);

  const [candidates, setCandidates] = useState<CandidateRecord[]>(initialCandidates.map(withArchiveStatus));
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(initialCandidates[0].id);

  const [candidateName, setCandidateName] = useState("Aarav Mehta");
  const [candidateRole, setCandidateRole] = useState("Senior Engineer");
  const [candidateEmail, setCandidateEmail] = useState("candidate@gethuminex.com");
  const [candidateExperience, setCandidateExperience] = useState("5");
  const [scheduleAt, setScheduleAt] = useState("");

  const [sendingInvite, setSendingInvite] = useState(false);
  const [precheckRunning, setPrecheckRunning] = useState(false);
  const [precheckDone, setPrecheckDone] = useState(false);
  const [precheckIndex, setPrecheckIndex] = useState(-1);

  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const [resumePreviewType, setResumePreviewType] = useState<"pdf" | "doc" | "docx" | null>(null);
  const [resumePreviewName, setResumePreviewName] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "next7" | "next30">("all");

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) || candidates[0],
    [candidates, selectedCandidateId]
  );
  const latestInterview = selectedCandidate?.interviews[0];
  const isCompletedCandidate = selectedCandidate?.status === "completed" || selectedCandidate?.status === "archived";
  const isNotAttendedCandidate = selectedCandidate?.status === "not_attended";
  const isInviteExpired = selectedCandidate?.inviteExpiresAt ? new Date(selectedCandidate.inviteExpiresAt).getTime() < Date.now() : false;
  const canReschedule = isNotAttendedCandidate || (selectedCandidate?.status === "scheduled" && isInviteExpired);
  const canTriggerCredentialEmail = !isCompletedCandidate && !isInviteExpired;

  useEffect(() => {
    return () => {
      if (resumePreviewUrl) {
        URL.revokeObjectURL(resumePreviewUrl);
      }
    };
  }, [resumePreviewUrl]);

  useEffect(() => {
    const candidate = searchParams.get("candidate");
    const role = searchParams.get("role");
    const email = searchParams.get("email");
    const experience = searchParams.get("experience");

    if (candidate) setCandidateName(candidate);
    if (role) setCandidateRole(role);
    if (email) setCandidateEmail(email);
    if (experience) setCandidateExperience(experience);
  }, [searchParams]);

  useEffect(() => {
    const defaultSchedule = new Date(Date.now() + 24 * 60 * 60 * 1000);
    defaultSchedule.setMinutes(0, 0, 0);
    setScheduleAt(toDateTimeInputValue(defaultSchedule));
  }, []);

  useEffect(() => {
    if (!selectedCandidate) return;
    setCandidateName(selectedCandidate.name);
    setCandidateRole(selectedCandidate.position);
    setCandidateEmail(selectedCandidate.email);
    setCandidateExperience(String(selectedCandidate.experienceYears));
    setScheduleAt(toDateTimeInputValue(new Date(selectedCandidate.nextInterviewAt)));
    setResumePreviewUrl(selectedCandidate.resumeUrl || null);
    setResumePreviewType(selectedCandidate.resumeType);
    setResumePreviewName(selectedCandidate.resumeFileName);
  }, [selectedCandidate?.id]);

  const averageScore = useMemo(
    () => (scoringTimeline.reduce((acc, item) => acc + item.score, 0) / scoringTimeline.length).toFixed(1),
    []
  );

  const roleTrack = useMemo(() => {
    const years = Number(candidateExperience || "0");
    if (years <= 2) return "Junior Technical Track";
    if (years <= 5) return "Mid-Level Technical Track";
    if (years <= 9) return "Senior Technical Track";
    return "Architect Technical Track";
  }, [candidateExperience]);

  const positionOptions = useMemo(
    () => Array.from(new Set(candidates.map((candidate) => candidate.position))),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch =
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPosition = positionFilter === "all" || candidate.position === positionFilter;
      const matchesCategory = categoryFilter === "all" || candidate.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;

      const scheduledDate = new Date(candidate.nextInterviewAt);
      const now = new Date();
      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);
      const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const matchesTime =
        timeFilter === "all" ||
        (timeFilter === "today" && scheduledDate >= now && scheduledDate <= dayEnd) ||
        (timeFilter === "next7" && scheduledDate >= now && scheduledDate <= next7) ||
        (timeFilter === "next30" && scheduledDate >= now && scheduledDate <= next30);

      return matchesSearch && matchesPosition && matchesCategory && matchesStatus && matchesTime;
    });
  }, [candidates, searchTerm, positionFilter, categoryFilter, statusFilter, timeFilter]);

  const scheduleMin = toDateTimeInputValue(new Date());

  const runPrecheck = async () => {
    setPrecheckRunning(true);
    setPrecheckDone(false);

    for (let i = 0; i < precheckSteps.length; i += 1) {
      setPrecheckIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    setPrecheckRunning(false);
    setPrecheckDone(true);
    setPrecheckIndex(precheckSteps.length - 1);
    toast.success("Precheck complete: candidate environment validated");
  };

  const scheduleInterview = async () => {
    if (isCompletedCandidate) {
      toast.info("Completed interviews cannot be scheduled again. Use archive actions if needed.");
      return;
    }

    const scheduledDate = new Date(scheduleAt);
    const now = new Date();

    if (!candidateName || !candidateRole || !candidateEmail || !scheduleAt) {
      toast.error("Please fill candidate, role, email and schedule date/time");
      return;
    }

    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate < now) {
      toast.error("Interview schedule must be current or future date/time");
      return;
    }

    setSendingInvite(true);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    setSendingInvite(false);
    const inviteIssuedAt = new Date();
    const inviteExpiresAt = new Date(inviteIssuedAt.getTime() + 48 * 60 * 60 * 1000);

    setCandidates((prev) => {
      const existing = prev.find((candidate) => candidate.id === selectedCandidateId);
      if (!existing) return prev;
      return prev.map((candidate) =>
        candidate.id === selectedCandidateId
          ? {
              ...candidate,
              name: candidateName,
              email: candidateEmail,
              position: candidateRole,
              experienceYears: Number(candidateExperience) || candidate.experienceYears,
              nextInterviewAt: scheduledDate.toISOString(),
              status: "scheduled",
              inviteIssuedAt: inviteIssuedAt.toISOString(),
              inviteExpiresAt: inviteExpiresAt.toISOString(),
            }
          : candidate
      );
    });

    toast.success(
      `Invite sent to ${candidateEmail} with OpenHuman link and credentials. Candidate should join 5-10 minutes before ${scheduledDate.toLocaleString()}.`
    );
  };

  const markInterviewCompleted = () => {
    if (!selectedCandidate || isCompletedCandidate) return;

    const nowIso = new Date().toISOString();
    const generatedScore = Number((7.4 + Math.random() * 1.8).toFixed(1));

    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === selectedCandidate.id
          ? {
              ...candidate,
              status: "completed",
              interviews: [
                {
                  happenedAt: nowIso,
                  score: generatedScore,
                  round: "Technical + Behavioral",
                  summary: "Demonstrated practical problem solving with relevant role-focused depth.",
                  transcriptRef: `transcript/${candidate.id}-${nowIso.slice(0, 10)}.txt`,
                  videoRef: `recordings/${candidate.id}-${nowIso.slice(0, 10)}.mp4`,
                  analysis: {
                    technical: Number((generatedScore + 0.4).toFixed(1)),
                    communication: Number((generatedScore - 0.1).toFixed(1)),
                    behavioral: Number((generatedScore - 0.2).toFixed(1)),
                    confidence: Number((generatedScore + 0.1).toFixed(1)),
                    eyeContact: Number((generatedScore - 0.3).toFixed(1)),
                  },
                },
                ...candidate.interviews,
              ],
            }
          : candidate
      )
    );

    toast.success("Interview marked as completed. Score cards and analysis are now available.");
  };

  const rescheduleNotAttended = async () => {
    if (!selectedCandidate || !canReschedule) return;
    const baseTime = scheduleAt ? new Date(scheduleAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const target = baseTime > now ? baseTime : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 48 * 60 * 60 * 1000);
    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === selectedCandidate.id
          ? {
              ...candidate,
              status: "scheduled",
              nextInterviewAt: target.toISOString(),
              inviteIssuedAt: issuedAt.toISOString(),
              inviteExpiresAt: expiresAt.toISOString(),
            }
          : candidate
      )
    );

    toast.success("Reschedule link generated. It will remain valid for 48 hours.");
  };

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCandidate) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    const fileType = extension === "pdf" ? "pdf" : extension === "docx" ? "docx" : "doc";

    if (resumePreviewUrl) {
      URL.revokeObjectURL(resumePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setResumePreviewUrl(previewUrl);
    setResumePreviewType(fileType);
    setResumePreviewName(file.name);

    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === selectedCandidate.id
          ? {
              ...candidate,
              resumeFileName: file.name,
              resumeType: fileType,
              resumeUrl: previewUrl,
            }
          : candidate
      )
    );

    toast.success("Resume uploaded and attached to candidate profile");
    event.target.value = "";
  };

  const handleCandidateAction = (action: "restore" | "mail" | "portal") => {
    if (!selectedCandidate) return;

    if (action === "restore") {
      toast.success("Archive restore request sent to HUMINEX support team");
      return;
    }
    if (action === "mail") {
      toast.success(`Candidate details packet queued for email to ${selectedCandidate.email}`);
      return;
    }
    toast.success("Candidate profile enabled for portal visibility (demo)");
  };

  const getStatusBadgeClass = (status: CandidateStatus) => {
    if (status === "completed") return "bg-[#0FB07A]/10 text-[#0FB07A] border border-[#0FB07A]/20";
    if (status === "scheduled") return "bg-[#005EEB]/10 text-[#005EEB] border border-[#005EEB]/20";
    if (status === "in_progress") return "bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/20";
    if (status === "not_attended") return "bg-[#E23E57]/10 text-[#E23E57] border border-[#E23E57]/20";
    return "bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#005EEB] to-[#00C2FF] flex items-center justify-center shadow-lg shadow-[#005EEB]/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F1E3A]">OpenHuman Interview Studio</h1>
            <p className="text-sm text-[#6B7280]">Admin interview control, candidate management and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setIsLive((prev) => !prev);
              toast.info(isLive ? "Session paused" : "Session resumed");
            }}
          >
            {isLive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
            {isLive ? "Pause Session" : "Resume Session"}
          </Button>
          <Button className="gap-2 bg-[#005EEB] hover:bg-[#004ACC]" onClick={() => toast.success("Evaluation package exported for HR and Hiring Manager")}>
            <FileDown className="w-4 h-4" /> Export Evaluation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#005EEB]" /> Candidate Pipeline Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or email" />
              </div>
              <select className="h-10 px-3 border border-gray-200 rounded-md text-sm" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
                <option value="all">All Positions</option>
                {positionOptions.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
              <select className="h-10 px-3 border border-gray-200 rounded-md text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="Engineering">Engineering</option>
                <option value="Data">Data</option>
                <option value="Security">Security</option>
                <option value="Product">Product</option>
              </select>
              <select className="h-10 px-3 border border-gray-200 rounded-md text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="not_attended">Not Attended</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="h-10 px-3 border border-gray-200 rounded-md text-sm" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as "all" | "today" | "next7" | "next30")}>
                <option value="all">All Timeframes</option>
                <option value="today">Today</option>
                <option value="next7">Next 7 Days</option>
                <option value="next30">Next 30 Days</option>
              </select>
              <div className="text-sm text-[#6B7280] flex items-center justify-end">
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Admin Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#6B7280]">Preview exactly how candidate interview screen looks before sharing invite link.</p>
            <Button asChild className="w-full gap-2 bg-[#0F1E3A] hover:bg-[#1E2D4A]">
              <Link
                to={`/tenant/openhuman-candidate-preview?candidate=${encodeURIComponent(candidateName)}&role=${encodeURIComponent(candidateRole)}`}
              >
                <ExternalLink className="w-4 h-4" /> Open Candidate Live Preview
              </Link>
            </Button>
            <div className="p-3 rounded-lg border border-gray-100 bg-[#F7F9FC] text-xs text-[#6B7280]">
              Completed interviews are retained 30 days, then moved to HUMINEX Archive. Restore/email/portal enable can be requested by admin.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Candidates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredCandidates.map((candidate) => (
              (() => {
                const inviteExpired = candidate.inviteExpiresAt ? new Date(candidate.inviteExpiresAt).getTime() < Date.now() : false;
                return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setSelectedCandidateId(candidate.id)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selectedCandidateId === candidate.id ? "border-[#005EEB] bg-[#005EEB]/5" : "border-gray-100 hover:bg-[#F7F9FC]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F1E3A]">{candidate.name}</p>
                    <p className="text-xs text-[#6B7280]">{candidate.position}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">{candidate.email}</p>
                    {candidate.inviteExpiresAt && (
                      <p className={`text-[11px] mt-1 ${inviteExpired ? "text-[#E23E57]" : "text-[#0FB07A]"}`}>
                        {inviteExpired ? "Interview link expired" : `Link valid till ${new Date(candidate.inviteExpiresAt).toLocaleString()}`}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusBadgeClass(candidate.status)}>{candidate.status.replace("_", " ")}</Badge>
                </div>
                <div className="text-xs text-[#6B7280] mt-2">{new Date(candidate.nextInterviewAt).toLocaleString()}</div>
              </button>
                );
              })()
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><UserRound className="w-5 h-5 text-[#005EEB]" /> Candidate Profile and Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Candidate Name</p>
                <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Candidate name" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Candidate Email</p>
                <Input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="candidate@email.com" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Position</p>
                <Input value={candidateRole} onChange={(e) => setCandidateRole(e.target.value)} placeholder="Role" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Experience (years)</p>
                <Input type="number" min="0" max="30" value={candidateExperience} onChange={(e) => setCandidateExperience(e.target.value)} placeholder="Years" />
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-[#6B7280] mb-1">Schedule Date and Time</p>
                <Input type="datetime-local" min={scheduleMin} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#F7F9FC] border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#0F1E3A]">Technical Flow: {roleTrack}</p>
                <Badge className="bg-[#005EEB]/10 text-[#005EEB] border border-[#005EEB]/20">{questionMode === "dynamic" ? "Dynamic Mode" : "Fixed Mode"}</Badge>
              </div>
              <p className="text-xs text-[#6B7280] mt-2">Resume-aligned dynamic questioning from introduction to scenario and in-depth analysis.</p>
            </div>

            <div className="p-3 rounded-lg border border-gray-100 bg-white">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="w-4 h-4 text-[#005EEB]" />
                  <span className="font-medium text-[#0F1E3A]">Interview Link Status</span>
                </div>
                {selectedCandidate?.inviteExpiresAt ? (
                  <Badge className={isInviteExpired ? "bg-[#E23E57]/10 text-[#E23E57] border border-[#E23E57]/20" : "bg-[#0FB07A]/10 text-[#0FB07A] border border-[#0FB07A]/20"}>
                    {isInviteExpired ? "Expired" : "Active"}
                  </Badge>
                ) : (
                  <Badge className="bg-[#F3F4F6] text-[#6B7280]">Not Generated</Badge>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-2">
                {selectedCandidate?.inviteExpiresAt
                  ? `Valid until ${new Date(selectedCandidate.inviteExpiresAt).toLocaleString()} (48-hour policy)`
                  : "No interview link issued yet."}
              </p>
            </div>

            {isCompletedCandidate && (
              <div className="p-3 rounded-lg border border-[#0FB07A]/30 bg-[#0FB07A]/5">
                <p className="text-sm font-semibold text-[#0F1E3A]">Interview Completed</p>
                <p className="text-xs text-[#4B5563] mt-1">Scheduling is locked. Review scorecards, transcript and recording below.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!isCompletedCandidate && (
                <Button className="gap-2 bg-[#005EEB] hover:bg-[#004ACC]" onClick={scheduleInterview} disabled={sendingInvite}>
                  <CalendarClock className="w-4 h-4" />
                  {sendingInvite ? "Sending Invite..." : "Schedule Interview"}
                </Button>
              )}
              {!isCompletedCandidate && (
                <Button variant="outline" className="gap-2" onClick={runPrecheck} disabled={precheckRunning}>
                  <Scan className="w-4 h-4" />
                  {precheckRunning ? "Running Precheck..." : "Run Environment Precheck"}
                </Button>
              )}
              {!isCompletedCandidate && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!canTriggerCredentialEmail}
                  onClick={() => toast.success("Credential email with OpenHuman secure link sent")}
                >
                  <Mail className="w-4 h-4" /> {canTriggerCredentialEmail ? "Trigger Credential Email" : "Link Expired"}
                </Button>
              )}
              {canReschedule && !isCompletedCandidate && (
                <Button variant="outline" className="gap-2" onClick={rescheduleNotAttended}>
                  <RefreshCcw className="w-4 h-4" /> Reschedule Interview
                </Button>
              )}
              {!isCompletedCandidate && (
                <Button variant="outline" className="gap-2" onClick={markInterviewCompleted}>
                  <CheckCircle2 className="w-4 h-4" /> Mark as Completed
                </Button>
              )}
            </div>

            {!isCompletedCandidate ? (
              <div className="space-y-2">
                {precheckSteps.map((step, index) => {
                  const Icon = step.icon;
                  const done = precheckDone || index < precheckIndex;
                  const active = index === precheckIndex && precheckRunning;
                  return (
                    <div key={step.key} className="p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#005EEB]" />
                        <span className="text-sm text-[#0F1E3A]">{step.label}</span>
                      </div>
                      <Badge className={done ? "bg-[#0FB07A]/10 text-[#0FB07A] border border-[#0FB07A]/20" : active ? "bg-[#005EEB]/10 text-[#005EEB] border border-[#005EEB]/20" : "bg-[#F3F4F6] text-[#6B7280]"}>
                        {done ? "Passed" : active ? "Running" : "Pending"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-gray-100 bg-[#F7F9FC] text-sm text-[#6B7280]">
                Environment checks are not required for already completed interviews.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-[#005EEB]" /> Candidate Resume (PDF/Word)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[#6B7280]">Upload and preview resume linked to selected candidate profile.</p>
              <label className="inline-flex">
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                <span className="inline-flex h-10 px-4 items-center rounded-md bg-[#005EEB] text-white text-sm font-medium cursor-pointer hover:bg-[#004ACC]">Upload Resume</span>
              </label>
            </div>

            <div className="p-3 rounded-lg border border-gray-100 bg-[#F7F9FC]">
              <p className="text-sm font-medium text-[#0F1E3A]">{resumePreviewName || "No resume attached"}</p>
              <p className="text-xs text-[#6B7280] mt-1">Supported format: PDF, DOC, DOCX</p>
            </div>

            {resumePreviewUrl && resumePreviewType === "pdf" ? (
              <iframe title="Resume Preview" src={resumePreviewUrl} className="w-full h-[420px] border border-gray-200 rounded-lg" />
            ) : resumePreviewUrl ? (
              <div className="p-4 rounded-lg border border-gray-100 bg-white">
                <p className="text-sm text-[#0F1E3A] font-medium">Word Resume Preview</p>
                <p className="text-xs text-[#6B7280] mt-1">Inline DOC/DOCX visual preview depends on browser support. Download/open file to view full formatting.</p>
                <a href={resumePreviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm text-[#005EEB] font-medium">
                  Open Resume <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-gray-200 text-sm text-[#6B7280]">Upload a resume to preview candidate file here.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Candidate History and Archive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg border border-gray-100 bg-[#F7F9FC]">
              <p className="text-xs text-[#6B7280]">Retention Policy</p>
              <p className="text-sm text-[#0F1E3A] font-medium mt-1">Interview data kept 30 days, then archived</p>
            </div>

            {selectedCandidate?.interviews.length ? (
              selectedCandidate.interviews.map((record) => (
                <div key={record.happenedAt} className="p-3 rounded-lg border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0F1E3A]">{record.round}</p>
                    <Badge className="bg-[#005EEB]/10 text-[#005EEB] border border-[#005EEB]/20">{record.score}/10</Badge>
                  </div>
                  <p className="text-xs text-[#6B7280]">{new Date(record.happenedAt).toLocaleString()}</p>
                  <p className="text-sm text-[#4B5563]">{record.summary}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-[#F7F9FC] p-2">Technical: <span className="font-semibold text-[#0F1E3A]">{record.analysis.technical}/10</span></div>
                    <div className="rounded-md bg-[#F7F9FC] p-2">Communication: <span className="font-semibold text-[#0F1E3A]">{record.analysis.communication}/10</span></div>
                    <div className="rounded-md bg-[#F7F9FC] p-2">Behavioral: <span className="font-semibold text-[#0F1E3A]">{record.analysis.behavioral}/10</span></div>
                    <div className="rounded-md bg-[#F7F9FC] p-2">Confidence: <span className="font-semibold text-[#0F1E3A]">{record.analysis.confidence}/10</span></div>
                    <div className="rounded-md bg-[#F7F9FC] p-2">Eye Contact: <span className="font-semibold text-[#0F1E3A]">{record.analysis.eyeContact}/10</span></div>
                    <div className="rounded-md bg-[#F7F9FC] p-2">Transcript: <span className="font-semibold text-[#005EEB]">{record.transcriptRef}</span></div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={() => toast.success(`Opening video replay: ${record.videoRef}`)}>
                    <Video className="w-4 h-4" /> Preview Candidate Interview Video
                  </Button>
                </div>
              ))
            ) : isNotAttendedCandidate ? (
              <div className="p-3 rounded-lg border border-[#E23E57]/20 bg-[#E23E57]/5 text-sm text-[#7F1D1D] flex items-start gap-2">
                <UserX className="w-4 h-4 mt-0.5" />
                Candidate did not attend the interview. Generate a reschedule link; it stays valid for 48 hours.
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-gray-200 text-sm text-[#6B7280]">No completed interview yet for this candidate.</div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => handleCandidateAction("restore")}><Archive className="w-4 h-4" /> Request Restore</Button>
              <Button variant="outline" className="gap-2" onClick={() => handleCandidateAction("mail")}><Mail className="w-4 h-4" /> Send Details Email</Button>
              <Button variant="outline" className="gap-2" onClick={() => handleCandidateAction("portal")}><Users className="w-4 h-4" /> Enable in Portal</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B7280]">Question Mode</span>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
              <button type="button" onClick={() => setQuestionMode("dynamic")} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${questionMode === "dynamic" ? "bg-[#005EEB] text-white" : "text-[#6B7280] hover:bg-[#F7F9FC]"}`}>Dynamic</button>
              <button type="button" onClick={() => setQuestionMode("fixed")} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${questionMode === "fixed" ? "bg-[#005EEB] text-white" : "text-[#6B7280] hover:bg-[#F7F9FC]"}`}>Fixed</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#0FB07A]/10 text-[#0FB07A] border border-[#0FB07A]/20">{isLive ? "Live Session" : "Paused"}</Badge>
            <Badge className="bg-[#005EEB]/10 text-[#005EEB] border border-[#005EEB]/20">Avg Score {averageScore}/10</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Live Session Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0F1E3A] to-[#1E2D4A] p-4 min-h-[250px] text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm"><Video className="w-4 h-4" /> Candidate Video</div>
                  <Badge className="bg-white/10 text-white border border-white/20">{candidateName} • {candidateRole}</Badge>
                </div>
                <div className="h-[190px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-8 h-8 mx-auto mb-2 text-[#00C2FF]" />
                    <p className="text-sm text-white/85">Live webcam stream (demo)</p>
                    <p className="text-xs text-white/60 mt-1">Eye movement, confidence, behavior and speech analysis active</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-[#005EEB]" /><p className="text-sm font-semibold text-[#0F1E3A]">AI Interviewer 1</p></div>
                  <p className="text-xs text-[#6B7280]">Technical Panel (Male)</p>
                  <p className="text-xs text-[#6B7280] mt-2">Resume-driven dynamic questioning with depth escalation.</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-[#8B5CF6]" /><p className="text-sm font-semibold text-[#0F1E3A]">AI Interviewer 2</p></div>
                  <p className="text-xs text-[#6B7280]">Behavioral Panel (Female)</p>
                  <p className="text-xs text-[#6B7280] mt-2">Communication and behavioral scoring with live follow-ups.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border border-gray-200 shadow-none"><CardContent className="p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[#005EEB]/10 flex items-center justify-center"><Mic className="w-4 h-4 text-[#005EEB]" /></div><div><p className="text-xs text-[#6B7280]">Speech Confidence</p><p className="text-lg font-bold text-[#0F1E3A]">8.1/10</p></div></CardContent></Card>
              <Card className="border border-gray-200 shadow-none"><CardContent className="p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[#0FB07A]/10 flex items-center justify-center"><Gauge className="w-4 h-4 text-[#0FB07A]" /></div><div><p className="text-xs text-[#6B7280]">Technical Depth</p><p className="text-lg font-bold text-[#0F1E3A]">8.4/10</p></div></CardContent></Card>
              <Card className="border border-gray-200 shadow-none"><CardContent className="p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[#FFB020]/10 flex items-center justify-center"><Clock3 className="w-4 h-4 text-[#FFB020]" /></div><div><p className="text-xs text-[#6B7280]">Round Duration</p><p className="text-lg font-bold text-[#0F1E3A]">09:20</p></div></CardContent></Card>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recording & Replay Artifacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {artifacts.map((artifact) => (
              <div key={artifact.label} className="p-3 rounded-lg border border-gray-100 hover:bg-[#F7F9FC] transition-colors">
                <p className="text-sm font-medium text-[#0F1E3A]">{artifact.label}</p>
                <p className="text-xs text-[#6B7280] mt-1 font-mono truncate">{artifact.detail}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full gap-2" onClick={() => toast.success("Replay opened in secure viewer")}><Download className="w-4 h-4" /> Open Replay</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Real-Time Scoring Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scoringTimeline.map((point) => (
              <div key={point.minute} className="p-3 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#0F1E3A]">{point.topic}</p>
                  <div className="flex items-center gap-2"><span className="text-xs text-[#6B7280]">{point.minute}</span><Badge className="bg-[#005EEB]/10 text-[#005EEB] border border-[#005EEB]/20">{point.score}/10</Badge></div>
                </div>
                <div className="h-2 rounded-full bg-[#EEF3FC] overflow-hidden"><div className="h-full bg-gradient-to-r from-[#005EEB] to-[#00C2FF]" style={{ width: `${point.score * 10}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Final Evaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F7F9FC] border border-gray-100">
              <p className="text-xs text-[#6B7280]">Recommended Decision</p>
              <p className="text-lg font-bold text-[#0F1E3A] mt-1">
                {latestInterview ? "Proceed to Final Manager Round" : "Interview Pending Completion"}
              </p>
              <p className="text-sm text-[#6B7280] mt-2">
                Composite Score:{" "}
                <span className="font-semibold text-[#005EEB]">
                  {latestInterview ? `${latestInterview.score}/10` : "Not Available"}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              {latestInterview ? (
                <>
                  <div className="flex items-start gap-2 text-sm text-[#0F1E3A]"><CheckCircle2 className="w-4 h-4 text-[#0FB07A] mt-0.5" /><span>Technical: {latestInterview.analysis.technical}/10</span></div>
                  <div className="flex items-start gap-2 text-sm text-[#0F1E3A]"><CheckCircle2 className="w-4 h-4 text-[#0FB07A] mt-0.5" /><span>Behavioral: {latestInterview.analysis.behavioral}/10</span></div>
                  <div className="flex items-start gap-2 text-sm text-[#0F1E3A]"><CheckCircle2 className="w-4 h-4 text-[#0FB07A] mt-0.5" /><span>Communication: {latestInterview.analysis.communication}/10</span></div>
                </>
              ) : (
                <div className="text-sm text-[#6B7280]">Complete interview to view score breakdown.</div>
              )}
            </div>
            <Button className="w-full gap-2 bg-[#0F1E3A] hover:bg-[#1E2D4A]" onClick={() => toast.success("HR + Hiring Manager feedback card exported")}><FileDown className="w-4 h-4" /> Export HR Packet</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantOpenHumanStudio;
