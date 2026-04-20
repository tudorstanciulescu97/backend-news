# Poveștile lui Nini

Site cu cărți ilustrate protejate prin login.

- **Backend**: Node.js + Express (JWT auth, rate-limiting). Deploy pe **Render**.
- **Frontend**: React + Vite + react-pageflip. Deploy pe **Vercel**.

## Local dev

```bash
# Backend
cd backend
npm install
npm run dev            # http://localhost:4000

# Frontend (alt terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

În dev, Vite proxy-uiește `/api/*` -> `http://localhost:4000`.

## Login

- user: `nico`
- parolă: `sticlimarci`

## Deploy

### Backend (Render)
- New Web Service → connect repo
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Env vars:
  - `JWT_SECRET` — string lung random
  - `FRONTEND_ORIGIN` — URL-ul Vercel (ex: `https://backend-news.vercel.app`)

### Frontend (Vercel)
- Import project
- Root directory: `frontend`
- Framework preset: Vite
- Env var:
  - `VITE_API_BASE` — URL-ul backend-ului Render (ex: `https://backend-news.onrender.com`)
