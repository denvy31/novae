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
  // à CHAQUE ouverture : supernova → choix de langue → visite guidée dans la vraie interface
  const [onboard, setOnboard] = useState("full");
  const [tour, setTour] = useState(null); // étape de la visite guidée (null = terminée)

  // Visite guidée : l'app SE DÉPLACE d'onglet en onglet — l'utilisateur découvre chaque
  // fonctionnalité en direct sur le vrai écran, pas sur des diapositives.
  const isFr = lang === "fr";
  // target : l'élément que la petite main 👆 vient montrer (comme un humain qui guide)
  const TOUR = [
    { tab: "sky", icon: "📱", target: ".sky-fabs .chip-ar", txt: isFr ? "Voici le VRAI ciel au-dessus de vous, en direct. Levez votre téléphone : la carte suit vos mouvements, et le nom de l'astre visé s'affiche en bas. La petite main vous montre le bouton 📱 qui coupe ou réactive le suivi." : "This is the REAL sky above you, live. Raise your phone: the map follows your movements, and the aimed object's name appears at the bottom. The little hand shows the 📱 button that toggles tracking." },
    { tab: "sky", icon: "⚙", target: ".menu-fab", txt: isFr ? "Cet engrenage ⚙ est votre centre de contrôle : constellations, étiquettes, planètes et supernovæ 💥 s'y activent ou s'y coupent. Vous y trouvez aussi les directions N/E/S/O, les pôles et le voyage dans le temps. Boussole fausse ? « 🔄 Sens », puis glissez l'écran pour aligner." : "This ⚙ gear is your control centre: constellations, labels, planets and supernovae 💥 toggle there. You'll also find N/E/S/W directions, the poles and time travel. Compass wrong? Tap “🔄 Mode”, then drag the screen to align." },
    { tab: "sky", icon: "🛰", target: ".menu-fab", txt: isFr ? "Les satellites (ISS, Hubble…) et le ciel profond (nébuleuses, galaxies) sont MASQUÉS par défaut pour garder un ciel pur. Pour les voir : ouvrez cet engrenage et activez « 🛰 Satellites » ou « 🌌 Ciel profond » — essayez maintenant !" : "Satellites (ISS, Hubble…) and deep sky (nebulae, galaxies) are HIDDEN by default to keep the sky clean. To see them: open this gear and enable “🛰 Satellites” or “🌌 Deep sky” — try it now!" },
    { tab: "sky", icon: "🔍", target: ".search-input", txt: isFr ? "Cette barre de recherche trouve n'importe quel astre : Véga, Mars, la nébuleuse d'Orion… Tapez un nom et la carte se centre dessus." : "This search bar finds any object: Vega, Mars, the Orion Nebula… Type a name and the map centers on it." },
    { tab: "planets", icon: "🪐", target: ".planet-canvas", txt: isFr ? "L'onglet Planètes : le système solaire aux vraies positions du jour. Touchez une planète — ou le Soleil — sur son orbite : gros plan photo NASA, zoom à deux doigts, lunes en orbite. UA = distance Terre–Soleil (150 M km)." : "The Planets tab: the solar system at today's real positions. Tap a planet — or the Sun — on its orbit: NASA photo close-up, two-finger zoom, moons in orbit. AU = Earth–Sun distance (150 M km)." },
    { tab: "timeline", icon: "⏳", target: ".tl-slider", txt: isFr ? "La Frise : glissez ce curseur pour remonter 13,8 milliards d'années, jusqu'au Big Bang. Tout en bas, « 💥 Qu'est-ce qui a créé le Big Bang ? » explique ce que la science sait… et ce qu'elle ignore." : "The Timeline: drag this slider to rewind 13.8 billion years, back to the Big Bang. At the bottom, “💥 What created the Big Bang?” explains what science knows… and what it doesn't." },
    { tab: "bortle", icon: "💡", target: ".loc-estimate", txt: isFr ? "La Pollution lumineuse : touchez ce bouton « 📍 Mon ciel est-il pollué ? » pour estimer la qualité de VOTRE ciel d'après votre position. L'échelle de Bortle y est expliquée simplement." : "Light Pollution: tap this “📍 Is my sky polluted?” button to estimate YOUR sky quality from your location. The Bortle scale is simply explained there." },
    { tab: "events", icon: "🔔", target: ".event-card", txt: isFr ? "Les Événements : éclipses, pluies d'étoiles filantes, oppositions — avec compte à rebours et, pour chacun, OÙ et QUAND l'observer. En dessous : les actualités spatiales." : "Events: eclipses, meteor showers, oppositions — with countdowns and, for each, WHERE and WHEN to watch. Below: space news." },
    { tab: "universe", icon: "🎓", target: ".uni-tabs .chip:nth-child(2)", txt: isFr ? "Enfin, l'Univers : son histoire complète, son futur (spoiler : la Terre n'explosera pas !) et ce bouton Quiz pour apprendre en jouant. L'app marche hors-ligne et s'installe via « Ajouter à l'écran d'accueil ». Bonne exploration ! ✦" : "Finally, the Universe: its full history, its future (spoiler: Earth won't explode!) and this Quiz button to learn while playing. The app works offline and installs via “Add to Home Screen”. Happy stargazing! ✦" },
  ];

  // Position de la petite main : suit l'élément cible de l'étape (recalculée après le
  // changement d'onglet, puis au redimensionnement)
  const [hand, setHand] = useState(null);
  useEffect(() => {
    if (tour == null || onboard) { setHand(null); return; }
    let alive = true;
    const place = () => {
      if (!alive) return;
      const el = TOUR[tour].target && document.querySelector(TOUR[tour].target);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0) { setHand({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); return; }
      }
      setHand(null);
    };
    const tm = setTimeout(place, 450); // laisse l'onglet se dessiner
    window.addEventListener("resize", place);
    return () => { alive = false; clearTimeout(tm); window.removeEventListener("resize", place); };
    // eslint-disable-next-line
  }, [tour, onboard, tab]);
  const tourNext = () => {
    const nxt = tour + 1;
    if (nxt < TOUR.length) { setTab(TOUR[nxt].tab); setTour(nxt); }
    else { setTab("sky"); setTour(null); }
  };
  const tourEnd = () => { setTab("sky"); setTour(null); };

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
    { id: "universe", icon: "🎓", label: lang === "fr" ? "Univers" : "Universe" },
  ];

  const titles = {
    sky: [tr("title_sky"), tr("sub_sky")],
    planets: [tr("title_planets"), tr("sub_planets")],
    timeline: [tr("title_timeline"), tr("sub_timeline")],
    bortle: [tr("title_bortle"), tr("sub_bortle")],
    events: [tr("title_events"), tr("sub_events")],
    universe: lang === "fr"
      ? ["Histoire de l'Univers", "Du Big Bang à la fin des temps · testez-vous avec le quiz"]
      : ["History of the Universe", "From the Big Bang to the end of time · test yourself with the quiz"],
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

    // Accueil : supernova + Bienvenue + langue ; puis la visite guidée prend le relais
    onboard &&
      React.createElement(Onboarding, {
        mode: onboard,
        lang,
        onLang: chooseLang,
        onDone: () => {
          const wasFull = onboard === "full";
          setOnboard(null);
          if (wasFull) { setTab("sky"); setTour(0); }
        },
      }),

    // Visite guidée : petite carte flottante, l'app reste visible et UTILISABLE derrière
    tour != null && !onboard &&
      React.createElement(
        "div",
        { className: "tour-card" },
        React.createElement("div", { className: "tour-head" },
          React.createElement("span", { className: "tour-icon" }, TOUR[tour].icon),
          React.createElement("div", { className: "tuto-dots tour-dots" },
            TOUR.map((_, i) => React.createElement("span", { key: i, className: i === tour ? "on" : "" })))),
        React.createElement("p", { className: "tour-txt" }, TOUR[tour].txt),
        React.createElement("div", { className: "tour-btns" },
          React.createElement("button", { className: "chip", onClick: tourEnd }, isFr ? "Passer" : "Skip"),
          React.createElement("button", { className: "chip on", onClick: tourNext },
            tour + 1 < TOUR.length ? (isFr ? "Suivant →" : "Next →") : (isFr ? "C'est parti 🚀" : "Let's go 🚀"))),
      ),

    // La petite main 👆 qui montre l'élément dont parle l'étape (glisse d'un point à l'autre)
    tour != null && !onboard && hand &&
      React.createElement("div", { className: "tour-hand", style: { left: hand.x + "px", top: hand.y + "px" } },
        React.createElement("span", { className: "tour-hand-ring" }),
        "👆"),
  );
}
