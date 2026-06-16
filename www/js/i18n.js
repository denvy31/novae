/* Novaé — internationalisation (i18n)
   Français par défaut + autres langues. Persistance localStorage. RTL pour l'arabe.
   Usage: NV_I18N.t("tab_sky"), NV_I18N.planet("Mercure"), NV_I18N.setLang("en"). */
window.NV_I18N = (function () {
  // Langues proposées (ordre du menu). flag = drapeau, name = nom natif.
  const LANGS = [
    { code: "fr", name: "Français",  flag: "🇫🇷", locale: "fr-FR", rtl: false },
    { code: "en", name: "English",   flag: "🇬🇧", locale: "en-US", rtl: false },
    { code: "es", name: "Español",   flag: "🇪🇸", locale: "es-ES", rtl: false },
    { code: "de", name: "Deutsch",   flag: "🇩🇪", locale: "de-DE", rtl: false },
    { code: "it", name: "Italiano",  flag: "🇮🇹", locale: "it-IT", rtl: false },
    { code: "pt", name: "Português", flag: "🇵🇹", locale: "pt-PT", rtl: false },
    { code: "ar", name: "العربية",   flag: "🇸🇦", locale: "ar",    rtl: true  },
    { code: "zh", name: "中文",       flag: "🇨🇳", locale: "zh-CN", rtl: false },
  ];

  // Noms des planètes par langue (clé = nom français utilisé dans data.js).
  const PLANETS = {
    Mercure: { en: "Mercury", es: "Mercurio", de: "Merkur", it: "Mercurio", pt: "Mercúrio", ar: "عطارد", zh: "水星" },
    Vénus:   { en: "Venus",   es: "Venus",    de: "Venus",  it: "Venere",   pt: "Vénus",    ar: "الزهرة", zh: "金星" },
    Terre:   { en: "Earth",   es: "Tierra",   de: "Erde",   it: "Terra",    pt: "Terra",    ar: "الأرض",  zh: "地球" },
    Mars:    { en: "Mars",    es: "Marte",    de: "Mars",   it: "Marte",    pt: "Marte",    ar: "المريخ", zh: "火星" },
    Jupiter: { en: "Jupiter", es: "Júpiter",  de: "Jupiter", it: "Giove",   pt: "Júpiter",  ar: "المشتري", zh: "木星" },
    Saturne: { en: "Saturn",  es: "Saturno",  de: "Saturn", it: "Saturno",  pt: "Saturno",  ar: "زحل",    zh: "土星" },
    Uranus:  { en: "Uranus",  es: "Urano",    de: "Uranus", it: "Urano",    pt: "Úrano",    ar: "أورانوس", zh: "天王星" },
    Neptune: { en: "Neptune", es: "Neptuno",  de: "Neptun", it: "Nettuno",  pt: "Neptuno",  ar: "نبتون",  zh: "海王星" },
    Pluton:  { en: "Pluto",   es: "Plutón",   de: "Pluto",  it: "Plutone",  pt: "Plutão",   ar: "بلوتو",  zh: "冥王星" },
  };

  const DICT = {
    fr: {
      lang_label: "Langue", night: "Mode nuit", view2d: "Vue 2D", view3d: "Vue 3D",
      tab_sky: "Ciel", tab_planets: "Planètes", tab_bortle: "Pollution", tab_events: "Événements", tab_library: "Galerie",
      title_sky: "Ciel en direct — ici & maintenant", sub_sky: "Vraies positions · glissez / zoomez · 📱 suivre · 📸 capturer",
      title_planets: "Suivi des planètes en temps réel", sub_planets: "Système solaire vu de dessus — positions réelles",
      title_bortle: "Carte de pollution lumineuse", sub_bortle: "Échelle de Bortle & aperçu du ciel attendu",
      title_events: "Alertes & événements astronomiques", sub_events: "Ne manquez plus aucun rendez-vous céleste",
      title_library: "Galerie personnelle", sub_library: "Vos captures du ciel : date, lieu et coordonnées",
      st_stars: "Étoiles cataloguées", st_planets: "Planètes suivies", st_supernovae: "Supernovæ",
      st_deepSky: "Ciel profond", st_cultures: "Cultures", st_languages: "Langues",
      pl_distance: "Distance au Soleil", pl_period: "Période orbitale", pl_diameter: "Diamètre",
      pl_moons: "Lunes (modèle)", pl_rings: "Anneaux", yes: "Oui", no: "Non",
      pl_dwarf: "Planète naine", pl_speed: "Vitesse", pl_pause: "Pause", pl_moons_shown: "Lunes affichées :",
      pl_hint: "Touchez une planète sur son orbite.", u_au: "UA", u_days: "jours", u_years: "ans", u_km: "km",
    },
    en: {
      lang_label: "Language", night: "Night mode", view2d: "2D view", view3d: "3D view",
      tab_sky: "Sky", tab_planets: "Planets", tab_bortle: "Light", tab_events: "Events", tab_library: "Gallery",
      title_sky: "Live sky — here & now", sub_sky: "Real positions · drag / zoom · 📱 follow · 📸 capture",
      title_planets: "Real-time planet tracking", sub_planets: "Solar system from above — real positions",
      title_bortle: "Light pollution map", sub_bortle: "Bortle scale & expected sky preview",
      title_events: "Astronomical alerts & events", sub_events: "Never miss a celestial appointment",
      title_library: "Personal gallery", sub_library: "Your sky captures: date, place and coordinates",
      st_stars: "Catalogued stars", st_planets: "Tracked planets", st_supernovae: "Supernovae",
      st_deepSky: "Deep sky", st_cultures: "Cultures", st_languages: "Languages",
      pl_distance: "Distance to Sun", pl_period: "Orbital period", pl_diameter: "Diameter",
      pl_moons: "Moons (model)", pl_rings: "Rings", yes: "Yes", no: "No",
      pl_dwarf: "Dwarf planet", pl_speed: "Speed", pl_pause: "Pause", pl_moons_shown: "Moons shown:",
      pl_hint: "Tap a planet on its orbit.", u_au: "AU", u_days: "days", u_years: "yr", u_km: "km",
    },
    es: {
      lang_label: "Idioma", night: "Modo nocturno", view2d: "Vista 2D", view3d: "Vista 3D",
      tab_sky: "Cielo", tab_planets: "Planetas", tab_bortle: "Polución", tab_events: "Eventos", tab_library: "Galería",
      title_sky: "Cielo en directo — aquí y ahora", sub_sky: "Posiciones reales · arrastra / zoom · 📱 seguir · 📸 captura",
      title_planets: "Seguimiento de planetas en tiempo real", sub_planets: "Sistema solar desde arriba — posiciones reales",
      title_bortle: "Mapa de contaminación lumínica", sub_bortle: "Escala de Bortle y vista previa del cielo",
      title_events: "Alertas y eventos astronómicos", sub_events: "No te pierdas ninguna cita celeste",
      title_library: "Galería personal", sub_library: "Tus capturas del cielo: fecha, lugar y coordenadas",
      st_stars: "Estrellas catalogadas", st_planets: "Planetas seguidos", st_supernovae: "Supernovas",
      st_deepSky: "Cielo profundo", st_cultures: "Culturas", st_languages: "Idiomas",
      pl_distance: "Distancia al Sol", pl_period: "Período orbital", pl_diameter: "Diámetro",
      pl_moons: "Lunas (modelo)", pl_rings: "Anillos", yes: "Sí", no: "No",
      pl_dwarf: "Planeta enano", pl_speed: "Velocidad", pl_pause: "Pausa", pl_moons_shown: "Lunas mostradas:",
      pl_hint: "Toca un planeta en su órbita.", u_au: "UA", u_days: "días", u_years: "años", u_km: "km",
    },
    de: {
      lang_label: "Sprache", night: "Nachtmodus", view2d: "2D-Ansicht", view3d: "3D-Ansicht",
      tab_sky: "Himmel", tab_planets: "Planeten", tab_bortle: "Licht", tab_events: "Termine", tab_library: "Galerie",
      title_sky: "Live-Himmel — hier & jetzt", sub_sky: "Echte Positionen · ziehen / zoomen · 📱 folgen · 📸 aufnehmen",
      title_planets: "Planeten in Echtzeit verfolgen", sub_planets: "Sonnensystem von oben — echte Positionen",
      title_bortle: "Lichtverschmutzungskarte", sub_bortle: "Bortle-Skala & Himmelsvorschau",
      title_events: "Astronomische Hinweise & Termine", sub_events: "Verpasse kein Himmelsereignis",
      title_library: "Persönliche Galerie", sub_library: "Deine Himmelsaufnahmen: Datum, Ort und Koordinaten",
      st_stars: "Katalogisierte Sterne", st_planets: "Verfolgte Planeten", st_supernovae: "Supernovae",
      st_deepSky: "Deep Sky", st_cultures: "Kulturen", st_languages: "Sprachen",
      pl_distance: "Entfernung zur Sonne", pl_period: "Umlaufzeit", pl_diameter: "Durchmesser",
      pl_moons: "Monde (Modell)", pl_rings: "Ringe", yes: "Ja", no: "Nein",
      pl_dwarf: "Zwergplanet", pl_speed: "Geschwindigkeit", pl_pause: "Pause", pl_moons_shown: "Gezeigte Monde:",
      pl_hint: "Tippe einen Planeten auf seiner Bahn an.", u_au: "AE", u_days: "Tage", u_years: "Jahre", u_km: "km",
    },
    it: {
      lang_label: "Lingua", night: "Modalità notte", view2d: "Vista 2D", view3d: "Vista 3D",
      tab_sky: "Cielo", tab_planets: "Pianeti", tab_bortle: "Luce", tab_events: "Eventi", tab_library: "Galleria",
      title_sky: "Cielo in diretta — qui e ora", sub_sky: "Posizioni reali · trascina / zoom · 📱 segui · 📸 cattura",
      title_planets: "Tracciamento pianeti in tempo reale", sub_planets: "Sistema solare dall'alto — posizioni reali",
      title_bortle: "Mappa dell'inquinamento luminoso", sub_bortle: "Scala di Bortle & anteprima del cielo",
      title_events: "Avvisi ed eventi astronomici", sub_events: "Non perdere nessun appuntamento celeste",
      title_library: "Galleria personale", sub_library: "Le tue catture del cielo: data, luogo e coordinate",
      st_stars: "Stelle catalogate", st_planets: "Pianeti tracciati", st_supernovae: "Supernovae",
      st_deepSky: "Cielo profondo", st_cultures: "Culture", st_languages: "Lingue",
      pl_distance: "Distanza dal Sole", pl_period: "Periodo orbitale", pl_diameter: "Diametro",
      pl_moons: "Lune (modello)", pl_rings: "Anelli", yes: "Sì", no: "No",
      pl_dwarf: "Pianeta nano", pl_speed: "Velocità", pl_pause: "Pausa", pl_moons_shown: "Lune mostrate:",
      pl_hint: "Tocca un pianeta sulla sua orbita.", u_au: "UA", u_days: "giorni", u_years: "anni", u_km: "km",
    },
    pt: {
      lang_label: "Idioma", night: "Modo noturno", view2d: "Vista 2D", view3d: "Vista 3D",
      tab_sky: "Céu", tab_planets: "Planetas", tab_bortle: "Luz", tab_events: "Eventos", tab_library: "Galeria",
      title_sky: "Céu ao vivo — aqui e agora", sub_sky: "Posições reais · arraste / zoom · 📱 seguir · 📸 capturar",
      title_planets: "Seguimento de planetas em tempo real", sub_planets: "Sistema solar visto de cima — posições reais",
      title_bortle: "Mapa de poluição luminosa", sub_bortle: "Escala de Bortle & pré-visualização do céu",
      title_events: "Alertas e eventos astronómicos", sub_events: "Não perca nenhum encontro celeste",
      title_library: "Galeria pessoal", sub_library: "As suas capturas do céu: data, local e coordenadas",
      st_stars: "Estrelas catalogadas", st_planets: "Planetas seguidos", st_supernovae: "Supernovas",
      st_deepSky: "Céu profundo", st_cultures: "Culturas", st_languages: "Idiomas",
      pl_distance: "Distância ao Sol", pl_period: "Período orbital", pl_diameter: "Diâmetro",
      pl_moons: "Luas (modelo)", pl_rings: "Anéis", yes: "Sim", no: "Não",
      pl_dwarf: "Planeta anão", pl_speed: "Velocidade", pl_pause: "Pausa", pl_moons_shown: "Luas exibidas:",
      pl_hint: "Toque num planeta na sua órbita.", u_au: "UA", u_days: "dias", u_years: "anos", u_km: "km",
    },
    ar: {
      lang_label: "اللغة", night: "الوضع الليلي", view2d: "عرض ثنائي", view3d: "عرض ثلاثي",
      tab_sky: "السماء", tab_planets: "الكواكب", tab_bortle: "التلوث", tab_events: "الأحداث", tab_library: "المعرض",
      title_sky: "السماء مباشرة — هنا والآن", sub_sky: "مواقع حقيقية · اسحب / كبّر · 📱 تتبّع · 📸 التقاط",
      title_planets: "تتبّع الكواكب في الوقت الحقيقي", sub_planets: "النظام الشمسي من الأعلى — مواقع حقيقية",
      title_bortle: "خريطة التلوث الضوئي", sub_bortle: "مقياس بورتل ومعاينة السماء",
      title_events: "تنبيهات وأحداث فلكية", sub_events: "لا تفوّت أي موعد سماوي",
      title_library: "المعرض الشخصي", sub_library: "لقطاتك للسماء: التاريخ والمكان والإحداثيات",
      st_stars: "نجوم مفهرسة", st_planets: "كواكب متتبَّعة", st_supernovae: "مستعرات عظمى",
      st_deepSky: "السماء العميقة", st_cultures: "ثقافات", st_languages: "لغات",
      pl_distance: "البعد عن الشمس", pl_period: "الفترة المدارية", pl_diameter: "القطر",
      pl_moons: "الأقمار (نموذج)", pl_rings: "حلقات", yes: "نعم", no: "لا",
      pl_dwarf: "كوكب قزم", pl_speed: "السرعة", pl_pause: "إيقاف", pl_moons_shown: "الأقمار المعروضة:",
      pl_hint: "اضغط على كوكب في مداره.", u_au: "و.ف", u_days: "يوم", u_years: "سنة", u_km: "كم",
    },
    zh: {
      lang_label: "语言", night: "夜间模式", view2d: "2D 视图", view3d: "3D 视图",
      tab_sky: "天空", tab_planets: "行星", tab_bortle: "光污染", tab_events: "事件", tab_library: "图库",
      title_sky: "实时天空 — 此时此地", sub_sky: "真实位置 · 拖动 / 缩放 · 📱 跟随 · 📸 捕捉",
      title_planets: "实时行星追踪", sub_planets: "俯视太阳系 — 真实位置",
      title_bortle: "光污染地图", sub_bortle: "波特尔等级与天空预览",
      title_events: "天文提醒与事件", sub_events: "不再错过任何天象",
      title_library: "个人图库", sub_library: "你的天空捕捉：日期、地点和坐标",
      st_stars: "已编目恒星", st_planets: "追踪行星", st_supernovae: "超新星",
      st_deepSky: "深空天体", st_cultures: "文化", st_languages: "语言",
      pl_distance: "到太阳距离", pl_period: "轨道周期", pl_diameter: "直径",
      pl_moons: "卫星（模型）", pl_rings: "光环", yes: "是", no: "否",
      pl_dwarf: "矮行星", pl_speed: "速度", pl_pause: "暂停", pl_moons_shown: "显示的卫星：",
      pl_hint: "点击轨道上的行星。", u_au: "天文单位", u_days: "天", u_years: "年", u_km: "公里",
    },
  };

  let lang = "fr";
  try { const s = localStorage.getItem("novae-lang"); if (s && DICT[s]) lang = s; } catch (e) {}

  function meta() { return LANGS.find((l) => l.code === lang) || LANGS[0]; }
  function t(key) { return (DICT[lang] && DICT[lang][key] != null) ? DICT[lang][key] : DICT.fr[key] != null ? DICT.fr[key] : key; }
  function planet(frName) { if (lang === "fr") return frName; const p = PLANETS[frName]; return (p && p[lang]) || frName; }
  function locale() { return meta().locale; }
  function get() { return lang; }
  function apply() { const m = meta(); try { document.documentElement.lang = lang; document.documentElement.dir = m.rtl ? "rtl" : "ltr"; } catch (e) {} }
  function setLang(l) { if (!DICT[l]) return; lang = l; try { localStorage.setItem("novae-lang", l); } catch (e) {} apply(); }

  apply();
  return { t, planet, locale, get, setLang, langs: LANGS, meta };
})();
