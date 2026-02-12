Frontend (Next.js)

Run
- `cd frontend && npm ci`
- `npm run dev` (port 3000)

Env
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` required.
- `NEXT_PUBLIC_API_URL` to point to backend (defaults to http://127.0.0.1:8000).

Notes
- Wizard posts to backend intake endpoint and polls Supabase plus backend for status.
- Supabase auth guards `/dashboard/*` via middleware.
