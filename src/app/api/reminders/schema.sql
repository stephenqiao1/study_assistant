create table if not exists reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date timestamp with time zone not null,
  type text not null check (type in ('assignment', 'exam')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
); 