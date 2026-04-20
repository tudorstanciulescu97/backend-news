// server.js — Grădina lui Nini
// Backend minim: login cu JWT + endpoint protejat care servește conținutul cărții.
// Idee cheie: conținutul cărții NU e trimis niciodată înainte de login.
// Orice bypass prin DevTools/CSS e inutil pentru că datele nu există în client.

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "schimba-ma-in-productie-chiar-te-rog";
const MONGO_URI = process.env.MONGO_URI;
const TOKEN_TTL = "2h";

// ─── Conectare MongoDB ───────────────────────────────────────────────────
if (!MONGO_URI) {
  console.error("❌ MONGO_URI lipsește din env. Pune-l în .env (local) sau Render env vars.");
  process.exit(1);
}
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => console.log("✅ Conectat la MongoDB"))
  .catch((err) => {
    console.error("❌ Eroare MongoDB:", err.message);
    process.exit(1);
  });

// CORS — în dev permitem Vite (5173), în prod pui domeniul tău real în .env (FRONTEND_ORIGIN).
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

// Regex pentru IP-uri de pe rețeaua locală (LAN) — util ca să accesezi de pe
// telefon când Vite rulează cu `host: true`.
const LAN_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / same-origin
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (LAN_ORIGIN.test(origin)) return cb(null, true);
      return cb(new Error("CORS blocat pentru originea: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

// Rate limit pe endpoint-ul de login ca să nu se poată face brute force ușor.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Prea multe încercări de login. Încearcă peste 15 minute." },
});

// Escape pentru regex (protecție la injecție pe username)
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper — generează JWT
function issueToken(user) {
  return jwt.sign(
    { sub: user.username, name: user.displayName },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Middleware — verifică token-ul din Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Lipsește token-ul." });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid sau expirat." });
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "gradina-lui-nini" });
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Trimite username și password." });
  }

  // Găsește user-ul în Mongo (case-insensitive pe username)
  const user = await User.findOne({
    username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
  });

  // Mesaj generic indiferent unde dă greș, ca să nu ajutăm atacatori.
  const genericFail = () =>
    res.status(401).json({ error: "Utilizator sau parolă greșită." });

  if (!user) {
    // Fake compare ca să nu trădăm timing-ul existenței userului
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvali");
    return genericFail();
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return genericFail();

  const token = issueToken(user);
  return res.json({
    token,
    user: { username: user.username, displayName: user.displayName },
  });
});

// Endpoint pentru validat token-ul (ex. la refresh, să vedem dacă mai e bun)
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: { username: req.user.sub, displayName: req.user.name } });
});

// ─── PROTECTED: conținutul cărților ──────────────────────────────────────
// Lista de cărți disponibile. Fiecare carte are metadate + pagini.
// Pentru a adăuga o carte nouă, adaugă un obiect nou în BOOKS.
const BOOKS = [
{
  id: "gradina-lui-nini",
  title: "Grădina lui Nini",
  subtitle: "O poveste despre flori și grijă",
  cover: "/images/gradina-lui-nini/cover.png",
  pages: [
    {
      id: 1,
      image: "/images/gradina-lui-nini/page-01-garden.jpg",
      lines: [
        "Aceasta este grădina lui Nini.",
        "În grădină sunt multe plante verzi.",
      ],
    },
    {
      id: 2,
      image: "/images/gradina-lui-nini/page-02-hello.jpg",
      lines: [
        "Nini iubește florile.",
        "Le spune: „Bună dimineața!”",
      ],
    },
    {
      id: 3,
      image: "/images/gradina-lui-nini/page-03-soil.png",
      lines: [
        "Nini pregătește solul.",
        "Pământul trebuie să fie afânat.",
      ],
    },
    {
      id: 4,
      image: "/images/gradina-lui-nini/page-04-repot.png",
      lines: [
        "Florile tinere au nevoie de un cămin nou.",
      ],
    },
    {
      id: 5,
      image: "/images/gradina-lui-nini/page-05-fertilize.png",
      lines: [
        "Nini pune îngrășământ natural.",
        "Pentru a le face puternice.",
      ],
    },
    {
      id: 6,
      image: "/images/gradina-lui-nini/page-06-climbing.png",
      lines: [
        "Florile agățătoare au nevoie de ajutor.",
      ],
    },
    {
      id: 7,
      image: "/images/gradina-lui-nini/page-07-weeds.png",
      lines: [
        "Secretele grădinii:",
        "buruienile trebuie smulse.",
      ],
    },
    {
      id: 8,
      image: "/images/gradina-lui-nini/page-08-check-soil.png",
      lines: [
        "Să verificăm pământul.",
        "Este umed și bun?",
      ],
    },
    {
      id: 9,
      image: "/images/gradina-lui-nini/page-09-water-a.jpg",
      lines: [
        "Florile au nevoie de apă.",
        "Nini le udă cu grijă.",
      ],
    },
    {
      id: 10,
      image: "/images/gradina-lui-nini/page-10-measure.jpg",
      lines: [
        "Nu prea mult.",
        "Nu prea puțin.",
        "Atât cât trebuie.",
      ],
    },
    {
      id: 11,
      image: "/images/gradina-lui-nini/page-11-water-b.png",
      lines: [
        "Florile sunt setoase din nou.",
        "Timpul pentru încă o udare blândă.",
      ],
    },
    {
      id: 12,
      image: "/images/gradina-lui-nini/page-12-sun.jpg",
      lines: [
        "Florile iubesc soarele.",
        "Nini le mută la lumină.",
      ],
    },
    {
      id: 13,
      image: "/images/gradina-lui-nini/page-13-lunch.png",
      lines: [
        "O mică pauză de prânz.",
        "Soarele este sus pe cer.",
      ],
    },
    {
      id: 14,
      image: "/images/gradina-lui-nini/page-14-bloom.jpg",
      lines: [
        "După o vreme, floarea înflorește.",
        "Ce frumoasă e!",
      ],
    },
    {
      id: 15,
      image: "/images/gradina-lui-nini/page-15-grow.jpg",
      lines: [
        "Plantele cresc mari și frumoase.",
        "Sunt fericite.",
      ],
    },
    {
      id: 16,
      image: "/images/gradina-lui-nini/page-16-happy.jpg",
      lines: [
        "Și Nini este fericit.",
        "Grădina lui zâmbește.",
      ],
    },
    {
      id: 17,
      image: null,
      lines: [
        "Ai grijă de flori.",
        "Cu apă.",
        "Cu soare.",
        "Cu iubire.",
      ],
    },
    {
      id: 18,
      image: null,
      isEnd: true,
      lines: [
        "Sfârșit",
        "(ne revedem mâine în grădină 🌱)",
      ],
    },
  ],
},
{
  id: "ferma-lui-nini",
  title: "Ferma lui Nini",
  subtitle: "O poveste despre animale și grija pentru pământ",
  cover: "/images/ferma-lui-nini/cover.png",
  pages: [
    {
      id: 1,
      image: "/images/ferma-lui-nini/page-01-sheep.png",
      lines: [
        "Primul lui prieten la fermă a fost mielul cel mic.",
      ],
    },
    {
      id: 2,
      image: "/images/ferma-lui-nini/page-02-cow.png",
      lines: [
        "Și animalele de la fermă sunt fericite cu Nini.",
        "„Fânul de la fermă e cel mai gustos, Nini!”",
      ],
    },
    {
      id: 3,
      image: "/images/ferma-lui-nini/page-03-birds.png",
      lines: [
        "Nini le dă păsărilor să mănânce grăunțe din diferite cereale.",
      ],
    },
    {
      id: 4,
      image: "/images/ferma-lui-nini/page-04-pigs.png",
      lines: [
        "Nini acum este la porci…",
        "…care sunt cei mai pofticioși.",
      ],
    },
    {
      id: 5,
      image: "/images/ferma-lui-nini/page-05-horse.png",
      lines: [
        "Nini acum este în grajdul calului,",
        "dându-i apă proaspătă.",
        "„Apa asta e minunată, Nini!”",
      ],
    },
    {
      id: 6,
      image: "/images/ferma-lui-nini/page-06-dogcat.png",
      lines: [
        "După aceea, Nini s-a dus să le dea de mâncare câinelui și pisicii lui.",
        "„Mulțumesc mult, Nini! Ce mâncare gustoasă!”",
        "„Miau! Mulțumesc și eu, Nini!”",
      ],
    },
    {
      id: 7,
      image: "/images/ferma-lui-nini/page-07-walk.png",
      lines: [
        "O plimbare binevenită după masa de prânz.",
        "„Mergem la plimbare, ce bine!”",
        "„Și eu vin! Doar să nu fugi.”",
      ],
    },
    {
      id: 8,
      image: "/images/ferma-lui-nini/page-08-clean-birds.png",
      lines: [
        "Înainte să vină seara Nini trebuie să facă curat la animale.",
        "Începe cu păsările.",
      ],
    },
    {
      id: 9,
      image: "/images/ferma-lui-nini/page-09-clean-pigs.png",
      lines: [
        "Și continuă curățenia la restul animalelor.",
      ],
    },
    {
      id: 10,
      image: "/images/ferma-lui-nini/page-10-sheeps.png",
      lines: [
        "Oile lui Nini sunt fericite în câmpul verde.",
        "„Lăsați-o să se liniștească!”",
      ],
    },
    {
      id: 11,
      image: "/images/ferma-lui-nini/page-11-milk.png",
      lines: [
        "Zizi e o vacă bună.",
        "Îmi dă lapte proaspăt.",
        "„Muuu… Mulțumesc pentru fânul bun, Nini!”",
      ],
    },
  ],
},
];

// Listă de cărți disponibile (fără pagini — ca să rămână lightweight).
app.get("/api/books", requireAuth, (req, res) => {
  res.json(BOOKS.map(({ pages, ...meta }) => ({ ...meta, pageCount: pages.length })));
});

// Detaliile unei cărți (inclusiv paginile).
app.get("/api/books/:id", requireAuth, (req, res) => {
  const book = BOOKS.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: "Carte negăsită." });
  res.json(book);
});

// ─── Start ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌱 Grădina lui Nini — backend pe http://localhost:${PORT}`);
  console.log(`   Origins permise: ${allowedOrigins.join(", ")}`);
});
