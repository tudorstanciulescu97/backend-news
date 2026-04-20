import { useEffect, useRef, useState, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { useAuth } from "../context/AuthContext.jsx";
import "./BookViewer.css";

// ─── Sub-componenta pentru o pagină individuală ───
// react-pageflip are nevoie ca fiecare pagină să fie un component cu forwardRef,
// ca să poată atașa ref-uri interne pentru animație.
const Page = forwardRef(({ children, pageNumber, className = "" }, ref) => {
  return (
    <div className={`book-page ${className}`} ref={ref} data-density="soft">
      <div className="book-page__inner">
        {children}
        {pageNumber && <span className="page-number">{pageNumber}</span>}
      </div>
    </div>
  );
});
Page.displayName = "Page";

// ─── Pagina de copertă (față) ───
// Imaginea de copertă are deja titlul încorporat, deci o afișăm full-bleed.
const CoverPage = forwardRef(({ cover }, ref) => (
  <div className="book-page book-cover book-cover--front" ref={ref} data-density="hard">
    {cover && <div className="cover-art" style={{ backgroundImage: `url(${cover})` }} />}
  </div>
));
CoverPage.displayName = "CoverPage";

// ─── Pagina de copertă (spate) ───
const BackCoverPage = forwardRef((props, ref) => (
  <div className="book-page book-cover book-cover--back" ref={ref} data-density="hard">
    <div className="back-cover-content">
      <div className="back-ornament">🌻</div>
      <p className="back-text">
        O poveste scurtă, pentru seri liniștite și dimineți<br />cu rouă pe frunze.
      </p>
    </div>
  </div>
));
BackCoverPage.displayName = "BackCoverPage";

// ─── Pagina de story ───
// Textul e deja încorporat în imagine, așa că redăm imaginea full-bleed.
// Dacă nu există imagine (pagini finale de tip "Sfârșit"), randăm textul centrat.
const StoryPage = forwardRef(({ page, pageNumber }, ref) => (
  <div className="book-page story-page" ref={ref} data-density="soft">
    {page.image ? (
      <div
        className="story-illustration-full"
        style={{ backgroundImage: `url(${page.image})` }}
        role="img"
        aria-label={page.lines.join(" ")}
      />
    ) : (
      <div className="book-page__inner">
        <div className={`story-text story-text--center ${page.isEnd ? "story-text--end" : ""}`}>
          {page.lines.map((line, i) => (
            <p key={i} className="story-line" style={{ animationDelay: `${i * 0.12}s` }}>
              {line}
            </p>
          ))}
        </div>
      </div>
    )}
  </div>
));
StoryPage.displayName = "StoryPage";

// ─── Pagina goală (după copertă, înainte să înceapă povestea) ───
const BlankPage = forwardRef((props, ref) => (
  <div className="book-page blank-page" ref={ref} data-density="soft">
    <div className="book-page__inner">
      <div className="blank-ornament">❦</div>
    </div>
  </div>
));
BlankPage.displayName = "BlankPage";

// ─── Componenta principală ───
export default function BookViewer({ bookId, onBack }) {
  const { authFetch, logout, user } = useAuth();
  const [story, setStory] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [dimensions, setDimensions] = useState(() => getBookDims());
  const bookRef = useRef(null);

  // Încarcă cartea de la backend în funcție de `bookId`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/books/${encodeURIComponent(bookId)}`);
        if (!res.ok) throw new Error("Nu s-a putut încărca cartea.");
        const data = await res.json();
        if (!cancelled) setStory(data);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [authFetch, bookId]);

  // Recalculează dimensiunile la resize
  useEffect(() => {
    const onResize = () => setDimensions(getBookDims());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (loadError) {
    return (
      <div className="book-error">
        <p>🥀 {loadError}</p>
        <button className="btn-logout" onClick={onBack}>Înapoi la bibliotecă</button>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="book-loading">
        <div className="loading-flower">🌼</div>
        <p>Culeg paginile…</p>
      </div>
    );
  }

  return (
    <div className="viewer-shell">
      <Topbar user={user} onLogout={logout} onBack={onBack} />

      <div className="book-stage">
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.w}
          height={dimensions.h}
          size="fixed"
          minWidth={280}
          maxWidth={560}
          minHeight={380}
          maxHeight={760}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          flippingTime={900}
          drawShadow={true}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          className="nini-book"
        >
          {/* Copertă față */}
          <CoverPage cover={story.cover} />

          {/* Pagină albă de tranziție */}
          <BlankPage />

          {/* Paginile poveștii */}
          {story.pages.map((p, idx) => (
            <StoryPage key={p.id} page={p} pageNumber={idx + 1} />
          ))}

          {/* Pagină albă + copertă spate */}
          <BlankPage />
          <BackCoverPage />
        </HTMLFlipBook>
      </div>
    </div>
  );
}

function Topbar({ user, onLogout, onBack }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn-back" onClick={onBack} aria-label="Înapoi la bibliotecă">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Bibliotecă</span>
        </button>
      </div>
      <div className="topbar-right">
        <span className="user-chip">Bună, {user?.displayName || user?.username}</span>
        <button className="btn-logout" onClick={onLogout}>Ieși</button>
      </div>
    </header>
  );
}

// ─── Dimensiunile cărții în funcție de viewport ───
// Afișăm landscape (2 pagini) — fiecare pagină e pătrată (imaginile sunt pătrate).
// `w` și `h` aici sunt dimensiunile UNEI pagini; spread-ul vizibil are 2*w lățime.
function getBookDims() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Spațiu disponibil: scad doar topbar (~65) + padding book-stage (~48) + buffer.
  const availableH = vh - 130;
  const availableW = vw - 40;

  const ratio = 1; // pagini pătrate
  // Spread-ul are lățime 2w, deci w = availableW / 2.
  let w = Math.min(availableW / 2, availableH / ratio);
  // Limite: min 300px / pagină (lizibil pe telefon), max 650px / pagină (spread 1300px).
  w = Math.max(300, Math.min(w, 650));
  const h = Math.round(w * ratio);
  return { w: Math.round(w), h };
}
