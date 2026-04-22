export type ProjectState = 'pre-production' | 'production' | 'post-production';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type Severity = 'low' | 'medium' | 'high';
export type RequestStatus = 'pending' | 'in-progress' | 'done';
export type ActionStatus = 'open' | 'in-progress' | 'done';

export interface Developer {
  id: string;
  name: string;
  role: string | null;
  archived: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  state: ProjectState;
  start_date: string | null;
  end_date: string | null;
  archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  developer_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  archived: boolean;
  created_at: string;
  developer?: Developer;
  project?: { id: string; name: string };
}

export interface ProjectLog {
  id: string;
  project_id: string;
  notes: string;
  flagged?: boolean;
  log_date: string;
  created_at: string;
}

export interface DeveloperLog {
  id: string;
  developer_id: string;
  notes: string;
  flagged: boolean;
  log_date: string;
  created_at: string;
}

export interface Risk {
  id: string;
  project_id: string;
  description: string;
  severity: Severity;
  created_at: string;
}

export interface Request {
  id: string;
  title: string;
  description: string | null;
  requester: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface RequestNote {
  id: string;
  request_id: string;
  notes: string;
  log_date: string;
  created_at: string;
}

export interface Standup {
  id: string;
  notes: string;
  standup_date: string;
  archived: boolean;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  group_name: string | null;
  notes: string | null;
  meeting_date: string;
  archived: boolean;
  created_at: string;
}

export interface Action {
  id: string;
  description: string;
  status: ActionStatus;
  standup_id: string | null;
  meeting_id: string | null;
  standup?: { id: string; standup_date: string } | null;
  meeting?: { id: string; title: string; group_name: string | null } | null;
  created_at: string;
}
