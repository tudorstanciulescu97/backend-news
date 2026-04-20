import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "./BookLibrary.css";

export default function BookLibrary({ onSelect }) {
  const { authFetch, user, logout } = useAuth();
  const [books, setBooks] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/books");
        if (!res.ok) throw new Error("Nu s-au putut încărca cărțile.");
        const data = await res.json();
        if (!cancelled) setBooks(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [authFetch]);

  return (
    <div className="library-shell">
      <header className="library-header">
        <div className="library-brand">
          <span className="brand-mark" aria-hidden="true">🌿</span>
          <span className="brand-text">Cărțile lui Nini</span>
        </div>
        <div className="library-right">
          <span className="user-chip">Bună, {user?.displayName || user?.username}</span>
          <button className="btn-logout" onClick={logout}>Ieși</button>
        </div>
      </header>

      <main className="library-main">
        <h1 className="library-title">Alege o carte</h1>

        {error && <p className="library-error">🥀 {error}</p>}

        {!books && !error && (
          <div className="library-loading">
            <div className="loading-flower">🌼</div>
            <p>Aranjez rafturile…</p>
          </div>
        )}

        {books && (
          <div className="library-grid">
            {books.map((b) => (
              <button
                key={b.id}
                className="book-card"
                onClick={() => onSelect(b.id)}
                aria-label={`Deschide cartea: ${b.title}`}
              >
                <div
                  className="book-card__cover"
                  style={{ backgroundImage: `url(${b.cover})` }}
                />
                <div className="book-card__meta">
                  <h3 className="book-card__title">{b.title}</h3>
                  {b.subtitle && <p className="book-card__subtitle">{b.subtitle}</p>}
                  <span className="book-card__count">{b.pageCount} pagini</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
