create table public.reminders (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  due_date timestamp with time zone not null,
  type text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  study_session_id uuid not null,
  constraint reminders_pkey primary key (id),
  constraint reminders_study_session_id_fkey foreign KEY (study_session_id) references study_sessions (id) on delete CASCADE,
  constraint reminders_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint reminders_type_check check (
    (
      type = any (array['assignment'::text, 'exam'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_reminders_study_session_id on public.reminders using btree (study_session_id) TABLESPACE pg_default; 