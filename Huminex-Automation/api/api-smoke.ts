const baseUrl = process.env.API_BASE_URL || "http://localhost:5035";

interface CheckResult {
  name: string;
  ok: boolean;
  status?: number;
  bodySnippet?: string;
}

const checks: Array<{ name: string; path: string; method?: string; headers?: Record<string, string> }> = [
  { name: "health", path: "/api/v1/system/health" },
  {
    name: "auth-login",
    path: "/api/v1/auth/login",
    method: "POST",
    headers: { "content-type": "application/json" },
  },
  {
    name: "payroll-runs-rbac",
    path: "/api/v1/payroll/runs",
    headers: {
      "X-Tenant-Id": "11111111-1111-1111-1111-111111111111",
      "X-User-Id": "22222222-2222-2222-2222-222222222222",
      "X-User-Email": "admin@gethuminex.com",
      "X-User-Role": "admin",
      "X-User-Permissions": "payroll.read",
    },
  },
];

async function run(): Promise<void> {
  const results: CheckResult[] = [];

  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    const method = check.method || "GET";
    let body: string | undefined;

    if (check.name === "auth-login") {
      body = JSON.stringify({ email: "admin@gethuminex.com", password: "demo" });
    }

    try {
      const response = await fetch(url, {
        method,
        headers: check.headers,
        body,
      });
      const text = await response.text();
      const bodySnippet = text.slice(0, 220);

      const ok =
        check.name === "auth-login"
          ? response.status === 200
          : check.name === "payroll-runs-rbac"
            ? response.status === 200 || response.status === 401 || response.status === 403
            : response.ok;

      results.push({ name: check.name, ok, status: response.status, bodySnippet });
    } catch (error) {
      results.push({ name: check.name, ok: false, bodySnippet: String(error) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  for (const result of results) {
    console.log(`[${result.ok ? "PASS" : "FAIL"}] ${result.name} status=${result.status ?? "n/a"}`);
  }

  if (failed.length > 0) {
    console.error("\nAPI smoke failures:");
    for (const fail of failed) {
      console.error(`- ${fail.name}: ${fail.bodySnippet || "no response"}`);
    }
    process.exit(1);
  }
}

run();
