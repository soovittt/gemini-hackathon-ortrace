# Ortace Frontend (Hackathon)

Runnable frontend subset for hackathon demos. Includes:

- **Landing** – marketing page, CTA
- **Auth** – sign-in (Google OAuth), auth callback
- **Dummy** – widget demo page with feedback FAB
- **Overview, Tickets, etc.** – full app routes (require backend)

## Run

```bash
npm install
npm run dev
```

Open http://localhost:8080. Use **Try the Widget Demo** for the feedback widget.

## Env

Copy `.env.example` to `.env` and set `VITE_API_URL` if needed (defaults: prod API in production build, localhost:3000 in dev).

## Files

- Config: `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `index.html`
- Entry: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Pages: `src/pages/` (Landing, Auth, AuthCallback, Dummy, Overview, …)
- Components: `src/components/` (FeedbackWidget, layout, landing, ui)
- Lib: `src/lib/api.ts`, `src/lib/domain.ts`, `src/contexts/AuthContext.tsx`

Test files are omitted.
