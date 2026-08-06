alter table public.applications
  add column email text;

update public.applications
set email = 'unknown+' || id::text || '@invalid.local'
where email is null;

alter table public.applications
  alter column email set not null,
  add constraint applications_email_format_check
    check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

create index applications_email_idx on public.applications (lower(email));
