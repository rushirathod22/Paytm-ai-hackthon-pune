import { UserRole } from '../types';

const API_BASE = '/api/v1';

async function fetchFreshDemoToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'MERCHANT' }),
    });
    const data = await res.json();
    if (data.ok && data.data?.access_token) {
      localStorage.setItem('opssaathi_token', data.data.access_token);
      return data.data.access_token;
    }
  } catch (err) {
    console.warn('Auto demo login failed:', err);
  }
  return null;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data: T; meta?: any; error?: any }> {
  let token = localStorage.getItem('opssaathi_token');

  // If no token exists and not calling demo-login, acquire one automatically
  if (!token && !endpoint.includes('/auth/demo-login')) {
    token = await fetchFreshDemoToken();
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401 Unauthorized, refresh the demo token and retry once
  if (response.status === 401 && !endpoint.includes('/auth/demo-login')) {
    localStorage.removeItem('opssaathi_token');
    const freshToken = await fetchFreshDemoToken();
    if (freshToken) {
      headers.set('Authorization', `Bearer ${freshToken}`);
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  const json = await response.json();
  if (!response.ok && !json.error) {
    throw new Error(json.detail || 'API request failed');
  }
  return json;
}

export const opsApi = {
  // Auth
  demoLogin: (role: UserRole) =>
    apiRequest('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  getMe: () => apiRequest('/auth/me'),

  // Merchant Data
  getTransactions: () => apiRequest('/transactions'),
  getSettlements: () => apiRequest('/settlements'),

  // Agent Chat & Voice
  sendMessage: (message: string, conversation_id?: string, channel: string = 'CHAT') =>
    apiRequest('/agent/messages', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id, channel }),
    }),

  // Voice Session
  createVoiceSession: (conversation_id?: string, language_code: string = 'en-IN') =>
    apiRequest('/voice/sessions', {
      method: 'POST',
      body: JSON.stringify({ conversation_id, language_code }),
    }),

  submitVoiceTranscription: (session_id: string, conversation_id: string, transcript: string, language_code: string = 'en-IN') =>
    apiRequest('/voice/transcriptions', {
      method: 'POST',
      body: JSON.stringify({
        session_id,
        conversation_id,
        audio_transcript: transcript,
        language_code,
      }),
    }),

  // Cases
  listCases: (status?: string) =>
    apiRequest(`/cases${status ? `?status=${status}` : ''}`),
  getCaseDetail: (id: string) => apiRequest(`/cases/${id}`),
  approveCase: (id: string, notes?: string) =>
    apiRequest(`/cases/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'APPROVE_REMEDIATION', notes }),
    }),
  rejectCase: (id: string, reason: string) =>
    apiRequest(`/cases/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  verifyCase: (id: string) =>
    apiRequest(`/cases/${id}/verify`, {
      method: 'POST',
    }),

  // Health & Demo Safety Reset
  getHealth: () => apiRequest('/health'),
  resetDemo: () =>
    apiRequest('/health/reset-demo', {
      method: 'POST',
    }),
};
