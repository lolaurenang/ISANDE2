/**
 * The only place in the View that knows how to talk to the API.
 * Every page calls these helpers, so auth headers, JSON parsing and
 * error shaping are handled once.
 */
const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'andoys.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  const query = entries.length ? `?${new URLSearchParams(entries).toString()}` : '';

  const token = tokenStore.get();
  const res = await fetch(`${BASE}/api${path}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new ApiError(
      payload?.message || 'The server could not complete that request',
      res.status,
      payload?.details
    );
  }

  return payload;
}

/**
 * Downloads a file from an authenticated endpoint.
 * A plain <a href> cannot carry the Authorization header, so the file is
 * fetched, turned into a blob, and handed to a temporary link.
 */
export async function downloadFile(path, params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  const query = entries.length ? `?${new URLSearchParams(entries).toString()}` : '';

  const token = tokenStore.get();
  const res = await fetch(`${BASE}/api${path}${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let message = 'The download failed';
    try {
      message = (await res.json())?.message || message;
    } catch {
      /* the server sent something that is not JSON */
    }
    throw new ApiError(message, res.status);
  }

  // Prefer the filename the server chose.
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'download.csv';

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return filename;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

/* --------- Named endpoints, grouped the way the screens use them -------- */
export const authApi = {
  login: (body) => api.post('/auth/login', body),
  signup: (body) => api.post('/auth/signup', body),
  me: () => api.get('/auth/me'),
  changePassword: (body) => api.patch('/auth/password', body),
};

export const dashboardApi = {
  home: () => api.get('/dashboard/home'),
  manager: (params) => api.get('/dashboard/manager', params),
  calendar: (params) => api.get('/dashboard/calendar', params),
};

export const jobsApi = {
  list: (params) => api.get('/jobs', params),
  create: (body) => api.post('/jobs', body),
  update: (id, body) => api.patch(`/jobs/${id}`, body),
  remove: (id) => api.delete(`/jobs/${id}`),
  logWork: (id, body) => api.post(`/jobs/${id}/logs`, body),
  suggest: (params) => api.get('/jobs/suggest', params),
};

export const attendanceApi = {
  today: () => api.get('/attendance/today'),
  clockIn: () => api.post('/attendance/clock-in'),
  clockOut: () => api.post('/attendance/clock-out'),
  list: (params) => api.get('/attendance', params),
  summary: (params) => api.get('/attendance/summary', params),
};

export const availabilityApi = {
  // Without ?employee= or ?all=true this always returns your own days.
  mine: (params) => api.get('/availability', params),
  forEmployee: (employee, params) => api.get('/availability', { ...params, employee }),
  all: (params) => api.get('/availability', { ...params, all: 'true' }),
  set: (body) => api.post('/availability', body),
  bulk: (body) => api.post('/availability/bulk', body),
  bulkRemove: (dates) => api.post('/availability/bulk-remove', { dates }),
  remove: (workDate) => api.delete(`/availability/${workDate}`),
  roster: (params) => api.get('/availability/roster', params),
};

export const reportsApi = {
  types: () => api.get('/reports'),
  run: (type, params) => api.get(`/reports/${type}`, params),
  download: (type, params) => downloadFile(`/reports/${type}`, { ...params, format: 'csv' }),
};

export const usersApi = {
  list: (params) => api.get('/users', params),
  create: (body) => api.post('/users', body),
  update: (id, body) => api.patch(`/users/${id}`, body),
  deactivate: (id) => api.delete(`/users/${id}`),
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', params),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const requestsApi = {
  list: (params) => api.get('/requests', params),
  create: (body) => api.post('/requests', body),
  review: (id, body) => api.patch(`/requests/${id}/review`, body),
  cancel: (id) => api.delete(`/requests/${id}`),
};
