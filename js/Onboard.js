/* Novaé — Accueil : explosion supernova + Bienvenue + choix de langue + tutoriel simple.
   mode "full" (premier lancement) : boom → langue → tuto. mode "lang" (bouton 🌐) : langue seule. */
function Onboarding({ mode, lang, onLang, onDone }) {
  const { useState, useRef, useEffect } = React;
  const I18N = window.NV_I18N;
  const [phase, setPhase] = useState(mode === "full" ? "boom" : "lang");
  const [slide, setSlide] = useState(0);
  const cvs = useRef(null);

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
    // enchaîne sur le choix de langue
    const tm = setTimeout(() => { if (mounted) setPhase("lang"); }, 3400);
    return () => { mounted = false; cancelAnimationFrame(raf); clearTimeout(tm); };
  }, [phase]);

  // ---- Tutoriel : 5 étapes très simples ----
  const SLIDES = [
    { icon: "📱", title: "Le ciel suit votre téléphone", txt: "Ouvrez l'onglet Ciel et levez votre téléphone : la carte s'aligne sur ce que vous visez. Le nom de l'astre pointé s'affiche en bas de l'écran." },
    { icon: "⚙", title: "Tout se règle en bas à gauche", txt: "Le bouton ⚙ regroupe les calques (constellations, satellites…), les directions N/E/S/O, l'heure et la capture. Directions fausses ? Touchez « 🔄 Sens » jusqu'à ce que ce soit juste, puis glissez l'écran pour affiner — c'est mémorisé." },
    { icon: "🪐", title: "Explorez les planètes", txt: "Dans l'onglet Planètes, touchez une planète (ou le Soleil !) sur son orbite : gros plan photoréaliste NASA, zoom à deux doigts, lunes en orbite." },
    { icon: "⏳", title: "Remontez le temps", txt: "L'onglet Frise vous emmène du ciel de ce soir jusqu'au Big Bang, il y a 13,8 milliards d'années. Glissez le curseur et laissez-vous porter." },
    { icon: "🎓", title: "Apprenez en jouant", txt: "L'onglet Univers raconte l'histoire (et le futur !) du cosmos, avec un quiz pour tester ce que vous avez retenu. Bonne exploration ! ✦" },
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
        React.createElement("button", { className: "chip boom-skip", onClick: () => setPhase("lang") }, "Passer →"))),

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
