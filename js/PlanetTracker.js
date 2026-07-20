/* Novaé — Planet tracker: orbital map + realistic close-up with moons */
function PlanetTracker(props) {
  const { useRef, useState, useEffect } = React;
  const NV = window.NV;
  const P = window.NovaePlanet;
  const I18N = window.NV_I18N;
  const lang = (props && props.lang) || I18N.get();
  const tr = (k) => I18N.t(k);
  const pname = (n) => I18N.planet(n);
  const FR2EN = { Mercure: "Mercury", Vénus: "Venus", Terre: "Earth", Mars: "Mars", Jupiter: "Jupiter", Saturne: "Saturn", Uranus: "Uranus", Neptune: "Neptune", Pluton: "Pluto" };
  const mapRef = useRef(null);
  const closeRef = useRef(null);
  const dateRef = useRef(null);
  const simDays = useRef(0);
  const zoomC = useRef(1);        // zoom du gros plan (molette / pincement)
  const rotOff = useRef(0);       // rotation manuelle du gros plan (glisser = tourner autour)
  const rotLat = useRef(0);       // bascule verticale (glisser haut/bas = voir les pôles)
  const dragX = useRef(null);
  const dragY = useRef(null);
  const pinch = useRef(null);
  const [speed, setSpeed] = useState(1 / 86400); // TEMPS RÉEL par défaut (1 s = 1 s)
  const [evoOpen, setEvoOpen] = useState(false); // panneau « Évolution du Soleil »
  const [closeFull, setCloseFull] = useState(false); // gros plan en plein écran (façon Google Earth)
  // le Soleil est sélectionnable comme les planètes
  const SUN = { name: "Soleil", sun: true, render: "sun", color: "#ffd24a", diam: 1392700, dayLen: 25.4, moons: [], rings: false, fact: "Étoile naine jaune (G2V). 99,86 % de la masse du système solaire. Température de surface ≈ 5 500 °C, cœur ≈ 15 millions °C." };
  const [selected, setSelected] = useState(NV.planets[4]); // Jupiter (montre lunes + bandes)

  const bgStars = useRef(null);
  const makeBg = (n) => {
    if (bgStars.current) return bgStars.current;
    let s = 7; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    bgStars.current = Array.from({ length: n }, () => ({ x: r(), y: r(), a: 0.2 + r() * 0.6, s: r() * 1.4 + 0.3 }));
    return bgStars.current;
  };

  useEffect(() => {
    P.setTextureLoadCallback(() => {}); // this tab animates continuously
    P.preloadTextures();
    let raf, last = performance.now();
    const base = new Date("2026-06-14T00:00:00");

    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      simDays.current += dt * speed;
      if (dateRef.current) {
        const d = new Date(base.getTime() + simDays.current * 86400000);
        dateRef.current.textContent = "🗓 " + d.toLocaleDateString(I18N.locale(), { day: "numeric", month: "long", year: "numeric" });
      }
      drawMap(); drawCloseup();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);

    function size(canvas) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    }

    function starfield(ctx, w, h) {
      makeBg(160).forEach((st) => { ctx.globalAlpha = st.a; ctx.fillStyle = "#cdd6ff"; ctx.fillRect(st.x * w, st.y * h, st.s, st.s); });
      ctx.globalAlpha = 1;
    }

    function drawMap() {
      const canvas = mapRef.current; if (!canvas) return;
      const { ctx, w, h } = size(canvas);
      ctx.fillStyle = "#03040a"; ctx.fillRect(0, 0, w, h);
      starfield(ctx, w, h);
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(w, h) / 2 - 22, innerR = 26;
      const radius = (a) => innerR + (maxR - innerR) * Math.pow(a / 39.5, 0.55);
      canvas._hits = [];
      const date = new Date(base.getTime() + simDays.current * 86400000);
      const useReal = window.NVAstro && window.NVAstro.ready();

      NV.planets.forEach((p) => {
        const R = radius(p.a);
        ctx.strokeStyle = "rgba(120,150,220,0.16)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        let ang;
        if (useReal) { try { const v = window.NVAstro.helio(FR2EN[p.name], date); ang = Math.atan2(v.y, v.x); } catch (e) { ang = p.phase0 + (simDays.current / 365.25 / p.period) * Math.PI * 2; } }
        else ang = p.phase0 + (simDays.current / 365.25 / p.period) * Math.PI * 2;
        const px = cx + Math.cos(ang) * R, py = cy + Math.sin(ang) * R;
        ctx.strokeStyle = p.color + "88"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, R, ang - 0.45, ang); ctx.stroke();
        // toutes les planètes en texture réelle, légèrement agrandies (aucune boule de couleur)
        const pr = Math.max(3.6, Math.min(12, Math.pow(p.diam, 0.32) / 6));
        const m = Math.hypot(cx - px, cy - py) || 1;
        const lightv = { x: (cx - px) / m, y: (cy - py) / m };
        const rot = (simDays.current / Math.max(0.05, p.dayLen)) % 1;
        if (p.rings) P.drawRings(ctx, px, py, pr, lightv, false);
        P.drawPlanetTextured(ctx, px, py, pr, p, rot, lightv);
        if (p.rings) P.drawRings(ctx, px, py, pr, lightv, true);
        if (selected.name === p.name) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, pr + 6, 0, Math.PI * 2); ctx.stroke(); }
        // Nom de la planète : localisé + jamais coupé (bascule à gauche près du bord, clampé dans le canvas)
        const name = pname(p.name);
        const fs = w < 480 ? 10 : 11;
        ctx.font = fs + "px system-ui, sans-serif";
        const tw = ctx.measureText(name).width;
        let lx = px + pr + 4;
        if (lx + tw > w - 4) lx = px - pr - 4 - tw;                 // près du bord droit → à gauche de la planète
        lx = Math.max(3, Math.min(w - tw - 3, lx));                  // garde le texte dans l'écran
        const ly = Math.max(fs + 2, Math.min(h - 3, py + 3));
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(3,4,12,0.85)"; ctx.strokeText(name, lx, ly);  // halo pour lisibilité
        ctx.fillStyle = "rgba(228,235,255,0.96)"; ctx.fillText(name, lx, ly);
        canvas._hits.push({ p, x: px, y: py, r: pr + 9 });
      });

      P.drawSun(ctx, cx, cy, 11);
      if (selected.sun) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke(); }
      canvas._hits.push({ p: SUN, x: cx, y: cy, r: 20 });
    }

    function drawCloseup() {
      const canvas = closeRef.current; if (!canvas) return;
      const { ctx, w, h } = size(canvas);
      ctx.fillStyle = "#04050c"; ctx.fillRect(0, 0, w, h);
      starfield(ctx, w, h);
      const cx = w / 2, cy = h / 2, p = selected;
      const phase2 = simDays.current / Math.max(0.25, p.dayLen) + rotOff.current; // + rotation manuelle (glisser)
      if (p.sun) { P.drawSunTextured(ctx, cx, cy, Math.min(w, h) * 0.34 * zoomC.current, phase2 * 0.2, rotLat.current); return; }
      const maxMoon = p.moons.reduce((a, m) => Math.max(a, m.dist), 0);
      const extent = Math.max(maxMoon, p.rings ? 2.3 : 1.2) + 0.55;
      const R = Math.min(Math.min(w, h) * 0.5 / extent, Math.min(w, h) * 0.32) * zoomC.current;
      const light = { x: -0.55, y: -0.5 };
      const phase = phase2;

      const moons = p.moons.map((m, i) => {
        const ang = i * 1.7 + (simDays.current / m.period) * Math.PI * 2;
        return { m, x: cx + Math.cos(ang) * m.dist * R, y: cy + Math.sin(ang) * m.dist * R * 0.45, depth: Math.sin(ang) };
      });
      const drawMoon = (mo) => {
        const mr = Math.max(1.5, mo.m.r * R);
        // surface cratérisée réaliste teintée (décalage stable par lune pour les différencier)
        P.drawMoonTextured(ctx, mo.x, mo.y, mr, mo.m.color, light, 0.13 + mo.m.dist * 0.37 + simDays.current / (mo.m.period * 4));
        if (mr > 3) { ctx.fillStyle = "rgba(210,220,255,0.7)"; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(mo.m.name, mo.x + mr + 3, mo.y + 3); }
      };

      moons.filter((mo) => mo.depth < 0).forEach(drawMoon);
      if (p.rings) P.drawRings(ctx, cx, cy, R, light, false);
      P.drawPlanetTextured(ctx, cx, cy, R, p, phase, light, rotLat.current);
      if (p.rings) P.drawRings(ctx, cx, cy, R, light, true);
      moons.filter((mo) => mo.depth >= 0).forEach(drawMoon);
    }
  }, [speed, selected, NV, P, lang]);

  const onMapClick = (e) => {
    const canvas = mapRef.current, rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = (canvas._hits || []).find((h) => (h.x - mx) ** 2 + (h.y - my) ** 2 < h.r * h.r);
    if (hit) { setSelected(hit.p); zoomC.current = 1; }
  };

  // zoom du gros plan : molette, pincement à deux doigts, double-clic pour réinitialiser
  const cPtrs = useRef(new Map());
  const onCloseWheel = (e) => { e.preventDefault(); zoomC.current = Math.max(0.6, Math.min(4.5, zoomC.current * (e.deltaY < 0 ? 1.15 : 0.87))); };
  const onCloseDown = (e) => { closeRef.current.setPointerCapture(e.pointerId); cPtrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragX.current = e.clientX; dragY.current = e.clientY; if (cPtrs.current.size === 2) { const [a, b] = [...cPtrs.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoomC.current }; } };
  const onCloseMove = (e) => {
    if (!cPtrs.current.has(e.pointerId)) return;
    cPtrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && cPtrs.current.size >= 2) { const [a, b] = [...cPtrs.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomC.current = Math.max(0.6, Math.min(4.5, pinch.current.z * (d / pinch.current.d))); return; }
    // un doigt / souris : glisser = tourner la planète DANS TOUS LES SENS
    // (horizontal = longitude, vertical = bascule vers les pôles)
    if (dragX.current != null) { rotOff.current -= (e.clientX - dragX.current) * 0.004; dragX.current = e.clientX; }
    if (dragY.current != null) { rotLat.current = Math.max(-85, Math.min(85, rotLat.current + (e.clientY - dragY.current) * 0.45)); dragY.current = e.clientY; }
  };
  const onCloseUp = (e) => { cPtrs.current.delete(e.pointerId); dragX.current = null; dragY.current = null; if (cPtrs.current.size < 2) pinch.current = null; };

  // eslint-disable-next-line no-use-before-define
  return React.createElement("div", { className: "panel-grid" },
    React.createElement("div", { className: "planet-stage" },
      React.createElement("canvas", { ref: mapRef, className: "planet-canvas", onClick: onMapClick }),
      React.createElement("div", { className: "sim-date", ref: dateRef }, "🗓 …"),
      evoOpen && React.createElement(SunEvolution, { lang, onClose: () => setEvoOpen(false) })
    ),

    // barre de vitesse : sa propre case, ENTRE le système solaire et la fiche planète
    // (avant : superposée en flottant sur le système solaire, elle en cachait le bas)
    React.createElement("div", { className: "sim-speed" },
      React.createElement("button", { className: "chip rt-btn" + (speed < 0.01 && speed > 0 ? " on" : ""), onClick: () => setSpeed(1 / 86400) }, "⏱ " + (lang === "fr" ? "Temps réel" : "Real time")),
      React.createElement("input", { type: "range", min: 0, max: 365, step: 1, value: Math.round(speed), onChange: (e) => setSpeed(Number(e.target.value)) }),
      React.createElement("span", { className: "speed-val" }, speed === 0 ? tr("pl_pause") : speed < 0.01 ? (lang === "fr" ? "Temps réel" : "Real time") : "×" + Math.round(speed * 86400).toLocaleString(I18N.locale())),
      React.createElement("button", { className: "chip evo-btn", onClick: () => setEvoOpen(true) }, "🕰 " + (lang === "fr" ? "Évolution → trou noir" : "Evolution → black hole"))),

    React.createElement("aside", { className: "planet-info" },
      React.createElement("div", { className: "closeup-wrap" + (closeFull ? " full" : "") },
        React.createElement("canvas", {
          ref: closeRef, className: "closeup-canvas",
          onWheel: onCloseWheel, onPointerDown: onCloseDown, onPointerMove: onCloseMove,
          onPointerUp: onCloseUp, onPointerCancel: onCloseUp,
          onDoubleClick: () => { zoomC.current = 1; rotOff.current = 0; rotLat.current = 0; },
        }),
        React.createElement("button", {
          className: closeFull ? "closeup-collapse" : "closeup-expand",
          onClick: () => setCloseFull((v) => !v),
          title: closeFull ? (lang === "fr" ? "Réduire" : "Collapse") : (lang === "fr" ? "Agrandir — tournez la planète comme sur Google Earth" : "Expand — spin the planet like Google Earth"),
        }, closeFull ? "×" : "⛶"),
        closeFull && React.createElement("div", { className: "closeup-hint" },
          lang === "fr" ? "👆 Glissez pour tourner dans tous les sens · pincez pour zoomer" : "👆 Drag to spin any direction · pinch to zoom")
      ),
      React.createElement("h3", null, selected.sun ? "Soleil ☀️" : pname(selected.name)),
      selected.dwarf && React.createElement("span", { className: "tag" }, tr("pl_dwarf")),
      React.createElement("table", { className: "info-table" },
        React.createElement("tbody", null,
          selected.sun
            ? React.createElement(React.Fragment, null,
                React.createElement("tr", null, React.createElement("td", null, "Type"), React.createElement("td", null, "Naine jaune G2V")),
                React.createElement("tr", null, React.createElement("td", null, tr("pl_diameter")), React.createElement("td", null, selected.diam.toLocaleString(I18N.locale()) + " " + tr("u_km"))),
                React.createElement("tr", null, React.createElement("td", null, "Température (surface)"), React.createElement("td", null, "≈ 5 500 °C")),
                React.createElement("tr", null, React.createElement("td", null, "Rotation"), React.createElement("td", null, "≈ 25 " + tr("u_days"))),
                React.createElement("tr", null, React.createElement("td", null, "Âge"), React.createElement("td", null, "4,6 Md " + tr("u_years"))))
            : React.createElement(React.Fragment, null,
                React.createElement("tr", null, React.createElement("td", null, tr("pl_distance")), React.createElement("td", null, selected.a + " " + tr("u_au"))),
                React.createElement("tr", null, React.createElement("td", null, tr("pl_period")), React.createElement("td", null, selected.period < 1 ? Math.round(selected.period * 365) + " " + tr("u_days") : selected.period.toFixed(1) + " " + tr("u_years"))),
                React.createElement("tr", null, React.createElement("td", null, tr("pl_diameter")), React.createElement("td", null, selected.diam.toLocaleString(I18N.locale()) + " " + tr("u_km"))),
                React.createElement("tr", null, React.createElement("td", null, tr("pl_moons")), React.createElement("td", null, selected.moons.length || "—")),
                React.createElement("tr", null, React.createElement("td", null, tr("pl_rings")), React.createElement("td", null, selected.rings ? tr("yes") : tr("no")))))),
      React.createElement("p", { className: "info-note" }, selected.fact),
      selected.moons.length > 0 && React.createElement("p", { className: "hint" }, tr("pl_moons_shown") + " " + selected.moons.map((m) => m.name).join(", ")),
      React.createElement("p", { className: "hint" }, lang === "fr" ? "🔍 Molette / pincez : zoomer · glissez : tourner la planète dans tous les sens · double-clic : réinitialiser" : "🔍 Wheel / pinch: zoom · drag: rotate the planet any way you like · double-click: reset"),
      !selected.sun && React.createElement("p", { className: "hint ua-hint" },
        "💡 UA = unité astronomique, la distance Terre–Soleil (≈ 150 millions de km). " +
        (selected.name === "Terre" ? "La Terre est donc à 1 UA par définition."
          : pname(selected.name) + " à " + selected.a + " UA est donc " + selected.a + " fois plus loin du Soleil que la Terre.")),
      React.createElement("p", { className: "hint" }, tr("pl_hint"))
    )
  );
}

// ---- Évolution du Soleil : curseur du présent à la naine blanche (science honnête) ----
function SunEvolution({ lang, onClose }) {
  const { useRef, useEffect, useState } = React;
  const cv = useRef(null); const val = useRef(0); const raf = useRef(0);
  const [stageIdx, setStageIdx] = useState(0);
  const fr = lang === "fr";
  const P = window.NovaePlanet;
  const ST = [
    { p: 0, t: fr ? "Aujourd'hui" : "Today", d: fr ? "Notre étoile, naine jaune stable depuis 4,6 milliards d'années. Elle fusionne 600 millions de tonnes d'hydrogène chaque seconde." : "Our star, a stable yellow dwarf for 4.6 billion years, fusing 600 million tonnes of hydrogen every second.", size: 0.15, tint: null },
    { p: 0.18, t: fr ? "+1 milliard d'années" : "+1 billion years", d: fr ? "Le Soleil brille ~10 % plus fort : les océans de la Terre s'évaporent." : "The Sun shines ~10% brighter: Earth's oceans evaporate.", size: 0.17, tint: "255,245,220,0.15" },
    { p: 0.45, t: fr ? "+5 milliards d'années" : "+5 billion years", d: fr ? "L'hydrogène du cœur s'épuise : le Soleil enfle en sous-géante orange." : "Core hydrogen runs out: the Sun swells into an orange subgiant.", size: 0.3, tint: "255,170,80,0.22" },
    { p: 0.68, t: fr ? "+6,5 Md — GÉANTE ROUGE" : "+6.5 billion — RED GIANT", d: fr ? "~200 fois sa taille : Mercure et Vénus sont englouties. Depuis la Terre, le Soleil remplirait la moitié du ciel." : "~200× its size: Mercury and Venus are engulfed. From Earth, the Sun would fill half the sky.", size: 0.92, tint: "255,90,40,0.35" },
    { p: 0.75, t: fr ? "+7,5 Md — nébuleuse planétaire" : "+7.5 billion — planetary nebula", d: fr ? "Les couches externes sont soufflées en voiles de gaz colorés : le cœur nu se dévoile." : "The outer layers blow away into glowing gas shells: the bare core is revealed.", size: 0.1, neb: true },
    { p: 0.88, t: fr ? "+8 Md — NAINE BLANCHE" : "+8 billion — WHITE DWARF", d: fr ? "Le Soleil finit en naine blanche grande comme la Terre, refroidissant pendant des milliards d'années. ⚠️ Il ne deviendra JAMAIS un trou noir : il faudrait une étoile au moins 20 fois plus massive." : "The Sun ends as an Earth-sized white dwarf, cooling for billions of years. ⚠️ It will NEVER become a black hole: that takes a star at least 20× more massive.", size: 0.035, wd: true },
    { p: 1, t: fr ? "BONUS — le destin TROU NOIR" : "BONUS — the BLACK HOLE fate", d: fr ? "Et une étoile de plus de 20-25 masses solaires ? Après sa supernova, son cœur s'effondre en TROU NOIR : un disque de gaz surchauffé tourbillonne autour d'un horizon d'où rien ne s'échappe, pas même la lumière. C'est la fin que notre Soleil, trop léger, ne connaîtra jamais." : "And a star over 20–25 solar masses? After its supernova, its core collapses into a BLACK HOLE: superheated gas swirls around a horizon from which nothing escapes, not even light. A fate our Sun, too light, will never meet.", size: 0.05, bh: true },
  ];

  useEffect(() => {
    let ok = true;
    const loop = (now) => {
      if (!ok) return;
      const c = cv.current; if (!c) { raf.current = requestAnimationFrame(loop); return; }
      const dpr = Math.min(2, window.devicePixelRatio || 1), rect = c.getBoundingClientRect();
      if (c.width !== Math.round(rect.width * dpr)) { c.width = rect.width * dpr; c.height = rect.height * dpr; }
      const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height, cx = w / 2, cy = h / 2, M = Math.min(w, h);
      g.fillStyle = "#010208"; g.fillRect(0, 0, w, h);
      let s = 13; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      g.fillStyle = "#cdd8f0";
      for (let i = 0; i < 90; i++) { g.globalAlpha = 0.2 + rnd() * 0.5; g.fillRect(rnd() * w, rnd() * h, 1.1, 1.1); }
      g.globalAlpha = 1;
      const v = val.current / 1000;
      let i0 = 0; while (i0 < ST.length - 1 && ST[i0 + 1].p <= v) i0++;
      const i1 = Math.min(ST.length - 1, i0 + 1);
      const span = ST[i1].p - ST[i0].p || 1, bl = Math.max(0, Math.min(1, (v - ST[i0].p) / span));
      const size = (ST[i0].size + (ST[i1].size - ST[i0].size) * bl) * M;
      const stage = bl > 0.5 ? ST[i1] : ST[i0];
      const nebA = (ST[i0].neb ? 1 - bl : 0) + (ST[i1].neb ? bl : 0);
      const wdA = (ST[i0].wd ? 1 - bl : 0) + (ST[i1].wd ? bl : 0);
      const bhA = (ST[i0].bh ? 1 - bl : 0) + (ST[i1].bh ? bl : 0);
      // TROU NOIR façon EHT (photos réelles M87*/Sgr A*, 2019/2022) : anneau de plasma
      // chauffé asymétrique — un côté nettement plus brillant que l'autre (effet Doppler du
      // gaz en rotation), pas de bandes propres et régulières — puis grande ombre noire nette.
      if (bhA > 0.02) {
        const rb = M * 0.09;
        g.save(); g.globalCompositeOperation = "lighter";
        const amb = g.createRadialGradient(cx, cy, rb * 0.85, cx, cy, rb * 2.7);
        amb.addColorStop(0, "rgba(255,130,40,0)"); amb.addColorStop(0.4, "rgba(255,120,40," + (0.22 * bhA).toFixed(3) + ")"); amb.addColorStop(1, "transparent");
        g.fillStyle = amb; g.beginPath(); g.arc(cx, cy, rb * 2.7, 0, 7); g.fill();
        const ringR = rb * 1.7, spin = now / 6000, N = 44;
        for (let i = 0; i < N; i++) {
          const t2 = (i / N) * Math.PI * 2 + spin;
          const bright = 0.32 + 0.68 * Math.pow(Math.max(0, Math.cos(t2 - Math.PI * 0.65)), 1.7); // asymétrie type M87*
          const px = cx + Math.cos(t2) * ringR, py = cy + Math.sin(t2) * ringR * 0.86;
          const rr = rb * (0.26 + bright * 0.24);
          const gr = g.createRadialGradient(px, py, 0, px, py, rr);
          gr.addColorStop(0, "rgba(" + (bright > 0.75 ? "255,235,190" : "255,130,55") + "," + (bright * 0.85 * bhA).toFixed(3) + ")");
          gr.addColorStop(1, "transparent");
          g.fillStyle = gr; g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
        }
        g.restore();
        g.fillStyle = "rgba(3,1,0," + Math.min(1, bhA * 1.3).toFixed(3) + ")";
        g.beginPath(); g.ellipse(cx, cy, rb, rb * 0.88, 0, 0, 7); g.fill();
        g.strokeStyle = "rgba(255,225,180," + (0.45 * bhA).toFixed(3) + ")"; g.lineWidth = Math.max(1, rb * 0.045);
        g.beginPath(); g.ellipse(cx, cy, rb * 1.02, rb * 0.9, 0, 0, 7); g.stroke();
      }
      if (nebA > 0.02) {
        for (let k = 0; k < 4; k++) {
          const rr = M * (0.18 + k * 0.11) * (1 + (now / 9000) % 1 * 0.12);
          g.strokeStyle = "rgba(" + (k % 2 ? "120,220,200" : "255,140,190") + "," + (0.3 * nebA * (1 - k * 0.18)).toFixed(3) + ")";
          g.lineWidth = M * 0.035;
          g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.82, k, 0, 7); g.stroke();
        }
      }
      if (wdA > 0.02) {
        const r2 = Math.max(3, M * 0.03);
        const gl = g.createRadialGradient(cx, cy, 0, cx, cy, r2 * 5);
        gl.addColorStop(0, "rgba(210,230,255," + (0.75 * wdA).toFixed(3) + ")"); gl.addColorStop(1, "transparent");
        g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, r2 * 5, 0, 7); g.fill();
        g.fillStyle = "rgba(235,245,255," + wdA.toFixed(3) + ")"; g.beginPath(); g.arc(cx, cy, r2, 0, 7); g.fill();
      }
      if (nebA < 0.9 && wdA < 0.9 && bhA < 0.5) {
        P.drawSunTextured(g, cx, cy, Math.max(6, size / 2), now / 40000);
        const tint = stage.tint;
        if (tint) { g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(" + tint + ")"; g.beginPath(); g.arc(cx, cy, size / 2 + 2, 0, 7); g.fill(); g.restore(); }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { ok = false; cancelAnimationFrame(raf.current); };
  }, []);

  const onSlide = (e) => {
    val.current = +e.target.value;
    const v = val.current / 1000;
    let ni = 0, nd = 9;
    ST.forEach((st, i) => { const d = Math.abs(st.p - v); if (d < nd) { nd = d; ni = i; } });
    if (ni !== stageIdx) setStageIdx(ni);
  };

  return React.createElement("div", { className: "evo-overlay" },
    React.createElement("div", { className: "evo-card" },
      React.createElement("button", { className: "evo-close", onClick: onClose }, "×"),
      React.createElement("h3", null, "🕰 " + (fr ? "L'avenir du Soleil" : "The Sun's future")),
      React.createElement("canvas", { className: "evo-canvas", ref: cv }),
      React.createElement("input", { className: "evo-slider", type: "range", min: 0, max: 1000, defaultValue: 0, onInput: onSlide }),
      React.createElement("div", { className: "evo-stage" }, ST[stageIdx].t),
      React.createElement("p", { className: "evo-desc" }, ST[stageIdx].d)));
}
