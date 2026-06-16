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

  const ringGeom = () => ({ inner: 1.28, outer: 2.3, tiltY: 0.42 });

  function drawRings(ctx, x, y, R, light, front) {
    const { outer, tiltY } = ringGeom();
    const bands = [
      [1.28, 1.50, "rgba(196,176,134,0.55)"],
      [1.50, 1.57, "rgba(90,75,55,0.18)"],
      [1.57, 1.96, "rgba(224,208,166,0.80)"],
      [1.96, 2.05, "rgba(150,135,100,0.30)"],
      [2.05, 2.30, "rgba(184,168,132,0.50)"],
    ];
    ctx.save();
    ctx.beginPath();
    if (front) ctx.rect(x - outer * R, y, outer * R * 2, outer * R);
    else ctx.rect(x - outer * R, y - outer * R, outer * R * 2, outer * R);
    ctx.clip();
    bands.forEach((b) => {
      const rad = R * (b[0] + b[1]) / 2;
      ctx.beginPath();
      ctx.ellipse(x, y, rad, rad * tiltY, 0, 0, Math.PI * 2);
      ctx.lineWidth = R * (b[1] - b[0]);
      ctx.strokeStyle = b[2];
      ctx.stroke();
    });
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
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // couronne diffuse étendue
    const corona = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 3.4);
    corona.addColorStop(0, "rgba(255,220,130,0.55)");
    corona.addColorStop(0.4, "rgba(255,170,60,0.18)");
    corona.addColorStop(1, "transparent");
    ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, "#fff8da"); g.addColorStop(0.35, "#ffd95c");
    g.addColorStop(0.7, "rgba(255,170,60,0.5)"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    const core = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    core.addColorStop(0, "#fff7e0"); core.addColorStop(0.7, "#ffd24a"); core.addColorStop(1, "#ff9e2c");
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ---- real photographic textures (equirectangular maps) ----
  const TEX_BASE = "https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/";
  const TEX_URL = {
    mercury: "mercurymap.jpg", venus: "venusmap.jpg", earth: "earthmap1k.jpg",
    mars: "marsmap1k.jpg", jupiter: "jupitermap.jpg", saturn: "saturnmap.jpg",
    uranus: "uranusmap.jpg", neptune: "neptunemap.jpg", pluto: "plutomap1k.jpg",
    moon: "moonmap1k.jpg", clouds: "earthcloudmap.jpg",
  };
  const TEX = {};
  let texCb = null;
  function setTextureLoadCallback(cb) { texCb = cb; }
  function getTex(key) {
    if (key in TEX) return TEX[key]; // Image | null(loading) | false(failed)
    const url = TEX_URL[key];
    if (!url) { TEX[key] = false; return false; }
    TEX[key] = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { TEX[key] = img; if (texCb) texCb(); };
    img.onerror = () => { TEX[key] = false; if (texCb) texCb(); };
    img.src = TEX_BASE + url;
    return null;
  }
  function preloadTextures() { Object.keys(TEX_URL).forEach(getTex); }

  // sphere mapping: draw an equirectangular map onto a disc (vertical-strip technique)
  function sphereMap(ctx, img, x, y, R, rot) {
    const texW = img.width, texH = img.height;
    for (let sx = -R; sx <= R; sx += 1) {
      const nx = sx / R;
      const lon = Math.asin(Math.max(-1, Math.min(1, nx)));
      let u = rot + lon / (Math.PI * 2);
      u -= Math.floor(u);
      const srcX = Math.min(texW - 1, u * texW);
      const chord = Math.sqrt(Math.max(0, R * R - sx * sx));
      if (chord <= 0) continue;
      ctx.drawImage(img, srcX, 0, 1, texH, x + sx, y - chord, 1.5, 2 * chord);
    }
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

  // realistic planet from a real texture (falls back to procedural while loading)
  function drawPlanetTextured(ctx, x, y, R, p, rot, light) {
    const img = getTex(p.render);
    if (!img) { drawPlanet(ctx, x, y, R, p, rot, light); return; }
    light = light || { x: -0.55, y: -0.55 };
    rot = ((rot % 1) + 1) % 1;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#000"; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    sphereMap(ctx, img, x, y, R, rot);
    if (p.render === "earth") {
      const c = getTex("clouds");
      if (c) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.55; sphereMap(ctx, c, x, y, R, (((rot * 1.2) % 1) + 1) % 1); ctx.restore(); }
    }
    const hlx = x + light.x * R * 0.45, hly = y + light.y * R * 0.45;
    const sg = ctx.createRadialGradient(hlx, hly, R * 0.1, hlx, hly, R * 1.5);
    sg.addColorStop(0, "rgba(255,255,255,0.14)");
    sg.addColorStop(0.42, "rgba(0,0,0,0)");
    sg.addColorStop(1, "rgba(0,0,0,0.88)");        // nuit plus profonde (terminateur net)
    ctx.fillStyle = sg; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    // reflet spéculaire subtil au point subsolaire
    const sp = ctx.createRadialGradient(hlx, hly, 0, hlx, hly, R * 0.5);
    sp.addColorStop(0, "rgba(255,255,255,0.16)");
    sp.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sp; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    ctx.restore();
    atmoRim(ctx, x, y, R, p, light);
  }

  window.NovaePlanet = { drawPlanet, drawPlanetTextured, drawBall, drawRings, drawSun, ringGeom, setTextureLoadCallback, preloadTextures };
})();
