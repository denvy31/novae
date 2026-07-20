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
  const [showOrigin, setShowOrigin] = useState(false); // « Qu'est-ce qui a créé le Big Bang ? »

  // Époques (chronologiques) — FR si l'app est en français, EN pour toutes les autres langues
  const ERAS = useMemo(() => {
    const L = (fr, en) => (lang === "fr" ? fr : en);
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
      // Big Bang façon NASA SVS : filaments courbes qui s'échappent + grumeaux de plasma turbulent
      fil: mk(18, (r) => ({ a: r() * Math.PI * 2, curve: (r() - 0.5) * 1.6, len: 0.8 + r() * 0.9, wd: 1.5 + r() * 3, ph: r() * Math.PI * 2 })),
      clump: mk(90, (r) => ({ a: r() * Math.PI * 2, d0: 0.15 + r() * 0.85, sz: 0.5 + r() * 1.6, warm: r(), ph: r() * Math.PI * 2 })),
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let mounted = true; const t0 = performance.now();

    // sprites doux pré-rendus (halos gaussiens) : particules réalistes au lieu de disques durs
    const mkSprite = (rgb) => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(" + rgb + ",1)"); gr.addColorStop(0.4, "rgba(" + rgb + ",0.45)"); gr.addColorStop(1, "rgba(" + rgb + ",0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; };
    const SPR = { white: mkSprite("255,250,240"), warm: mkSprite("255,190,120"), hot: mkSprite("255,140,60"), blue: mkSprite("170,200,255"), deep: mkSprite("120,60,30") };
    const spr = (ctx, s, x, y, r, a2) => { ctx.globalAlpha = a2; ctx.drawImage(s, x - r, y - r, 2 * r, 2 * r); };

    // Une scène par époque — dessinée avec alpha pour le fondu enchaîné
    const scenes = [
      // 0 — Big Bang façon NASA SVS : point de lumière aveuglant, plasma doré turbulent qui
      // s'échappe, filaments courbes, ondes de choc, bord bleuté — rendu additif photo
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        const cx = w / 2, cy = h / 2, pulse = 1 + Math.sin(tm * 2.2) * 0.06;
        const R = Math.min(w, h) * 0.28 * pulse;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        // 1) grumeaux de plasma turbulent expulsés du cœur (dérive lente vers l'extérieur, en boucle)
        parts.clump.forEach((p) => {
          const drift = ((p.d0 + tm * 0.055) % 1);
          const d = (0.35 + drift * 1.7) * R;
          const wob = Math.sin(tm * 1.2 + p.ph) * R * 0.04;
          const x = cx + Math.cos(p.a) * d + wob, y = cy + Math.sin(p.a) * d - wob;
          const fade = (1 - drift) * 0.35;
          spr(ctx, p.warm > 0.35 ? SPR.warm : SPR.hot, x, y, p.sz * R * 0.16, a * fade);
        });
        // 2) filaments courbes effilés (l'aspect « explosion filamenteuse » des rendus NASA)
        parts.fil.forEach((p, i) => {
          const an = p.a + tm * 0.06, breathe = 1 + 0.12 * Math.sin(tm * 1.6 + p.ph);
          const r0 = R * 0.4, r1 = R * (0.9 + p.len) * breathe;
          const mx = cx + Math.cos(an + p.curve * 0.3) * (r0 + r1) * 0.5;
          const my = cy + Math.sin(an + p.curve * 0.3) * (r0 + r1) * 0.5;
          const x0 = cx + Math.cos(an) * r0, y0 = cy + Math.sin(an) * r0;
          const x1 = cx + Math.cos(an + p.curve * 0.55) * r1, y1 = cy + Math.sin(an + p.curve * 0.55) * r1;
          for (let s2 = 0; s2 < 3; s2++) {
            ctx.strokeStyle = s2 === 0 ? "rgba(255,240,210," + (0.34 * a).toFixed(3) + ")" : s2 === 1 ? "rgba(255,185,100," + (0.22 * a).toFixed(3) + ")" : "rgba(160,120,255," + (0.1 * a).toFixed(3) + ")";
            ctx.lineWidth = Math.max(0.6, p.wd * (1 - s2 * 0.3) * (i % 3 === 0 ? 1.4 : 1));
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
          }
        });
        // 3) ondes de choc concentriques
        for (let k = 0; k < 3; k++) {
          const ph = ((tm * 0.3 + k / 3) % 1);
          const rr = R * (0.7 + ph * 2.4), al = (1 - ph) * 0.26 * a;
          ctx.strokeStyle = "rgba(200,190,255," + al.toFixed(3) + ")";
          ctx.lineWidth = 2.2 - ph * 1.6;
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke();
        }
        // 4) cœur : point aveuglant blanc-bleu → or → orange, bord violet (chromatisme photo)
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
        halo.addColorStop(0, "rgba(255,255,255,0.95)"); halo.addColorStop(0.14, "rgba(255,246,220,0.9)");
        halo.addColorStop(0.34, "rgba(255,200,110,0.55)"); halo.addColorStop(0.62, "rgba(255,130,55,0.25)");
        halo.addColorStop(0.85, "rgba(140,90,255,0.1)"); halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, 7); ctx.fill();
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
        core.addColorStop(0, "#ffffff"); core.addColorStop(0.6, "#eef2ff"); core.addColorStop(1, "transparent");
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R * 0.18, 0, 7); ctx.fill();
        // 5) aigrettes 6 branches + reflet anamorphique horizontal (source aveuglante à la caméra)
        for (let i = 0; i < 6; i++) {
          const an = (i / 6) * Math.PI + tm * 0.03;
          const L1 = R * (1.7 + 0.25 * Math.sin(tm * 2 + i));
          const sg2 = ctx.createLinearGradient(cx - Math.cos(an) * L1, cy - Math.sin(an) * L1, cx + Math.cos(an) * L1, cy + Math.sin(an) * L1);
          sg2.addColorStop(0, "transparent"); sg2.addColorStop(0.5, "rgba(255,250,235," + (0.5 * a).toFixed(3) + ")"); sg2.addColorStop(1, "transparent");
          ctx.strokeStyle = sg2; ctx.lineWidth = i % 2 ? 1 : 2;
          ctx.beginPath(); ctx.moveTo(cx - Math.cos(an) * L1, cy - Math.sin(an) * L1); ctx.lineTo(cx + Math.cos(an) * L1, cy + Math.sin(an) * L1); ctx.stroke();
        }
        const flare = ctx.createLinearGradient(cx - R * 3, cy, cx + R * 3, cy);
        flare.addColorStop(0, "transparent"); flare.addColorStop(0.5, "rgba(200,215,255," + (0.5 * a).toFixed(3) + ")"); flare.addColorStop(1, "transparent");
        ctx.fillStyle = flare; ctx.fillRect(cx - R * 3, cy - Math.max(1.5, R * 0.025), R * 6, Math.max(3, R * 0.05));
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
          // halos gaussiens additifs : le plasma « brille » vraiment au lieu de points durs
          spr(ctx, i % 3 ? SPR.warm : SPR.white, x, y, p.sz * 2.8, a * 0.75);
        });
        ctx.globalAlpha = a;
        ctx.restore();
      },
      // 2 — Noyaux légers : brouillard incandescent + noyaux H/He avec électrons en halo
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.5;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
        bg.addColorStop(0, "rgba(230,110,60,0.35)"); bg.addColorStop(0.6, "rgba(150,60,25,0.15)"); bg.addColorStop(1, "transparent");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        parts.plasma.forEach((p, i) => {
          if (i % 2) return;
          const x = cx + Math.cos(p.a) * p.d * R, y = cy + Math.sin(p.a) * p.d * R * 0.8;
          const wob = Math.sin(tm * 1.5 + p.ph) * 2.5;
          spr(ctx, SPR.warm, x, y, p.sz * 2.4, a * 0.7);                        // noyau (proton/He)
          if (i % 6 === 0) spr(ctx, SPR.blue, x + 6 + wob, y - 5, p.sz * 1.6, a * 0.6); // électron libre
        });
        ctx.globalAlpha = a;
        ctx.restore();
      },
      // 3 — Première lumière : vraie texture du fond diffus (granulation multi-échelle façon Planck)
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a * 0.92;
        ctx.fillStyle = "#240d06"; ctx.fillRect(0, 0, w, h);
        // grande échelle : taches chaudes/froides douces
        parts.cmb.forEach((p) => {
          const r = p.sz * Math.min(w, h) * 1.5;
          spr(ctx, p.warm > 0.5 ? SPR.hot : SPR.deep, p.x * w, p.y * h, r, a * (p.warm > 0.5 ? 0.34 : 0.5));
        });
        // petite échelle : granulation fine par-dessus (aspect carte Planck)
        parts.cmb.forEach((p, i) => {
          if (i % 2) return;
          const r = p.sz * Math.min(w, h) * 0.5;
          spr(ctx, p.warm > 0.4 ? SPR.warm : SPR.deep, ((p.x + 0.37) % 1) * w, ((p.y + 0.61) % 1) * h, r, a * 0.3);
        });
        ctx.globalAlpha = a;
      },
      // 4 — Premières étoiles : géantes bleues Population III dans leur nuage natal
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        // voiles de gaz primordial (nébulosité bleutée diffuse)
        spr(ctx, SPR.blue, w * 0.3, h * 0.35, Math.min(w, h) * 0.4, a * 0.10);
        spr(ctx, SPR.blue, w * 0.72, h * 0.6, Math.min(w, h) * 0.32, a * 0.08);
        spr(ctx, SPR.deep, w * 0.55, h * 0.25, Math.min(w, h) * 0.3, a * 0.14);
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
      // 5 — Premières galaxies : spirales avec bulbe brillant et deux bras, toile cosmique en fond
      (ctx, w, h, tm, a) => {
        ctx.globalAlpha = a;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        spr(ctx, SPR.blue, w * 0.5, h * 0.5, Math.min(w, h) * 0.55, a * 0.05);
        ctx.restore(); ctx.globalAlpha = a;
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
          // jeune Soleil : vraie photosphère NASA (granulation), plus un simple orbe
          if (P.drawSunTextured) P.drawSunTextured(ctx, cx, cy, R * 0.13, tm * 0.01); else P.drawSun(ctx, cx, cy, R * 0.13);
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
      g.addColorStop(0, "#010208"); g.addColorStop(1, "#060b18");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // fond étoilé permanent (profondeur), sauf avant la première lumière
      if (f > 2.6) {
        const bgA = Math.min(1, (f - 2.6) / 0.8);
        parts.sky.forEach((p, i2) => {
          if (i2 % 2) return;
          ctx.globalAlpha = bgA * p.b * 0.35;
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x * w, p.y * h, 1, 1);
        });
        ctx.globalAlpha = 1;
      }

      scenes[i0](ctx, w, h, tm, 1 - blend);
      if (i1 !== i0 && blend > 0.01) scenes[i1](ctx, w, h, tm, blend);
      // vignette photo : assombrit doucement les bords (rendu cinéma)
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx.globalAlpha = 1; ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
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
  const L = (fr, en) => (lang === "fr" ? fr : en);

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
        "Science note — the Big Bang cannot be “filmed”: for its first 380,000 years the universe was opaque. The first observable light is the cosmic microwave background. Novaé therefore presents the history of the universe as an annotated chronology.")),

    // Qu'est-ce qui a créé le Big Bang ? — explication progressive, sourcée (FR/EN)
    React.createElement("button", { className: "chip tl-origin-btn" + (showOrigin ? " on" : ""), onClick: () => setShowOrigin(!showOrigin) },
      L("💥 Qu'est-ce qui a créé le Big Bang ? ", "💥 What created the Big Bang? ") + (showOrigin ? "▾" : "▸")),
    showOrigin && React.createElement("div", { className: "tl-origin" },
      [
        ["1️⃣", L("Ce que l'on SAIT", "What we KNOW"), L("L'Univers était il y a 13,8 milliards d'années dans un état extrêmement dense et chaud, et il est en expansion depuis — mesuré par la fuite des galaxies (Hubble, 1929) et confirmé par le fond diffus cosmologique découvert en 1965. Ça, ce sont des observations solides.", "13.8 billion years ago the universe was in an extremely dense, hot state, and it has been expanding ever since — measured through receding galaxies (Hubble, 1929) and confirmed by the cosmic microwave background discovered in 1965. These are solid observations.")],
        ["2️⃣", L("L'inflation cosmique", "Cosmic inflation"), L("Juste « avant » le Big Bang chaud, l'espace aurait subi une expansion fulgurante : l'inflation. En une fraction infime de seconde, l'Univers aurait grossi d'un facteur gigantesque. Quand l'inflation s'arrête, toute son énergie se déverse en matière et en lumière : c'est ce déversement qui EST le Big Bang chaud.", "Just “before” the hot Big Bang, space is thought to have undergone a runaway expansion: inflation. In a tiny fraction of a second, the universe grew by a staggering factor. When inflation ends, all its energy pours into matter and light: that outpouring IS the hot Big Bang.")],
        ["3️⃣", L("L'empreinte quantique", "The quantum imprint"), L("Pendant l'inflation, d'infimes fluctuations quantiques — des tremblements du vide — ont été étirées à des tailles cosmiques. On les voit encore : ce sont les taches chaudes et froides du fond diffus, et elles ont donné naissance aux galaxies. Les mesures collent remarquablement aux prédictions.", "During inflation, tiny quantum fluctuations — tremors of the vacuum — were stretched to cosmic sizes. We still see them: the hot and cold spots of the microwave background, which seeded the galaxies. Measurements match predictions remarkably well.")],
        ["4️⃣", L("Ce que l'on ne sait PAS", "What we DON'T know"), L("Qu'y avait-il « avant » ? D'où vient l'énergie de l'inflation ? À l'instant zéro, nos lois physiques (relativité + quantique) cessent d'être valables — c'est le « mur de Planck ». Fluctuation quantique née « de rien », rebond d'un univers précédent, multivers : hypothèses sérieuses, mais aucune n'est encore testable. La science honnête s'arrête ici — pour l'instant.", "What was there “before”? Where did inflation's energy come from? At time zero our physical laws (relativity + quantum) break down — the “Planck wall”. A quantum fluctuation born “from nothing”, a bounce from a previous universe, a multiverse: serious hypotheses, none yet testable. Honest science stops here — for now.")],
      ].map((c, i) => React.createElement("div", { key: i, className: "tl-origin-card" },
        React.createElement("span", { className: "tl-origin-num" }, c[0]),
        React.createElement("div", null,
          React.createElement("h4", null, c[1]),
          // redistribue le texte en paragraphes courts (≤2 phrases) : moins lourd à lire
          c[2].split(/(?<=[.!?])\s+/).filter(Boolean).reduce((paras, s2, si) => {
            if (si % 2 === 0) paras.push(s2); else paras[paras.length - 1] += " " + s2;
            return paras;
          }, []).map((para, pi) => React.createElement("p", { key: pi }, para))))),
      React.createElement("p", { className: "tl-origin-src" }, L("Sources : NASA (théorie du Big Bang et inflation), observations du fond diffus cosmologique (COBE, WMAP, Planck), Guth (1981) — vulgarisé.", "Sources: NASA (Big Bang theory and inflation), cosmic microwave background observations (COBE, WMAP, Planck), Guth (1981) — popularized.")))
  );
}
