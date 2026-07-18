/* Novaé — procedural planet renderer (realistic shaded spheres, no external images) */
(function () {
  const hx = (c) => { c = c.replace("#", ""); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; };
  const rgb = (a) => "rgb(" + a.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",") + ")";
  const lighten = (c, n) => rgb(hx(c).map((v) => v + n));
  const darken = (c, n) => rgb(hx(c).map((v) => v - n));
  const mix = (c1, c2, t) => { const a = hx(c1), b = hx(c2); return rgb(a.map((v, i) => v + (b[i] - v) * t)); };
  const strSeed = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; return h || 1; };
  const rng = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // shaded ball — moons + small planets on the sky map
  function drawBall(ctx, x, y, r, color, light) {
    light = light || { x: -0.5, y: -0.5 };
    const lx = x + light.x * r * 0.55, ly = y + light.y * r * 0.55;
    const g = ctx.createRadialGradient(lx, ly, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, lighten(color, 48));
    g.addColorStop(0.55, color);
    g.addColorStop(1, darken(color, 80));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  const ringGeom = () => ({ inner: 1.24, outer: 2.27, tiltY: 0.42 });

  // Anneaux réels : couleurs + transparence échantillonnées depuis les bandes Cassini
  // (saturnringcolor.jpg / saturnringpattern.gif) → divisions de Cassini et Encke exactes.
  let RING_STOPS = null;
  function buildRingStops() {
    if (RING_STOPS) return RING_STOPS;
    const col = TEX.ringcolor, pat = TEX.ringpattern;
    if (!col) return null;
    try {
      const N = 96;
      const c = document.createElement("canvas"); c.width = N; c.height = 1;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(col, 0, 0, col.width, col.height, 0, 0, N, 1);
      const cd = g.getImageData(0, 0, N, 1).data;
      let pd = null;
      if (pat) { g.clearRect(0, 0, N, 1); g.drawImage(pat, 0, 0, pat.width, pat.height, 0, 0, N, 1); pd = g.getImageData(0, 0, N, 1).data; }
      RING_STOPS = [];
      for (let i = 0; i < N; i++) {
        const r = cd[i * 4], gg = cd[i * 4 + 1], b = cd[i * 4 + 2];
        const a = pd ? pd[i * 4] / 255 : Math.min(1, (r + gg + b) / 380);
        RING_STOPS.push({ c: "rgba(" + r + "," + gg + "," + b + ",", a });
      }
      return RING_STOPS;
    } catch (e) { return null; } // canvas souillé (CORS) → repli procédural
  }

  const RING_BANDS = [
    [1.24, 1.50, "rgba(196,176,134,0.55)"],
    [1.50, 1.57, "rgba(90,75,55,0.18)"],
    [1.57, 1.94, "rgba(224,208,166,0.80)"],
    [1.94, 2.03, "rgba(150,135,100,0.30)"],
    [2.03, 2.27, "rgba(184,168,132,0.50)"],
  ];

  function drawRings(ctx, x, y, R, light, front) {
    const { inner, outer, tiltY } = ringGeom();
    ctx.save();
    ctx.beginPath();
    if (front) ctx.rect(x - outer * R - 2, y, (outer * R + 2) * 2, outer * R + 2);
    else ctx.rect(x - outer * R - 2, y - outer * R - 2, (outer * R + 2) * 2, outer * R + 2);
    ctx.clip();
    const stops = buildRingStops();
    if (stops) {
      const N = stops.length, span = (outer - inner) / N;
      const lw = Math.max(0.6, span * R + 0.45);
      for (let i = 0; i < N; i++) {
        const s = stops[i]; if (s.a < 0.04) continue;
        const rad = R * (inner + (i + 0.5) * span);
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * tiltY, 0, 0, Math.PI * 2);
        ctx.lineWidth = lw;
        ctx.strokeStyle = s.c + (Math.pow(s.a, 1.4) * 0.82).toFixed(3) + ")"; // contraste : les zones denses restent, le voile s'efface
        ctx.stroke();
      }
    } else {
      RING_BANDS.forEach((b) => {
        const rad = R * (b[0] + b[1]) / 2;
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * tiltY, 0, 0, Math.PI * 2);
        ctx.lineWidth = R * (b[1] - b[0]);
        ctx.strokeStyle = b[2];
        ctx.stroke();
      });
    }
    // ombre du globe portée sur les anneaux arrière, côté opposé au Soleil (photos Cassini),
    // confinée à l'anneau (clip en couronne) pour ne pas assombrir le ciel derrière
    if (!front && light) {
      const len = Math.hypot(light.x, light.y) || 1;
      const sxd = -light.x / len, syd = -light.y / len; // direction de l'ombre
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, outer * R, outer * R * tiltY, 0, 0, Math.PI * 2);
      ctx.ellipse(x, y, inner * R * 0.98, inner * R * tiltY * 0.98, 0, 0, Math.PI * 2);
      ctx.clip("evenodd");
      const sh = ctx.createRadialGradient(x + sxd * R * 1.15, y + syd * R * 1.15 * tiltY, 0, x + sxd * R * 1.15, y + syd * R * 1.15 * tiltY, R * 1.05);
      sh.addColorStop(0, "rgba(2,3,8,0.75)"); sh.addColorStop(0.55, "rgba(2,3,8,0.35)"); sh.addColorStop(1, "rgba(2,3,8,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(x - outer * R - 2, y - outer * R - 2, (outer * R + 2) * 2, (outer * R + 2) * 2);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlanet(ctx, x, y, R, p, phase, light) {
    light = light || { x: -0.55, y: -0.55 };
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
    renderSurface(ctx, x, y, R, p, phase);
    const hlx = x + light.x * R * 0.45, hly = y + light.y * R * 0.45;
    const sg = ctx.createRadialGradient(hlx, hly, R * 0.1, hlx, hly, R * 1.5);
    sg.addColorStop(0, "rgba(255,255,255,0.16)");
    sg.addColorStop(0.45, "rgba(0,0,0,0)");
    sg.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = sg;
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    ctx.restore();

    const atmo = { earth: "120,180,255", venus: "240,220,160", jupiter: "232,211,160", saturn: "230,214,168", uranus: "189,238,245", neptune: "111,155,255", mars: "227,160,122" }[p.render];
    if (atmo) {
      const ring = ctx.createRadialGradient(x, y, R * 0.92, x, y, R * 1.13);
      ring.addColorStop(0, "rgba(0,0,0,0)");
      ring.addColorStop(0.55, "rgba(" + atmo + ",0.22)");
      ring.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ring;
      ctx.beginPath(); ctx.arc(x, y, R * 1.13, 0, Math.PI * 2); ctx.fill();
    }
  }

  function renderSurface(ctx, x, y, R, p, phase) {
    const k = p.render;
    const off = (((phase % 1) + 1) % 1) * 2 * R;
    const band = (y0, y1, color) => { ctx.fillStyle = color; ctx.fillRect(x - R, y + y0 * R, 2 * R, (y1 - y0) * R); };
    const feat = (bx, by, rx, ry, color, alpha) => {
      const baseX = ((bx + 1) / 2) * 2 * R;
      const fx = (((baseX + off) % (2 * R)) + 2 * R) % (2 * R);
      [fx, fx - 2 * R, fx + 2 * R].forEach((xx) => {
        const px = x - R + xx;
        if (px < x - R - rx * R || px > x + R + rx * R) return;
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(px, y + by * R, rx * R, ry * R, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    ctx.fillStyle = p.color;
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    const rnd = rng(strSeed(p.name));

    if (k === "mercury") {
      for (let i = 0; i < 26; i++) {
        const s = 0.03 + rnd() * 0.08;
        feat(rnd() * 2 - 1, rnd() * 2 - 1, s, s * 0.95, i % 3 ? darken(p.color, 26) : lighten(p.color, 22), 0.55);
      }
    } else if (k === "venus") {
      band(-1, -0.45, mix(p.color, "#fff", 0.12));
      band(-0.05, 0.35, darken(p.color, 16));
      band(0.6, 1, mix(p.color, "#fff", 0.08));
      for (let i = 0; i < 7; i++) feat(rnd() * 2 - 1, rnd() * 1.6 - 0.8, 0.3, 0.12, mix(p.color, "#fff", 0.18), 0.18);
    } else if (k === "earth") {
      ctx.fillStyle = "#16407a"; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      const land = "#3f7a3c", land2 = "#7d8a3e", land3 = "#8a6a3a";
      [[-0.45, -0.15, 0.34, 0.28, land], [-0.2, 0.35, 0.30, 0.34, land],
       [0.25, -0.25, 0.26, 0.22, land2], [0.55, 0.2, 0.30, 0.30, land],
       [0.85, -0.05, 0.22, 0.26, land3], [-0.8, 0.45, 0.20, 0.18, land2]]
        .forEach((b) => feat(b[0], b[1], b[2], b[3], b[4], 1));
      band(-1, -0.82, "#eef4ff"); band(0.84, 1, "#eef4ff");
      const coff = off * 1.3;
      const cloud = (bx, by, rx) => {
        const baseX = ((bx + 1) / 2) * 2 * R, fx = (((baseX + coff) % (2 * R)) + 2 * R) % (2 * R);
        [fx, fx - 2 * R, fx + 2 * R].forEach((xx) => {
          ctx.globalAlpha = 0.22; ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.ellipse(x - R + xx, y + by * R, rx * R, rx * R * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      };
      cloud(-0.6, -0.4, 0.3); cloud(0.1, 0.1, 0.4); cloud(0.7, 0.45, 0.3); cloud(-0.2, 0.6, 0.25);
    } else if (k === "mars") {
      for (let i = 0; i < 10; i++) feat(rnd() * 2 - 1, rnd() * 1.4 - 0.7, 0.12 + rnd() * 0.14, 0.1 + rnd() * 0.12, darken(p.color, 34), 0.5);
      feat(0.2, -0.86, 0.22, 0.12, "#f1ece0", 0.95);
      feat(-0.1, 0.9, 0.16, 0.09, "#f1ece0", 0.9);
    } else if (k === "jupiter") {
      band(-1, -0.72, "#d9c49a"); band(-0.72, -0.46, "#b98e5e");
      band(-0.46, -0.2, "#e7d4a9"); band(-0.2, 0.04, "#c79a63");
      band(0.04, 0.3, "#efe1bc"); band(0.3, 0.56, "#b6884f");
      band(0.56, 0.8, "#ddc896"); band(0.8, 1, "#c2a06a");
      feat(0.3, 0.34, 0.18, 0.11, "#b5532f", 0.9);
      feat(0.3, 0.34, 0.1, 0.06, "#d97a52", 0.7);
    } else if (k === "saturn") {
      band(-1, -0.6, "#e8d7a9"); band(-0.6, -0.2, "#cdb277");
      band(-0.2, 0.2, "#efe2bd"); band(0.2, 0.6, "#d8c389"); band(0.6, 1, "#e4d3a1");
    } else if (k === "uranus") {
      band(-0.35, 0.35, mix(p.color, "#fff", 0.12));
      band(0.7, 1, mix(p.color, "#fff", 0.08));
    } else if (k === "neptune") {
      band(-1, -0.5, mix(p.color, "#fff", 0.1));
      band(0.2, 0.55, mix(p.color, "#fff", 0.08));
      feat(-0.25, -0.15, 0.16, 0.1, "#163a86", 0.85);
      for (let i = 0; i < 4; i++) feat(rnd() * 2 - 1, rnd() * 1.4 - 0.7, 0.18, 0.04, "#dfe9ff", 0.3);
    } else if (k === "pluto") {
      for (let i = 0; i < 8; i++) feat(rnd() * 2 - 1, rnd() * 1.4 - 0.7, 0.12, 0.12, darken(p.color, 30), 0.45);
      feat(0.15, 0.25, 0.34, 0.3, mix(p.color, "#fff", 0.22), 0.7);
    }
  }

  function drawSun(ctx, x, y, r) {
    // rendu réaliste : disque blanc quasi uniforme (comme à l'œil/à la caméra),
    // léger assombrissement centre-bord, halo discret — plus de « tache jaune »
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const corona = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 2.1);
    corona.addColorStop(0, "rgba(255,244,214,0.32)");
    corona.addColorStop(0.5, "rgba(255,220,150,0.10)");
    corona.addColorStop(1, "transparent");
    ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, Math.PI * 2); ctx.fill();
    // aigrettes de diffraction fines (rendu photo)
    ctx.globalAlpha = 0.30;
    const L = r * 2.6, W = Math.max(0.5, r * 0.09);
    const spike = (ang) => { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const lg = ctx.createLinearGradient(0, 0, 0, -L); lg.addColorStop(0, "rgba(255,250,235,0.9)"); lg.addColorStop(1, "transparent"); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-W, 0); ctx.lineTo(0, -L); ctx.lineTo(W, 0); ctx.closePath(); ctx.fill(); ctx.restore(); };
    spike(0); spike(Math.PI); spike(Math.PI / 2); spike(-Math.PI / 2);
    ctx.restore();
    const core = ctx.createRadialGradient(x, y, 0, x, y, r);
    core.addColorStop(0, "#fffdf6"); core.addColorStop(0.75, "#fff3cf"); core.addColorStop(1, "#ffe1a0");
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ---- real photographic textures (equirectangular maps) ----
  // Photos NASA/USGS 2k stockées EN LOCAL (assets/textures/) : chargement instantané, hors-ligne ok.
  // CDN en secours si un fichier local manque.
  const TEX_1K = "https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/";
  const TEX_2K = "https://cdn.jsdelivr.net/gh/maryjuliennelyracastroverde-source/SolarSystem-Planet-Textures@main/PlanetTextures/";
  const LOC = "assets/textures/";
  const TEX_URL = {
    mercury: [LOC + "mercury.jpg", TEX_2K + "mercury.jpg", TEX_1K + "mercurymap.jpg"],
    venus: [LOC + "venus.jpg", TEX_2K + "venus.jpg", TEX_1K + "venusmap.jpg"],
    earth: [LOC + "earth.jpg", TEX_2K + "earth.jpg", TEX_1K + "earthmap1k.jpg"],
    mars: [LOC + "mars.jpg", TEX_2K + "mars.jpg", TEX_1K + "marsmap1k.jpg"],
    jupiter: [LOC + "jupiter.jpg", TEX_2K + "jupiter.jpg", TEX_1K + "jupitermap.jpg"],
    saturn: [LOC + "saturn.jpg", TEX_2K + "saturn.jpg", TEX_1K + "saturnmap.jpg"],
    uranus: [LOC + "uranus.jpg", TEX_2K + "uranus.jpg", TEX_1K + "uranusmap.jpg"],
    neptune: [LOC + "neptune.jpg", TEX_2K + "neptune.jpg", TEX_1K + "neptunemap.jpg"],
    pluto: [LOC + "pluto.jpg", TEX_1K + "plutomap1k.jpg"],
    moon: [LOC + "moon.jpg", TEX_2K + "moon.jpg", TEX_1K + "moonmap1k.jpg"],
    clouds: [LOC + "clouds.jpg", TEX_1K + "earthcloudmaptrans.jpg"],
    lights: [LOC + "lights.png", "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_lights_2048.png"],
    ringcolor: [LOC + "ringcolor.jpg", TEX_1K + "saturnringcolor.jpg"],
    ringpattern: [LOC + "ringpattern.gif", TEX_1K + "saturnringpattern.gif"],
    sun: [LOC + "sun.jpg", TEX_1K + "sunmap.jpg"],
  };
  const TEX = {};
  let texCb = null;
  function setTextureLoadCallback(cb) { texCb = cb; }
  function getTex(key) {
    if (key in TEX) return TEX[key]; // Image | null(loading) | false(failed)
    const urls = TEX_URL[key];
    if (!urls || !urls.length) { TEX[key] = false; return false; }
    TEX[key] = null;
    const tryLoad = (i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { TEX[key] = img; if (texCb) texCb(); };
      img.onerror = () => { if (i + 1 < urls.length) tryLoad(i + 1); else { TEX[key] = false; if (texCb) texCb(); } };
      img.src = urls[i];
    };
    tryLoad(0);
    return null;
  }
  function preloadTextures() { Object.keys(TEX_URL).forEach(getTex); }

  // sphere mapping: draw an equirectangular map onto a disc (vertical-strip technique).
  // Chaque colonne n'échantillonne QUE les latitudes visibles (±acos|nx|) : les pôles
  // restent en haut/bas du disque au lieu de baver le long du limbe (calottes de la Terre).
  function sphereMap(ctx, img, x, y, R, rot) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const texW = img.width, texH = img.height;
    // suréchantillonnage adaptatif : colonnes 2× plus fines en gros plan (détails nets)
    const step = R > 40 ? 0.5 : 1;
    for (let sx = -R; sx <= R; sx += step) {
      const nx = sx / R;
      const lon = Math.asin(Math.max(-1, Math.min(1, nx)));
      let u = rot + lon / (Math.PI * 2);
      u -= Math.floor(u);
      const srcX = Math.min(texW - 1, u * texW);
      const chord = Math.sqrt(Math.max(0, R * R - sx * sx));
      if (chord <= 0) continue;
      const vSpan = Math.acos(Math.min(1, Math.abs(nx))) / Math.PI; // demi-fenêtre de latitude
      const srcY = texH * (0.5 - vSpan), srcH = Math.max(1, texH * vSpan * 2);
      ctx.drawImage(img, srcX, srcY, 1, srcH, x + sx, y - chord, step * 1.5, 2 * chord);
    }
  }

  // ---- projection orthographique PAR PIXEL (vrai globe, zéro artefact aux pôles) ----
  // La texture équirectangulaire est projetée exactement comme le ferait un moteur 3D,
  // dans un canvas hors-écran mis en cache (recalcul seulement quand la rotation avance d'un pas).
  const srcPix = {};
  function texPixels(key, img) {
    if (key in srcPix) return srcPix[key];
    const w = 1024, h = 512, c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0, w, h);
    let sp = null;
    try { sp = { d: g.getImageData(0, 0, w, h).data, w, h }; } catch (e) {}
    srcPix[key] = sp;
    return sp;
  }
  const orthoCache = {};
  function orthoSphere(key, img, R, rot) {
    const S = R >= 60 ? 384 : 128;
    const q = Math.round((((rot % 1) + 1) % 1) * 128) % 128;
    const ck = key + ":" + S;
    const e = orthoCache[ck];
    if (e && e.q === q) return e.c;
    const sp = texPixels(key, img);
    if (!sp) return null;
    const c = (e && e.c) || document.createElement("canvas");
    if (c.width !== S) { c.width = S; c.height = S; }
    const g = c.getContext("2d");
    const out = g.createImageData(S, S), od = out.data, sd = sp.d, sw = sp.w, sh = sp.h;
    const mid = (S - 1) / 2, rr = S / 2 - 0.5, rotU = q / 128, PI2 = Math.PI * 2;
    for (let py = 0; py < S; py++) {
      const ny = (py - mid) / rr;
      for (let px = 0; px < S; px++) {
        const nx = (px - mid) / rr;
        const d2 = nx * nx + ny * ny;
        const o = (py * S + px) * 4;
        if (d2 > 1) { od[o + 3] = 0; continue; }
        const nz = Math.sqrt(1 - d2);
        const lat = Math.asin(-ny), lon = Math.atan2(nx, nz);
        let u = rotU + lon / PI2; u -= Math.floor(u);
        const v = 0.5 - lat / Math.PI;
        const sx = Math.min(sw - 1, (u * sw) | 0), sy = Math.min(sh - 1, (v * sh) | 0);
        const si = (sy * sw + sx) * 4;
        od[o] = sd[si]; od[o + 1] = sd[si + 1]; od[o + 2] = sd[si + 2];
        od[o + 3] = Math.max(0, Math.min(1, (1 - Math.sqrt(d2)) * rr)) * 255; // bord adouci 1 px
      }
    }
    g.putImageData(out, 0, 0);
    orthoCache[ck] = { q, c };
    return c;
  }

  function atmoRim(ctx, x, y, R, p, light) {
    const atmo = { earth: "120,180,255", venus: "240,220,160", jupiter: "232,211,160", saturn: "230,214,168", uranus: "189,238,245", neptune: "111,155,255", mars: "227,160,122", pluto: "205,188,176" }[p.render];
    if (!atmo) return;
    light = light || { x: -0.55, y: -0.5 };
    const len = Math.hypot(light.x, light.y) || 1, ux = light.x / len, uy = light.y / len;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // halo atmosphérique diffus tout autour du disque
    const halo = ctx.createRadialGradient(x, y, R * 0.95, x, y, R * 1.2);
    halo.addColorStop(0, "rgba(" + atmo + ",0)");
    halo.addColorStop(0.45, "rgba(" + atmo + ",0.16)");
    halo.addColorStop(1, "rgba(" + atmo + ",0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, R * 1.2, 0, Math.PI * 2); ctx.fill();
    // limbe ensoleillé : croissant brillant côté lumière (diffusion atmosphérique)
    const ex = x + ux * R, ey = y + uy * R;
    ctx.beginPath(); ctx.arc(x, y, R * 1.06, 0, Math.PI * 2); ctx.arc(x, y, R * 0.84, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
    const limb = ctx.createRadialGradient(ex, ey, 0, ex, ey, R * 1.1);
    limb.addColorStop(0, "rgba(" + atmo + ",0.55)");
    limb.addColorStop(0.5, "rgba(" + atmo + ",0.14)");
    limb.addColorStop(1, "rgba(" + atmo + ",0)");
    ctx.fillStyle = limb;
    ctx.fillRect(x - R * 1.2, y - R * 1.2, R * 2.4, R * 2.4);
    ctx.restore();
  }

  // offscreen réutilisé pour composer les lumières nocturnes (pas d'allocation par image)
  let nightC = null;
  function nightCanvas(size) {
    if (!nightC) nightC = document.createElement("canvas");
    if (nightC.width !== size) { nightC.width = size; nightC.height = size; }
    return nightC;
  }

  // realistic planet from a real texture (falls back to procedural while loading)
  function drawPlanetTextured(ctx, x, y, R, p, rot, light) {
    const img = getTex(p.render);
    if (!img) { drawPlanet(ctx, x, y, R, p, rot, light); return; }
    light = light || { x: -0.55, y: -0.55 };
    rot = ((rot % 1) + 1) % 1;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#000"; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    const oc = orthoSphere(p.render, img, R, rot);
    if (oc) ctx.drawImage(oc, x - R, y - R, 2 * R, 2 * R);
    else sphereMap(ctx, img, x, y, R, rot);
    if (p.render === "earth") {
      const c = getTex("clouds");
      if (c) {
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5;
        const cc = orthoSphere("clouds", c, R, rot * 1.2);
        if (cc) ctx.drawImage(cc, x - R, y - R, 2 * R, 2 * R); else sphereMap(ctx, c, x, y, R, (((rot * 1.2) % 1) + 1) % 1);
        ctx.restore();
      }
    }
    const hlx = x + light.x * R * 0.45, hly = y + light.y * R * 0.45;
    const sg = ctx.createRadialGradient(hlx, hly, R * 0.1, hlx, hly, R * 1.5);
    sg.addColorStop(0, "rgba(255,255,255,0.14)");
    sg.addColorStop(0.42, "rgba(0,0,0,0)");
    sg.addColorStop(1, "rgba(0,0,0,0.88)");        // nuit plus profonde (terminateur net)
    ctx.fillStyle = sg; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    // assombrissement du limbe (photométrie réelle : bords plus sombres, surtout les géantes gazeuses)
    const limbK = { jupiter: 0.5, saturn: 0.45, uranus: 0.4, neptune: 0.4, venus: 0.35 }[p.render] || 0.24;
    const ld = ctx.createRadialGradient(x, y, R * 0.62, x, y, R);
    ld.addColorStop(0, "rgba(0,0,0,0)"); ld.addColorStop(1, "rgba(0,0,0," + limbK + ")");
    ctx.fillStyle = ld; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    // Terre : reflet spéculaire du Soleil sur les océans (glint, comme sur les photos DSCOVR)
    if (p.render === "earth") {
      const gl = ctx.createRadialGradient(hlx, hly, 0, hlx, hly, R * 0.2);
      gl.addColorStop(0, "rgba(255,250,232,0.38)"); gl.addColorStop(1, "rgba(255,250,232,0)");
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gl; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); ctx.restore();
    }
    // villes illuminées côté nuit (NASA Black Marble), en gros plan seulement
    if (p.render === "earth" && R >= 22) {
      const lt = getTex("lights");
      if (lt) {
        const size = Math.ceil(2 * R);
        const nc = nightCanvas(size), ng = nc.getContext("2d");
        ng.clearRect(0, 0, size, size);
        const lo = orthoSphere("lights", lt, R, rot);
        if (lo) ng.drawImage(lo, 0, 0, size, size); else sphereMap(ng, lt, R, R, R, rot);
        // masque : visible uniquement côté nuit (opposé au point subsolaire)
        ng.globalCompositeOperation = "destination-in";
        const m = ng.createRadialGradient(R + light.x * R * 0.45, R + light.y * R * 0.45, R * 0.3, R + light.x * R * 0.45, R + light.y * R * 0.45, R * 1.6);
        m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.5, "rgba(0,0,0,0)"); m.addColorStop(0.85, "rgba(0,0,0,1)");
        ng.fillStyle = m; ng.fillRect(0, 0, size, size);
        ng.globalCompositeOperation = "source-over";
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9;
        ctx.drawImage(nc, x - R, y - R);
        ctx.restore();
      }
    }
    // ombre des anneaux portée sur le globe de Saturne (bande sombre caractéristique)
    if (p.render === "saturn") {
      const { tiltY } = ringGeom();
      const sy = y - light.y * R * 0.22;
      ctx.strokeStyle = "rgba(20,14,6,0.38)"; ctx.lineWidth = R * 0.13;
      ctx.beginPath(); ctx.ellipse(x, sy, R * 1.45, R * 1.45 * tiltY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(20,14,6,0.2)"; ctx.lineWidth = R * 0.07;
      ctx.beginPath(); ctx.ellipse(x, sy, R * 1.62, R * 1.62 * tiltY, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // reflet spéculaire subtil au point subsolaire
    const sp = ctx.createRadialGradient(hlx, hly, 0, hlx, hly, R * 0.5);
    sp.addColorStop(0, "rgba(255,255,255,0.16)");
    sp.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sp; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    ctx.restore();
    atmoRim(ctx, x, y, R, p, light);
  }

  // lune réaliste : surface cratérisée (texture Lune) teintée de la couleur du satellite
  // (Io jaune soufre, Europe glace, Titan orange…) au lieu d'une boule de couleur unie
  function drawMoonTextured(ctx, x, y, r, color, light, rot) {
    const img = getTex("moon");
    if (!img || r < 2.5) { drawBall(ctx, x, y, r, color, light); return; }
    light = light || { x: -0.5, y: -0.5 };
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const mo = orthoSphere("moon", img, r, ((rot || 0.3) % 1 + 1) % 1);
    if (mo) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(mo, x - r, y - r, 2 * r, 2 * r); }
    else sphereMap(ctx, img, x, y, r, ((rot || 0.3) % 1 + 1) % 1);
    ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.5;
    ctx.fillStyle = color; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    const lx = x + light.x * r * 0.5, ly = y + light.y * r * 0.5;
    const sg = ctx.createRadialGradient(lx, ly, r * 0.15, lx, ly, r * 1.5);
    sg.addColorStop(0, "rgba(255,255,255,0.12)");
    sg.addColorStop(0.45, "rgba(0,0,0,0)");
    sg.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = sg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  }

  // Soleil texturé (photo NASA de la photosphère, granulation réelle) — pour les gros plans.
  // Couronne discrète + assombrissement centre-bord réel du Soleil.
  function drawSunTextured(ctx, x, y, r, rot) {
    const img = getTex("sun");
    const oc = img ? orthoSphere("sun", img, r, rot || 0) : null;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const corona = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 2.3);
    corona.addColorStop(0, "rgba(255,240,200,0.35)");
    corona.addColorStop(0.45, "rgba(255,200,110,0.12)");
    corona.addColorStop(1, "transparent");
    ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(x, y, r * 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (!oc) { drawSun(ctx, x, y, r); return; }
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(oc, x - r, y - r, 2 * r, 2 * r);
    // éclat du cœur + assombrissement centre-bord (photométrie solaire réelle)
    const hot = ctx.createRadialGradient(x, y, 0, x, y, r);
    hot.addColorStop(0, "rgba(255,252,235,0.5)"); hot.addColorStop(0.55, "rgba(255,235,180,0.12)"); hot.addColorStop(0.88, "rgba(120,50,0,0.12)"); hot.addColorStop(1, "rgba(90,30,0,0.42)");
    ctx.fillStyle = hot; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  }

  window.NovaePlanet = { drawPlanet, drawPlanetTextured, drawBall, drawMoonTextured, drawRings, drawSun, drawSunTextured, ringGeom, setTextureLoadCallback, preloadTextures };
})();
