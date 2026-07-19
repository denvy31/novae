/* Novaé — App shell */
function App() {
  const { useState, useEffect } = React;
  const I18N = window.NV_I18N;
  const tr = (k) => I18N.t(k);
  // accès direct par URL : novae/#planets, #timeline, #bortle, #events, #library
  const [tab, setTab] = useState(() => {
    const h = (window.location.hash || "").replace("#", "");
    return ["sky", "planets", "timeline", "bortle", "events", "universe"].includes(h) ? h : "sky";
  });
  const [night, setNight] = useState(false);
  const [now, setNow] = useState(new Date());
  const [lang, setLangState] = useState(I18N.get());
  // premier lancement : on demande sa langue à l'utilisateur (modal plein écran, pas de menu déroulant)
  // premier lancement : supernova → Bienvenue → langue → tutoriel ; bouton 🌐 : langue seule
  const [onboard, setOnboard] = useState(() => { try { return !localStorage.getItem("novae-lang") ? "full" : null; } catch (e) { return null; } });

  // Horloge « ce soir » mise à jour régulièrement (signature Sky Tonight)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const chooseLang = (code) => {
    I18N.setLang(code);
    setLangState(code);
  };
  const loc = I18N.locale();
  const dateLabel = now.toLocaleDateString(loc, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = now.toLocaleTimeString(loc, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const tabs = [
    { id: "sky", icon: "🌌", label: tr("tab_sky") },
    { id: "planets", icon: "🪐", label: tr("tab_planets") },
    { id: "timeline", icon: "⏳", label: tr("tab_timeline") },
    { id: "bortle", icon: "💡", label: tr("tab_bortle") },
    { id: "events", icon: "🔔", label: tr("tab_events") },
    { id: "universe", icon: "🎓", label: "Univers" },
  ];

  const titles = {
    sky: [tr("title_sky"), tr("sub_sky")],
    planets: [tr("title_planets"), tr("sub_planets")],
    timeline: [tr("title_timeline"), tr("sub_timeline")],
    bortle: [tr("title_bortle"), tr("sub_bortle")],
    events: [tr("title_events"), tr("sub_events")],
    universe: ["Histoire de l'Univers", "Du Big Bang à la fin des temps · testez-vous avec le quiz"],
  };

  return React.createElement(
    "div",
    { className: "app" + (night ? " night" : "") },
    React.createElement(
      "header",
      { className: "topbar" },
      React.createElement(
        "div",
        { className: "brand" },
        React.createElement("span", { className: "logo" }, "✦"),
        React.createElement("span", { className: "brand-name" }, "NOVAÉ"),
        React.createElement("span", { className: "brand-sub" }, "v2.0"),
      ),
      React.createElement(
        "div",
        { className: "header-titles" },
        React.createElement("h1", null, titles[tab][0]),
        React.createElement("p", null, titles[tab][1]),
      ),
      React.createElement(
        "div",
        { className: "tonight-chip", title: tr("title_sky") },
        React.createElement("span", { className: "tonight-day" }, dateLabel),
        React.createElement("span", { className: "tonight-time" }, timeLabel),
      ),
      // Langue : simple bouton 🌐 qui rouvre le sélecteur plein écran (fiable, sans menu déroulant)
      React.createElement(
        "button",
        {
          className: "lang-btn",
          onClick: () => setOnboard("lang"),
          title: tr("lang_label"),
          "aria-label": tr("lang_label"),
        },
        React.createElement("span", { className: "lang-flag" }, "🌐"),
      ),
      React.createElement(
        "button",
        {
          className: "night-toggle" + (night ? " on" : ""),
          onClick: () => setNight(!night),
          title: tr("night"),
        },
        React.createElement(
          "span",
          { className: "nt-icon" },
          night ? "🔴" : "🌙",
        ),
        React.createElement("span", { className: "nt-label" }, tr("night")),
      ),
    ),

    React.createElement(
      "main",
      { className: "content" },
      // vue unique du ciel : la carte immersive qui suit le téléphone (plus de bascule 2D/3D)
      tab === "sky" && React.createElement(SkyMap),
      tab === "planets" && React.createElement(PlanetTracker, { lang }),
      tab === "timeline" && React.createElement(TimelinePanel, { key: lang }),
      tab === "bortle" && React.createElement(LightPollution),
      tab === "events" && React.createElement(EventsPanel),
      tab === "universe" && React.createElement(UniversePanel),
    ),

    React.createElement(
      "nav",
      { className: "bottom-nav" },
      tabs.map((tb) =>
        React.createElement(
          "button",
          {
            key: tb.id,
            className: "nav-btn" + (tab === tb.id ? " active" : ""),
            onClick: () => setTab(tb.id),
          },
          React.createElement("span", { className: "nav-icon" }, tb.icon),
          React.createElement("span", { className: "nav-label" }, tb.label),
        ),
      ),
    ),

    // Accueil : supernova + Bienvenue + langue + tutoriel (premier lancement) ; 🌐 : langue seule
    onboard &&
      React.createElement(Onboarding, {
        mode: onboard,
        lang,
        onLang: chooseLang,
        onDone: () => setOnboard(null),
      }),
  );
}
