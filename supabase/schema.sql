create type project_state as enum ('pre-production', 'production', 'post-production');
create type task_status as enum ('todo', 'in-progress', 'done');

create table developers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  state project_state not null default 'pre-production',
  start_date date,
  end_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  developer_id uuid references developers(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table project_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  notes text not null,
  log_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table developer_logs (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid references developers(id) on delete cascade,
  notes text not null,
  flagged boolean not null default false,
  log_date date not null default current_date,
  created_at timestamptz not null default now()
);
