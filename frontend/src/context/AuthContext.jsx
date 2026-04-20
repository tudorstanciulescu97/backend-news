import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthCtx = createContext(null);

// Folosim sessionStorage ca token-ul să dispară când închizi tab-ul.
// (localStorage ar persista, dar pentru un MVP cu conținut protejat e mai safe
// să forțezi re-login la restart de browser.)
const TOKEN_KEY = "nini_token";
const USER_KEY = "nini_user";

// În dev folosim proxy-ul Vite (VITE_API_BASE gol → URL relativ → /api/* proxied).
// În prod (Vercel) setăm VITE_API_BASE la URL-ul backend-ului Render.
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const apiUrl = (path) => `${API_BASE}${path}`;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [checking, setChecking] = useState(Boolean(sessionStorage.getItem(TOKEN_KEY)));

  // La mount, dacă avem token, îl validăm cu /api/me. Dacă e expirat, facem logout.
  useEffect(() => {
    if (!token) { setChecking(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("expired");
        const data = await res.json();
        if (!cancelled) {
          setUser(data.user);
          sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const login = useCallback(async (username, password) => {
    const res = await fetch(apiUrl("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Eroare la autentificare.");
    }
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Helper ca să nu mai scrii manual headerele peste tot.
  // Dacă primești un URL relativ (ex. "/api/books"), îi pune prefix-ul API_BASE.
  const authFetch = useCallback(
    async (url, opts = {}) => {
      const headers = { ...(opts.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;
      const finalUrl = url.startsWith("http") ? url : apiUrl(url);
      const res = await fetch(finalUrl, { ...opts, headers });
      if (res.status === 401) {
        // token expirat sau invalid — forțăm logout
        logout();
      }
      return res;
    },
    [token, logout]
  );

  return (
    <AuthCtx.Provider
      value={{ token, user, checking, login, logout, authFetch, isAuthed: Boolean(token && user) }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
