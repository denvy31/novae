/* Novaé — App shell */
function App() {
  const { useState, useEffect } = React;
  const I18N = window.NV_I18N;
  const tr = (k) => I18N.t(k);
  const [tab, setTab] = useState("sky");
  const [night, setNight] = useState(false);
  const [sky3d, setSky3d] = useState(false); // 2D "Sky Tonight" sky by default (3D via toggle)
  const [now, setNow] = useState(new Date());
  const [lang, setLangState] = useState(I18N.get());
  const [langOpen, setLangOpen] = useState(false);

  // Horloge « ce soir » mise à jour régulièrement (signature Sky Tonight)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const chooseLang = (code) => {
    I18N.setLang(code);
    setLangState(code);
    setLangOpen(false);
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
    { id: "library", icon: "📷", label: tr("tab_library") },
  ];

  const titles = {
    sky: [tr("title_sky"), tr("sub_sky")],
    planets: [tr("title_planets"), tr("sub_planets")],
    timeline: [tr("title_timeline"), tr("sub_timeline")],
    bortle: [tr("title_bortle"), tr("sub_bortle")],
    events: [tr("title_events"), tr("sub_events")],
    library: [tr("title_library"), tr("sub_library")],
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
      // Sélecteur de langue
      React.createElement(
        "div",
        { className: "lang-wrap" },
        React.createElement(
          "button",
          {
            className: "lang-btn" + (langOpen ? " on" : ""),
            onClick: () => setLangOpen(!langOpen),
            title: tr("lang_label"),
            "aria-label": tr("lang_label"),
          },
          React.createElement(
            "span",
            { className: "lang-flag" },
            I18N.meta().flag,
          ),
          React.createElement(
            "span",
            { className: "lang-code" },
            lang.toUpperCase(),
          ),
        ),
        langOpen &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement("div", {
              className: "lang-backdrop",
              onClick: () => setLangOpen(false),
            }),
            React.createElement(
              "div",
              { className: "lang-menu" },
              I18N.langs.map((l) =>
                React.createElement(
                  "button",
                  {
                    key: l.code,
                    className: "lang-item" + (l.code === lang ? " active" : ""),
                    onClick: () => chooseLang(l.code),
                  },
                  React.createElement(
                    "span",
                    { className: "lang-flag" },
                    l.flag,
                  ),
                  React.createElement("span", null, l.name),
                  l.code === lang &&
                    React.createElement(
                      "span",
                      { className: "lang-check" },
                      "✓",
                    ),
                ),
              ),
            ),
          ),
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
      tab === "sky" &&
        React.createElement(
          React.Fragment,
          null,
          React.createElement(sky3d ? SkyMap3D : SkyMap, {
            key: sky3d ? "3d" : "2d",
          }),
          React.createElement(
            "button",
            { className: "mode3d-toggle", onClick: () => setSky3d(!sky3d) },
            sky3d ? tr("view2d") : tr("view3d"),
          ),
        ),
      tab === "planets" && React.createElement(PlanetTracker, { lang }),
      tab === "timeline" && React.createElement(TimelinePanel, { key: lang }),
      tab === "bortle" && React.createElement(LightPollution),
      tab === "events" && React.createElement(EventsPanel),
      tab === "library" && React.createElement(LibraryPanel),
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
  );
}
