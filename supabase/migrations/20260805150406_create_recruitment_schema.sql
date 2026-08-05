create extension if not exists pgcrypto;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'queued', 'sent', 'opened', 'failed')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  age smallint not null check (age between 16 and 100),
  location text not null check (char_length(location) between 2 and 160),
  whatsapp text not null check (char_length(whatsapp) between 8 and 40),
  languages text not null check (char_length(languages) between 2 and 240),
  role text not null
    check (role in ('Brand Designer', 'Website Designer', 'I can do both')),
  branding_rate numeric(10, 2) check (branding_rate is null or branding_rate >= 0),
  website_rate numeric(10, 2) check (website_rate is null or website_rate >= 0),
  portfolio_url text not null check (portfolio_url ~ '^https?://'),
  rejection_reason text,
  decided_at timestamptz,
  constraint role_rate_required check (
    (role = 'Brand Designer' and branding_rate is not null)
    or (role = 'Website Designer' and website_rate is not null)
    or (role = 'I can do both' and branding_rate is not null and website_rate is not null)
  )
);

create index applications_status_submitted_idx
  on public.applications (status, submitted_at desc);
create index applications_role_idx on public.applications (role);

create table public.application_events (
  id bigint generated always as identity primary key,
  event_type text not null
    check (event_type in ('form_started', 'form_completed', 'email_sent', 'email_opened')),
  application_id uuid references public.applications(id) on delete cascade,
  occurred_at timestamptz not null default now()
);

create index application_events_type_occurred_idx
  on public.application_events (event_type, occurred_at desc);

alter table public.applications enable row level security;
alter table public.application_events enable row level security;

create policy "Public can submit pending applications"
  on public.applications
  for insert
  to anon
  with check (
    status = 'pending'
    and email_status = 'not_sent'
    and rejection_reason is null
    and decided_at is null
  );

create policy "Public can record form events"
  on public.application_events
  for insert
  to anon
  with check (
    event_type in ('form_started', 'form_completed')
    and application_id is null
  );

create policy "Admin can read applications"
  on public.applications
  for select
  to authenticated
  using ((select auth.jwt()) ->> 'email' = 'louisstaub67@gmail.com');

create policy "Admin can update applications"
  on public.applications
  for update
  to authenticated
  using ((select auth.jwt()) ->> 'email' = 'louisstaub67@gmail.com')
  with check ((select auth.jwt()) ->> 'email' = 'louisstaub67@gmail.com');

create policy "Admin can read application events"
  on public.application_events
  for select
  to authenticated
  using ((select auth.jwt()) ->> 'email' = 'louisstaub67@gmail.com');
