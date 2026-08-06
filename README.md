# RUFF Recruitment

Recruitment form and candidate review dashboard for RUFF.

## Pages

- `/` — candidate application
- `/admin` — authenticated talent dashboard

## Stack

- Static HTML, CSS and JavaScript
- Supabase Database and Auth
- Vercel hosting with GitHub automatic deployments

Database changes are stored in `supabase/migrations`.

## Rejection emails

Rejection emails are sent by the authenticated `send-rejection-email` Supabase Edge Function through Resend. Configure these Edge Function secrets before using it:

- `RESEND_API_KEY` — API key created in Resend
- `RESEND_FROM` — verified sender, for example `RUFF Recruitment <recruitment@ruff.agency>`
- `ADMIN_EMAIL` — optional; defaults to `louisstaub67@gmail.com`

The frontend never receives the Resend API key.
