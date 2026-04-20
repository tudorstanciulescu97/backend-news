import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "./LoginGate.css";

export default function LoginGate() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || "Eroare.");
      // shake animation
      if (cardRef.current) {
        cardRef.current.classList.remove("shake");
        void cardRef.current.offsetWidth; // reflow trick
        cardRef.current.classList.add("shake");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-stage">
      {/* Decor — frunze care plutesc în fundal */}
      <div className="floating-leaves" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`leaf leaf-${i}`}>🍃</span>
        ))}
      </div>

      <form ref={cardRef} className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-badge" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="44" height="44">
            <circle cx="24" cy="24" r="10" fill="#f4a261" />
            <circle cx="24" cy="24" r="4" fill="#fff3b0" />
            {/* petals */}
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <ellipse
                key={deg}
                cx="24"
                cy="10"
                rx="4"
                ry="8"
                fill="#f4a261"
                transform={`rotate(${deg} 24 24)`}
              />
            ))}
            <rect x="23" y="30" width="2" height="14" fill="#4a7c59" />
          </svg>
        </div>

        <h1 className="login-title">Poveștile lui Nini</h1>
        <p className="login-subtitle">Povești despre flori, animale și grijă</p>

        <div className="divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-icon">✿</span>
          <span className="divider-line" />
        </div>

        <label className="field">
          <span className="field-label">Utilizator</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex. admin"
            required
            disabled={busy}
          />
        </label>

        <label className="field">
          <span className="field-label">Parolă</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
            disabled={busy}
          />
        </label>

        {error && <div className="login-error" role="alert">{error}</div>}

        <button type="submit" className="login-submit" disabled={busy}>
          {busy ? (
            <span className="busy-dots"><span/><span/><span/></span>
          ) : (
            <>Deschide cartea <span aria-hidden="true">→</span></>
          )}
        </button>
      </form>
    </main>
  );
}
