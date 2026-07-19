/* Novaé — Real local-sky planetarium (alt/az, here & now) with cached frame + smooth AR follow */
function SkyMap() {
  const { useRef, useState, useEffect, useCallback, useMemo } = React;
  const DEG = Math.PI / 180;
  const canvasRef = useRef(null);
  const NV = window.NV;
  const P = window.NovaePlanet;
  const AS = window.NVAstro;

  const view = useRef({ az: 180, alt: 35, scale: 0, roll: 0 });
  const target = useRef({ az: 180, alt: 35, scale: 0 });
  const initScale = useRef(0);
  const anim = useRef(false);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const orient = useRef({ az: null, alt: null });
  const mwPoints = useRef(null);
  const obs = useRef({ lat: 48.8566, lon: 2.3522, elev: 35, label: "Paris (par défaut)" });
  const clock = useRef({ date: new Date(), live: true, rate: 0 });
  const sats = useRef([]);
  const aeReady = useRef(false);
  const frame = useRef(null);           // cached alt/az per time-tick (the expensive part)
  const motionOn = useRef(false);
  const motionRAF = useRef(0);
  const reticleRef = useRef(null); // objet visé {name, kind, data} ou null
  const lastSize = useRef({ w: 0, h: 0, dpr: 0 });
  const absSeen = useRef(false);
  const azOffset = useRef(0);   // manual calibration (azimuth)
  const altOffset = useRef(0);  // manual calibration (altitude)
  const magDeclRef = useRef(0); // déclinaison magnétique WMM (° est, 0 hors-ligne)
  const aosRef = useRef(null);  // AbsoluteOrientationSensor (Android : quaternion précis)
  const aosOn = useRef(false);  // capteur quaternion actif → ignore les événements Euler
  const chBranch = useRef(null); // iOS : branche du cap boussole (avant/après verticale), avec hystérésis
  const chAnchor = useRef(null); // iOS : décalage gyro→nord ancré une fois (mouvement fluide, zéro saut)
  const lastEvt = useRef(0);     // chien de garde : iOS coupe parfois les capteurs (rotation écran, retour d'onglet)
  const lastReattach = useRef(0);
  // secours utilisateur : selon le montage du capteur, le cap peut être tourné de 180° OU en
  // miroir (que +180° ne corrige PAS). 4 modes cyclables, mémorisés : normal / +180° /
  // miroir E-O (az→−az) / miroir N-S (az→180−az).
  const azModeRef = useRef(null);
  if (azModeRef.current === null) {
    try {
      const m = parseInt(localStorage.getItem("novae-azmode") || "", 10);
      azModeRef.current = m >= 0 && m <= 3 ? m : (localStorage.getItem("novae-azflip") === "1" ? 1 : 0);
    } catch (e) { azModeRef.current = 0; }
  }
  const AZMODES = ["Normal", "+180°", "Miroir E-O", "Miroir N-S"];
  const azApply = (az) => {
    const m = azModeRef.current;
    if (m === 1) az += 180; else if (m === 2) az = -az; else if (m === 3) az = 180 - az;
    return az;
  };
  const hoverRef = useRef(null); // hover tooltip element
  const hoveredConst = useRef(-1); // constellation under the cursor / reticle
  const previewRef = useRef(null); // planet icon preview element
  const previewFns = useRef({});
  const hudRef = useRef(null);        // currently-shown planet HUD name (change guard)
  const centerPlanetRef = useRef(null); // planet aimed by the reticle (motion)

  const [, force] = useState(0); const rerender = () => force((n) => n + 1);
  const [showLines, setShowLines] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [showPlanets, setShowPlanets] = useState(true);
  const [showDeepSky, setShowDeepSky] = useState(true);   // actif d'office (désactivable dans ⚙)
  const [showSats, setShowSats] = useState(true);
  const [snFilter, setSnFilter] = useState(false);
  const [belowHorizon, setBelowHorizon] = useState(true); // actif d'office (désactivable dans ⚙)
  const [motion, setMotion] = useState(false);
  const [motionMsg, setMotionMsg] = useState("");
  const [askFollow, setAskFollow] = useState(false); // iOS : bouton d'activation (geste requis)
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Initialisation du moteur astronomique…");
  const [clockLabel, setClockLabel] = useState("");
  const [aim, setAim] = useState(null); // objet visé (étiquette bas d'écran)
  const [lapse, setLapse] = useState(false);
  const [hud, setHud] = useState(null); // planet info panel (bottom-right, on hover/aim)
  const [toolsOpen, setToolsOpen] = useState(false); // calques repliés par défaut (épuré)
  const [query, setQuery] = useState(""); // recherche d'objets

  const FR2EN = { Mercure: "Mercury", Vénus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturne: "Saturn", Uranus: "Uranus", Neptune: "Neptune", Pluton: "Pluto" };

  const named = useMemo(() => {
    const arr = [];
    NV.brightStars.forEach((s) => arr.push({ name: s.name, ra: s.ra, dec: s.dec, mag: s.mag, spec: s.spec }));
    NV.constellations.forEach((c) => c.stars.forEach((s) => arr.push({ name: s.name, ra: s.ra, dec: s.dec, mag: s.mag, spec: s.spec })));
    return arr;
  }, [NV]);

  // Index pour la recherche d'objets (noms fixes ; planètes résolues au clic)
  const searchIndex = useMemo(() => {
    const idx = [], seen = new Set();
    const add = (name, ra, dec, kind, data, planet) => { if (!name) return; const k = kind + ":" + name; if (seen.has(k)) return; seen.add(k); idx.push({ name, ra, dec, kind, data, planet }); };
    named.forEach((s) => add(s.name, s.ra, s.dec, "star", s));
    NV.planets.forEach((p) => add(p.name, null, null, "planet", p, true));
    (NV.supernovae || []).forEach((d) => add(d.name, d.ra, d.dec, "sn", d));
    (NV.hypernovae || []).forEach((d) => add(d.name, d.ra, d.dec, "hyper", d));
    (NV.unstableStars || []).forEach((d) => add(d.name, d.ra, d.dec, "unstable", d));
    const DS = window.NV_DEEPSKY;
    if (DS && DS.messier) DS.messier.forEach((m) => add((m.name ? m.name + " (M" + m.m + ")" : "M" + m.m), m.ra, m.dec, "messier", m));
    return idx;
  }, [NV, named]);
  const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const I18N = window.NV_I18N;
  const results = query.trim().length >= 1 ? (() => {
    const q = norm(query);
    return searchIndex.filter((r) => norm(r.name).includes(q) || (r.planet && I18N && norm(I18N.planet(r.data.name)).includes(q))).slice(0, 8);
  })() : [];
  const goToResult = (r) => {
    setQuery("");
    if (r.planet) {
      const f = frame.current, b = f && f.bodies.find((x) => x.pl.name === r.data.name);
      if (b) { setSelected({ kind: "planet", data: r.data, ra: b.ra, dec: b.dec }); zoomToRaDec(b.ra, b.dec, initScale.current * 12); }
      return;
    }
    setSelected({ kind: r.kind, data: r.data, ra: r.ra, dec: r.dec });
    zoomToRaDec(r.ra, r.dec, initScale.current * 8);
  };

  // dense faint starfield (astrophoto look), uniform on the sphere
  const dust = useMemo(() => {
    const a = []; let s = 99; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const count = (typeof window !== "undefined" && window.innerWidth < 700) ? 1300 : 2800; // lighter on phones
    for (let i = 0; i < count; i++) a.push({ ra: r() * 360, dec: Math.asin(r() * 2 - 1) * 180 / Math.PI, b: 0.25 + r() * 0.5 });
    return a;
  }, []);
  // nebulosity patches (Hα red / reflection blue) near bright Milky Way regions
  const NEB = useMemo(() => [
    { ra: 266.4, dec: -29.0, c: "255,150,90", s: 2.4 },  // galactic centre bulge
    { ra: 84.0, dec: -1.2, c: "255,95,90", s: 1.2 },     // Orion (Hα)
    { ra: 305.6, dec: 40.2, c: "255,95,95", s: 1.4 },    // Cygnus
    { ra: 230.0, dec: -57.0, c: "130,165,255", s: 1.1 }, // Carina region
    { ra: 85.0, dec: 22.0, c: "255,120,120", s: 0.7 },   // Taurus
    { ra: 201.0, dec: -63.0, c: "150,180,255", s: 1.0 },
  ], []);
  const sprites = useRef(null);
  const getSprites = () => {
    if (sprites.current) return sprites.current;
    const mk = (rgb) => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(" + rgb + ",1)"); gr.addColorStop(1, "rgba(" + rgb + ",0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; };
    sprites.current = { blue: mk("180,195,255"), red: mk("255,140,120") };
    return sprites.current;
  };

  const galToEq = (l, b) => {
    const raN = 192.8595 * DEG, decN = 27.1283 * DEG, lN = 122.932 * DEG;
    l *= DEG; b *= DEG;
    const sb = Math.sin(b), cb = Math.cos(b);
    const dec = Math.asin(Math.sin(decN) * sb + Math.cos(decN) * cb * Math.cos(lN - l));
    const ra = raN + Math.atan2(cb * Math.sin(lN - l), Math.cos(decN) * sb - Math.sin(decN) * cb * Math.cos(lN - l));
    return [((ra / DEG) % 360 + 360) % 360, dec / DEG];
  };
  const mwRaDec = () => {
    if (mwPoints.current) return mwPoints.current;
    const pts = []; let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    // dense cloud of faint stars hugging the galactic plane (the real Milky Way look)
    const n = (typeof window !== "undefined" && window.innerWidth < 700) ? 2200 : 3600;
    for (let i = 0; i < n; i++) {
      const l = rnd() * 360;
      const b = (rnd() + rnd() + rnd() + rnd() - 2) * 4.5;     // ~gaussian, concentrated near b=0
      const eq = galToEq(l, b);
      const bright = Math.max(0.05, 1 - Math.abs(b) / 13) * (0.25 + rnd() * 0.6);
      pts.push([eq[0], eq[1], bright]);
    }
    mwPoints.current = pts;
    return pts;
  };

  const project = useCallback((az, alt, w, h) => {
    const v = view.current;
    const r0 = v.az * DEG, d0 = v.alt * DEG, r = az * DEG, d = alt * DEG;
    const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(r - r0);
    if (cosc < -0.2) return null;
    const k = 2 / (1 + cosc);
    const x = k * Math.cos(d) * Math.sin(r - r0);
    const y = k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(r - r0));
    return [w / 2 + x * v.scale, h / 2 - y * v.scale];
  }, []);

  // ---- EXPENSIVE: compute alt/az for everything once per time-tick (cached) ----
  const computeFrame = useCallback(() => {
    if (!aeReady.current) { frame.current = null; return; }
    const o = obs.current, date = clock.current.date;
    const lst = AS.lstHours(date, o.lon), lat = o.lat;
    const A2 = (ra, dec) => AS.altaz(ra, dec, lst, lat);
    const src = NV.cat || NV.fallback;
    const f = { lst, lat };

    f.stars = []; for (let i = 0; i < src.stars.length; i++) { const s = src.stars[i]; const a = A2(s.ra, s.dec); f.stars.push({ az: a.az, alt: a.alt, mag: s.mag, color: s.color, ra: s.ra, dec: s.dec }); }
    f.lines = src.lines.map((seg) => seg.map((p) => { const a = A2(p[0], p[1]); return [a.az, a.alt]; }));
    f.names = src.names.map((n) => { const a = A2(n.ra, n.dec); return { az: a.az, alt: a.alt, name: n.name, rank: n.rank }; });
    f.named = named.map((s) => { const a = A2(s.ra, s.dec); return { az: a.az, alt: a.alt, s }; });
    f.consts = (src.consts || []).map((c) => ({ name: c.name, rank: c.rank, segs: c.segs.map((seg) => seg.map((p) => { const a = A2(p[0], p[1]); return [a.az, a.alt]; })), centroid: (() => { const a = A2(c.ra, c.dec); return [a.az, a.alt]; })() }));
    const DS = window.NV_DEEPSKY;
    f.messier = DS ? DS.messier.map((m) => { const a = A2(m.ra, m.dec); return { az: a.az, alt: a.alt, data: m }; }) : [];
    f.blackHoles = DS ? DS.blackHoles.map((b) => { const a = A2(b.ra, b.dec); return { az: a.az, alt: a.alt, data: b }; }) : [];
    const mk = (arr, kind, sym, color) => arr.map((d) => { const a = A2(d.ra, d.dec); return { az: a.az, alt: a.alt, data: d, kind, sym, color }; });
    f.sne = mk(NV.supernovae, "sn", "✕", "#c879ff").concat(mk(NV.hypernovae, "hyper", "✸", "#ff5d6c")).concat(mk(NV.unstableStars, "unstable", "⚠", "#ff9d3c"));

    f.bodies = []; f.sun = null; f.moon = null;
    try {
      const obsv = AS.observer(o.lat, o.lon, o.elev);
      const sun = AS.bodyEqu("Sun", date, obsv); const sa = A2(sun.ra, sun.dec); f.sun = { az: sa.az, alt: sa.alt, ra: sun.ra, dec: sun.dec };
      const moon = AS.bodyEqu("Moon", date, obsv); const ma = A2(moon.ra, moon.dec); f.moon = { az: ma.az, alt: ma.alt, ra: moon.ra, dec: moon.dec };
      NV.planets.forEach((pl) => { const en = FR2EN[pl.name]; if (!en) return; const eq = AS.bodyEqu(en, date, obsv); const a = A2(eq.ra, eq.dec); f.bodies.push({ az: a.az, alt: a.alt, ra: eq.ra, dec: eq.dec, pl }); });
    } catch (e) {}

    f.sats = [];
    if (window.satellite && sats.current.length) {
      const gmst = window.satellite.gstime(date), gd = { longitude: o.lon * DEG, latitude: o.lat * DEG, height: o.elev / 1000 };
      sats.current.forEach((st) => { try { const pv = window.satellite.propagate(st.satrec, date); if (!pv.position) return; const ecf = window.satellite.eciToEcf(pv.position, gmst); const la = window.satellite.ecfToLookAngles(gd, ecf); f.sats.push({ az: la.azimuth / DEG, alt: la.elevation / DEG, name: st.name, rangeKm: la.rangeSat, satrec: st.satrec }); } catch (e) {} });
    }
    f.mw = mwRaDec().map((p) => { const a = A2(p[0], p[1]); return [a.az, a.alt, p[2]]; });
    f.dust = dust.map((d) => { const a = A2(d.ra, d.dec); return [a.az, a.alt, d.b]; });
    f.neb = NEB.map((n) => { const a = A2(n.ra, n.dec); return { az: a.az, alt: a.alt, c: n.c, s: n.s }; });
    frame.current = f;
  }, [AS, NV, named, dust, NEB]);

  // ---- CHEAP: project the cached frame to the screen (runs at 60 fps) ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1); // cap retina (iPhone ×3 → perf)
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const ls = lastSize.current;
    if (ls.w !== w || ls.h !== h || ls.dpr !== dpr) { canvas.width = w * dpr; canvas.height = h * dpr; lastSize.current = { w, h, dpr }; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Zoom initial basé sur la HAUTEUR (champ vertical constant ~60°) : identique en paysage
    // (desktop), mais évite que le portrait étroit (téléphone) ne dézoome et révèle tout le
    // disque d'horizon — la Voie Lactée apparaissait alors « en disque » au lieu de remplir l'écran.
    if (!view.current.scale) { const s = h * 0.5; initScale.current = s; view.current.scale = s; target.current.scale = s; }
    const v = view.current, zoomF = v.scale / initScale.current;

    // ciel quasi noir : contraste maximal avec les étoiles (astrophoto)
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#010207"); g.addColorStop(0.7, "#040812"); g.addColorStop(1, "#08101f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    const f = frame.current;
    if (!f) { canvas._hit = {}; return; }
    const minAlt = belowHorizon ? -90 : -1;
    const magLimit = Math.max(4.6, Math.min(6.6, 4.6 + Math.log2(Math.max(1, zoomF)) * 1.3));

    if (v.roll) { ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(v.roll * DEG); ctx.translate(-w / 2, -h / 2); }

    // Milky Way = a dense cloud of faint stars along the galactic plane (no halos → no blobs)
    if (showMilkyWay && f.mw) { ctx.fillStyle = "#cdd8f5"; for (let i = 0; i < f.mw.length; i++) { const m = f.mw[i]; if (m[1] < minAlt) continue; const p = project(m[0], m[1], w, h); if (!p || p[0] < 0 || p[0] > w || p[1] < 0 || p[1] > h) continue; ctx.globalAlpha = m[2] * 0.8; ctx.fillRect(p[0], p[1], 1, 1); } ctx.globalAlpha = 1; }
    // dense faint background starfield (depth)
    if (f.dust) { ctx.fillStyle = "#d6def0"; for (let i = 0; i < f.dust.length; i++) { const d = f.dust[i]; if (d[1] < minAlt) continue; const p = project(d[0], d[1], w, h); if (!p || p[0] < 0 || p[0] > w || p[1] < 0 || p[1] > h) continue; ctx.globalAlpha = d[2] * 0.7; ctx.fillRect(p[0], p[1], 1, 1); } ctx.globalAlpha = 1; }

    // stars — bright ones get bloom + diffraction spikes (astrophoto look)
    const starsHit = [];
    for (let i = 0; i < f.stars.length; i++) {
      const s = f.stars[i]; if (s.mag > magLimit || s.alt < minAlt) continue;
      const p = project(s.az, s.alt, w, h); if (!p) continue;
      const x = p[0], y = p[1]; if (x < -24 || x > w + 24 || y < -24 || y > h + 24) continue;
      const r = Math.max(0.5, (6.6 - s.mag) * 0.42) * (0.7 + 0.35 * Math.min(3, zoomF));
      // subtle glow only for fairly bright stars (like a real camera, not a game)
      if (s.mag < 2.2) {
        const gr = r * (s.mag < 0.6 ? 3.2 : 2.2);
        const bg = ctx.createRadialGradient(x, y, 0, x, y, gr);
        bg.addColorStop(0, s.color); bg.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.16; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, gr, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      }
      // faint, thin diffraction rays ONLY on the very brightest (Sirius/Vega class)
      if (s.mag < 1.2) {
        ctx.save(); ctx.globalAlpha = 0.28;
        const L = r * (3 + (1.2 - s.mag) * 2.5), W = Math.max(0.35, r * 0.28);
        const spike = (ang) => { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const lg = ctx.createLinearGradient(0, 0, 0, -L); lg.addColorStop(0, "rgba(255,255,255,0.7)"); lg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-W, 0); ctx.lineTo(0, -L); ctx.lineTo(W, 0); ctx.closePath(); ctx.fill(); ctx.restore(); };
        spike(0); spike(Math.PI); spike(Math.PI / 2); spike(-Math.PI / 2);
        ctx.restore();
      }
      ctx.fillStyle = s.mag < 1.5 ? "#f5f7ff" : s.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      if (r > 1.0) starsHit.push({ x, y, r, s });
    }

    // constellation lines
    if (showLines) {
      ctx.strokeStyle = "rgba(120,170,255,0.30)"; ctx.lineWidth = 1;
      f.lines.forEach((seg) => { ctx.beginPath(); let st = false; for (let i = 0; i < seg.length; i++) { const v2 = seg[i]; const p = v2[1] < minAlt ? null : project(v2[0], v2[1], w, h); if (!p) { st = false; continue; } if (!st) { ctx.moveTo(p[0], p[1]); st = true; } else ctx.lineTo(p[0], p[1]); } ctx.stroke(); });
    }
    if (showLabels && zoomF < 9) {
      ctx.fillStyle = "rgba(125,165,255,0.5)"; ctx.font = "italic 12px Georgia, serif"; ctx.textAlign = "center";
      f.names.forEach((n) => { if (n.rank > 2 && zoomF < 1.4) return; if (n.alt < minAlt) return; const p = project(n.az, n.alt, w, h); if (!p || p[0] < 0 || p[0] > w || p[1] < 0 || p[1] > h) return; ctx.fillText((n.name || "").toUpperCase(), p[0], p[1]); });
      ctx.textAlign = "left";
    }

    // aimed/hovered constellation: highlight the figure + show its name
    canvas._consts = [];
    if (f.consts) {
      for (let ci = 0; ci < f.consts.length; ci++) { const c = f.consts[ci]; if (c.centroid[1] < minAlt) continue; const cp = project(c.centroid[0], c.centroid[1], w, h); if (cp && cp[0] >= 0 && cp[0] <= w && cp[1] >= 0 && cp[1] <= h) canvas._consts.push({ x: cp[0], y: cp[1], idx: ci }); }
      const hi = hoveredConst.current;
      if (hi >= 0 && hi < f.consts.length) {
        const c = f.consts[hi];
        ctx.strokeStyle = "rgba(150,195,255,0.95)"; ctx.lineWidth = 2;
        c.segs.forEach((seg) => { ctx.beginPath(); let st = false; for (let i = 0; i < seg.length; i++) { const v2 = seg[i]; const p = v2[1] < minAlt ? null : project(v2[0], v2[1], w, h); if (!p) { st = false; continue; } if (!st) { ctx.moveTo(p[0], p[1]); st = true; } else ctx.lineTo(p[0], p[1]); } ctx.stroke(); });
        const cp = project(c.centroid[0], c.centroid[1], w, h);
        if (cp) { ctx.fillStyle = "rgba(205,225,255,0.97)"; ctx.font = "italic 16px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(c.name.toUpperCase(), cp[0], cp[1] - 6); ctx.textAlign = "left"; }
      }
    }

    const namedHit = [];
    f.named.forEach((n) => { if (n.alt < minAlt) return; const p = project(n.az, n.alt, w, h); if (!p || p[0] < -20 || p[0] > w + 20 || p[1] < -20 || p[1] > h + 20) return; namedHit.push({ x: p[0], y: p[1], r: 10, s: n.s }); if (showLabels && (n.s.mag < 1.7 || zoomF > 1.6)) { ctx.fillStyle = "rgba(214,226,255,0.8)"; ctx.font = "11px system-ui"; ctx.fillText(n.s.name, p[0] + 7, p[1] + 3); } });

    // deep sky
    const dsHit = [];
    if (showDeepSky) {
      f.messier.forEach((m) => { if (m.alt < minAlt) return; const p = project(m.az, m.alt, w, h); if (!p) return; ctx.strokeStyle = "#73e0c8"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(p[0], p[1], 5, 3.2, 0, 0, 7); ctx.stroke(); if (zoomF > 2) { ctx.fillStyle = "rgba(140,235,210,0.8)"; ctx.font = "10px system-ui"; ctx.fillText("M" + m.data.m, p[0] + 7, p[1] + 3); } dsHit.push({ x: p[0], y: p[1], r: 9, data: m.data, kind: "messier" }); });
      f.blackHoles.forEach((b) => { if (b.alt < minAlt) return; const p = project(b.az, b.alt, w, h); if (!p) return; ctx.fillStyle = "#0b0b14"; ctx.strokeStyle = "#ff8c42"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 7); ctx.fill(); ctx.stroke(); const halo = ctx.createRadialGradient(p[0], p[1], 4, p[0], p[1], 13); halo.addColorStop(0, "rgba(255,140,66,0.5)"); halo.addColorStop(1, "transparent"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p[0], p[1], 13, 0, 7); ctx.fill(); if (zoomF > 1.5) { ctx.fillStyle = "rgba(255,180,120,0.9)"; ctx.font = "10px system-ui"; ctx.fillText(b.data.name, p[0] + 9, p[1] + 3); } dsHit.push({ x: p[0], y: p[1], r: 10, data: b.data, kind: "blackhole" }); });
    }

    // planets / Sun / Moon
    const planetHit = [];
    let sunP = null;
    if (f.sun && f.sun.alt >= minAlt) sunP = project(f.sun.az, f.sun.alt, w, h);
    const lightTo = (p) => { if (sunP) { const dx = sunP[0] - p[0], dy = sunP[1] - p[1], d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; } return { x: -0.55, y: -0.55 }; };
    if (showPlanets) {
      // tailles plafonnées : les astres restent des repères élégants, jamais des ballons plein écran
      if (sunP) { const sr = 9 * Math.max(0.8, Math.min(2.4, zoomF)); P.drawSun(ctx, sunP[0], sunP[1], sr); planetHit.push({ x: sunP[0], y: sunP[1], r: sr + 6, kind: "sun", data: { name: "Soleil", render: "sun" }, ra: f.sun.ra, dec: f.sun.dec }); }
      if (f.moon && f.moon.alt >= minAlt) { const mp = project(f.moon.az, f.moon.alt, w, h); if (mp) { const mr = 8 * Math.max(0.9, Math.min(2.8, zoomF)); P.drawPlanetTextured(ctx, mp[0], mp[1], mr, { render: "moon", name: "Lune" }, 0.25, lightTo(mp)); ctx.fillStyle = "rgba(235,240,255,0.9)"; ctx.font = "11px system-ui"; ctx.fillText("Lune", mp[0] + mr + 4, mp[1] + 3); planetHit.push({ x: mp[0], y: mp[1], r: mr + 6, kind: "moon", data: { name: "Lune", render: "moon" }, ra: f.moon.ra, dec: f.moon.dec }); } }
      f.bodies.forEach((b) => {
        if (b.alt < minAlt) return; const p = project(b.az, b.alt, w, h); if (!p) return;
        const pl = b.pl, basePr = Math.max(3, Math.min(8, Math.pow(pl.diam, 0.27) / 3.2)), pr = basePr * Math.max(0.7, Math.min(3.2, zoomF)), light = lightTo(p);
        // texture réelle dès que la planète est assez grande pour la voir (fini les boules colorées)
        if (pr > 6) { if (pl.rings) P.drawRings(ctx, p[0], p[1], pr, light, false); P.drawPlanetTextured(ctx, p[0], p[1], pr, pl, 0.2, light); if (pl.rings) P.drawRings(ctx, p[0], p[1], pr, light, true); }
        else { P.drawBall(ctx, p[0], p[1], pr, pl.color, light); if (pl.rings) { ctx.strokeStyle = "rgba(220,205,160,0.8)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(p[0], p[1], pr * 2, pr * 0.7, 0.5, 0, 7); ctx.stroke(); } }
        ctx.fillStyle = "rgba(235,240,255,0.92)"; ctx.font = "11px system-ui"; ctx.fillText(pl.name, p[0] + pr + 4, p[1] + 3);
        planetHit.push({ x: p[0], y: p[1], r: pr + 8, kind: "planet", data: pl, ra: b.ra, dec: b.dec });
      });
    }

    // satellites
    const satHit = [];
    if (showSats) f.sats.forEach((s) => { if (s.alt < minAlt) return; const p = project(s.az, s.alt, w, h); if (!p) return; const halo = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 13); halo.addColorStop(0, "rgba(255,236,160,0.55)"); halo.addColorStop(1, "transparent"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p[0], p[1], 13, 0, 7); ctx.fill(); ctx.font = "15px system-ui"; ctx.textAlign = "center"; ctx.fillText("🛰", p[0], p[1] + 5); ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,236,160,0.95)"; ctx.font = "11px system-ui"; ctx.fillText(s.name, p[0] + 11, p[1] + 3); satHit.push({ x: p[0], y: p[1], r: 12, data: s, kind: "satellite" }); });

    // supernovae / hypernovae / unstable
    const snHit = [];
    if (snFilter) f.sne.forEach((m) => { if (m.alt < minAlt) return; const p = project(m.az, m.alt, w, h); if (!p) return; const halo = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 16); halo.addColorStop(0, m.color + "66"); halo.addColorStop(1, "transparent"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p[0], p[1], 16, 0, 7); ctx.fill(); ctx.fillStyle = m.color; ctx.font = "bold 15px system-ui"; ctx.textAlign = "center"; ctx.fillText(m.sym, p[0], p[1] + 5); ctx.textAlign = "left"; snHit.push({ x: p[0], y: p[1], r: 12, data: m.data, kind: m.kind }); });

    // horizon + cardinals
    ctx.strokeStyle = "rgba(150,120,90,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); let st = false;
    for (let az = 0; az <= 360; az += 2) { const p = project(az, 0, w, h); if (!p) { st = false; continue; } if (!st) { ctx.moveTo(p[0], p[1]); st = true; } else ctx.lineTo(p[0], p[1]); }
    ctx.stroke();
    ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
    [[0, "N"], [45, "NE"], [90, "E"], [135, "SE"], [180, "S"], [225, "SO"], [270, "O"], [315, "NO"]].forEach(([az, lab]) => { const p = project(az, 1.5, w, h); if (!p) return; ctx.fillStyle = lab.length === 1 ? "rgba(255,225,170,0.95)" : "rgba(200,180,150,0.7)"; ctx.fillText(lab, p[0], p[1]); });
    ctx.textAlign = "left";

    if (selected && selected.ra != null && f.lst != null) {
      const aa = AS.altaz(selected.ra, selected.dec, f.lst, f.lat); const p = aa.alt >= minAlt ? project(aa.az, aa.alt, w, h) : null;
      if (p) { ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0], p[1], 16, 0, 7); ctx.stroke(); }
    }

    if (v.roll) ctx.restore();

    // repère central : un point pur, rien d'autre (liseré sombre fin pour rester visible)
    if (motion) {
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 2.6, 0, 7); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 2, 0, 7); ctx.fill();
      // objet visé : conserve type + données pour l'étiquette enrichie (image + explication)
      const all = [].concat(
        planetHit.map((p) => ({ x: p.x, y: p.y, name: p.data.name, kind: p.kind, data: p.data })),
        namedHit.map((n) => ({ x: n.x, y: n.y, name: n.s.name, kind: "star", data: n.s })),
        satHit.map((s) => ({ x: s.x, y: s.y, name: s.data.name, kind: "satellite", data: s.data })),
        dsHit.map((d) => ({ x: d.x, y: d.y, name: d.data.name || ("M" + d.data.m), kind: d.kind, data: d.data })));
      let best = null, bd = 70 * 70; all.forEach((c) => { const d = (c.x - w / 2) ** 2 + (c.y - h / 2) ** 2; if (d < bd) { bd = d; best = c; } });
      let cbc = null, cbd = 200 * 200; (canvas._consts || []).forEach((c) => { const d = (c.x - w / 2) ** 2 + (c.y - h / 2) ** 2; if (d < cbd) { cbd = d; cbc = c; } });
      hoveredConst.current = cbc ? cbc.idx : -1;
      reticleRef.current = best ? { name: best.name, kind: best.kind, data: best.data } : (cbc && f.consts[cbc.idx] ? { name: f.consts[cbc.idx].name, kind: "const", data: null } : null);
      let pc = null, pcd = 70 * 70; planetHit.forEach((p) => { const d = (p.x - w / 2) ** 2 + (p.y - h / 2) ** 2; if (d < pcd) { pcd = d; pc = p; } });
      centerPlanetRef.current = pc ? { data: pc.data, kind: pc.kind } : null;
    }

    canvas._hit = { stars: starsHit, named: namedHit, planets: planetHit, sn: snHit, ds: dsHit, sat: satHit };
  }, [project, showLines, showLabels, showMilkyWay, showPlanets, showDeepSky, showSats, snFilter, belowHorizon, selected, motion, AS, NV, P]);

  const drawRef = useRef(draw); drawRef.current = draw;
  const computeRef = useRef(computeFrame); computeRef.current = computeFrame;
  const refresh = useCallback(() => { computeRef.current(); drawRef.current(); }, []);

  const step = useCallback(() => {
    const v = view.current, t = target.current;
    let dAz = t.az - v.az; if (dAz > 180) dAz -= 360; if (dAz < -180) dAz += 360;
    v.az = ((v.az + dAz * 0.22) % 360 + 360) % 360; v.alt += (t.alt - v.alt) * 0.22; v.scale += (t.scale - v.scale) * 0.22;
    drawRef.current();
    if (Math.abs(dAz) < 0.04 && Math.abs(t.alt - v.alt) < 0.04 && Math.abs(t.scale - v.scale) < 0.4) { v.az = t.az; v.alt = t.alt; v.scale = t.scale; drawRef.current(); anim.current = false; return; }
    requestAnimationFrame(step);
  }, []);
  const startAnim = useCallback(() => { if (anim.current) return; anim.current = true; requestAnimationFrame(step); }, [step]);

  useEffect(() => {
    P.setTextureLoadCallback(() => drawRef.current && drawRef.current());
    P.preloadTextures();
    let mounted = true;
    const waitAE = () => new Promise((res) => { let n = 0; const id = setInterval(() => { if (window.Astronomy || n++ > 60) { clearInterval(id); res(!!window.Astronomy); } }, 100); });
    waitAE().then((ok) => {
      if (!mounted) return; aeReady.current = ok; setStatus(ok ? "" : "Moteur astronomique indisponible (hors-ligne).");
      refresh();
      NV.loadCatalog().then(() => { if (mounted) refresh(); }).catch(() => {});
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => { if (!mounted) return; obs.current = { lat: pos.coords.latitude, lon: pos.coords.longitude, elev: pos.coords.altitude || 30, label: "Ma position" }; AS.magDecl(pos.coords.latitude, pos.coords.longitude).then((d) => { magDeclRef.current = d; }); rerender(); refresh(); }, () => {}, { timeout: 8000 });
      loadSats();
      // Suivi du téléphone dès l'ouverture (sauf si désactivé dans le menu ⚙, préférence mémorisée).
      // Android : démarrage direct. iOS : Apple exige un geste → on propose un bouton.
      try {
        const pref = localStorage.getItem("novae-follow");
        const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        const DOE = window.DeviceOrientationEvent;
        if (pref !== "off" && coarse && DOE) {
          if (typeof DOE.requestPermission === "function") setAskFollow(true);
          else startMotion();
        }
      } catch (e) {}
    });
    const tick = setInterval(() => { if (!mounted) return; const c = clock.current; if (c.live) c.date = new Date(); else if (c.rate) c.date = new Date(c.date.getTime() + c.rate * 1000); setClockLabel(fmtClock(c.date, c.live)); if (motionOn.current) { const r = reticleRef.current; setAim((prev) => (prev && r && prev.name === r.name ? prev : r)); } refresh(); }, 1000);
    const onResize = () => drawRef.current();
    window.addEventListener("resize", onResize);
    return () => { mounted = false; clearInterval(tick); cancelAnimationFrame(motionRAF.current); window.removeEventListener("resize", onResize); window.removeEventListener("deviceorientationabsolute", handleOrientation, true); window.removeEventListener("deviceorientation", handleOrientation, true); };
    // eslint-disable-next-line
  }, []);
  useEffect(() => { drawRef.current(); }, [draw]);

  function loadSats() {
    if (!window.satellite) return;
    const ids = [
      [25544, "ISS"], [20580, "Hubble"], [48274, "Tiangong"],
      [25338, "NOAA 15"], [28654, "NOAA 18"], [33591, "NOAA 19"],
      [25994, "Terra"], [27424, "Aqua"], [39084, "Landsat 8"],
    ];
    Promise.all(ids.map(([id, nm]) => fetch("https://tle.ivanstanojevic.me/api/tle/" + id).then((r) => r.json()).then((j) => ({ name: nm, satrec: window.satellite.twoline2satrec(j.line1, j.line2) })).catch(() => null)))
      .then((list) => { sats.current = list.filter(Boolean); refresh(); });
  }
  const fmtClock = (d, live) => d.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + (live ? " · en direct" : "");

  // pointer
  const onPointerDown = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    if (motion) { gesture.current = { calib: true, x: e.clientX, y: e.clientY, moved: false }; return; }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current = { pinch: true, dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.current.scale, moved: true }; }
    else gesture.current = { pinch: false, x: e.clientX, y: e.clientY, moved: false };
  };
  const renderPreview = (data, kind, cxClient, cyClient) => {
    const c = previewRef.current; if (!c) return; const P = window.NovaePlanet; const dpr = window.devicePixelRatio || 1; const S = 76;
    if (c.width !== Math.round(S * dpr)) { c.width = S * dpr; c.height = S * dpr; }
    const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
    const mid = S / 2;
    if (kind === "sun") P.drawSun(ctx, mid, mid, S * 0.3);
    else { const R = S * (data.rings ? 0.3 : 0.38), light = { x: -0.5, y: -0.5 }; if (data.rings) P.drawRings(ctx, mid, mid, R, light, false); P.drawPlanetTextured(ctx, mid, mid, R, data, 0.2, light); if (data.rings) P.drawRings(ctx, mid, mid, R, light, true); }
    c.style.left = cxClient + "px"; c.style.top = cyClient + "px"; c.style.display = "block";
  };
  const hidePreview = () => { const c = previewRef.current; if (c) c.style.display = "none"; };
  previewFns.current = { renderPreview, hidePreview };

  const updateHover = (e) => {
    const canvas = canvasRef.current, tip = hoverRef.current; if (!canvas || !tip) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top, hit = canvas._hit || {};
    let best = null, bd = 1e9, label = "", bk = "";
    const scan = (arr, fn, kind) => { (arr || []).forEach((c) => { const rr = Math.max(c.r || 10, 14); const d = (c.x - mx) ** 2 + (c.y - my) ** 2; if (d < rr * rr && d < bd) { bd = d; best = c; label = fn(c); bk = (kind === "planet" ? c.kind : kind); } }); };
    scan(hit.planets, (c) => c.data.name, "planet");
    scan(hit.sat, (c) => "🛰 " + c.data.name, "sat");
    scan(hit.sn, (c) => c.data.name, "sn");
    scan(hit.ds, (c) => c.data.name || ("M" + c.data.m), "ds");
    scan(hit.named, (c) => c.s.name, "star");
    let cb = null, cbd = 170 * 170;
    (canvas._consts || []).forEach((c) => { const d = (c.x - mx) ** 2 + (c.y - my) ** 2; if (d < cbd) { cbd = d; cb = c; } });
    const newConst = cb ? cb.idx : -1;
    if (newConst !== hoveredConst.current) { hoveredConst.current = newConst; drawRef.current(); }
    if (!best && cb && frame.current && frame.current.consts[cb.idx]) { best = cb; label = frame.current.consts[cb.idx].name; }
    const isPlanet = bk === "planet" || bk === "sun" || bk === "moon";
    if (isPlanet) { const nm = best.data.name; if (hudRef.current !== nm) { hudRef.current = nm; setHud({ data: best.data, kind: bk }); } tip.style.display = "none"; canvas.style.cursor = "pointer"; }
    else {
      if (hudRef.current !== null) { hudRef.current = null; setHud(null); }
      if (best) { tip.textContent = label; tip.style.display = "block"; tip.style.left = (e.clientX + 14) + "px"; tip.style.top = (e.clientY + 12) + "px"; canvas.style.cursor = "pointer"; }
      else { tip.style.display = "none"; canvas.style.cursor = ""; }
    }
  };

  const onPointerMove = (e) => {
    if (!gesture.current && !motion) updateHover(e);   // survol : montre l'objet sous le curseur
    const cg = gesture.current;
    if (motion && cg && cg.calib) {
      const dx = e.clientX - cg.x, dy = e.clientY - cg.y; if (Math.abs(dx) + Math.abs(dy) > 2) cg.moved = true;
      const v = view.current, fct = 1 / v.scale;
      azOffset.current -= (dx * fct / DEG) / Math.max(0.25, Math.cos(v.alt * DEG));
      altOffset.current = Math.max(-45, Math.min(45, altOffset.current + dy * fct / DEG));
      cg.x = e.clientX; cg.y = e.clientY; return;
    }
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const gs = gesture.current; if (!gs) return;
    if (gs.pinch && pointers.current.size >= 2) { const [a, b] = [...pointers.current.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y); let s = gs.scale * (dist / gs.dist); s = Math.max(initScale.current * 0.4, Math.min(initScale.current * 60, s)); view.current.scale = s; target.current.scale = s; drawRef.current(); }
    else if (!gs.pinch) { const dx = e.clientX - gs.x, dy = e.clientY - gs.y; if (Math.abs(dx) + Math.abs(dy) > 3) gs.moved = true; const v = view.current, fct = 1 / v.scale; v.az -= (dx * fct / DEG) / Math.max(0.25, Math.cos(v.alt * DEG)); v.alt = Math.max(-89, Math.min(89, v.alt + dy * fct / DEG)); v.az = ((v.az % 360) + 360) % 360; gs.x = e.clientX; gs.y = e.clientY; target.current.az = v.az; target.current.alt = v.alt; drawRef.current(); }
  };
  const onPointerUp = (e) => {
    const gs = gesture.current;
    if (motion) {
      gesture.current = null;
      if (gs && gs.calib && !gs.moved) selectCenter();
      // fin d'un glisser d'alignement → mémorise le calibrage définitivement
      else if (gs && gs.calib && gs.moved) { try { localStorage.setItem("novae-calib", JSON.stringify({ az: azOffset.current, alt: altOffset.current })); } catch (e2) {} }
      return;
    }
    pointers.current.delete(e.pointerId);
    gesture.current = pointers.current.size === 1 ? { pinch: false, x: [...pointers.current.values()][0].x, y: [...pointers.current.values()][0].y, moved: true } : null;
    if (gs && !gs.pinch && !gs.moved) handleTap(e);
  };
  const handleTap = (e) => {
    const canvas = canvasRef.current, rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top, hit = canvas._hit || {};
    const near = (arr) => { let best = null, bd = 1e9; (arr || []).forEach((c) => { const d = (c.x - mx) ** 2 + (c.y - my) ** 2; if (d < c.r * c.r && d < bd) { bd = d; best = c; } }); return best; };
    let H;
    // planète touchée → AUCUNE fiche (choix utilisateur) : le nom apparaît déjà via l'étiquette
    // de visée en mode suivi ; un tap ne fait que fermer ce qui est ouvert
    if (near(hit.planets)) { setSelected(null); return; }
    if (hudRef.current !== null) { hudRef.current = null; setHud(null); } // tap elsewhere closes the planet panel
    if ((H = near(hit.sat))) { setSelected({ kind: "satellite", data: H.data }); return; }
    if ((H = near(hit.ds))) { setSelected({ kind: H.kind, data: H.data, ra: H.data.ra, dec: H.data.dec }); zoomToRaDec(H.data.ra, H.data.dec, view.current.scale * 2); return; }
    if ((H = near(hit.sn))) { setSelected({ kind: H.kind, data: H.data, ra: H.data.ra, dec: H.data.dec }); zoomToRaDec(H.data.ra, H.data.dec, view.current.scale * 2); return; }
    if ((H = near(hit.named))) { setSelected({ kind: "star", data: H.s, ra: H.s.ra, dec: H.s.dec }); zoomToRaDec(H.s.ra, H.s.dec, view.current.scale * 2.2); return; }
    if ((H = near(hit.stars))) { setSelected({ kind: "anon", data: Object.assign({ name: "Étoile (catalogue)" }, H.s), ra: H.s.ra, dec: H.s.dec }); zoomToRaDec(H.s.ra, H.s.dec, view.current.scale * 2.2); return; }
    setSelected(null);
  };

  const zoomToRaDec = (raDeg, decDeg, scale) => { if (!frame.current) return; const aa = AS.altaz(raDeg, decDeg, frame.current.lst, frame.current.lat); target.current.az = aa.az; target.current.alt = Math.max(-85, Math.min(89, aa.alt)); target.current.scale = Math.max(initScale.current * 0.4, Math.min(initScale.current * 60, scale)); startAnim(); };
  const zoomBy = (fac) => { target.current.scale = Math.max(initScale.current * 0.4, Math.min(initScale.current * 60, target.current.scale * fac)); startAnim(); };
  const lookAt = (az, alt) => { target.current.az = az; target.current.alt = alt; startAnim(); };
  const onWheel = (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.18 : 0.85); };

  const setLive = () => { clock.current = { date: new Date(), live: true, rate: 0 }; setLapse(false); setClockLabel(fmtClock(clock.current.date, true)); refresh(); };
  const shiftHours = (hh) => { clock.current.live = false; clock.current.rate = 0; setLapse(false); clock.current.date = new Date(clock.current.date.getTime() + hh * 3600000); setClockLabel(fmtClock(clock.current.date, false)); refresh(); };
  const toggleLapse = () => { const on = !lapse; setLapse(on); clock.current.live = false; clock.current.rate = on ? 600 : 0; };
  const useMyLocation = () => { if (!navigator.geolocation) { setStatus("Géolocalisation indisponible."); return; } navigator.geolocation.getCurrentPosition((pos) => { obs.current = { lat: pos.coords.latitude, lon: pos.coords.longitude, elev: pos.coords.altitude || 30, label: "Ma position" }; AS.magDecl(pos.coords.latitude, pos.coords.longitude).then((d) => { magDeclRef.current = d; }); rerender(); refresh(); }, () => setStatus("Position refusée."), { enableHighAccuracy: true, timeout: 8000 }); };

  // ---- device orientation: sensor updates a target; a 60 fps loop eases the view (smooth follow) ----
  const handleOrientation = useCallback((e) => {
    if (aosOn.current) return; // le capteur quaternion (plus précis) a la priorité
    // avoid the relative/absolute conflict that makes the compass jitter
    if (e.type === "deviceorientation" && absSeen.current) return;
    if (e.type === "deviceorientationabsolute") absSeen.current = true;
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    // iOS : alpha n'est PAS référencé au nord → on reconstruit un alpha absolu depuis
    // webkitCompassHeading (cap boussole matériel). Ce cap mesure la projection du HAUT du
    // téléphone : avant la verticale (cos β ≥ 0) alpha = 360 − cap ; au-delà (visée vers le
    // ciel, cos β < 0) la projection s'inverse : alpha = 180 − cap. Une HYSTÉRÉSIS fige la
    // branche autour de la verticale (|cos β| < 0.12) : sans elle, le bruit du capteur faisait
    // basculer le ciel de 180° quand on visait près de l'horizon (le « bug de mouvement »).
    // iPhone — architecture « ancre » (celle des vraies apps AR) : le suivi du mouvement vient
    // du GYROSCOPE (alpha relatif : fluide, 60 Hz, zéro saut) ; la boussole ne sert qu'à CALER
    // ce gyroscope sur le nord une fois au départ, puis à corriger sa dérive très doucement.
    // Fini les à-coups et les bascules de 180° qu'donnait la boussole utilisée en continu.
    // ANCRAGE UNIQUE : la boussole ne sert qu'UNE fois, pour caler le gyroscope au démarrage
    // (dans une attitude où elle est fiable). Ensuite : gyroscope pur — stable par construction.
    // L'ancienne « correction de dérive » continue faisait tourner le ciel n'importe comment
    // quand la boussole changeait de régime (près de la verticale) : supprimée.
    let alphaDeg = e.alpha;
    const ch = e.webkitCompassHeading;
    if (typeof ch === "number" && ch >= 0 && (e.webkitCompassAccuracy == null || e.webkitCompassAccuracy >= 0)) {
      if (chAnchor.current == null) {
        const cb2 = Math.cos(e.beta * DEG);
        if (Math.abs(cb2) >= 0.35) {                             // attitude franche = boussole fiable
          const chAlpha = cb2 >= 0 ? 360 - ch : 180 - ch;        // alpha absolu à cet instant
          chAnchor.current = ((chAlpha - e.alpha) % 360 + 360) % 360;
        }
      }
      if (chAnchor.current != null) alphaDeg = e.alpha + chAnchor.current;
      // NE PAS marquer absSeen ici (les événements iPhone sont de type "deviceorientation" ;
      // les marquer « absolus » gelait tout — bug corrigé en v37).
    }
    lastEvt.current = performance.now(); // le chien de garde sait que les capteurs vivent
    // Full device->world rotation (world: X=East, Y=North, Z=Up), ZXY order.
    // We take the direction the BACK of the phone points → azimut/altitude stay
    // consistent at any tilt, so one calibration holds (no re-calibrate when you move).
    const a = alphaDeg * DEG, b = e.beta * DEG, g = e.gamma * DEG;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
    const lx = -(ca * sg + sa * sb * cg);   // back-camera direction, East component
    const ly = -(sa * sg - ca * sb * cg);   // North component
    const lz = -(cb * cg);                  // Up component
    // vrai nord = nord magnétique + déclinaison WMM (est positif)
    let az = Math.atan2(lx, ly) / DEG + magDeclRef.current; az = ((az % 360) + 360) % 360;
    const alt = Math.asin(Math.max(-1, Math.min(1, lz))) / DEG;
    // roulis physique + compensation de la rotation de l'écran (paysage) : même sensibilité
    // et même sens de balayage quelle que soit l'orientation de l'interface
    const scrA = (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === "number") ? window.screen.orientation.angle : (window.orientation || 0);
    const roll = Math.atan2(-cb * sg, sb) / DEG + scrA;
    orient.current.az = az;
    orient.current.alt = Math.max(-89, Math.min(89, alt)); // pôles célestes accessibles (plus de blocage à −30°)
    orient.current.roll = Math.max(-90, Math.min(90, ((roll + 180) % 360) - 180));
  }, []);
  const motionLoop = useCallback(() => {
    const v = view.current, o = orient.current;
    // chien de garde : si iOS a coupé les capteurs (rotation d'écran, retour d'onglet…),
    // on re-branche les écouteurs — c'est LE contournement connu du gel Safari
    const nowT = performance.now();
    if (lastEvt.current && nowT - lastEvt.current > 1500 && nowT - lastReattach.current > 2000) {
      lastReattach.current = nowT;
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
    if (o.az != null) {
      const taz = ((azApply(o.az) + azOffset.current) % 360 + 360) % 360; // mode boussole + calibrage manuel
      const talt = Math.max(-89, Math.min(89, o.alt + altOffset.current));
      let d = taz - v.az; if (d > 180) d -= 360; if (d < -180) d += 360;
      // lissage adaptatif : filtre le tremblement de la boussole quand on vise (petits écarts),
      // reste réactif quand on tourne vraiment le téléphone (grands écarts)
      const k = Math.abs(d) < 2.5 ? 0.12 : Math.abs(d) < 8 ? 0.3 : 0.5;
      v.az = ((v.az + d * k) % 360 + 360) % 360;
      v.alt += (talt - v.alt) * k;
      v.roll += ((o.roll || 0) - v.roll) * 0.2;  // gentler: gamma is noisy near vertical
    }
    drawRef.current();
    // épure : pas de panneau auto en mode suivi — le nom s'affiche en bas (aim-label),
    // la fiche complète s'ouvre au tap (selectCenter)
    if (motionOn.current) motionRAF.current = requestAnimationFrame(motionLoop);
  }, []);
  const recalibrate = () => { azOffset.current = 0; altOffset.current = 0; chAnchor.current = null; chBranch.current = null; try { localStorage.removeItem("novae-calib"); } catch (e) {} };
  const selectCenter = () => {
    const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2, hit = canvas._hit || {};
    const near = (arr) => { let b = null, bd = 80 * 80; (arr || []).forEach((c) => { const d = (c.x - cx) ** 2 + (c.y - cy) ** 2; if (d < bd) { bd = d; b = c; } }); return b; };
    let H;
    if (near(hit.planets)) return; // planètes : pas de fiche (l'étiquette de visée suffit)
    if ((H = near(hit.sat))) return setSelected({ kind: "satellite", data: H.data });
    if ((H = near(hit.ds))) return setSelected({ kind: H.kind, data: H.data, ra: H.data.ra, dec: H.data.dec });
    if ((H = near(hit.sn))) return setSelected({ kind: H.kind, data: H.data, ra: H.data.ra, dec: H.data.dec });
    if ((H = near(hit.named))) return setSelected({ kind: "star", data: H.s, ra: H.s.ra, dec: H.s.dec });
    if ((H = near(hit.stars))) return setSelected({ kind: "anon", data: Object.assign({ name: "Étoile (catalogue)" }, H.s), ra: H.s.ra, dec: H.s.dec });
  };
  const stopMotion = useCallback(() => { motionOn.current = false; cancelAnimationFrame(motionRAF.current); view.current.roll = 0; hoveredConst.current = -1; centerPlanetRef.current = null; if (hudRef.current !== null) { hudRef.current = null; setHud(null); } if (previewRef.current) previewRef.current.style.display = "none"; if (aosRef.current) { try { aosRef.current.stop(); } catch (e) {} aosRef.current = null; } aosOn.current = false; window.removeEventListener("deviceorientationabsolute", handleOrientation, true); window.removeEventListener("deviceorientation", handleOrientation, true); setMotion(false); setAim(null); reticleRef.current = null; drawRef.current(); }, [handleOrientation]);
  const startMotion = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) { setMotionMsg("Capteur d'orientation indisponible — ouvrez Novaé sur un téléphone."); return; }
    try { if (typeof DOE.requestPermission === "function") { const r = await DOE.requestPermission(); if (r !== "granted") { setMotionMsg("Permission de mouvement refusée."); return; } } }
    catch (e) { setMotionMsg("Le mode mouvement nécessite HTTPS sur mobile."); return; }
    orient.current = { az: null, alt: null, roll: 0 };
    // repart du capteur brut : un calibrage manuel fait quand la boussole était fausse
    // resterait sinon appliqué et fausserait tout après correction
    // restaure le calibrage manuel mémorisé (aligné une fois par l'utilisateur = gardé pour toujours)
    try { const c = JSON.parse(localStorage.getItem("novae-calib") || "null"); azOffset.current = (c && +c.az) || 0; altOffset.current = (c && +c.alt) || 0; } catch (e) { azOffset.current = 0; altOffset.current = 0; }
    chBranch.current = null; chAnchor.current = null; absSeen.current = false;
    if (view.current.scale < initScale.current) { view.current.scale = initScale.current * 1.5; target.current.scale = view.current.scale; }
    // Android : AbsoluteOrientationSensor (quaternion fusionné gyro+magnéto+gravité) —
    // le cap le plus précis disponible, sans les ambiguïtés des angles d'Euler
    aosOn.current = false;
    if (window.AbsoluteOrientationSensor) {
      try {
        const s = new AbsoluteOrientationSensor({ frequency: 30 });
        s.addEventListener("reading", () => {
          const q = s.quaternion; if (!q) return;
          const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
          // direction du dos du téléphone (0,0,−1) exprimée en repère Terre (X est, Y nord, Z haut)
          const ex = -2 * (qw * qy + qx * qz);
          const ny = 2 * (qw * qx - qy * qz);
          const uz = 2 * (qx * qx + qy * qy) - 1;
          let az = Math.atan2(ex, ny) / DEG + magDeclRef.current; az = ((az % 360) + 360) % 360;
          const alt = Math.asin(Math.max(-1, Math.min(1, uz))) / DEG;
          const xz = 2 * (qx * qz - qw * qy); // composante verticale de l'axe droit → roulis écran
          aosOn.current = true;
          lastEvt.current = performance.now();
          orient.current.az = az;
          orient.current.alt = Math.max(-89, Math.min(89, alt));
          orient.current.roll = Math.max(-90, Math.min(90, Math.asin(Math.max(-1, Math.min(1, xz))) / DEG));
        });
        s.addEventListener("error", () => { aosOn.current = false; try { s.stop(); } catch (e2) {} });
        s.start();
        aosRef.current = s;
      } catch (e2) { aosOn.current = false; }
    }
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    setMotion(true); setMotionMsg("");
    motionOn.current = true; cancelAnimationFrame(motionRAF.current); motionRAF.current = requestAnimationFrame(motionLoop);
  }, [handleOrientation, motionLoop]);

  // Bascule utilisateur : mémorise le choix (l'auto-démarrage respecte « off » aux prochains lancements)
  const toggleFollow = () => {
    try { localStorage.setItem("novae-follow", motion ? "off" : "on"); } catch (e) {}
    if (motion) stopMotion(); else { setAskFollow(false); startMotion(); }
  };

  const capture = () => { const c = canvasRef.current; if (!c || !window.NVLibrary) return; window.NVLibrary.capture(c, { date: clock.current.date.toISOString(), place: obs.current.label, lat: obs.current.lat, lon: obs.current.lon }); setStatus("📸 Capture enregistrée dans la Bibliothèque."); setTimeout(() => setStatus(""), 2200); };

  const chip = (label, on, onClick, cls) => React.createElement("button", { key: label, className: "chip" + (cls || "") + (on ? " on" : ""), onClick }, label);

  return React.createElement("div", { className: "skymap-wrap" },
    React.createElement("canvas", { ref: canvasRef, className: "skymap-canvas", onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel, onPointerLeave: () => { const t = hoverRef.current; if (t) t.style.display = "none"; const pv = previewRef.current; if (pv) pv.style.display = "none"; if (hudRef.current !== null) { hudRef.current = null; setHud(null); } if (hoveredConst.current !== -1) { hoveredConst.current = -1; drawRef.current(); } } }),
    React.createElement("div", { ref: hoverRef, className: "hover-tip" }),
    React.createElement("canvas", { ref: previewRef, className: "planet-preview" }),
    React.createElement("div", { className: "sky-toolbar" },
      // Recherche d'objets : tape un nom → centre la carte dessus
      React.createElement("div", { className: "sky-search" },
        React.createElement("input", {
          className: "search-input", type: "search", value: query,
          placeholder: "🔍 " + I18N.t("sky_search"),
          onChange: (e) => setQuery(e.target.value),
          onKeyDown: (e) => { if (e.key === "Enter" && results[0]) goToResult(results[0]); if (e.key === "Escape") setQuery(""); },
        }),
        results.length > 0 && React.createElement("div", { className: "search-results" },
          results.map((r) => React.createElement("button", {
            key: r.kind + r.name, className: "search-item", onClick: () => goToResult(r),
          },
            React.createElement("span", { className: "search-ico" }, ({ star: "★", planet: "🪐", sn: "✕", hyper: "✸", unstable: "⚠", messier: "🌌" }[r.kind] || "✦")),
            React.createElement("span", { className: "search-name" }, r.name)))) ),
    ),
    // Boutons flottants en bas à gauche : menu ⚙ + mode AR (loin du bouton 3D)
    React.createElement("div", { className: "sky-fabs" },
      React.createElement("button", {
        className: "menu-fab" + (toolsOpen ? " on" : ""),
        onClick: () => setToolsOpen((o) => !o),
        title: I18N.t("sky_layers"), "aria-label": I18N.t("sky_layers"),
      }, "⚙"),
      chip("📱", motion, toggleFollow, " chip-ar")
    ),
    toolsOpen && React.createElement(React.Fragment, null,
      React.createElement("div", { className: "menu-backdrop", onClick: () => setToolsOpen(false) }),
      React.createElement("div", { className: "layer-panel sky-menu" },
        // suivi du téléphone : activé à l'ouverture, désactivable ici (choix mémorisé)
        chip("📱 " + (motion ? I18N.t("sky_follow_on") : I18N.t("sky_follow")), motion, toggleFollow, " chip-ar"),
        motion && React.createElement("button", { className: "jump-btn", onClick: recalibrate }, "🧭 Recalibrer"),
        motion && React.createElement("button", {
          className: "jump-btn", title: "Directions fausses ? Touchez plusieurs fois jusqu'à ce que N/S/E/O soient justes (mémorisé)",
          onClick: () => { azModeRef.current = (azModeRef.current + 1) % 4; try { localStorage.setItem("novae-azmode", String(azModeRef.current)); } catch (e) {} rerender(); },
        }, "🔄 Sens : " + AZMODES[azModeRef.current]),
        React.createElement("div", { className: "layer-sep" }),
        React.createElement("div", { className: "menu-title" }, "🔭 " + I18N.t("sky_layers")),
        // Voie Lactée, ciel profond et sous-l'horizon : toujours actifs, plus de bascule
        chip(I18N.t("sky_constellations"), showLines, () => setShowLines(!showLines)),
        chip(I18N.t("sky_labels"), showLabels, () => setShowLabels(!showLabels)),
        chip(I18N.t("tab_planets"), showPlanets, () => setShowPlanets(!showPlanets)),
        chip("🛰 " + I18N.t("sky_satellites"), showSats, () => setShowSats(!showSats)),
        chip("💥 " + I18N.t("st_supernovae"), snFilter, () => setSnFilter(!snFilter), " chip-sn"),
        React.createElement("div", { className: "layer-sep" }),
        React.createElement("div", { className: "menu-title" }, "🧭 Regarder"),
        [["N", 0, 25], ["E", 90, 25], ["S", 180, 35], ["O", 270, 25], ["Zénith", 180, 88], ["Pôle N ⭐", 0, 49], ["Pôle S ✚", 180, -45]].map(([l, az, alt]) => React.createElement("button", { key: l, className: "jump-btn", onClick: () => lookAt(az, alt) }, l)),
        React.createElement("div", { className: "layer-sep" }),
        React.createElement("div", { className: "menu-title" }, "🕒 Heure"),
        React.createElement("div", { className: "clock-controls in-menu" },
          React.createElement("button", { onClick: () => shiftHours(-1) }, "−1 h"),
          React.createElement("span", { className: "clock-label" }, clockLabel),
          React.createElement("button", { onClick: () => shiftHours(1) }, "+1 h"),
          React.createElement("button", { className: lapse ? "on" : "", onClick: toggleLapse }, lapse ? "⏸" : "⏩"),
          React.createElement("button", { onClick: setLive }, "Maintenant")),
        React.createElement("div", { className: "layer-sep" }),
        React.createElement("button", { className: "loc-chip", onClick: useMyLocation }, "📍 " + obs.current.lat.toFixed(2) + "°, " + obs.current.lon.toFixed(2) + "° · " + obs.current.label),
        React.createElement("button", { className: "chip", onClick: capture }, "📸 Capturer le ciel")
      )
    ),
    React.createElement("div", { className: "sky-zoom" },
      React.createElement("button", { onClick: () => zoomBy(1.3) }, "+"),
      React.createElement("button", { onClick: () => zoomBy(0.77) }, "−")),
    status && React.createElement("div", { className: "sky-loading" }, status),
    snFilter && React.createElement("div", { className: "sn-legend" },
      React.createElement("div", null, React.createElement("span", { style: { color: "#c879ff" } }, "✕"), " supernova"),
      React.createElement("div", null, React.createElement("span", { style: { color: "#ff5d6c" } }, "✸"), " hypernova"),
      React.createElement("div", null, React.createElement("span", { style: { color: "#ff9d3c" } }, "⚠"), " instable")),
    // objet visé : étiquette minimaliste en bas (mini-image + nom + une ligne d'explication)
    motion && aim && React.createElement(AimLabel, { info: aim }),
    motionMsg && React.createElement("div", { className: "motion-msg" }, motionMsg, React.createElement("button", { className: "motion-msg-close", onClick: () => setMotionMsg("") }, "×")),
    // iOS : le gyroscope exige un geste utilisateur → bouton d'activation en un tap
    askFollow && !motion && React.createElement("button", { className: "follow-prompt", onClick: toggleFollow },
      "📱 Suivre le ciel avec le téléphone",
      React.createElement("span", { className: "follow-sub" }, "Touchez pour activer · désactivable dans ⚙")),
    hud && React.createElement(PlanetHUD, { data: hud.data, kind: hud.kind, obs: obs.current, date: clock.current.date }),
    selected && React.createElement(InfoCard, { sel: selected, obs: obs.current, date: clock.current.date, onClose: () => setSelected(null) })
  );
}

// Étiquette de visée : juste le nom dans un cadre élégant en bas d'écran (zéro pollution)
function AimLabel({ info }) {
  const SAT_DESC = {
    ISS: "Station spatiale internationale · ~400 km", Hubble: "Télescope spatial · lancé en 1990",
    Tiangong: "Station spatiale chinoise", "NOAA 15": "Satellite météorologique",
    "NOAA 18": "Satellite météorologique", "NOAA 19": "Satellite météorologique",
    Terra: "Observation de la Terre (NASA)", Aqua: "Observation de la Terre (NASA)",
    "Landsat 8": "Imagerie terrestre (NASA/USGS)",
  };
  let desc = null;
  if (info.kind === "satellite") desc = SAT_DESC[info.name] || "Satellite artificiel";
  else if (info.kind === "sun") desc = "Notre étoile · naine jaune G2V";
  else if (info.kind === "moon") desc = "Satellite naturel de la Terre";
  else if (info.kind === "planet") desc = info.data.dwarf ? "Planète naine · " + info.data.a + " UA" : (info.data.fact || "").split(".")[0];
  else if (info.kind === "star") desc = info.data && info.data.mag != null ? "Étoile · magnitude " + info.data.mag : "Étoile";
  else if (info.kind === "const") desc = "Constellation";
  else if (info.kind === "messier") desc = "Objet du ciel profond (Messier)";
  else if (info.kind === "blackhole") desc = "Trou noir";

  return React.createElement("div", { className: "aim-pill" },
    React.createElement("div", { className: "aim-pill-name" }, info.name),
    desc && React.createElement("div", { className: "aim-pill-desc" }, desc));
}

// Bottom-right panel: the pointed planet spins (real texture) + all its info
function PlanetHUD({ data, kind, obs, date }) {
  const { useRef, useEffect } = React;
  const cvs = useRef(null); const AS = window.NVAstro;
  useEffect(() => {
    const c = cvs.current; if (!c) return; const P = window.NovaePlanet; let raf, start = performance.now();
    const loop = (now) => {
      const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) { c.width = w * dpr; c.height = h * dpr; }
      const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      if (kind === "sun") { P.drawSun(ctx, cx, cy, Math.min(w, h) * 0.3); }
      else { const R = Math.min(w, h) * (data.rings ? 0.30 : 0.40), light = { x: -0.5, y: -0.45 }, rot = ((now - start) / 1000) * 0.08; if (data.rings) P.drawRings(ctx, cx, cy, R, light, false); P.drawPlanetTextured(ctx, cx, cy, R, data, rot, light); if (data.rings) P.drawRings(ctx, cx, cy, R, light, true); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [data, kind]);

  const rows = []; const FR2EN = { Mercure: "Mercury", Vénus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturne: "Saturn", Uranus: "Uranus", Neptune: "Neptune", Pluton: "Pluto" };
  const riseSet = (en) => { try { const o = AS.observer(obs.lat, obs.lon, obs.elev); const r = AS.riseSet(en, date, o, +1), s = AS.riseSet(en, date, o, -1); const f = (d) => d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"; if (r) rows.push(["Lever", f(r)]); if (s) rows.push(["Coucher", f(s)]); } catch (e) {} };
  let badge = "🪐 Planète";
  if (kind === "sun") { badge = "☀️ Étoile"; rows.push(["Type", "Naine jaune G2V"]); rows.push(["Diamètre", "1 392 700 km"]); rows.push(["Distance", "≈ 150 M km (1 UA)"]); riseSet("Sun"); }
  else if (kind === "moon") { badge = "🌙 Satellite naturel"; try { const ph = AS.moonPhase(date), names = ["Nouvelle", "Premier croissant", "Premier quartier", "Gibbeuse croissante", "Pleine", "Gibbeuse décroissante", "Dernier quartier", "Dernier croissant"]; rows.push(["Phase", names[Math.round(ph / 45) % 8]]); } catch (e) {} rows.push(["Distance", "≈ 384 400 km"]); rows.push(["Diamètre", "3 474 km"]); riseSet("Moon"); }
  else { badge = data.dwarf ? "🪐 Planète naine" : "🪐 Planète"; rows.push(["Distance au Soleil", data.a + " UA"]); rows.push(["Période orbitale", data.period < 1 ? Math.round(data.period * 365) + " j" : data.period.toFixed(1) + " ans"]); rows.push(["Diamètre", data.diam.toLocaleString("fr-FR") + " km"]); rows.push(["Jour", data.dayLen < 1 ? (data.dayLen * 24).toFixed(1) + " h" : data.dayLen.toFixed(1) + " j"]); rows.push(["Lunes", data.moons.length || "—"]); rows.push(["Anneaux", data.rings ? "Oui" : "Non"]); riseSet(FR2EN[data.name]); }

  return React.createElement("div", { className: "planet-hud" },
    React.createElement("canvas", { ref: cvs, className: "hud-canvas" }),
    React.createElement("div", { className: "hud-badge" }, badge),
    React.createElement("h3", null, data.name),
    React.createElement("table", { className: "info-table" }, React.createElement("tbody", null,
      rows.map(([k, v]) => React.createElement("tr", { key: k }, React.createElement("td", null, k), React.createElement("td", null, String(v)))))),
    (data.fact || data.note) && React.createElement("p", { className: "hud-fact" }, data.fact || data.note)
  );
}

function InfoCard({ sel, obs, date, onClose }) {
  const { useRef, useEffect, useState } = React;
  const { data, kind } = sel;
  const thumb = useRef(null);
  const AS = window.NVAstro;
  const I18N = window.NV_I18N;

  useEffect(() => {
    if (!["planet", "sun", "moon"].includes(kind) || !thumb.current) return;
    const c = thumb.current, P = window.NovaePlanet; let raf, start = performance.now();
    const render = (now) => {
      const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) c.width = w * dpr; if (c.height !== Math.round(h * dpr)) c.height = h * dpr;
      const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      if (kind === "sun") { P.drawSun(ctx, cx, cy, Math.min(w, h) * 0.26); return; }
      const R = Math.min(w, h) * (data.rings ? 0.26 : 0.34), light = { x: -0.55, y: -0.5 }, rot = ((now - start) / 1000) * 0.04;
      if (data.rings) P.drawRings(ctx, cx, cy, R, light, false);
      P.drawPlanetTextured(ctx, cx, cy, R, data, rot, light);
      if (data.rings) P.drawRings(ctx, cx, cy, R, light, true);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render); return () => cancelAnimationFrame(raf);
  }, [kind, data]);

  // --- Section « ce soir » : courbe d'altitude sur 24 h (tout objet avec ra/dec) ---
  const curveRef = useRef(null);
  const sky = (sel.ra != null && sel.dec != null && AS) ? (() => {
    try {
      const pts = []; const t0 = date.getTime();
      for (let i = 0; i <= 48; i++) {                 // pas de 30 min sur 24 h
        const t = new Date(t0 + i * 1800000);
        const lst = AS.lstHours(t, obs.lon);
        const aa = AS.altaz(sel.ra, sel.dec, lst, obs.lat);
        pts.push({ t, alt: aa.alt });
      }
      let top = pts[0]; pts.forEach((p) => { if (p.alt > top.alt) top = p; });
      let rise = null, set = null;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i - 1].alt < 0 && pts[i].alt >= 0 && !rise) rise = pts[i].t;
        if (pts[i - 1].alt >= 0 && pts[i].alt < 0 && !set) set = pts[i].t;
      }
      return { pts, top, rise, set, now: pts[0].alt };
    } catch (e) { return null; }
  })() : null;

  useEffect(() => {
    if (!sky || !curveRef.current) return;
    const c = curveRef.current, dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr)) c.width = w * dpr;
    if (c.height !== Math.round(h * dpr)) c.height = h * dpr;
    const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const pad = 5;
    const altY = (a) => { const v = Math.max(-20, Math.min(90, a)); return h - pad - ((v + 20) / 110) * (h - 2 * pad); };
    const iX = (i) => pad + (i / (sky.pts.length - 1)) * (w - 2 * pad);
    const y0 = altY(0);
    ctx.fillStyle = "rgba(255,150,90,0.06)"; ctx.fillRect(pad, y0, w - 2 * pad, h - pad - y0); // sol
    ctx.strokeStyle = "rgba(150,120,90,0.55)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(pad, y0); ctx.lineTo(w - pad, y0); ctx.stroke(); ctx.setLineDash([]);
    // aire sous la courbe (au-dessus de l'horizon)
    ctx.beginPath(); ctx.moveTo(iX(0), y0);
    sky.pts.forEach((p, i) => ctx.lineTo(iX(i), altY(Math.max(0, p.alt))));
    ctx.lineTo(iX(sky.pts.length - 1), y0); ctx.closePath();
    ctx.fillStyle = "rgba(88,200,255,0.16)"; ctx.fill();
    // courbe
    ctx.beginPath(); sky.pts.forEach((p, i) => { const x = iX(i), y = altY(p.alt); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = "#58c8ff"; ctx.lineWidth = 2; ctx.stroke();
    // culmination + « maintenant »
    const tx = iX(sky.pts.indexOf(sky.top)), ty = altY(sky.top.alt);
    ctx.fillStyle = "#ffce6e"; ctx.beginPath(); ctx.arc(tx, ty, 3, 0, 7); ctx.fill();
    const nx = iX(0), ny = altY(sky.now);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(nx, ny, 3.2, 0, 7); ctx.fill();
  }, [sel.ra, sel.dec, obs.lat, obs.lon, date]);

  const fmtT = (d) => d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
  const card = (az) => ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round((((az % 360) + 360) % 360) / 45) % 8];

  // --- Satellites : prochain passage > 10° au-dessus de l'observateur (SGP4, prochaines 24 h) ---
  const [pass, setPass] = useState(null);
  useEffect(() => {
    if (kind !== "satellite" || !data.satrec || !window.satellite) { setPass(null); return; }
    try {
      const S = window.satellite, D = Math.PI / 180;
      const gd = { longitude: obs.lon * D, latitude: obs.lat * D, height: obs.elev / 1000 };
      let inPass = false, p = null;
      for (let m = 0; m <= 1440; m += 0.5) {            // pas de 30 s sur 24 h
        const t = new Date(date.getTime() + m * 60000);
        const pv = S.propagate(data.satrec, t); if (!pv.position) continue;
        const la = S.ecfToLookAngles(gd, S.eciToEcf(pv.position, S.gstime(t)));
        const el = la.elevation / D;
        if (el > 10) {
          if (!inPass) { inPass = true; p = { start: t, maxEl: el, max: t, az0: la.azimuth / D }; }
          else if (el > p.maxEl) { p.maxEl = el; p.max = t; }
        } else if (inPass) { p.end = t; p.az1 = la.azimuth / D; break; }
      }
      setPass(p);
    } catch (e) { setPass(null); }
  }, [kind, data, obs.lat, obs.lon, date]);

  const rows = []; let badge, badgeColor;
  const riseSetInfo = (en) => { try { const o = AS.observer(obs.lat, obs.lon, obs.elev); const r = AS.riseSet(en, date, o, +1), s = AS.riseSet(en, date, o, -1); const f = (d) => d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"; if (r) rows.push(["Prochain lever", f(r)]); if (s) rows.push(["Prochain coucher", f(s)]); } catch (e) {} };
  const FR2EN = { Mercure: "Mercury", Vénus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturne: "Saturn", Uranus: "Uranus", Neptune: "Neptune", Pluton: "Pluto" };

  if (kind === "planet") { badge = data.dwarf ? "🪐 Planète naine" : "🪐 Planète"; badgeColor = "#7aa2ff"; rows.push(["Distance au Soleil", data.a + " UA"]); rows.push(["Période orbitale", data.period < 1 ? Math.round(data.period * 365) + " j" : data.period.toFixed(1) + " ans"]); rows.push(["Diamètre", data.diam.toLocaleString("fr-FR") + " km"]); rows.push(["Lunes", data.moons.length || "—"]); rows.push(["Anneaux", data.rings ? "Oui" : "Non"]); riseSetInfo(FR2EN[data.name]); }
  else if (kind === "sun") { badge = "☀️ Étoile"; badgeColor = "#ffcf5c"; rows.push(["Type", "Naine jaune G2V"]); rows.push(["Diamètre", "1 392 700 km"]); riseSetInfo("Sun"); }
  else if (kind === "moon") { badge = "🌙 Satellite naturel"; badgeColor = "#cfd4dc"; try { const ph = AS.moonPhase(date); const names = ["Nouvelle", "Premier croissant", "Premier quartier", "Gibbeuse croissante", "Pleine", "Gibbeuse décroissante", "Dernier quartier", "Dernier croissant"]; rows.push(["Phase", names[Math.round(ph / 45) % 8] + " (" + ph.toFixed(0) + "°)"]); } catch (e) {} rows.push(["Distance", "≈ 384 400 km"]); riseSetInfo("Moon"); }
  else if (kind === "satellite") {
    badge = "🛰 Satellite artificiel"; badgeColor = "#ffe07a";
    const SAT = { ISS: "Station spatiale internationale — ~420 km d'altitude, 7,66 km/s, équipage permanent depuis 2000.", Hubble: "Télescope spatial Hubble — NASA/ESA, en orbite depuis 1990, ~540 km.", Tiangong: "Station spatiale chinoise — ~390 km, occupée en permanence depuis 2022." };
    rows.push(["Hauteur", data.alt.toFixed(1) + "°"]); rows.push(["Azimut", data.az.toFixed(1) + "°"]); if (data.rangeKm) rows.push(["Distance", Math.round(data.rangeKm) + " km"]);
    data.note = SAT[data.name] || "Objet artificiel en orbite (données TLE/NORAD).";
  }
  else if (kind === "messier") { badge = "🌌 Objet Messier"; badgeColor = "#73e0c8"; rows.push(["Désignation", "M" + data.m]); rows.push(["Type", ({ G: "Galaxie", GCl: "Amas globulaire", OCl: "Amas ouvert", PN: "Nébuleuse planétaire", Neb: "Nébuleuse", SNR: "Vestige de supernova", "*": "Étoile", "**": "Étoile double" }[data.type] || data.type)]); if (data.mag != null) rows.push(["Magnitude", data.mag]); }
  else if (kind === "blackhole") { badge = "⚫ Trou noir"; badgeColor = "#ff8c42"; rows.push(["Type", data.kind]); rows.push(["Masse", data.mass]); }
  else if (kind === "sn") { badge = "✕ Supernova"; badgeColor = "#c879ff"; rows.push(["Type", data.type]); rows.push(["Année", data.year < 0 ? Math.abs(data.year) + " av. J.-C." : data.year]); rows.push(["Vestige", data.remnant]); rows.push(["Constellation", data.constellation]); }
  else if (kind === "hyper") { badge = "✸ Hypernova"; badgeColor = "#ff5d6c"; rows.push(["Type", data.type]); rows.push(["Vestige", data.remnant]); rows.push(["Constellation", data.constellation]); }
  else if (kind === "unstable") { badge = "⚠ Étoile instable"; badgeColor = "#ff9d3c"; rows.push(["Magnitude", data.mag.toFixed(2)]); rows.push(["Type", data.spec]); rows.push(["Constellation", data.constellation]); }
  else if (kind === "star") { badge = "★ Étoile"; badgeColor = "#9bb0ff"; rows.push(["Magnitude", data.mag.toFixed(2)]); rows.push(["Type spectral", data.spec || "—"]); rows.push(["Ascension droite", (data.ra / 15).toFixed(2) + " h"]); rows.push(["Déclinaison", data.dec.toFixed(2) + "°"]); }
  else { badge = "✦ Étoile (catalogue)"; badgeColor = "#9bb0ff"; rows.push(["Magnitude", data.mag != null ? data.mag.toFixed(2) : "—"]); rows.push(["Ascension droite", (data.ra / 15).toFixed(2) + " h"]); rows.push(["Déclinaison", data.dec.toFixed(2) + "°"]); }

  return React.createElement("div", { className: "info-card" },
    React.createElement("button", { className: "info-close", onClick: onClose }, "×"),
    ["planet", "sun", "moon"].includes(kind) && React.createElement("canvas", { ref: thumb, className: "info-thumb" }),
    React.createElement("div", { className: "info-badge", style: { color: badgeColor, borderColor: badgeColor } }, badge),
    React.createElement("h3", null, data.name),
    React.createElement("table", { className: "info-table" }, React.createElement("tbody", null, rows.map(([k, val]) => React.createElement("tr", { key: k }, React.createElement("td", null, k), React.createElement("td", null, String(val)))))),
    kind === "satellite" && React.createElement("div", { className: "tonight-box" },
      React.createElement("div", { className: "tonight-head" },
        React.createElement("span", null, "🛰 Prochain passage"),
        pass && React.createElement("span", { className: "tonight-vis up" }, "max " + pass.maxEl.toFixed(0) + "°")),
      pass
        ? React.createElement("div", { className: "tonight-row" },
            React.createElement("span", null, "↑ ", React.createElement("strong", null, fmtT(pass.start)), " " + card(pass.az0)),
            pass.end && React.createElement("span", null, "↓ ", fmtT(pass.end) + " " + card(pass.az1)),
            React.createElement("span", null, "culmination ", fmtT(pass.max)))
        : React.createElement("div", { className: "tonight-row" }, React.createElement("span", null, "Aucun passage > 10° dans les 24 h"))),
    sky && React.createElement("div", { className: "tonight-box" },
      React.createElement("div", { className: "tonight-head" },
        React.createElement("span", null, "🌙 " + I18N.t("sky_tonight")),
        React.createElement("span", { className: "tonight-vis" + (sky.now > 0 ? " up" : "") }, sky.now > 0 ? I18N.t("sky_visible") + " · " + sky.now.toFixed(0) + "°" : I18N.t("sky_below"))),
      React.createElement("canvas", { ref: curveRef, className: "alt-curve" }),
      React.createElement("div", { className: "tonight-row" },
        React.createElement("span", null, I18N.t("sky_culmination") + " ", React.createElement("strong", null, fmtT(sky.top.t)), " · ", sky.top.alt.toFixed(0), "°"),
        sky.rise && React.createElement("span", null, "↑ ", fmtT(sky.rise)),
        sky.set && React.createElement("span", null, "↓ ", fmtT(sky.set)))),
    (data.note || data.fact) && React.createElement("p", { className: "info-note" }, data.note || data.fact)
  );
}
