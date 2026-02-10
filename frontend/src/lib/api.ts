// API Client for Ortrace Backend
// In production builds we never use localhost; locally we default to localhost:3000.

const PROD_API_URL = "https://prod-ortrace-api-jtjotridxa-uc.a.run.app";
const DEV_API_URL = "http://localhost:3000";

function getApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    const envUrl = import.meta.env.VITE_API_URL;
    // In prod, never use localhost even if env is misconfigured
    if (typeof envUrl === "string" && envUrl && !/localhost|127\.0\.0\.1/i.test(envUrl)) {
      return envUrl.replace(/\/$/, "");
    }
    return PROD_API_URL;
  }
  return import.meta.env.VITE_API_URL || DEV_API_URL;
}

const API_BASE_URL = getApiBaseUrl();

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: 'internal' | 'customer';
  onboarding_completed: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Project types
export interface AnalysisQuestion {
  id: string;
  text: string;
  enabled: boolean;
  is_custom: boolean;
}

export interface AnalysisQuestions {
  bug: AnalysisQuestion[];
  feedback: AnalysisQuestion[];
  idea: AnalysisQuestion[];
}

export interface Project {
  id: string;
  name: string;
  domain: string | null;
  is_active: boolean;
  require_auth: boolean;
  analysis_questions: AnalysisQuestions;
  created_at: string;
  updated_at: string;
  ticket_count: number;
}

// Ticket types
export type FeedbackType = 'bug' | 'feedback' | 'idea';
export type TicketStatus = 'open' | 'in_progress' | 'in_qa' | 'todo' | 'backlog' | 'resolved';
export type TicketPriority = 'urgent' | 'high' | 'neutral' | 'low';
export type ProcessingStatus = 'pending' | 'recording' | 'uploading' | 'processing' | 'analyzed' | 'failed';

export interface TicketListItem {
  id: string;
  project_id: string | null;
  project_name: string | null;
  feedback_type: FeedbackType;
  ticket_status: TicketStatus;
  priority: TicketPriority;
  task_description: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  customer_name: string | null;
  assignee_name: string | null;
  assignee_id: string | null;
  category: string | null;
  page_url: string | null;
  status: ProcessingStatus;
  duration_seconds: number | null;
  issues_count: number;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketDetail {
  id: string;
  project_id: string | null;
  project_name: string | null;
  feedback_type: FeedbackType;
  ticket_status: TicketStatus;
  priority: TicketPriority;
  task_description: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  category: string | null;
  page_url: string | null;
  browser_info: Record<string, unknown>;
  video_url: string | null;
  duration_seconds: number | null;
  status: ProcessingStatus;
  ai_confidence: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  recording_id: string;
  executive_summary: {
    outcome: 'success' | 'partial' | 'failed';
    confidence: number;
    overview: string;
  };
  metrics: {
    task_completion_rate: number;
    total_hesitation_time: number;
    retries_count: number;
    abandonment_point: string | null;
  };
  issues: Issue[];
  question_analysis: QuestionAnalysis[];
  suggested_actions: string[];
  possible_solutions?: string[];
}

export interface Issue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  observed_behavior: string | null;
  expected_behavior: string | null;
  evidence: { type: string; value: string; description: string | null }[];
  screenshots: string[];
  impact: string[];
  reproduction_steps: string[];
  confidence: number | null;
  external_ticket_url: string | null;
}

export interface QuestionAnalysis {
  question: string;
  answer: string;
  observations: string[];
  confidence: number;
  timestamp: string | null;
}

export interface OverviewStats {
  feedback_count: number;
  bug_count: number;
  idea_count: number;
  open_count: number;
  open_pct: number;
  in_progress_count: number;
  in_progress_pct: number;
  in_qa_count: number;
  in_qa_pct: number;
  todo_count: number;
  todo_pct: number;
  backlog_count: number;
  backlog_pct: number;
  resolved_count: number;
  resolved_pct: number;
  total_count: number;
}

export interface ChatMessage {
  id: string;
  recording_id: string;
  sender_type: 'system' | 'team' | 'user';
  sender_name: string;
  sender_role: string | null;
  message: string;
  sent_at: string;
  edited_at: string | null;
  is_own: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Widget types
export interface WidgetConfig {
  project_id: string;
  project_name: string;
  domain: string | null;
  require_auth: boolean;
}

export interface WidgetSubmitResponse {
  ticket_id: string;
  message: string;
}

// ============================================================================
// API Error class
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// Token storage
// ============================================================================

const TOKEN_KEY = 'ortrace_access_token';
const REFRESH_TOKEN_KEY = 'ortrace_refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * URL for Google OAuth: send user here to start sign-in (backend redirects to Google, then back to frontend).
 * Pass redirectUri so the backend knows where to send the user after login (e.g. https://app.ortrace.com/auth/callback).
 * If omitted, backend uses its configured default (may be localhost in prod and cause wrong redirect).
 */
export function getGoogleOAuthStartUrl(redirectUri?: string): string {
  const base = `${API_BASE_URL}/api/v1/auth/google/start`;
  if (typeof redirectUri === "string" && redirectUri) {
    return `${base}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
  return base;
}

// ============================================================================
// API request helpers
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.code || 'UNKNOWN_ERROR',
      data.error || 'An error occurred'
    );
  }

  return data.data;
}

async function apiMultipartRequest<T>(
  endpoint: string,
  formData: FormData,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.code || 'UNKNOWN_ERROR',
      data.error || 'An error occurred'
    );
  }

  return data.data;
}

/// Public widget request — no auth headers needed
async function widgetRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.code || 'UNKNOWN_ERROR',
      data.error || 'An error occurred'
    );
  }

  return data.data;
}

// ============================================================================
// Auth API
// ============================================================================

export const authApi = {
  async register(email: string, password: string, name?: string, role: 'internal' | 'customer' = 'internal'): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async googleAuth(idToken: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/api/v1/auth/me');
  },

  async completeOnboarding(name: string, companyName?: string): Promise<User> {
    return apiRequest<User>('/api/v1/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify({ name, company_name: companyName }),
    });
  },
};

// ============================================================================
// Projects API
// ============================================================================

export const projectsApi = {
  async create(data: {
    name: string;
    domain: string;
    require_auth?: boolean;
    is_active?: boolean;
    analysis_questions?: AnalysisQuestions;
  }): Promise<Project> {
    return apiRequest<Project>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list(): Promise<Project[]> {
    return apiRequest<Project[]>('/api/v1/projects');
  },

  async get(id: string): Promise<Project> {
    return apiRequest<Project>(`/api/v1/projects/${id}`);
  },

  async update(
    id: string,
    data: {
      name?: string;
      domain?: string | null;
      is_active?: boolean;
      require_auth?: boolean;
      analysis_questions?: AnalysisQuestions;
    }
  ): Promise<Project> {
    return apiRequest<Project>(`/api/v1/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/api/v1/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Tickets API
// ============================================================================

export const ticketsApi = {
  async list(params?: {
    project_id?: string;
    feedback_type?: FeedbackType;
    ticket_status?: TicketStatus;
    priority?: TicketPriority;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<TicketListItem>> {
    const searchParams = new URLSearchParams();
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    if (params?.feedback_type) searchParams.set('feedback_type', params.feedback_type);
    if (params?.ticket_status) searchParams.set('ticket_status', params.ticket_status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.per_page) searchParams.set('per_page', String(params.per_page));

    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<TicketListItem>>(`/api/v1/tickets${query ? `?${query}` : ''}`);
  },

  async get(id: string): Promise<TicketDetail> {
    return apiRequest<TicketDetail>(`/api/v1/tickets/${id}`);
  },

  async update(id: string, data: {
    ticket_status?: TicketStatus;
    priority?: TicketPriority;
    assignee_id?: string;
    category?: string;
  }): Promise<void> {
    await apiRequest<void>(`/api/v1/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async close(id: string): Promise<void> {
    await apiRequest<void>(`/api/v1/tickets/${id}/close`, {
      method: 'POST',
    });
  },

  async reopen(id: string): Promise<void> {
    await apiRequest<void>(`/api/v1/tickets/${id}/reopen`, {
      method: 'POST',
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/api/v1/tickets/${id}`, {
      method: 'DELETE',
    });
  },

  async getReport(id: string): Promise<Report> {
    return apiRequest<Report>(`/api/v1/tickets/${id}/report`);
  },

  async getOverview(): Promise<OverviewStats> {
    return apiRequest<OverviewStats>('/api/v1/tickets/overview');
  },

  getVideoUrl(id: string): string {
    return `${API_BASE_URL}/api/v1/tickets/${id}/video`;
  },
};

// ============================================================================
// Chat API
// ============================================================================

export const chatApi = {
  async getMessages(ticketId: string): Promise<ChatMessage[]> {
    return apiRequest<ChatMessage[]>(`/api/v1/tickets/${ticketId}/messages`);
  },

  async sendMessage(ticketId: string, message: string): Promise<ChatMessage> {
    return apiRequest<ChatMessage>(`/api/v1/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async editMessage(ticketId: string, messageId: string, message: string): Promise<void> {
    await apiRequest<void>(`/api/v1/tickets/${ticketId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ message }),
    });
  },

  async deleteMessage(ticketId: string, messageId: string): Promise<void> {
    await apiRequest<void>(`/api/v1/tickets/${ticketId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Widget API (public — identified by project ID, no auth)
// ============================================================================

export const widgetApi = {
  /** Look up project config by domain (auto-detection) */
  async getConfigByDomain(domain: string): Promise<WidgetConfig> {
    return widgetRequest<WidgetConfig>(`/api/v1/widget/config?domain=${encodeURIComponent(domain)}`);
  },

  /** Look up project config by project ID (fallback) */
  async getConfigById(projectId: string): Promise<WidgetConfig> {
    return widgetRequest<WidgetConfig>(`/api/v1/widget/${projectId}/config`);
  },

  async submit(projectId: string, data: {
    feedback_type: FeedbackType;
    description: string;
    submitter_email?: string;
    submitter_name?: string;
    page_url?: string;
    browser_info?: Record<string, unknown>;
  }): Promise<WidgetSubmitResponse> {
    return widgetRequest<WidgetSubmitResponse>(`/api/v1/widget/${projectId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadVideo(projectId: string, ticketId: string, videoBlob: Blob, duration: number): Promise<WidgetSubmitResponse> {
    const url = `${API_BASE_URL}/api/v1/widget/${projectId}/tickets/${ticketId}/upload`;
    const formData = new FormData();
    formData.append('video', videoBlob, 'recording.webm');
    formData.append('duration', String(Math.round(duration)));

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.code || 'UNKNOWN_ERROR',
        data.error || 'An error occurred'
      );
    }

    return data.data;
  },
};
