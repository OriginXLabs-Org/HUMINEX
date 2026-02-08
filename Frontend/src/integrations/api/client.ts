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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";
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
  me: (accessToken?: string) => apiRequest<UserProfileResponse>("/users/me", {}, accessToken),
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
