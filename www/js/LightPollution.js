/* Novaé — Light pollution (Bortle) with live sky preview */
function LightPollution() {
  const { useState, useRef, useEffect } = React;
  const NV = window.NV;
  const I18N = window.NV_I18N;
  const [level, setLevel] = useState(4);
  const canvasRef = useRef(null);
  const info = NV.bortle[level - 1];

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
    const total = 700;
    let shown = 0;
    for (let i = 0; i < total; i++) {
      const mag = rnd() * 7;
      const x = rnd() * w, y = rnd() * h * 0.92;
      if (mag > magLimit) continue;
      shown++;
      const r = Math.max(0.4, 2.2 - mag * 0.28);
      ctx.globalAlpha = Math.max(0.2, 1 - mag / magLimit);
      ctx.fillStyle = "#dfe8ff";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Milky Way only visible at low Bortle
    if (level <= 4) {
      ctx.save();
      const mwAlpha = (5 - level) * 0.04;
      const grd = ctx.createLinearGradient(0, h * 0.3, w, h * 0.7);
      grd.addColorStop(0, "rgba(180,195,255,0)");
      grd.addColorStop(0.5, `rgba(190,205,255,${mwAlpha})`);
      grd.addColorStop(1, "rgba(180,195,255,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      ctx.lineTo(w, h * 0.25);
      ctx.lineTo(w, h * 0.45);
      ctx.lineTo(0, h * 0.75);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

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
