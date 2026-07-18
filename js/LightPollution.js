/* Novaé — Light pollution (Bortle) with live sky preview */
function LightPollution() {
  const { useState, useRef, useEffect } = React;
  const NV = window.NV;
  const I18N = window.NV_I18N;
  const [level, setLevel] = useState(4);
  const [locMsg, setLocMsg] = useState(null); // estimation basée sur la position
  const [locBusy, setLocBusy] = useState(false);
  const canvasRef = useRef(null);
  const info = NV.bortle[level - 1];

  // Estime la pollution lumineuse de l'endroit où se trouve l'utilisateur :
  // GPS du téléphone → géocodage inverse (BigDataCloud, gratuit, CORS) → taille de la
  // localité → niveau de Bortle approché. Estimation honnête, pas une mesure satellite.
  const estimateHere = () => {
    if (!navigator.geolocation) { setLocMsg({ err: "Géolocalisation indisponible sur cet appareil." }); return; }
    setLocBusy(true); setLocMsg(null);
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + latitude + "&longitude=" + longitude + "&localityLanguage=fr")
        .then((r) => r.json())
        .then((j) => {
          const city = j.city || j.locality || "";
          let pop = 0;
          try { (j.localityInfo.administrative || []).forEach((ad) => { if (ad.population && ad.population > pop && ad.adminLevel >= 7) pop = ad.population; }); } catch (e) {}
          let est; let why;
          if (pop > 500000) { est = 8; why = "grande ville (" + Math.round(pop / 1000) + " k hab.)"; }
          else if (pop > 100000) { est = 7; why = "ville importante (" + Math.round(pop / 1000) + " k hab.)"; }
          else if (pop > 30000) { est = 6; why = "ville moyenne"; }
          else if (pop > 8000) { est = 5; why = "petite ville"; }
          else if (pop > 2000) { est = 4; why = "bourg / périphérie"; }
          else if (pop > 0) { est = 3; why = "village / campagne"; }
          else { est = city ? 6 : 4; why = city ? "zone urbaine" : "zone peu documentée"; }
          setLevel(est); setLocBusy(false);
          setLocMsg({ place: city || (latitude.toFixed(2) + "°, " + longitude.toFixed(2) + "°"), est, why, polluted: est >= 5 });
        })
        .catch(() => { setLocBusy(false); setLocMsg({ err: "Estimation impossible (hors-ligne ?)." }); });
    }, () => { setLocBusy(false); setLocMsg({ err: "Position refusée — autorisez la localisation." }); }, { timeout: 10000 });
  };

  // visible stars shrink as Bortle rises
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // sky-glow background depending on level
    const glowStrength = (level - 1) / 8;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, info.color);
    g.addColorStop(1, blend(info.color, "#3a2a10", glowStrength * 0.7));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // magnitude limit: B1 ~ 7.5, B9 ~ 4.0
    const magLimit = 7.6 - (level - 1) * 0.45;
    let seed = 99;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    // Voie Lactée : vraie nuée d'étoiles faibles le long de la bande (visible ciel sombre)
    if (level <= 4) {
      const mwK = (5 - level) / 4;
      ctx.fillStyle = "#cdd8f5";
      for (let i = 0; i < 1600 * mwK; i++) {
        const u = rnd();
        const x = u * (w + 160) - 80;
        const y = h * 0.5 - (u - 0.5) * h * 0.42 + (rnd() + rnd() + rnd() - 1.5) * h * 0.09;
        if (y < 0 || y > h * 0.92) continue;
        ctx.globalAlpha = (0.12 + rnd() * 0.4) * mwK;
        ctx.fillRect(x, y, 1.1, 1.1);
      }
      // lueur diffuse du bulbe
      ctx.globalAlpha = 1;
      const bulge = ctx.createRadialGradient(w * 0.6, h * 0.44, 0, w * 0.6, h * 0.44, w * 0.3);
      bulge.addColorStop(0, "rgba(235,225,205," + (0.10 * mwK).toFixed(3) + ")");
      bulge.addColorStop(1, "transparent");
      ctx.fillStyle = bulge; ctx.fillRect(0, 0, w, h);
    }

    // étoiles aux vraies couleurs spectrales, halo doux sur les brillantes (rendu astrophoto)
    const pal = ["#aabfff", "#cad7ff", "#f8f7ff", "#fff4ea", "#ffd2a1", "#ffb38a"];
    const total = 750;
    let shown = 0;
    for (let i = 0; i < total; i++) {
      const mag = rnd() * 7;
      const x = rnd() * w, y = rnd() * h * 0.92;
      const t = rnd();
      if (mag > magLimit) continue;
      shown++;
      const color = pal[t < 0.28 ? 0 : t < 0.52 ? 1 : t < 0.74 ? 2 : t < 0.88 ? 3 : t < 0.97 ? 4 : 5];
      const r = Math.max(0.4, 2.4 - mag * 0.3);
      if (mag < 1.8) {
        const bg = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        bg.addColorStop(0, color); bg.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.25; ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = Math.max(0.25, 1 - mag / magLimit);
      ctx.fillStyle = mag < 1.2 ? "#ffffff" : color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ground glow
    const gg = ctx.createLinearGradient(0, h * 0.8, 0, h);
    gg.addColorStop(0, "transparent");
    gg.addColorStop(1, `rgba(255,160,60,${glowStrength * 0.5})`);
    ctx.fillStyle = gg;
    ctx.fillRect(0, h * 0.8, w, h * 0.2);

    canvas._shown = shown;
  }, [level, info]);

  return React.createElement("div", { className: "panel-grid" },
    React.createElement("div", { className: "bortle-stage" },
      React.createElement("canvas", { ref: canvasRef, className: "bortle-canvas" }),
      React.createElement("div", { className: "bortle-overlay" },
        React.createElement("div", { className: "bortle-num" }, "Bortle " + level),
        React.createElement("div", { className: "bortle-name" }, info.label),
        React.createElement("div", { className: "bortle-stars" }, "⭐ " + info.stars + " " + I18N.t("lp_stars_visible"))
      ),
      React.createElement("div", { className: "bortle-slider" },
        React.createElement("input", {
          type: "range", min: 1, max: 9, step: 1, value: level,
          onChange: (e) => setLevel(Number(e.target.value)),
        }),
        React.createElement("div", { className: "bortle-ticks" },
          NV.bortle.map((b) =>
            React.createElement("span", {
              key: b.level,
              className: b.level === level ? "active" : "",
              onClick: () => setLevel(b.level),
            }, b.level))
        )
      )
    ),

    React.createElement("aside", { className: "bortle-info" },
      React.createElement("h3", null, I18N.t("lp_quality")),
      React.createElement("p", { className: "info-note" }, info.desc),
      level < 4
        ? React.createElement("div", { className: "ideal-badge ok" }, "✅ " + I18N.t("lp_ideal"))
        : React.createElement("div", { className: "ideal-badge warn" }, "⚠ " + I18N.t("lp_polluted")),

      // Où suis-je ? — estimation basée sur la position du téléphone
      React.createElement("button", { className: "chip loc-estimate", onClick: estimateHere, disabled: locBusy },
        locBusy ? "📍 Estimation…" : "📍 Mon ciel est-il pollué ?"),
      locMsg && locMsg.err && React.createElement("p", { className: "loc-result err" }, locMsg.err),
      locMsg && !locMsg.err && React.createElement("div", { className: "loc-result" },
        React.createElement("strong", null, locMsg.place),
        React.createElement("p", null, "Estimation : Bortle ~" + locMsg.est + " (" + locMsg.why + ")"),
        React.createElement("p", { className: locMsg.polluted ? "warn-txt" : "ok-txt" },
          locMsg.polluted
            ? "⚠ Zone touchée par la pollution lumineuse — pour bien observer, éloignez-vous des éclairages (voir sites ci-dessous)."
            : "✅ Zone plutôt préservée : bonnes conditions d'observation par nuit claire."),
        React.createElement("p", { className: "loc-note" }, "Estimation d'après la taille de la localité, pas une mesure satellite.")),

      // Qu'est-ce que l'échelle de Bortle ?
      React.createElement("div", { className: "bortle-explain" },
        React.createElement("h4", null, "💡 C'est quoi, l'échelle de Bortle ?"),
        React.createElement("p", null,
          "Créée par l'astronome John Bortle en 2001, elle note la qualité du ciel nocturne de 1 (ciel parfaitement noir, en plein désert) à 9 (centre-ville illuminé). Plus il y a d'éclairage artificiel autour de vous, plus le ciel « brille » et masque les étoiles faibles, les nébuleuses et la Voie Lactée."),
        React.createElement("p", null,
          "À quoi ça sert ? À savoir ce que vous pourrez réellement voir à l'œil nu ce soir, et à choisir un bon lieu d'observation : viser un site Bortle 4 ou moins change tout — la Voie Lactée redevient visible.")),

      React.createElement("h4", null, I18N.t("lp_sites")),
      React.createElement("ul", { className: "site-list" },
        NV.sites.map((s) =>
          React.createElement("li", { key: s.name },
            React.createElement("span", { className: "site-name" }, s.name),
            React.createElement("span", { className: "site-meta" }, "Bortle " + s.bortle + " · " + s.dist + " km")
          ))
      )
    )
  );

  function blend(a, b, t) {
    const pa = hex(a), pb = hex(b);
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  function hex(h) {
    h = h.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
}
