export interface MockProject {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "review" | "completed";
  phase: string;
  progress: number;
  health_score: number;
  due_date: string;
  project_milestones: Array<{
    id: string;
    name: string;
    status: "pending" | "active" | "completed";
    due_date: string;
  }>;
}

export interface MockInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  due_date: string;
  created_at: string;
}

export interface MockFile {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface MockTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved";
  created_at: string;
}

export interface MockMeeting {
  id: string;
  title: string;
  status: "scheduled" | "completed" | "cancelled";
  scheduled_at: string;
  duration_minutes: number;
  meeting_link?: string;
  projects?: { name: string };
}

const DEMO_PROJECTS: Record<string, MockProject[]> = {
  "lead.frontend@gethuminex.com": [
    {
      id: "proj-1",
      name: "Employee Portal UX Refresh",
      description: "Revamp employee dashboard with role-aware hierarchy and clean navigation.",
      status: "active",
      phase: "Development",
      progress: 68,
      health_score: 91,
      due_date: "2026-03-12",
      project_milestones: [
        { id: "m-1", name: "Design approval", status: "completed", due_date: "2026-01-20" },
        { id: "m-2", name: "Frontend implementation", status: "active", due_date: "2026-02-28" },
        { id: "m-3", name: "QA + release", status: "pending", due_date: "2026-03-12" },
      ],
    },
    {
      id: "proj-2",
      name: "Interview Insights Widgets",
      description: "Add score timeline and feedback cards for interview outcomes.",
      status: "planning",
      phase: "Planning",
      progress: 24,
      health_score: 88,
      due_date: "2026-04-05",
      project_milestones: [
        { id: "m-4", name: "Schema planning", status: "active", due_date: "2026-02-18" },
      ],
    },
  ],
  default: [
    {
      id: "proj-3",
      name: "HUMINEX Core Platform",
      description: "Core workforce modules enhancement.",
      status: "active",
      phase: "Execution",
      progress: 55,
      health_score: 89,
      due_date: "2026-03-30",
      project_milestones: [
        { id: "m-7", name: "Module integration", status: "active", due_date: "2026-03-10" },
      ],
    },
  ],
};

const DEMO_INVOICES: Record<string, MockInvoice[]> = {
  "lead.frontend@gethuminex.com": [
    {
      id: "inv-1",
      invoice_number: "INV-HX-2026-014",
      amount: 42000,
      tax_amount: 7560,
      total_amount: 49560,
      status: "sent",
      due_date: "2026-02-19",
      created_at: "2026-02-04T10:00:00.000Z",
    },
    {
      id: "inv-2",
      invoice_number: "INV-HX-2026-011",
      amount: 38000,
      tax_amount: 6840,
      total_amount: 44840,
      status: "paid",
      due_date: "2026-01-28",
      created_at: "2026-01-14T10:00:00.000Z",
    },
  ],
  default: [
    {
      id: "inv-3",
      invoice_number: "INV-HX-2026-009",
      amount: 25000,
      tax_amount: 4500,
      total_amount: 29500,
      status: "paid",
      due_date: "2026-01-20",
      created_at: "2026-01-08T10:00:00.000Z",
    },
  ],
};

const DEMO_FILES: Record<string, MockFile[]> = {
  "lead.frontend@gethuminex.com": [
    { id: "f-1", name: "Frontend-Architecture-v3.pdf", file_type: "application/pdf", file_size: 420000, created_at: "2026-02-02T09:00:00.000Z" },
    { id: "f-2", name: "Interview-Scoring-Matrix.xlsx", file_type: "application/vnd.ms-excel", file_size: 210000, created_at: "2026-02-01T09:00:00.000Z" },
    { id: "f-3", name: "Benefits-Handbook-2026.pdf", file_type: "application/pdf", file_size: 800000, created_at: "2026-01-20T09:00:00.000Z" },
  ],
  default: [
    { id: "f-4", name: "Employee-Guide.pdf", file_type: "application/pdf", file_size: 300000, created_at: "2026-01-10T09:00:00.000Z" },
  ],
};

const DEMO_TICKETS: Record<string, MockTicket[]> = {
  "lead.frontend@gethuminex.com": [
    {
      id: "t-1",
      ticket_number: "TKT-320114",
      subject: "Need VPN whitelist for staging APIs",
      description: "Please whitelist my system IP for staging interview APIs.",
      priority: "high",
      status: "in_progress",
      created_at: "2026-02-05T09:00:00.000Z",
    },
    {
      id: "t-2",
      ticket_number: "TKT-318902",
      subject: "Benefits claim query",
      description: "Unable to see latest insurance claim status in panel.",
      priority: "medium",
      status: "open",
      created_at: "2026-02-03T09:00:00.000Z",
    },
  ],
  default: [],
};

const DEMO_MEETINGS: Record<string, MockMeeting[]> = {
  "lead.frontend@gethuminex.com": [
    {
      id: "m-1",
      title: "Sprint Review - Employee Portal",
      status: "scheduled",
      scheduled_at: "2026-02-08T10:30:00.000Z",
      duration_minutes: 45,
      meeting_link: "https://meet.gethuminex.com/portal-review",
      projects: { name: "Employee Portal UX Refresh" },
    },
    {
      id: "m-2",
      title: "OpenHuman Scoring Sync",
      status: "scheduled",
      scheduled_at: "2026-02-09T14:00:00.000Z",
      duration_minutes: 30,
      meeting_link: "https://meet.gethuminex.com/openhuman-sync",
      projects: { name: "Interview Insights Widgets" },
    },
    {
      id: "m-3",
      title: "Architecture Checkpoint",
      status: "completed",
      scheduled_at: "2026-02-04T11:00:00.000Z",
      duration_minutes: 60,
      projects: { name: "Employee Portal UX Refresh" },
    },
  ],
  default: [],
};

export const isDemoPortalUser = (userId?: string) => Boolean(userId?.startsWith("dev-"));

export const getDemoEmployeeEmail = () => {
  try {
    const raw = localStorage.getItem("huminex_dev_employee_profile");
    if (!raw) return "default";
    const parsed = JSON.parse(raw) as { email?: string };
    return (parsed.email || "default").toLowerCase();
  } catch {
    return "default";
  }
};

export const getMockProjects = () => {
  const email = getDemoEmployeeEmail();
  return DEMO_PROJECTS[email] || DEMO_PROJECTS.default;
};

export const getMockInvoices = () => {
  const email = getDemoEmployeeEmail();
  return DEMO_INVOICES[email] || DEMO_INVOICES.default;
};

export const getMockFiles = () => {
  const email = getDemoEmployeeEmail();
  return DEMO_FILES[email] || DEMO_FILES.default;
};

export const getMockTickets = () => {
  const email = getDemoEmployeeEmail();
  return DEMO_TICKETS[email] || DEMO_TICKETS.default;
};

export const getMockMeetings = () => {
  const email = getDemoEmployeeEmail();
  return DEMO_MEETINGS[email] || DEMO_MEETINGS.default;
};
