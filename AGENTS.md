# DramaSpeak Project Instructions

## Project

DramaSpeak is an immersive two-person English theatre. Scenarios may be professional or personal, but every story must be driven mainly by conversation and practice transferable spoken-English skills.

## Run and verify

- Install: `npm install`
- Develop: `npm run dev`
- Unit tests: `npm test`
- Production build: `npm run build`
- Full local gate: `npm run check`

## Stack

- React 18 + Vite 6 + Tailwind CSS 3
- Vercel serverless functions under `api/`
- Upstash Redis for temporary shared room state
- Browser localStorage for private profile, prep, notebook, custom scripts, and optional personal model configuration

## Structure and conventions

- `src/App.jsx` contains the current product flow and built-in scripts.
- `src/storage.js` is the only browser-to-storage adapter.
- `api/storage.js` owns room authorization and key permissions; never expose generic Redis access.
- `lib/server-security.js` owns request limits and shared server security helpers.
- Room keys must match the allowlist in `parseRoomKey`; room data must retain a TTL.
- Never log, persist, or return API keys, Redis credentials, room tokens, or provider error bodies.
- A personal model key passes through the Vercel proxy; user-facing copy must say so explicitly.
- Product positioning, six built-in scripts, prompt limits, TTL, and environment variables are authoritative in `README.md`.

## Current state

- The canonical branch is `main`; deployment target is the Vercel URL in `README.md`.
- Room membership uses signed capability tokens with host/member permissions.
- Text prompts are capped at 100,000 characters; image prompts at 20,000.
- Server-funded model access is disabled unless `ALLOW_SERVER_MODEL=true`.
- `output/` and `tmp/` are untracked review artifacts; do not delete or commit them without user confirmation.

## Next priorities

- Keep security tests aligned with any storage schema or permission change.
- Split the large `src/App.jsx` by domain when making the next substantial feature change; do not mix that refactor into unrelated hotfixes.
