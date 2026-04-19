export type ProjectState = 'pre-production' | 'production' | 'post-production';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

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
}

export interface ProjectLog {
  id: string;
  project_id: string;
  notes: string;
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
