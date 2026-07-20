/* Novaé — Light pollution (Bortle) with live sky preview */
function LightPollution() {
  const { useState, useRef, useEffect } = React;
  const NV = window.NV;
  const I18N = window.NV_I18N;
  const [level, setLevel] = useState(4);
  const [locMsg, setLocMsg] = useState(null); // estimation basée sur la position
  const [locBusy, setLocBusy] = useState(false);
  const [realSites, setRealSites] = useState(null); // sites sombres réels près de l'utilisateur (OSM)
  const canvasRef = useRef(null);
  const info = NV.bortle[level - 1];
  const fr = I18N.get() === "fr";
  const T = (f, e) => (fr ? f : e);

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Vrais lieux sombres proches de l'utilisateur (parcs nationaux, réserves naturelles) via
  // OpenStreetMap/Overpass — gratuit, sans clé, fonctionne PARTOUT dans le monde, avec de
  // vraies distances calculées depuis la position réelle (au lieu d'une liste française fixe).
  const findRealSites = (lat, lon) => {
    const q = "[out:json][timeout:20];(" +
      ["boundary\"=\"national_park", "leisure\"=\"nature_reserve"].map((tag) =>
        ["node", "way", "relation"].map((el) => el + "[\"" + tag + "\"](around:150000," + lat + "," + lon + ");").join("")
      ).join("") + ");out center 40;";
    return fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q) })
      .then((r) => r.json())
      .then((j) => {
        const seen = new Set();
        return (j.elements || [])
          .map((el) => {
            const nm = el.tags && el.tags.name;
            if (!nm || seen.has(nm)) return null;
            const la = el.lat != null ? el.lat : (el.center && el.center.lat);
            const lo = el.lon != null ? el.lon : (el.center && el.center.lon);
            if (la == null || lo == null) return null;
            seen.add(nm);
            const type = el.tags.boundary === "national_park" ? T("Parc national", "National park") : T("Réserve naturelle", "Nature reserve");
            return { name: nm, type, dist: Math.round(haversineKm(lat, lon, la, lo)) };
          })
          .filter(Boolean).sort((a, b) => a.dist - b.dist).slice(0, 5);
      });
  };

  // Estime la pollution lumineuse de l'endroit où se trouve l'utilisateur :
  // GPS du téléphone → géocodage inverse (BigDataCloud, gratuit, CORS) → taille de la
  // localité → niveau de Bortle approché. Estimation honnête, pas une mesure satellite.
  const estimateHere = () => {
    if (!navigator.geolocation) { setLocMsg({ err: T("Géolocalisation indisponible sur cet appareil.", "Geolocation unavailable on this device.") }); return; }
    setLocBusy(true); setLocMsg(null);
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      findRealSites(latitude, longitude).then(setRealSites).catch(() => {}); // en parallèle, ne bloque pas l'estimation
      fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + latitude + "&longitude=" + longitude + "&localityLanguage=fr")
        .then((r) => r.json())
        .then((j) => {
          const city = j.city || j.locality || "";
          let pop = 0;
          try { (j.localityInfo.administrative || []).forEach((ad) => { if (ad.population && ad.population > pop && ad.adminLevel >= 7) pop = ad.population; }); } catch (e) {}
          let est; let why;
          if (pop > 500000) { est = 8; why = T("grande ville", "large city") + " (" + Math.round(pop / 1000) + T(" k hab.)", "k pop.)"); }
          else if (pop > 100000) { est = 7; why = T("ville importante", "major town") + " (" + Math.round(pop / 1000) + T(" k hab.)", "k pop.)"); }
          else if (pop > 30000) { est = 6; why = T("ville moyenne", "mid-size town"); }
          else if (pop > 8000) { est = 5; why = T("petite ville", "small town"); }
          else if (pop > 2000) { est = 4; why = T("bourg / périphérie", "outskirts / small town"); }
          else if (pop > 0) { est = 3; why = T("village / campagne", "village / countryside"); }
          else { est = city ? 6 : 4; why = city ? T("zone urbaine", "urban area") : T("zone peu documentée", "poorly documented area"); }
          setLevel(est); setLocBusy(false);
          setLocMsg({ place: city || (latitude.toFixed(2) + "°, " + longitude.toFixed(2) + "°"), est, why, polluted: est >= 5 });
        })
        .catch(() => { setLocBusy(false); setLocMsg({ err: T("Estimation impossible (hors-ligne ?).", "Estimation failed (offline?).") }); });
    }, () => { setLocBusy(false); setLocMsg({ err: T("Position refusée — autorisez la localisation.", "Location denied — please allow it.") }); }, { timeout: 10000 });
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
        locBusy ? T("📍 Estimation…", "📍 Estimating…") : T("📍 Mon ciel est-il pollué ?", "📍 Is my sky polluted?")),
      locMsg && locMsg.err && React.createElement("p", { className: "loc-result err" }, locMsg.err),
      locMsg && !locMsg.err && React.createElement("div", { className: "loc-result" },
        React.createElement("strong", null, locMsg.place),
        React.createElement("p", null, T("Estimation : Bortle ~", "Estimate: Bortle ~") + locMsg.est + " (" + locMsg.why + ")"),
        React.createElement("p", { className: locMsg.polluted ? "warn-txt" : "ok-txt" },
          locMsg.polluted
            ? T("⚠ Zone touchée par la pollution lumineuse — pour bien observer, éloignez-vous des éclairages (voir sites ci-dessous).", "⚠ Area affected by light pollution — for good viewing, get away from artificial lights (see sites below).")
            : T("✅ Zone plutôt préservée : bonnes conditions d'observation par nuit claire.", "✅ Fairly dark area: good viewing conditions on clear nights.")),
        React.createElement("p", { className: "loc-note" }, T("Estimation d'après la taille de la localité, pas une mesure satellite.", "Estimated from locality size, not a satellite measurement."))),

      // Qu'est-ce que l'échelle de Bortle ?
      React.createElement("div", { className: "bortle-explain" },
        React.createElement("h4", null, T("💡 C'est quoi, l'échelle de Bortle ?", "💡 What is the Bortle scale?")),
        React.createElement("p", null,
          T("Créée par l'astronome John Bortle en 2001, elle note la qualité du ciel nocturne de 1 (ciel parfaitement noir, en plein désert) à 9 (centre-ville illuminé). Plus il y a d'éclairage artificiel autour de vous, plus le ciel « brille » et masque les étoiles faibles, les nébuleuses et la Voie Lactée.",
            "Created by astronomer John Bortle in 2001, it rates night-sky quality from 1 (perfectly dark desert sky) to 9 (bright city centre). The more artificial light around you, the more the sky “glows”, hiding faint stars, nebulae and the Milky Way.")),
        React.createElement("p", null,
          T("À quoi ça sert ? À savoir ce que vous pourrez réellement voir à l'œil nu ce soir, et à choisir un bon lieu d'observation : viser un site Bortle 4 ou moins change tout — la Voie Lactée redevient visible.",
            "What is it for? Knowing what you'll actually see tonight with the naked eye, and picking a good observing spot: aiming for Bortle 4 or darker changes everything — the Milky Way becomes visible again."))),

      React.createElement("h4", null, realSites && realSites.length ? T("📍 Sites sombres près de vous", "📍 Dark sites near you") : I18N.t("lp_sites")),
      realSites && realSites.length === 0 && React.createElement("p", { className: "loc-note" }, T("Aucun parc national/réserve trouvé dans un rayon de 150 km.", "No national park/reserve found within 150 km.")),
      React.createElement("ul", { className: "site-list" },
        (realSites && realSites.length ? realSites : NV.sites).map((s) =>
          React.createElement("li", { key: s.name },
            React.createElement("span", { className: "site-name" }, s.name),
            React.createElement("span", { className: "site-meta" }, (s.type || ("Bortle " + s.bortle)) + " · " + s.dist + " km")
          ))
      ),
      realSites && realSites.length > 0 && React.createElement("p", { className: "loc-note" }, T("📡 Calculé depuis votre position réelle (OpenStreetMap).", "📡 Computed from your real location (OpenStreetMap)."))
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
