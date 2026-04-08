/**
 * API client module — all backend communication goes through here.
 */

const API_BASE = '/api';

/**
 * Generic API request helper with error handling.
 */
async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`;

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const message = data.error?.message || `Request failed with status ${response.status}`;
      throw new ApiError(message, data.error?.code || 'UNKNOWN', response.status);
    }

    return data.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Network error. Please check your connection and try again.',
      'NETWORK_ERROR',
      0,
    );
  }
}

/** Custom error class for API errors */
export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Submit input for AI triage analysis */
export async function submitTriage(sessionId, input) {
  return apiRequest(`/sessions/${sessionId}/triage`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

/** Send a follow-up chat message */
export async function sendChatMessage(sessionId, message) {
  return apiRequest(`/sessions/${sessionId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/** Generate an incident report */
export async function generateReport(sessionId) {
  return apiRequest(`/sessions/${sessionId}/report`, {
    method: 'POST',
  });
}

/** Get current session state */
export async function getSessionState(sessionId) {
  return apiRequest(`/sessions/${sessionId}`);
}

/** List past cases */
export async function listCases() {
  return apiRequest('/cases');
}

/** Get case detail */
export async function getCaseDetail(caseId) {
  return apiRequest(`/cases/${caseId}`);
}
