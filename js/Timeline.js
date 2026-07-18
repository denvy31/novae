/* Novaé — Frise cosmique réversible : du présent au Big Bang (chronologie commentée).
   Curseur bidirectionnel + visualisation procédurale animée par époque (Canvas). */
function TimelinePanel() {
  const { useRef, useState, useEffect, useMemo } = React;
  const I18N = window.NV_I18N;
  const lang = I18N.get();
  const canvasRef = useRef(null);
  const sliderVal = useRef(1000); // 0 = Big Bang, 1000 = présent
  const raf = useRef(0);
  const [eraIdx, setEraIdx] = useState(7);

  // Époques (chronologiques) — contenu FR par défaut, EN si langue anglaise
  const ERAS = useMemo(() => {
    const L = (fr, en) => (lang === "en" ? en : fr);
    return [
      { t: "t = 0", icon: "💥", title: L("Big Bang", "Big Bang"),
        desc: L("Origine de la chronologie. Toute la matière et l'énergie de l'Univers observable concentrées en un état extrêmement dense et chaud.",
                "Origin of the timeline. All matter and energy of the observable universe concentrated in an extremely dense, hot state."),
        show: L("Origine de la chronologie", "Origin of the timeline") },
      { t: "< 1 s", icon: "🔥", title: L("Soupe de particules", "Particle soup"),
        desc: L("Quarks, électrons, photons : un plasma opaque et brûlant. Non observable directement — présenté en schéma.",
                "Quarks, electrons, photons: an opaque, searing plasma. Not directly observable — shown as a diagram."),
        show: L("Schéma (non observable)", "Diagram (not observable)") },
      { t: "3 min", icon: "⚛️", title: L("Noyaux légers", "Light nuclei"),
        desc: L("Nucléosynthèse primordiale : formation de l'hydrogène et de l'hélium, les briques des futures étoiles.",
                "Primordial nucleosynthesis: hydrogen and helium form — the building blocks of future stars."),
        show: L("Hydrogène & hélium", "Hydrogen & helium") },
      { t: "380 000 " + L("ans", "yr"), icon: "🌅", title: L("Première lumière", "First light"),
        desc: L("L'Univers devient transparent : le fond diffus cosmologique est la plus ancienne lumière observable.",
                "The universe becomes transparent: the cosmic microwave background is the oldest observable light."),
        show: L("Fond diffus cosmologique", "Cosmic microwave background") },
      { t: "100–400 M " + L("d'années", "yr"), icon: "✨", title: L("Premières étoiles", "First stars"),
        desc: L("Les étoiles de Population III : massives, bleues, brèves. Elles forgent les premiers éléments lourds.",
                "Population III stars: massive, blue, short-lived. They forge the first heavy elements."),
        show: L("Population III", "Population III") },
      { t: "~1 Md " + L("d'années", "yr"), icon: "🌌", title: L("Premières galaxies", "First galaxies"),
        desc: L("Les galaxies primitives s'assemblent — celles que le télescope James Webb observe aujourd'hui.",
                "Primitive galaxies assemble — the ones the James Webb telescope observes today."),
        show: L("Galaxies primitives (JWST)", "Primitive galaxies (JWST)") },
      { t: "~9 Md " + L("d'années", "yr"), icon: "☀️", title: L("Naissance du Soleil", "Birth of the Sun"),
        desc: L("Un nuage de gaz s'effondre : le Soleil s'allume, entouré d'un disque de poussière d'où naissent les planètes.",
                "A gas cloud collapses: the Sun ignites, surrounded by a dust disk from which the planets form."),
        show: L("Formation du Système solaire", "Formation of the Solar System") },
      { t: "13,8 Md " + L("d'années", "yr"), icon: "🌍", title: L("Univers actuel", "Universe today"),
        desc: L("Le ciel que vous observez ce soir : étoiles, planètes, galaxies — et vous, fait d'atomes forgés dans les étoiles.",
                "The sky you observe tonight: stars, planets, galaxies — and you, made of atoms forged in stars."),
        show: L("Le ciel observé", "The observed sky") },
    ];
  }, [lang]);
  const N = ERAS.length;

  // Particules déterministes partagées par les scènes
  const parts = useMemo(() => {
    let s = 42; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const mk = (n, fn) => Array.from({ length: n }, () => fn(r));
    return {
      plasma: mk(260, (r) => ({ a: r() * Math.PI * 2, d: Math.pow(r(), 0.6), sz: 0.6 + r() * 1.8, ph: r() * Math.PI * 2 })),
      cmb: mk(170, (r) => ({ x: r(), y: r(), sz: 0.025 + r() * 0.085, warm: r() })),
      stars3: mk(9, (r) => ({ x: 0.08 + r() * 0.84, y: 0.1 + r() * 0.75, sz: 2 + r() * 3 })),
      gals: mk(14, (r) => ({ x: 0.06 + r() * 0.88, y: 0.08 + r() * 0.8, sz: 0.02 + r() * 0.045, rot: r() * Math.PI, hue: r() })),
      // vraies couleurs stellaires (types O/B bleus → M rouges, majorité blanc-bleuté)
      sky: mk(460, (r) => {
        const pal = ["#aabfff", "#cad7ff", "#f8f7ff", "#fff4ea", "#ffd2a1", "#ffb38a"];
        const t = r();
        const c = pal[t < 0.3 ? 0 : t < 0.55 ? 1 : t < 0.75 ? 2 : t < 0.88 ? 3 : t < 0.96 ? 4 : 5];
        return { x: r(), y: r(), sz: 0.3 + r() * 1.3, b: 0.25 + r() * 0.75, ph: r() * Math.PI * 2, c, big: r() < 0.05 };
      }),
      band: mk(900, (r) => ({ u: r(), v: (r() + r() + r() - 1.5) * 0.06, b: 0.2 + r() * 0.6 })),
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let mounted = true; const t0 = performance.now();

    // Une scène par époque — dessinée avec alpha pour le fondu enchaîné
    const scenes = [
      // 0 — Big Bang : flash central + ondes de choc en expansion (rendu additif)
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        const cx = w / 2, cy = h / 2, pulse = 1 + Math.sin(tm * 2.2) * 0.1;
        const R = Math.min(w, h) * 0.3 * pulse;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        // ondes de choc concentriques qui s'échappent en boucle
        for (let k = 0; k < 3; k++) {
          const ph = ((tm * 0.35 + k / 3) % 1);
          const rr = R * (0.6 + ph * 2.2), al = (1 - ph) * 0.3 * a;
          ctx.strokeStyle = "rgba(255,190,120," + al.toFixed(3) + ")";
          ctx.lineWidth = 2.5 - ph * 1.8;
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke();
        }
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, "#ffe9b0"); g.addColorStop(0.6, "rgba(255,140,60,0.5)"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
        ctx.globalAlpha = a * 0.5; ctx.strokeStyle = "rgba(255,225,170,0.6)"; ctx.lineWidth = 1.2;
        for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2 + tm * 0.2; const L1 = R * (1.05 + 0.18 * Math.sin(tm * 3 + i)); ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * R * 0.45, cy + Math.sin(an) * R * 0.45); ctx.lineTo(cx + Math.cos(an) * L1, cy + Math.sin(an) * L1); ctx.stroke(); }
        ctx.restore();
      },
      // 1 — Soupe de particules : plasma incandescent (rendu additif, cœur brûlant)
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2);
        bg.addColorStop(0, "rgba(255,120,50,0.45)"); bg.addColorStop(0.6, "rgba(200,70,30,0.18)"); bg.addColorStop(1, "transparent");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.4);
        core.addColorStop(0, "rgba(255,240,210,0.5)"); core.addColorStop(1, "transparent");
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R * 0.4, 0, 7); ctx.fill();
        parts.plasma.forEach((p, i) => {
          const jig = Math.sin(tm * 3 + p.ph) * 6;
          const x = cx + Math.cos(p.a + tm * 0.12) * p.d * R + jig, y = cy + Math.sin(p.a + tm * 0.12) * p.d * R * 0.85 - jig;
          ctx.fillStyle = i % 3 ? "rgba(255,185,110,0.8)" : "rgba(255,250,240,0.9)";
          ctx.beginPath(); ctx.arc(x, y, p.sz, 0, 7); ctx.fill();
        });
        ctx.restore();
      },
      // 2 — Noyaux légers : brouillard orange + paires de particules (H/He)
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.5;
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
        bg.addColorStop(0, "rgba(230,110,60,0.4)"); bg.addColorStop(1, "transparent");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        parts.plasma.forEach((p, i) => {
          if (i % 2) return;
          const x = cx + Math.cos(p.a) * p.d * R, y = cy + Math.sin(p.a) * p.d * R * 0.8;
          const wob = Math.sin(tm * 1.5 + p.ph) * 2;
          ctx.fillStyle = "rgba(255,190,130,0.85)"; ctx.beginPath(); ctx.arc(x, y, p.sz * 1.1, 0, 7); ctx.fill();
          if (i % 6 === 0) { ctx.fillStyle = "rgba(180,210,255,0.8)"; ctx.beginPath(); ctx.arc(x + 5 + wob, y - 4, p.sz * 0.8, 0, 7); ctx.fill(); }
        });
      },
      // 3 — Première lumière : carte CMB granuleuse orange/rouge
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a * 0.92;
        ctx.fillStyle = "#2a0f08"; ctx.fillRect(0, 0, w, h);
        parts.cmb.forEach((p) => {
          const r = p.sz * Math.min(w, h);
          const warm = p.warm > 0.5;
          const g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, r);
          g.addColorStop(0, warm ? "rgba(255,150,60,0.5)" : "rgba(150,40,20,0.55)"); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, r, 0, 7); ctx.fill();
        });
      },
      // 4 — Premières étoiles : géantes bleues Population III, halos photo additifs
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        parts.stars3.forEach((p, i) => {
          const x = p.x * w, y = p.y * h, tw = 0.85 + 0.15 * Math.sin(tm * 2 + i);
          ctx.globalAlpha = a * 0.9;
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.sz * 9);
          g.addColorStop(0, "rgba(175,205,255,0.9)"); g.addColorStop(0.3, "rgba(140,175,255,0.28)"); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.sz * 9, 0, 7); ctx.fill();
          // aigrettes fines de diffraction (rendu télescope)
          ctx.globalAlpha = a * 0.55 * tw;
          const L = p.sz * 8, W2 = Math.max(0.4, p.sz * 0.22);
          [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
            const lg = ctx.createLinearGradient(x, y, x + dx * L, y + dy * L);
            lg.addColorStop(0, "rgba(225,238,255,0.85)"); lg.addColorStop(1, "transparent");
            ctx.fillStyle = lg;
            ctx.beginPath();
            if (dx === 0) { ctx.moveTo(x - W2, y); ctx.lineTo(x, y + dy * L); ctx.lineTo(x + W2, y); }
            else { ctx.moveTo(x, y - W2); ctx.lineTo(x + dx * L, y); ctx.lineTo(x, y + W2); }
            ctx.closePath(); ctx.fill();
          });
          ctx.globalAlpha = a;
          ctx.fillStyle = "#f2f7ff"; ctx.beginPath(); ctx.arc(x, y, p.sz * tw * 0.9, 0, 7); ctx.fill();
        });
        ctx.restore();
      },
      // 5 — Premières galaxies : spirales avec bulbe brillant et deux bras
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        parts.gals.forEach((p) => {
          const x = p.x * w, y = p.y * h, r = p.sz * Math.min(w, h), rot = p.rot + tm * 0.02;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
          // disque incliné diffus
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          g.addColorStop(0, "rgba(210,220,255,0.35)"); g.addColorStop(0.6, "rgba(140,160,230,0.16)"); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.4, 0, 0, 7); ctx.fill();
          // deux bras spiraux (arcs décalés, bleutés — étoiles jeunes)
          ctx.strokeStyle = "rgba(175,200,255,0.5)"; ctx.lineWidth = Math.max(0.8, r * 0.09); ctx.lineCap = "round";
          ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.28, 0, 0.3, 2.4); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.28, 0, Math.PI + 0.3, Math.PI + 2.4); ctx.stroke();
          // bulbe central chaud (vieilles étoiles jaunes)
          const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
          core.addColorStop(0, p.hue > 0.6 ? "rgba(255,236,200,0.95)" : "rgba(240,240,255,0.9)"); core.addColorStop(1, "transparent");
          ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill();
          ctx.restore();
        });
      },
      // 6 — Naissance du Soleil : disque protoplanétaire réaliste (style images ALMA / HL Tauri) —
      // annelures de poussière chaudes près de l'étoile, sillons sombres creusés par les protoplanètes
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        const P = window.NovaePlanet, NV = window.NV;
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46, tilt = 0.34;
        // voile du nuage moléculaire natal
        const neb = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.7);
        neb.addColorStop(0, "rgba(95,58,36,0.22)"); neb.addColorStop(0.6, "rgba(45,28,22,0.12)"); neb.addColorStop(1, "transparent");
        ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);
        // annelures de poussière : blanc chaud au centre → brun-rouge au bord, avec sillons (gaps)
        const gaps = [0.34, 0.55, 0.74, 0.9];
        const NR = 46;
        for (let i = NR; i >= 1; i--) {
          const f = i / NR;
          const rad = R * (0.15 + f * 0.85);
          let gapK = 1;
          gaps.forEach((g2) => { const d = Math.abs(f - g2); if (d < 0.05) gapK = Math.min(gapK, 0.18 + (d / 0.05) * 0.82); });
          const rC = Math.round(255 - f * 140), gC = Math.round(216 - f * 146), bC = Math.round(176 - f * 138);
          const alpha = (0.36 - f * 0.22) * gapK;
          ctx.strokeStyle = "rgba(" + rC + "," + gC + "," + bC + "," + alpha.toFixed(3) + ")";
          ctx.lineWidth = R * 0.036;
          ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * tilt, 0, 0, 7); ctx.stroke();
        }
        // lueur interne du disque (poussière surchauffée près de l'étoile)
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1, tilt);
        const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
        ig.addColorStop(0, "rgba(255,228,182,0.55)"); ig.addColorStop(0.5, "rgba(255,190,120,0.18)"); ig.addColorStop(1, "transparent");
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, 7); ctx.fill();
        ctx.restore();
        // protoplanètes texturées dans leurs sillons + halo d'accrétion ; occultation correcte
        if (P && NV) {
          const bodies = [[NV.planets[0], gaps[0], 0.34, 3.0], [NV.planets[2], gaps[1], 0.24, 4.2], [NV.planets[4], gaps[2], 0.16, 6.2], [NV.planets[5], gaps[3], 0.12, 5.2]]
            .map(([pl, g2, sp, pr], i) => {
              const rad = R * (0.15 + g2 * 0.85), an = tm * sp + i * 1.9;
              return { pl, pr, i, x: cx + Math.cos(an) * rad, y: cy + Math.sin(an) * rad * tilt, front: Math.sin(an) >= 0 };
            });
          const drawBody = (b) => {
            const m = Math.hypot(cx - b.x, cy - b.y) || 1;
            const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.pr * 3);
            glow.addColorStop(0, "rgba(255,200,140,0.4)"); glow.addColorStop(1, "transparent");
            ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(b.x, b.y, b.pr * 3, 0, 7); ctx.fill();
            P.drawPlanetTextured(ctx, b.x, b.y, b.pr, b.pl, tm * 0.02 + b.i * 0.3, { x: (cx - b.x) / m, y: (cy - b.y) / m });
          };
          bodies.filter((b) => !b.front).forEach(drawBody);   // derrière l'étoile
          P.drawSun(ctx, cx, cy, R * 0.13);
          bodies.filter((b) => b.front).forEach(drawBody);    // devant
        } else {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
          g.addColorStop(0, "#fff8e0"); g.addColorStop(0.4, "#ffd070"); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, 7); ctx.fill();
        }
      },
      // 7 — Aujourd'hui : ciel astrophoto (couleurs stellaires réelles, halos, Voie Lactée + bulbe)
      (ctx, w, h, tm, a) => {
        // lueur diffuse de la bande galactique + bulbe central chaud (comme une vraie pose longue)
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.save(); ctx.translate(w * 0.52, h * 0.52); ctx.rotate(Math.atan2(h * 0.5, w));
        const bulge = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.32);
        bulge.addColorStop(0, "rgba(255,225,190," + (0.10 * a).toFixed(3) + ")");
        bulge.addColorStop(0.5, "rgba(180,190,235," + (0.05 * a).toFixed(3) + ")");
        bulge.addColorStop(1, "transparent");
        ctx.fillStyle = bulge; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.32, w * 0.09, 0, 0, 7); ctx.fill();
        ctx.restore(); ctx.restore();
        ctx.fillStyle = "#cdd8f5";
        parts.band.forEach((p) => {
          const x = p.u * (w + 200) - 100, y = h * 0.5 + (p.u - 0.5) * h * 0.5 + p.v * h;
          if (y < 0 || y > h) return;
          ctx.globalAlpha = a * p.b * 0.55; ctx.fillRect(x, y, 1.2, 1.2);
        });
        parts.sky.forEach((p) => {
          const tw = 0.75 + 0.25 * Math.sin(tm * 1.8 + p.ph);
          const x = p.x * w, y = p.y * h;
          // halo doux sur les étoiles brillantes (comme une vraie pose photo)
          if (p.big) {
            ctx.globalAlpha = a * 0.5 * tw;
            const g = ctx.createRadialGradient(x, y, 0, x, y, p.sz * 6);
            g.addColorStop(0, p.c); g.addColorStop(1, "transparent");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.sz * 6, 0, 7); ctx.fill();
          }
          ctx.globalAlpha = a * p.b * tw;
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(x, y, p.sz * (p.big ? 1.4 : 1), 0, 7); ctx.fill();
        });
      },
    ];

    const loop = (now) => {
      if (!mounted) return;
      const tm = (now - t0) / 1000;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width * dpr)) { canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height;

      const f = (sliderVal.current / 1000) * (N - 1);
      const i0 = Math.max(0, Math.min(N - 1, Math.floor(f))), blend = f - i0, i1 = Math.min(N - 1, i0 + 1);

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#04060f"); g.addColorStop(1, "#0a1226");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      scenes[i0](ctx, w, h, tm, 1 - blend);
      if (i1 !== i0 && blend > 0.01) scenes[i1](ctx, w, h, tm, blend);
      ctx.globalAlpha = 1;
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { mounted = false; cancelAnimationFrame(raf.current); };
  }, [parts, N]);

  const onSlide = (e) => {
    sliderVal.current = +e.target.value;
    const idx = Math.round((sliderVal.current / 1000) * (N - 1));
    if (idx !== eraIdx) setEraIdx(idx);
  };
  const jumpTo = (i) => { sliderVal.current = (i / (N - 1)) * 1000; setEraIdx(i); };

  const era = ERAS[eraIdx];
  const L = (fr, en) => (lang === "en" ? en : fr);

  return React.createElement("div", { className: "timeline-wrap" },
    React.createElement("div", { className: "tl-canvas-box" },
      React.createElement("canvas", { ref: canvasRef, className: "tl-canvas" }),
      React.createElement("div", { className: "tl-era-badge" },
        React.createElement("span", { className: "tl-era-icon" }, era.icon),
        React.createElement("div", null,
          React.createElement("div", { className: "tl-era-time" }, era.t + " " + L("après le Big Bang", "after the Big Bang")),
          React.createElement("h3", { className: "tl-era-title" }, era.title)))),
    React.createElement("div", { className: "tl-slider-row" },
      React.createElement("span", { className: "tl-end" }, "💥 " + L("Big Bang", "Big Bang")),
      React.createElement("input", {
        className: "tl-slider", type: "range", min: 0, max: 1000, defaultValue: 1000,
        onInput: onSlide, "aria-label": L("Curseur temporel", "Time slider"),
      }),
      React.createElement("span", { className: "tl-end" }, L("Présent", "Now") + " 🌍")),
    React.createElement("div", { className: "tl-chips" },
      ERAS.map((e2, i) => React.createElement("button", {
        key: i, className: "tl-chip" + (i === eraIdx ? " on" : ""), onClick: () => jumpTo(i), title: e2.title,
      }, e2.icon))),
    React.createElement("div", { className: "tl-card" },
      React.createElement("p", { className: "tl-desc" }, era.desc),
      React.createElement("p", { className: "tl-show" }, "👁 " + L("Ce que montre Novaé : ", "What Novaé shows: ") + era.show)),
    React.createElement("p", { className: "tl-note" },
      L("Note scientifique — on ne peut pas « filmer » le Big Bang : pendant ses 380 000 premières années, l'Univers était opaque. La première lumière observable est le fond diffus cosmologique. Novaé présente donc l'histoire de l'Univers comme une chronologie commentée.",
        "Science note — the Big Bang cannot be “filmed”: for its first 380,000 years the universe was opaque. The first observable light is the cosmic microwave background. Novaé therefore presents the history of the universe as an annotated chronology."))
  );
}
