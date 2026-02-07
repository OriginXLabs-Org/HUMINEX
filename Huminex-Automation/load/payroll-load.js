import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: __ENV.VUS ? Number(__ENV.VUS) : 10,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1200'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5035';

export default function () {
  const params = {
    headers: {
      'X-Tenant-Id': '11111111-1111-1111-1111-111111111111',
      'X-User-Id': '22222222-2222-2222-2222-222222222222',
      'X-User-Email': 'admin@gethuminex.com',
      'X-User-Role': 'admin',
      'X-User-Permissions': 'payroll.read',
    },
  };

  const res = http.get(`${BASE_URL}/api/v1/payroll/runs`, params);
  check(res, {
    'status is 200 or 403': (r) => r.status === 200 || r.status === 403,
  });

  sleep(1);
}
