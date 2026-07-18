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
  const [speed, setSpeed] = useState(20);
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
    }

    function drawCloseup() {
      const canvas = closeRef.current; if (!canvas) return;
      const { ctx, w, h } = size(canvas);
      ctx.fillStyle = "#04050c"; ctx.fillRect(0, 0, w, h);
      starfield(ctx, w, h);
      const cx = w / 2, cy = h / 2, p = selected;
      const maxMoon = p.moons.reduce((a, m) => Math.max(a, m.dist), 0);
      const extent = Math.max(maxMoon, p.rings ? 2.3 : 1.2) + 0.55;
      const R = Math.min(Math.min(w, h) * 0.5 / extent, Math.min(w, h) * 0.32);
      const light = { x: -0.55, y: -0.5 };
      const phase = simDays.current / Math.max(0.25, p.dayLen);

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
      P.drawPlanetTextured(ctx, cx, cy, R, p, phase, light);
      if (p.rings) P.drawRings(ctx, cx, cy, R, light, true);
      moons.filter((mo) => mo.depth >= 0).forEach(drawMoon);
    }
  }, [speed, selected, NV, P, lang]);

  const onMapClick = (e) => {
    const canvas = mapRef.current, rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = (canvas._hits || []).find((h) => (h.x - mx) ** 2 + (h.y - my) ** 2 < h.r * h.r);
    if (hit) setSelected(hit.p);
  };

  return React.createElement("div", { className: "panel-grid" },
    React.createElement("div", { className: "planet-stage" },
      React.createElement("canvas", { ref: mapRef, className: "planet-canvas", onClick: onMapClick }),
      React.createElement("div", { className: "sim-date", ref: dateRef }, "🗓 …"),
      React.createElement("div", { className: "sim-speed" },
        React.createElement("label", null, tr("pl_speed")),
        React.createElement("input", { type: "range", min: 0, max: 365, step: 1, value: speed, onChange: (e) => setSpeed(Number(e.target.value)) }),
        React.createElement("span", { className: "speed-val" }, speed === 0 ? tr("pl_pause") : "×" + Math.round(speed * 86400).toLocaleString(I18N.locale())))
    ),

    React.createElement("aside", { className: "planet-info" },
      React.createElement("canvas", { ref: closeRef, className: "closeup-canvas" }),
      React.createElement("h3", null, pname(selected.name)),
      selected.dwarf && React.createElement("span", { className: "tag" }, tr("pl_dwarf")),
      React.createElement("table", { className: "info-table" },
        React.createElement("tbody", null,
          React.createElement("tr", null, React.createElement("td", null, tr("pl_distance")), React.createElement("td", null, selected.a + " " + tr("u_au"))),
          React.createElement("tr", null, React.createElement("td", null, tr("pl_period")), React.createElement("td", null, selected.period < 1 ? Math.round(selected.period * 365) + " " + tr("u_days") : selected.period.toFixed(1) + " " + tr("u_years"))),
          React.createElement("tr", null, React.createElement("td", null, tr("pl_diameter")), React.createElement("td", null, selected.diam.toLocaleString(I18N.locale()) + " " + tr("u_km"))),
          React.createElement("tr", null, React.createElement("td", null, tr("pl_moons")), React.createElement("td", null, selected.moons.length || "—")),
          React.createElement("tr", null, React.createElement("td", null, tr("pl_rings")), React.createElement("td", null, selected.rings ? tr("yes") : tr("no"))))),
      React.createElement("p", { className: "info-note" }, selected.fact),
      selected.moons.length > 0 && React.createElement("p", { className: "hint" }, tr("pl_moons_shown") + " " + selected.moons.map((m) => m.name).join(", ")),
      React.createElement("p", { className: "hint" }, tr("pl_hint"))
    )
  );
}
