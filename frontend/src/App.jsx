import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import LoginGate from "./components/LoginGate.jsx";
import BookLibrary from "./components/BookLibrary.jsx";
import BookViewer from "./components/BookViewer.jsx";

// Routing minim cu History API — fără librărie externă.
// `/` → biblioteca, `/:bookId` → vizualizare carte.
function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname || "/");

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((newPath) => {
    if (window.location.pathname === newPath) return;
    window.history.pushState({}, "", newPath);
    setPath(newPath);
  }, []);

  return [path, navigate];
}

export default function App() {
  const { isAuthed, checking } = useAuth();
  const [path, navigate] = useRoute();

  return (
    <>
      <div className="garden-backdrop" aria-hidden="true" />
      {checking ? (
        <SplashLoader />
      ) : !isAuthed ? (
        <LoginGate />
      ) : (
        renderAuthedRoute(path, navigate)
      )}
    </>
  );
}

function renderAuthedRoute(path, navigate) {
  const bookId = path === "/" ? null : path.replace(/^\/+/, "");

  if (!bookId) {
    return <BookLibrary onSelect={(id) => navigate(`/${id}`)} />;
  }

  return <BookViewer bookId={bookId} onBack={() => navigate("/")} />;
}

function SplashLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-display)",
        color: "var(--ink-soft)",
        letterSpacing: "0.05em",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div className="splash-flower" aria-hidden="true">🌻</div>
        <span style={{ fontSize: 18, fontStyle: "italic" }}>Se deschide grădina…</span>
      </div>
      <style>{`
        .splash-flower {
          font-size: 48px;
          animation: splashSway 1.6s ease-in-out infinite;
        }
        @keyframes splashSway {
          0%, 100% { transform: rotate(-8deg); }
          50%      { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}
