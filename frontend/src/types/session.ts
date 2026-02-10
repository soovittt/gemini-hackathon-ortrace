// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  domain: string | null;
  is_active: boolean;
  require_auth: boolean;
  analysis_questions: {
    bug: { id: string; text: string; enabled: boolean; is_custom: boolean }[];
    feedback: { id: string; text: string; enabled: boolean; is_custom: boolean }[];
    idea: { id: string; text: string; enabled: boolean; is_custom: boolean }[];
  };
  created_at: string;
  updated_at: string;
  ticket_count: number;
}

// ============================================================================
// Ticket Types
// ============================================================================

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

// ============================================================================
// Report / Issue / Analysis Types
// ============================================================================

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export type IssueTag =
  | 'infra'
  | 'ux'
  | 'cloud'
  | 'ml'
  | 'ai'
  | 'frontend'
  | 'backend'
  | 'api'
  | 'security'
  | 'performance';

export interface IssueType {
  id: string;
  title: string;
  tags: IssueTag[];
  severity: IssueSeverity;
  observedBehavior: string;
  expectedBehavior: string;
  evidence: Array<{
    type: 'screenshot' | 'timestamp';
    value: string;
    description?: string;
  }>;
  screenshots?: string[];
  impact: string[];
  reproductionSteps: string[];
  confidence: number;
  externalTicketUrl?: string;
}

export interface QuestionAnalysis {
  question: string;
  answer: string;
  observations: string[];
  confidence: number;
  timestamp?: string;
}

export interface TicketReport {
  id: string;
  ticket_id: string;
  executive_summary: {
    outcome: 'success' | 'partial' | 'failed';
    confidence: number;
    overview: string;
  };
  metrics: {
    task_completion_rate: number;
    total_hesitation_time: number;
    retries_count: number;
    abandonment_point?: string;
  };
  issues: IssueType[];
  question_analysis: QuestionAnalysis[];
  suggested_actions: string[];
}

// ============================================================================
// Overview / Analytics Types
// ============================================================================

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

export interface AnalyticsData {
  totalProjects: number;
  totalTickets: number;
  totalIssues: number;
  avgCompletionRate: number;
  issuesOverTime: Array<{ date: string; bugs: number; ux: number; features: number }>;
  issuesByType: { bug: number; ux: number; feature: number };
  issuesBySeverity: { critical: number; high: number; medium: number; low: number };
  issuesByProductArea: Array<{ area: string; count: number }>;
  recentActivity: Array<{
    projectName: string;
    userName: string;
    completedAt: string;
    issuesFound: number;
  }>;
}

// ============================================================================
// Chat Types
// ============================================================================

export type TeamRole =
  | 'infra'
  | 'ux'
  | 'frontend'
  | 'backend'
  | 'adoption'
  | 'support'
  | 'product'
  | 'engineering';

export interface ChatMessage {
  id: string;
  ticket_id: string;
  sender_type: 'system' | 'team' | 'user';
  sender_name: string;
  sender_role?: string;
  message: string;
  sent_at: string;
  edited_at?: string | null;
  is_own: boolean;
}
