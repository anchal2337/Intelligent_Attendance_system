/**
 * AttendOS API Client
 * Connects frontend to the FastAPI + Supabase PostgreSQL backend.
 */

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

function getToken(): string | null {
  return localStorage.getItem('attend-os-token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('attend-os-token', token);
  } else {
    localStorage.removeItem('attend-os-token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// ── AUTH API ──────────────────────────────────────────────────────────────────
export const authApi = {
  async login(payload: { role: 'admin' | 'teacher'; username?: string; password: string; teacher_id?: string }) {
    const data = await request<{
      access_token: string;
      token_type: string;
      portal: string;
      teacher_id?: string;
      user: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(data.access_token);
    return data;
  },

  async getMe() {
    return request<any>('/auth/me');
  },

  logout() {
    setToken(null);
  },
};

// ── STUDENTS API ──────────────────────────────────────────────────────────────
export const studentsApi = {
  async getAll(params?: { dept?: string; year?: string; category?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.dept && params.dept !== 'All') q.append('dept', params.dept);
    if (params?.year && params.year !== 'All') q.append('year', params.year);
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);

    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/students/${qs}`);
  },

  async getById(id: string) {
    return request<any>(`/students/${id}`);
  },

  async create(data: {
    name: string;
    rollNo: string;
    dept: string;
    year?: string;
    section?: string;
    email?: string;
    phone?: string;
    category?: string;
    role?: string;
  }) {
    return request<any>('/students/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addRemark(studentId: string, remark: { text: string; category?: string; date?: string }) {
    return request<any>(`/students/${studentId}/remarks`, {
      method: 'POST',
      body: JSON.stringify(remark),
    });
  },
};

// ── DEPARTMENTS API ───────────────────────────────────────────────────────────
export const departmentsApi = {
  async getAll() {
    return request<any[]>('/departments/');
  },
};

// ── LECTURES API ──────────────────────────────────────────────────────────────
export const lecturesApi = {
  async getAll(params?: { dept?: string; date?: string; start_date?: string; end_date?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.dept && params.dept !== 'All') q.append('dept', params.dept);
    if (params?.date) q.append('date', params.date);
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.status) q.append('status', params.status);

    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/lectures/${qs}`);
  },

  async getToday(dept?: string) {
    const qs = dept && dept !== 'All' ? `?dept=${dept}` : '';
    return request<any[]>(`/lectures/today${qs}`);
  },

  async startSession(lectureId: string) {
    return request<any>(`/lectures/${encodeURIComponent(lectureId)}/start`, {
      method: 'POST',
    });
  },

  async saveAttendance(lectureId: string, conductedBy?: string, attendanceMethod: string = 'Manual') {
    const q = new URLSearchParams();
    if (conductedBy) q.append('conducted_by', conductedBy);
    if (attendanceMethod) q.append('attendance_method', attendanceMethod);

    return request<any>(`/lectures/${encodeURIComponent(lectureId)}/save?${q.toString()}`, {
      method: 'POST',
    });
  },

  async setException(lectureId: string, status: string, reason: string = '', conductedBy?: string) {
    const q = conductedBy ? `?conducted_by=${encodeURIComponent(conductedBy)}` : '';
    return request<any>(`/lectures/${encodeURIComponent(lectureId)}/exception${q}`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  },
};

// ── ATTENDANCE API ────────────────────────────────────────────────────────────
export const attendanceApi = {
  async markGate(payload: { student_id: string; status: string; is_out?: boolean }) {
    return request<any>('/attendance/gate/mark', {
      method: 'POST',
      body: JSON.stringify({
        student_id: payload.student_id,
        status: payload.status,
        is_out: !!payload.is_out,
      }),
    });
  },

  async getGateToday(dept?: string) {
    const qs = dept && dept !== 'All' ? `?dept=${dept}` : '';
    return request<{
      date: string;
      checkedIn: number;
      checkedOut: number;
      notArrived: number;
      total: number;
    }>(`/attendance/gate/today${qs}`);
  },

  async markLectureSingle(lectureId: string, studentId: string, status: 'Present' | 'Absent', changedBy: string = 'Teacher') {
    const q = `?changed_by=${encodeURIComponent(changedBy)}`;
    return request<any>(`/attendance/lecture/${encodeURIComponent(lectureId)}/mark${q}`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, status }),
    });
  },

  async markLectureAll(lectureId: string, status: 'Present' | 'Absent', changedBy: string = 'Teacher') {
    const q = `?changed_by=${encodeURIComponent(changedBy)}`;
    return request<any>(`/attendance/lecture/${encodeURIComponent(lectureId)}/mark-all${q}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async voiceBatch(lectureId: string, commands: { text: string }[]) {
    return request<any[]>(`/attendance/lecture/${encodeURIComponent(lectureId)}/voice-batch`, {
      method: 'POST',
      body: JSON.stringify(commands),
    });
  },
};

// ── CALENDAR API ──────────────────────────────────────────────────────────────
export const calendarApi = {
  async getEvents(dept?: string, month?: string) {
    const q = new URLSearchParams();
    if (dept && dept !== 'All') q.append('dept', dept);
    if (month) q.append('month', month);

    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/calendar/events${qs}`);
  },

  async createEvent(data: { date: string; time: string; dept: string; subject: string; status: string; reason?: string }) {
    return request<any>('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ── SETTINGS API ──────────────────────────────────────────────────────────────
export const settingsApi = {
  async get() {
    return request<{
      minPct: number;
      college: string;
      lateAfter: number;
      dupePrev: boolean;
      autoStart: boolean;
      lowAlert: boolean;
    }>('/settings/');
  },

  async update(settings: Partial<{
    minPct: number;
    college: string;
    lateAfter: number;
    dupePrev: boolean;
    autoStart: boolean;
    lowAlert: boolean;
  }>) {
    return request<any>('/settings/', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};

// ── REPORTS API ───────────────────────────────────────────────────────────────
export const reportsApi = {
  async getDashboard(dept?: string) {
    const qs = dept && dept !== 'All' ? `?dept=${dept}` : '';
    return request<any>(`/reports/dashboard${qs}`);
  },

  async getDepartmentSummary() {
    return request<any[]>('/reports/department-summary');
  },

  async getDefaulters(threshold?: number, dept?: string) {
    const q = new URLSearchParams();
    if (threshold !== undefined) q.append('threshold', String(threshold));
    if (dept && dept !== 'All') q.append('dept', dept);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/reports/defaulters${qs}`);
  },

  getExportCsvUrl(dept?: string) {
    const qs = dept && dept !== 'All' ? `?dept=${dept}` : '';
    return `${API_BASE}/reports/export/csv${qs}`;
  },
};
