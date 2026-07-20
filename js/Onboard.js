/* Novaé — Accueil : explosion supernova + Bienvenue + choix de langue + tutoriel simple.
   mode "full" (premier lancement) : boom → langue → tuto. mode "lang" (bouton 🌐) : langue seule. */
function Onboarding({ mode, lang, onLang, onDone }) {
  // mode "full" : boom → langue → (l'app démarre la visite guidée) · "lang" : langue seule (🌐)
  const { useState, useRef, useEffect } = React;
  const I18N = window.NV_I18N;
  const [phase, setPhase] = useState(mode === "lang" ? "lang" : "boom");
  const cvs = useRef(null);
  const afterBoom = () => { if (mode === "full") setPhase("lang"); else onDone(); };

  // ---- Supernova : flash + onde de choc + particules incandescentes (Canvas, additif) ----
  useEffect(() => {
    if (phase !== "boom") return;
    const c = cvs.current; if (!c) return;
    let raf, mounted = true;
    const t0 = performance.now();
    // particules déterministes
    let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const parts = Array.from({ length: 260 }, () => ({
      a: rnd() * Math.PI * 2, v: 0.25 + Math.pow(rnd(), 1.6) * 1.1,
      sz: 0.8 + rnd() * 2.6, hue: rnd(), tw: rnd() * Math.PI * 2,
    }));
    const loop = (now) => {
      if (!mounted) return;
      const t = (now - t0) / 1000;                       // secondes depuis l'ouverture
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = innerWidth, h = innerHeight;
      if (c.width !== Math.round(w * dpr)) { c.width = w * dpr; c.height = h * dpr; }
      const g = c.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "#010207"; g.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2 - h * 0.06, R = Math.min(w, h);
      g.save(); g.globalCompositeOperation = "lighter";
      // 1) flash initial aveuglant qui décroît
      const flash = Math.max(0, 1 - t * 1.6);
      if (flash > 0) {
        const fg = g.createRadialGradient(cx, cy, 0, cx, cy, R * (0.2 + t * 1.4));
        fg.addColorStop(0, "rgba(255,255,255," + flash + ")");
        fg.addColorStop(0.4, "rgba(255,225,170," + flash * 0.7 + ")");
        fg.addColorStop(1, "transparent");
        g.fillStyle = fg; g.fillRect(0, 0, w, h);
      }
      // 1b) aigrettes de flash façon photo (même langage visuel que le Soleil/les étoiles
      // brillantes ailleurs dans l'app) — donne un vrai « coup de flash » au moment zéro
      const flareA = Math.max(0, 1 - t * 1.1);
      if (flareA > 0) {
        g.globalAlpha = flareA * 0.8;
        const L = R * (0.5 + t * 0.6), W = Math.max(1, R * 0.006);
        [0, 1, 2, 3, 4, 5].forEach((k) => {
          const ang = (k / 6) * Math.PI + 0.3;
          g.save(); g.translate(cx, cy); g.rotate(ang);
          const lg = g.createLinearGradient(0, 0, 0, -L);
          lg.addColorStop(0, "rgba(255,250,235,0.9)"); lg.addColorStop(1, "transparent");
          g.fillStyle = lg;
          g.beginPath(); g.moveTo(-W, 0); g.lineTo(0, -L); g.lineTo(W, 0); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(-W, 0); g.lineTo(0, L); g.lineTo(W, 0); g.closePath(); g.fill();
          g.restore();
        });
        g.globalAlpha = 1;
      }
      // 2) onde de choc
      const ring = t * R * 0.75;
      const ra = Math.max(0, 0.65 - t * 0.28);
      if (ra > 0) {
        g.strokeStyle = "rgba(180,205,255," + ra + ")"; g.lineWidth = Math.max(1, 10 - t * 4);
        g.beginPath(); g.arc(cx, cy, ring, 0, 7); g.stroke();
        g.strokeStyle = "rgba(255,190,120," + ra * 0.6 + ")"; g.lineWidth = Math.max(1, 5 - t * 2);
        g.beginPath(); g.arc(cx, cy, ring * 0.82, 0, 7); g.stroke();
      }
      // 3) éjectas : traînées incandescentes qui filent puis se figent en étoiles scintillantes
      parts.forEach((p) => {
        const d = Math.min(1, t * p.v) * R * 0.52;
        const dPrev = Math.min(1, Math.max(0, t - 0.045) * p.v) * R * 0.52; // position juste avant → traînée
        const x = cx + Math.cos(p.a) * d, y = cy + Math.sin(p.a) * d;
        const cool = Math.min(1, t * 0.55);              // refroidit : blanc-or → bleuté
        const al = (t * p.v < 1 ? 0.9 : 0.45 + 0.35 * Math.sin(now / 300 + p.tw)) * Math.min(1, t * 3);
        const col = p.hue < 0.6 - cool * 0.3 ? "#ffd9a0" : "#cfe0ff";
        // traînée de vitesse (visible tant que la particule file encore, s'efface une fois figée)
        if (t * p.v < 1.15 && d > dPrev) {
          const xp = cx + Math.cos(p.a) * dPrev, yp = cy + Math.sin(p.a) * dPrev;
          g.strokeStyle = col; g.globalAlpha = Math.max(0, al * 0.5); g.lineWidth = p.sz * 0.7;
          g.beginPath(); g.moveTo(xp, yp); g.lineTo(x, y); g.stroke();
        }
        g.globalAlpha = Math.max(0, al);
        g.fillStyle = col;
        g.beginPath(); g.arc(x, y, p.sz * (1 - cool * 0.4), 0, 7); g.fill();
      });
      g.restore(); g.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // enchaîne (langue au 1er lancement, sinon entre dans l'app)
    const tm = setTimeout(() => { if (mounted) afterBoom(); }, 3400);
    return () => { mounted = false; cancelAnimationFrame(raf); clearTimeout(tm); };
  }, [phase]);

  // Après la langue : l'accueil se ferme et l'app démarre la VISITE GUIDÉE (voir App.js) —
  // l'utilisateur découvre chaque fonctionnalité en direct, écran par écran.
  const pickLang = (code) => {
    onLang(code);
    onDone();
  };

  return React.createElement("div", { className: "welcome-overlay" + (phase === "boom" ? " boom" : "") },
    phase === "boom" && React.createElement(React.Fragment, null,
      React.createElement("canvas", { ref: cvs, className: "boom-canvas" }),
      React.createElement("div", { className: "boom-title" },
        React.createElement("div", { className: "boom-logo" }, "✦"),
        React.createElement("h1", null, "NOVAÉ"),
        React.createElement("p", null, "Bienvenue · Welcome"),
        React.createElement("button", { className: "chip boom-skip", onClick: afterBoom }, "Passer →"))),

    phase === "lang" && React.createElement("div", { className: "welcome-card" },
      React.createElement("div", { className: "welcome-logo" }, "✦"),
      React.createElement("h2", null, "NOVAÉ"),
      React.createElement("p", { className: "welcome-sub" }, "Bienvenue ! Choisissez votre langue · Choose your language"),
      React.createElement("div", { className: "welcome-langs" },
        I18N.langs.map((l) => React.createElement("button", {
          key: l.code, className: "welcome-lang" + (l.code === lang ? " active" : ""),
          onClick: () => pickLang(l.code),
        },
          React.createElement("span", { className: "welcome-flag" }, l.flag),
          React.createElement("span", null, l.name))))));
}
