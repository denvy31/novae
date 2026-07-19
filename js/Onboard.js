/* Novaé — Accueil : explosion supernova + Bienvenue + choix de langue + tutoriel simple.
   mode "full" (premier lancement) : boom → langue → tuto. mode "lang" (bouton 🌐) : langue seule. */
function Onboarding({ mode, lang, onLang, onDone }) {
  // mode "full" : boom → langue → tuto (1er lancement) · "boom" : explosion seule (chaque
  // ouverture) · "lang" : sélecteur de langue seul (bouton 🌐)
  const { useState, useRef, useEffect } = React;
  const I18N = window.NV_I18N;
  const [phase, setPhase] = useState(mode === "lang" ? "lang" : "boom");
  const [slide, setSlide] = useState(0);
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
      // 2) onde de choc
      const ring = t * R * 0.75;
      const ra = Math.max(0, 0.65 - t * 0.28);
      if (ra > 0) {
        g.strokeStyle = "rgba(180,205,255," + ra + ")"; g.lineWidth = Math.max(1, 10 - t * 4);
        g.beginPath(); g.arc(cx, cy, ring, 0, 7); g.stroke();
        g.strokeStyle = "rgba(255,190,120," + ra * 0.6 + ")"; g.lineWidth = Math.max(1, 5 - t * 2);
        g.beginPath(); g.arc(cx, cy, ring * 0.82, 0, 7); g.stroke();
      }
      // 3) éjectas : particules qui filent puis se figent en étoiles scintillantes
      parts.forEach((p) => {
        const d = Math.min(1, t * p.v) * R * 0.52;
        const x = cx + Math.cos(p.a) * d, y = cy + Math.sin(p.a) * d;
        const cool = Math.min(1, t * 0.55);              // refroidit : blanc-or → bleuté
        const al = (t * p.v < 1 ? 0.9 : 0.45 + 0.35 * Math.sin(now / 300 + p.tw)) * Math.min(1, t * 3);
        g.globalAlpha = Math.max(0, al);
        g.fillStyle = p.hue < 0.6 - cool * 0.3 ? "#ffd9a0" : "#cfe0ff";
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

  // ---- Tutoriel complet : utiliser l'app à son plein potentiel + à savoir / à désactiver ----
  const SLIDES = [
    { icon: "📱", title: "Le ciel suit votre téléphone", txt: "Levez le téléphone : la carte s'aligne sur ce que vous visez, et le nom de l'astre pointé s'affiche en bas. Le suivi démarre tout seul — pour le couper, touchez 📱 en bas à gauche (votre choix est mémorisé)." },
    { icon: "🧭", title: "Si les directions sont fausses", txt: "Dans ⚙ : touchez « 🔄 Sens » plusieurs fois jusqu'à ce que N/S/E/O soient justes, puis glissez l'écran pour aligner finement sur un repère réel (Lune, soleil couchant…) — mémorisé pour toujours. « Recalibrer » remet tout à zéro. Astuce : retirez les coques aimantées, elles faussent la boussole !" },
    { icon: "⚙", title: "Personnalisez votre ciel", txt: "Le menu ⚙ permet d'activer ou désactiver : constellations, étiquettes, planètes, satellites 🛰 et le filtre supernovæ 💥. Vous y trouvez aussi les raccourcis N/E/S/O et les pôles, le voyage dans le temps (−1 h/+1 h/accéléré) et la capture 📸." },
    { icon: "🔍", title: "Cherchez n'importe quel astre", txt: "La barre de recherche trouve étoiles, planètes, objets Messier, supernovæ… La carte se centre dessus. Touchez une étoile ou un satellite pour sa fiche — un tap à côté la referme." },
    { icon: "🪐", title: "Explorez les planètes de près", txt: "Onglet Planètes : touchez une planète ou le Soleil sur son orbite. Gros plan photoréaliste NASA, zoom à deux doigts (double-tap pour réinitialiser), lunes en orbite. UA = distance Terre–Soleil (150 millions de km)." },
    { icon: "⏳", title: "Remontez jusqu'au Big Bang", txt: "L'onglet Frise raconte 13,8 milliards d'années avec le curseur. En bas, « Qu'est-ce qui a créé le Big Bang ? » explique pas à pas ce que la science sait… et ce qu'elle ignore." },
    { icon: "💡", title: "Trouvez un bon ciel", txt: "Onglet Pollution : « 📍 Mon ciel est-il pollué ? » estime la qualité de votre ciel d'après votre position. L'onglet Événements vous dit quoi observer, où et quand — avec les actus spatiales traduites en français." },
    { icon: "🎓", title: "À savoir, pour finir", txt: "L'onglet Univers + son quiz pour apprendre en jouant · l'app marche hors-ligne après le 1ᵉʳ chargement · « Ajouter à l'écran d'accueil » l'installe comme une vraie app · le bouton 🌐 change la langue. Bonne exploration ! ✦" },
  ];

  const pickLang = (code) => {
    onLang(code);
    if (mode === "full") setPhase("tuto"); else onDone();
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
          React.createElement("span", null, l.name))))),

    phase === "tuto" && React.createElement("div", { className: "welcome-card tuto-card" },
      React.createElement("div", { className: "tuto-icon" }, SLIDES[slide].icon),
      React.createElement("h3", null, SLIDES[slide].title),
      React.createElement("p", { className: "tuto-txt" }, SLIDES[slide].txt),
      React.createElement("div", { className: "tuto-dots" },
        SLIDES.map((_, i) => React.createElement("span", { key: i, className: i === slide ? "on" : "" }))),
      React.createElement("div", { className: "tuto-btns" },
        React.createElement("button", { className: "chip", onClick: onDone }, "Passer"),
        React.createElement("button", {
          className: "chip on",
          onClick: () => (slide + 1 < SLIDES.length ? setSlide(slide + 1) : onDone()),
        }, slide + 1 < SLIDES.length ? "Suivant →" : "C'est parti 🚀"))));
}
