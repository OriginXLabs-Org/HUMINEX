export type ApiEnvelope<T> = {
  data: T;
  traceId: string;
};

export type ApiErrorEnvelope = {
  code: string;
  message: string;
  traceId: string;
  validationErrors?: Record<string, string[]>;
};

export type UserProfileResponse = {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
};

export type RoleResponse = {
  roleId: string;
  name: string;
  description: string;
  userCount: number;
};

export type AccessReviewUserResponse = {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  lastActivityAtUtc?: string | null;
};

export type IdentityAccessMetricsResponse = {
  totalUsers: number;
  activeUsersLast24Hours: number;
  totalRoles: number;
  totalPolicies: number;
  usersWithoutRoles: number;
};

export type OrgNodeDto = {
  employeeId: string;
  name: string;
  role: string;
  managerId: string | null;
};

export type EmployeeDto = {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  managerEmployeeId: string | null;
  isPortalAccessEnabled: boolean;
  allowedWidgets: string[];
};

export type EmployeesPagedResponse = {
  page: {
    items: EmployeeDto[];
    page: number;
    pageSize: number;
    totalCount: number;
  };
};

export type PayrollRunDto = {
  runId: string;
  period: string;
  status: string;
  employees: number;
  gross: number;
  net: number;
};

export type PayslipDto = {
  employeeId: string;
  period: string;
  gross: number;
  deductions: number;
  net: number;
  status: string;
};

export type AdminAuthAuditRequest = {
  portal: string;
  status: "attempt" | "blocked" | "success" | "failure";
  reason: string;
  path?: string;
  userAgent?: string;
};

export type AdminAuthAuditResponse = {
  accepted: boolean;
  message: string;
};

export type InternalAdminSummaryResponse = {
  employerTenants: number;
  employerAdmins: number;
  totalEmployees: number;
  totalQuotes: number;
  pendingQuotes: number;
  totalInvoices: number;
  totalRevenue: number;
  auditEventsLast24Hours: number;
  lastAuditAtUtc?: string | null;
};

export type EmployerOverviewResponse = {
  id: string;
  name: string;
  slug: string;
  tenantType: string;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  adminCount: number;
  employeeCount: number;
  contactEmail: string;
};

export type InternalAdminAuditLogResponse = {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  metadataJson: string;
  occurredAtUtc: string;
};

export type InternalEmployerUserResponse = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roles: string[];
  createdAtUtc: string;
};

export type InternalAdminUserResponse = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roles: string[];
  createdAtUtc: string;
};

export type InternalSystemLogResponse = {
  id: string;
  level: string;
  source: string;
  message: string;
  metadataJson: string;
  createdAtUtc: string;
};

export type InternalSystemHealthCheckResponse = {
  name: string;
  status: string;
  latency: string;
  description: string;
  category: string;
  portalUrl: string;
  resourceType: string;
  resourceName: string;
};

export type InternalSystemHealthResponse = {
  status: string;
  checkedAtUtc: string;
  checks: InternalSystemHealthCheckResponse[];
};

export type InternalApiEndpointResponse = {
  method: string;
  route: string;
  apiVersion: string;
  authRequired: boolean;
  callCount: number;
  operationName: string;
};

export type InternalApiCatalogResponse = {
  swaggerUrl: string;
  generatedAtUtc: string;
  endpointCount: number;
  totalCallCount: number;
  endpoints: InternalApiEndpointResponse[];
};

export type InternalPortalModuleStatusResponse = {
  module: string;
  status: "completed" | "pending" | string;
  implementedWith: string;
  pendingReason: string;
  primaryEndpoint: string;
};

export type InternalPortalArchitectureStatusResponse = {
  name: string;
  completedModules: number;
  pendingModules: number;
  endpointCount: number;
  modules: InternalPortalModuleStatusResponse[];
};

export type InternalArchitectureStatusResponse = {
  generatedAtUtc: string;
  title: string;
  notes: string;
  techStack: string[];
  portals: InternalPortalArchitectureStatusResponse[];
};

export type InternalAdminQuoteResponse = {
  id: string;
  tenantId: string;
  userId: string;
  quoteNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactCompany: string;
  clientType: string;
  serviceType: string;
  complexity: string;
  estimatedPrice: number;
  discountPercent: number;
  finalPrice: number;
  status: string;
  notes: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type InternalAdminQuoteConversionResponse = {
  quoteId: string;
  quoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTotalAmount: number;
};

export type InternalAdminInvoiceResponse = {
  id: string;
  tenantId: string;
  quoteId: string;
  userId: string;
  invoiceNumber: string;
  quoteNumber: string;
  contactName: string;
  contactEmail: string;
  contactCompany: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  dueDateUtc: string;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type InternalAdminTenantBillingItemResponse = {
  tenantId: string;
  tenantName: string;
  plan: string;
  status: string;
  mrr: number;
  nextBillingAtUtc: string;
  paymentMethod: string;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingAmount: number;
  overdueAmount: number;
};

export type InternalAdminTenantBillingResponse = {
  totalMrr: number;
  totalArr: number;
  activeSubscriptions: number;
  trialAccounts: number;
  pastDueAccounts: number;
  items: InternalAdminTenantBillingItemResponse[];
};

export type InternalAdminRevenuePointResponse = {
  month: string;
  mrr: number;
  arr: number;
  newMrr: number;
  churned: number;
};

export type InternalAdminPlanDistributionResponse = {
  plan: string;
  count: number;
  percent: number;
};

export type InternalAdminRevenueAnalyticsResponse = {
  currentMrr: number;
  mrrGrowthPercent: number;
  currentArr: number;
  arpu: number;
  churnRatePercent: number;
  netRevenueRetentionPercent: number;
  timeline: InternalAdminRevenuePointResponse[];
  planDistribution: InternalAdminPlanDistributionResponse[];
};

export type InternalAdminAiWorkflowResponse = {
  id: string;
  name: string;
  totalRuns: number;
  successRatePercent: number;
  status: string;
  lastRunAtUtc: string;
};

export type InternalAdminAiActivityResponse = {
  id: string;
  kind: string;
  actorEmail: string;
  message: string;
  status: string;
  latencyMs?: number | null;
  occurredAtUtc: string;
};

export type InternalAdminAiDashboardResponse = {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgResponseTimeSeconds: number;
  activeWorkflows: number;
  estimatedCostSavings: number;
  workflows: InternalAdminAiWorkflowResponse[];
  recentActivity: InternalAdminAiActivityResponse[];
};

export type InternalAdminAutomationWorkflowResponse = {
  id: string;
  name: string;
  trigger: string;
  status: string;
  totalRuns: number;
  successRatePercent: number;
  avgDurationMs: number;
  lastRunAtUtc: string;
};

export type InternalAdminAutomationExecutionResponse = {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  triggeredBy: string;
  resourceType: string;
  resourceId: string;
  durationMs?: number | null;
  startedAtUtc: string;
};

export type InternalAdminScheduledJobResponse = {
  id: string;
  name: string;
  schedule: string;
  nextRunAtUtc: string;
  status: string;
};

export type InternalAdminAutomationLogsResponse = {
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  workflows: InternalAdminAutomationWorkflowResponse[];
  executions: InternalAdminAutomationExecutionResponse[];
  scheduledJobs: InternalAdminScheduledJobResponse[];
};

export type InternalAdminFeatureFlagResponse = {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  rolloutPercent: number;
  updatedAtUtc: string;
  targetingType: string;
};

export type InternalAdminAbTestVariantResponse = {
  name: string;
  conversions: number;
};

export type InternalAdminAbTestResponse = {
  id: string;
  name: string;
  status: string;
  variants: InternalAdminAbTestVariantResponse[];
  visitors: number;
  winner: string;
};

export type InternalAdminFeatureFlagsResponse = {
  totalFlags: number;
  enabledFlags: number;
  partialFlags: number;
  flags: InternalAdminFeatureFlagResponse[];
  abTests: InternalAdminAbTestResponse[];
};

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const fallbackLocal = "http://localhost:5000/api/v1";
  const fallbackProd = "https://api.gethuminex.com/api/v1";

  if (typeof window === "undefined") {
    return configured ?? fallbackLocal;
  }

  const onHostedDomain = /(^|\.)gethuminex\.com$/i.test(window.location.hostname);
  const raw = (configured ?? fallbackLocal).trim();

  try {
    const parsed = new URL(raw);
    const isLocalTarget = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (onHostedDomain && isLocalTarget) {
      console.warn("VITE_API_BASE_URL points to localhost on hosted domain. Falling back to production API URL.");
      return fallbackProd;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    // Support relative values and malformed input with safe defaults.
    if (onHostedDomain) {
      return fallbackProd;
    }
    return fallbackLocal;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();
const SESSION_STORAGE_KEY = "huminex_api_session";

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: ApiErrorEnvelope;

  constructor(message: string, status: number, details?: ApiErrorEnvelope) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

async function parseJson<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  return JSON.parse(text) as T;
}

function tryGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getStoredAccessToken(): string | null {
  const raw = tryGetLocalStorage(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<TResponse> {
  const headers: HeadersInit = {
    ...defaultHeaders,
    ...(init.headers ?? {}),
  };

  const resolvedAccessToken = accessToken ?? getStoredAccessToken();
  if (resolvedAccessToken) {
    headers.Authorization = `Bearer ${resolvedAccessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const error = await parseJson<ApiErrorEnvelope>(response);
    throw new ApiClientError(error?.message ?? "API request failed", response.status, error);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload = await parseJson<ApiEnvelope<TResponse>>(response);
  if (!payload) {
    throw new ApiClientError("Empty API response", response.status);
  }

  return payload.data;
}

export const huminexApi = {
  health: () => apiRequest<{ service: string; status: string; utcTime: string }>("/system/health"),
  logAdminAuthAudit: (request: AdminAuthAuditRequest, accessToken?: string) =>
    apiRequest<AdminAuthAuditResponse>("/system/admin-auth-audit", {
      method: "POST",
      body: JSON.stringify(request),
    }, accessToken),
  getInternalAdminSummary: (accessToken?: string) =>
    apiRequest<InternalAdminSummaryResponse>("/admin/internal/summary", {}, accessToken),
  getInternalEmployers: (limit = 50, accessToken?: string) =>
    apiRequest<EmployerOverviewResponse[]>(`/admin/internal/employers?limit=${limit}`, {}, accessToken),
  getInternalEmployerById: (tenantId: string, accessToken?: string) =>
    apiRequest<EmployerOverviewResponse>(`/admin/internal/employers/${tenantId}`, {}, accessToken),
  getInternalEmployerUsers: (tenantId: string, limit = 100, accessToken?: string) =>
    apiRequest<InternalEmployerUserResponse[]>(
      `/admin/internal/employers/${tenantId}/users?limit=${limit}`,
      {},
      accessToken
    ),
  getInternalUsers: (limit = 200, search?: string, tenantId?: string, accessToken?: string) =>
    apiRequest<InternalAdminUserResponse[]>(
      `/admin/internal/users?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}${tenantId ? `&tenantId=${encodeURIComponent(tenantId)}` : ""}`,
      {},
      accessToken
    ),
  getInternalEmployerActivity: (tenantId: string, limit = 100, sinceUtc?: string, accessToken?: string) =>
    apiRequest<InternalAdminAuditLogResponse[]>(
      `/admin/internal/employers/${tenantId}/activity?limit=${limit}${sinceUtc ? `&sinceUtc=${encodeURIComponent(sinceUtc)}` : ""}`,
      {},
      accessToken
    ),
  getInternalAuditLogs: (limit = 100, sinceUtc?: string, accessToken?: string) =>
    apiRequest<InternalAdminAuditLogResponse[]>(
      `/admin/internal/audit-logs?limit=${limit}${sinceUtc ? `&sinceUtc=${encodeURIComponent(sinceUtc)}` : ""}`,
      {},
      accessToken
    ),
  getInternalSystemLogs: (level = "all", limit = 200, accessToken?: string) =>
    apiRequest<InternalSystemLogResponse[]>(
      `/admin/internal/system-logs?level=${encodeURIComponent(level)}&limit=${limit}`,
      {},
      accessToken
    ),
  getInternalSystemHealth: (accessToken?: string) =>
    apiRequest<InternalSystemHealthResponse>("/admin/internal/system-health", {}, accessToken),
  getInternalApiEndpoints: (accessToken?: string) =>
    apiRequest<InternalApiCatalogResponse>("/admin/internal/api-endpoints", {}, accessToken),
  getInternalArchitectureStatus: (accessToken?: string) =>
    apiRequest<InternalArchitectureStatusResponse>("/admin/internal/architecture-status", {}, accessToken),
  getInternalQuotes: (limit = 200, status = "all", search?: string, accessToken?: string) =>
    apiRequest<InternalAdminQuoteResponse[]>(
      `/admin/internal/quotes?limit=${limit}&status=${encodeURIComponent(status)}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      {},
      accessToken
    ),
  updateInternalQuoteStatus: (quoteId: string, status: "draft" | "pending" | "approved" | "rejected" | "converted", accessToken?: string) =>
    apiRequest<InternalAdminQuoteResponse>(
      `/admin/internal/quotes/${quoteId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      },
      accessToken
    ),
  convertInternalQuoteToInvoice: (quoteId: string, accessToken?: string) =>
    apiRequest<InternalAdminQuoteConversionResponse>(
      `/admin/internal/quotes/${quoteId}/convert-to-invoice`,
      {
        method: "POST",
      },
      accessToken
    ),
  getInternalInvoices: (
    limit = 200,
    status = "all",
    search?: string,
    tenantId?: string,
    accessToken?: string
  ) =>
    apiRequest<InternalAdminInvoiceResponse[]>(
      `/admin/internal/invoices?limit=${limit}&status=${encodeURIComponent(status)}${search ? `&search=${encodeURIComponent(search)}` : ""}${tenantId ? `&tenantId=${encodeURIComponent(tenantId)}` : ""}`,
      {},
      accessToken
    ),
  updateInternalInvoiceStatus: (
    invoiceId: string,
    status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "failed",
    accessToken?: string
  ) =>
    apiRequest<InternalAdminInvoiceResponse>(
      `/admin/internal/invoices/${invoiceId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      },
      accessToken
    ),
  getInternalTenantBilling: (limit = 200, search?: string, accessToken?: string) =>
    apiRequest<InternalAdminTenantBillingResponse>(
      `/admin/internal/tenant-billing?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      {},
      accessToken
    ),
  getInternalRevenueAnalytics: (months = 12, accessToken?: string) =>
    apiRequest<InternalAdminRevenueAnalyticsResponse>(
      `/admin/internal/revenue-analytics?months=${months}`,
      {},
      accessToken
    ),
  getInternalAiDashboard: (limit = 300, accessToken?: string) =>
    apiRequest<InternalAdminAiDashboardResponse>(
      `/admin/internal/ai-dashboard?limit=${limit}`,
      {},
      accessToken
    ),
  getInternalAutomationLogs: (limit = 500, accessToken?: string) =>
    apiRequest<InternalAdminAutomationLogsResponse>(
      `/admin/internal/automation-logs?limit=${limit}`,
      {},
      accessToken
    ),
  getInternalFeatureFlags: (accessToken?: string) =>
    apiRequest<InternalAdminFeatureFlagsResponse>(
      "/admin/internal/feature-flags",
      {},
      accessToken
    ),
  me: (accessToken?: string) => apiRequest<UserProfileResponse>("/users/me", {}, accessToken),
  getRoles: (accessToken?: string) =>
    apiRequest<RoleResponse[]>("/rbac/roles", {}, accessToken),
  createRole: (name: string, description: string, accessToken?: string) =>
    apiRequest<RoleResponse>(
      "/rbac/roles",
      {
        method: "POST",
        body: JSON.stringify({ name, description }),
      },
      accessToken
    ),
  updateRole: (roleId: string, name: string, description: string, accessToken?: string) =>
    apiRequest<RoleResponse>(
      `/rbac/roles/${roleId}`,
      {
        method: "PUT",
        body: JSON.stringify({ name, description }),
      },
      accessToken
    ),
  deleteRole: (roleId: string, accessToken?: string) =>
    apiRequest<void>(`/rbac/roles/${roleId}`, { method: "DELETE" }, accessToken),
  getPolicies: (accessToken?: string) =>
    apiRequest<{ policyId: string; name: string; permissions: string[] }[]>("/rbac/policies", {}, accessToken),
  updatePolicy: (policyId: string, permissions: string[], accessToken?: string) =>
    apiRequest<void>(
      `/rbac/policies/${encodeURIComponent(policyId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      },
      accessToken
    ),
  getAccessReview: (limit = 100, accessToken?: string) =>
    apiRequest<AccessReviewUserResponse[]>(
      `/rbac/access-review?limit=${limit}`,
      {},
      accessToken
    ),
  getIdentityAccessMetrics: (accessToken?: string) =>
    apiRequest<IdentityAccessMetricsResponse>("/rbac/metrics", {}, accessToken),
  updateUserRoles: (id: string, roles: string[], accessToken?: string) =>
    apiRequest<void>(`/users/${id}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roles }),
    }, accessToken),
  getOrgStructure: (accessToken?: string) =>
    apiRequest<OrgNodeDto[]>("/org/structure", {}, accessToken),
  getEmployees: (page = 1, pageSize = 200, accessToken?: string) =>
    apiRequest<EmployeesPagedResponse>(`/org/employees?page=${page}&pageSize=${pageSize}`, {}, accessToken),
  getEmployeeById: (employeeId: string, accessToken?: string) =>
    apiRequest<EmployeeDto>(`/org/employees/${employeeId}`, {}, accessToken),
  updateEmployeeRole: (employeeId: string, role: string, accessToken?: string) =>
    apiRequest<EmployeeDto>(
      `/org/employees/${employeeId}/role`,
      {
        method: "PUT",
        body: JSON.stringify({ role }),
      },
      accessToken
    ),
  getManagerChain: (employeeId: string, accessToken?: string) =>
    apiRequest<{ employeeId: string; chain: EmployeeDto[] }>(`/org/employees/${employeeId}/manager-chain`, {}, accessToken),
  getDirectReports: (managerId: string, accessToken?: string) =>
    apiRequest<{ managerId: string; reports: EmployeeDto[] }>(`/org/managers/${managerId}/direct-reports`, {}, accessToken),
  updatePortalAccess: (employeeId: string, isEnabled: boolean, allowedWidgets: string[], accessToken?: string) =>
    apiRequest<{ employeeId: string; isEnabled: boolean; allowedWidgets: string[] }>(
      `/workforce/employees/${employeeId}/portal-access`,
      {
        method: "PUT",
        body: JSON.stringify({ isEnabled, allowedWidgets }),
      },
      accessToken
    ),
  getPayrollRuns: (accessToken?: string) => apiRequest<PayrollRunDto[]>("/payroll/runs", {}, accessToken),
  createPayrollRun: (period: string, idempotencyKey: string, accessToken?: string) =>
    apiRequest<PayrollRunDto>("/payroll/runs", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ period }),
    }, accessToken),
  approvePayrollRun: (runId: string, idempotencyKey: string, accessToken?: string) =>
    apiRequest<{ runId: string; action: string; status: string }>(`/payroll/runs/${runId}/approve`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    }, accessToken),
  disbursePayrollRun: (runId: string, idempotencyKey: string, accessToken?: string) =>
    apiRequest<{ runId: string; action: string; status: string }>(`/payroll/runs/${runId}/disburse`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    }, accessToken),
  getEmployeePayslips: (employeeId: string, accessToken?: string) =>
    apiRequest<PayslipDto[]>(`/payroll/employees/${employeeId}/payslips`, {}, accessToken),
  getEmployeePayslipForPeriod: (employeeId: string, period: string, accessToken?: string) =>
    apiRequest<PayslipDto>(`/payroll/employees/${employeeId}/payslips/${period}`, {}, accessToken),
  emailEmployeePayslip: (employeeId: string, period: string, idempotencyKey: string, accessToken?: string) =>
    apiRequest<{ employeeId: string; period: string; email: string; dispatchStatus: string }>(
      `/payroll/employees/${employeeId}/payslips/${period}/email`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      },
      accessToken
    ),
};
