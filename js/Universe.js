/* Novaé — Histoire de l'Univers : passé, futur (données NASA / Nature Astronomy 2025) + quiz
   à 3 niveaux de difficulté. Remplace la Galerie. Contenu pédagogique sourcé. */
function UniversePanel() {
  const { useState } = React;
  // français si l'app est en français, anglais sinon
  const fr = window.NV_I18N.get() === "fr";
  const T = (f, e) => (fr ? f : e);

  // ---- Chronologie : du Big Bang à la fin de l'Univers (consensus scientifique) ----
  const PAST = [
    { t: T("il y a 13,8 Md d'années", "13.8 billion years ago"), icon: "💥", title: T("Le Big Bang", "The Big Bang"), txt: T("L'Univers naît d'un état extrêmement dense et chaud, puis s'étend et se refroidit. Ce n'est pas une explosion DANS l'espace : c'est l'espace lui-même qui grandit.", "The universe emerges from an extremely dense, hot state, then expands and cools. It isn't an explosion IN space: space itself is growing.") },
    { t: T("380 000 ans après", "380,000 years later"), icon: "🌅", title: T("Première lumière", "First light"), txt: T("L'Univers devient transparent : cette lumière fossile, le fond diffus cosmologique, est encore observable aujourd'hui — c'est la plus vieille image du cosmos.", "The universe becomes transparent: this fossil light, the cosmic microwave background, is still observable today — the oldest image of the cosmos.") },
    { t: T("≈ 200 millions d'années", "≈ 200 million years"), icon: "✨", title: T("Premières étoiles", "First stars"), txt: T("Des géantes bleues 100 fois plus massives que le Soleil s'allument et forgent les premiers éléments lourds : carbone, oxygène, fer…", "Blue giants 100 times the Sun's mass ignite and forge the first heavy elements: carbon, oxygen, iron…") },
    { t: T("≈ 13,6 Md d'années", "≈ 13.6 billion years ago"), icon: "🌌", title: T("Naissance de la Voie Lactée", "Birth of the Milky Way"), txt: T("Notre galaxie s'assemble par fusion de petites galaxies. Elle compte aujourd'hui 200 à 400 milliards d'étoiles.", "Our galaxy assembles from merging smaller galaxies. Today it holds 200–400 billion stars.") },
    { t: T("il y a 4,6 Md d'années", "4.6 billion years ago"), icon: "☀️", title: T("Naissance du Soleil et de la Terre", "Birth of the Sun and Earth"), txt: T("Un nuage de gaz s'effondre : le Soleil s'allume, les planètes se forment dans le disque de poussière qui l'entoure. L'oxygène de votre sang a été forgé dans des étoiles mortes bien avant.", "A gas cloud collapses: the Sun ignites and planets form in its dust disk. The oxygen in your blood was forged in stars that died long before.") },
    { t: T("il y a ≈ 3,8 Md d'années", "≈ 3.8 billion years ago"), icon: "🦠", title: T("La vie apparaît sur Terre", "Life appears on Earth"), txt: T("Les premières cellules apparaissent dans les océans. Les humains modernes, eux, n'existent que depuis ~300 000 ans — un battement de cils cosmique.", "The first cells appear in the oceans. Modern humans have existed for only ~300,000 years — a cosmic blink.") },
  ];
  const FUTURE = [
    { t: T("dans ≈ 1 Md d'années", "in ≈ 1 billion years"), icon: "🌡", title: T("La Terre devient inhabitable", "Earth becomes uninhabitable"), txt: T("Le Soleil chauffe de ~10 % par milliard d'années : les océans s'évaporeront et la Terre deviendra stérile. Non, la Terre n'explosera pas — elle sera d'abord stérilisée par la chaleur (consensus NASA).", "The Sun brightens ~10% per billion years: the oceans will evaporate and Earth will turn sterile. No, Earth won't explode — it will first be sterilized by heat (NASA consensus).") },
    { t: T("dans 5 à 10 Md d'années", "in 5–10 billion years"), icon: "🌀", title: T("Rencontre avec Andromède ?", "Meeting Andromeda?"), txt: T("On a longtemps annoncé une collision certaine avec la galaxie d'Andromède dans ~4,5 Md d'années. Une étude de 2025 (Nature Astronomy) a rebattu les cartes : seulement ~2 % de chances dans les 5 prochains milliards d'années, et environ 50/50 sur 10 milliards d'années. Si fusion il y a, ce serait plutôt dans 7-8 Md d'années.", "A collision with the Andromeda galaxy was long announced as certain within ~4.5 billion years. A 2025 study (Nature Astronomy) changed the odds: only ~2% within the next 5 billion years, and roughly 50/50 over 10 billion. If they do merge, it would rather be in 7–8 billion years.") },
    { t: T("dans ≈ 5-6 Md d'années", "in ≈ 5–6 billion years"), icon: "🔴", title: T("Le Soleil géante rouge", "The Sun becomes a red giant"), txt: T("À court d'hydrogène, le Soleil gonflera jusqu'à ~200 fois sa taille : Mercure et Vénus seront englouties. Pour la Terre, c'est incertain — des travaux récents suggèrent qu'elle pourrait s'éloigner juste assez pour survivre… calcinée. Le Soleil finira en naine blanche.", "Out of hydrogen, the Sun will swell ~200× its size: Mercury and Venus will be engulfed. Earth's fate is uncertain — recent work suggests it may drift just far enough to survive… scorched. The Sun will end as a white dwarf.") },
    { t: T("dans ≈ 100 000 Md d'années", "in ≈ 100 trillion years"), icon: "🌑", title: T("La fin des étoiles", "The end of stars"), txt: T("Le gaz pour former de nouvelles étoiles s'épuise. Les dernières naines rouges s'éteignent lentement : l'Univers entre dans l'ère de la dégénérescence — plus aucune étoile ne brille.", "The gas for new stars runs out. The last red dwarfs slowly fade: the universe enters the degenerate era — no star shines anymore.") },
    { t: T("dans ≈ 10¹⁰⁰ ans", "in ≈ 10¹⁰⁰ years"), icon: "🕳", title: T("L'ère des trous noirs, puis le noir", "The black hole era, then darkness"), txt: T("Ne resteront que des trous noirs, qui s'évaporeront très lentement (rayonnement de Hawking). Le scénario privilégié est le « Big Freeze » : l'expansion, accélérée par l'énergie noire, dilue tout — l'Univers finit froid, sombre et vide. La bonne nouvelle : il nous reste un temps inimaginablement long pour regarder les étoiles.", "Only black holes will remain, slowly evaporating (Hawking radiation). The favoured scenario is the “Big Freeze”: expansion, accelerated by dark energy, dilutes everything — a cold, dark, empty universe. Good news: we have an unimaginably long time left to watch the stars.") },
  ];

  // ---- Le saviez-vous ? — faits marquants sur l'Univers actuel (chiffres à jour 2025-2026) ----
  const FACTS = [
    { icon: "🌌", title: T("Un Univers presque entièrement invisible", "A nearly invisible universe"), txt: T("L'Univers est composé à 68 % d'énergie noire et 27 % de matière noire — deux phénomènes que la science ne comprend pas encore. La matière « ordinaire », celle qui forme étoiles, planètes et vous-même, ne représente que 5 % du total.", "The universe is 68% dark energy and 27% dark matter — two phenomena science doesn't yet fully understand. “Ordinary” matter, the kind that forms stars, planets and you, is only 5% of the total.") },
    { icon: "🔭", title: T("Des milliers de mondes découverts", "Thousands of worlds discovered"), txt: T("Plus de 6 300 exoplanètes ont été confirmées en dehors de notre Système solaire (2026), et des milliers d'autres candidates attendent d'être validées.", "Over 6,300 exoplanets have been confirmed outside our Solar System (2026), with thousands more candidates awaiting confirmation.") },
    { icon: "📏", title: T("93 milliards d'années-lumière de diamètre", "93 billion light-years across"), txt: T("Bien que l'Univers n'ait que 13,8 milliards d'années, il mesure environ 93 milliards d'années-lumière de diamètre : l'espace lui-même s'est étiré depuis l'émission de la lumière la plus ancienne que nous observons.", "Though the universe is only 13.8 billion years old, it spans about 93 billion light-years across: space itself has stretched since the oldest light we observe was emitted.") },
    { icon: "🌠", title: T("2 000 milliards de galaxies", "2 trillion galaxies"), txt: T("Les estimations les plus récentes (télescope Hubble) portent le nombre de galaxies de l'Univers observable à environ 2 000 milliards — dix fois plus que ce que l'on pensait il y a quelques années.", "The latest estimates (Hubble telescope) put the number of galaxies in the observable universe at around 2 trillion — ten times more than previously thought.") },
  ];

  // ---- Quiz à 3 niveaux (réponses inspirées des cartes ci-dessus + du reste de l'app) ----
  const QUIZ_EASY = [
    { q: T("Combien de planètes compte le Système solaire ?", "How many planets are in the Solar System?"), opts: fr ? ["7", "8", "9", "10"] : ["7", "8", "9", "10"], ok: 1, why: T("8 planètes officielles depuis 2006 — Pluton a été reclassée planète naine.", "8 official planets since 2006 — Pluto was reclassified as a dwarf planet.") },
    { q: T("Quelle est l'étoile la plus proche de la Terre ?", "What is the closest star to Earth?"), opts: fr ? ["Proxima Centauri", "Sirius", "Le Soleil", "Alpha Centauri"] : ["Proxima Centauri", "Sirius", "The Sun", "Alpha Centauri"], ok: 2, why: T("Le Soleil est notre étoile, à seulement 150 millions de km.", "The Sun is our star, only 150 million km away.") },
    { q: T("Combien de temps la lumière du Soleil met-elle pour atteindre la Terre ?", "How long does sunlight take to reach Earth?"), opts: fr ? ["8 minutes", "8 secondes", "8 heures", "8 jours"] : ["8 minutes", "8 seconds", "8 hours", "8 days"], ok: 0, why: T("Environ 8 minutes et 19 secondes, à la vitesse de la lumière.", "About 8 minutes 19 seconds, at the speed of light.") },
    { q: T("Quelle planète est surnommée la « planète rouge » ?", "Which planet is nicknamed the “red planet”?"), opts: fr ? ["Vénus", "Mars", "Jupiter", "Mercure"] : ["Venus", "Mars", "Jupiter", "Mercury"], ok: 1, why: T("Mars, colorée par l'oxyde de fer (rouille) de sa surface.", "Mars, coloured by the iron oxide (rust) on its surface.") },
    { q: T("Qu'est-ce qu'une constellation ?", "What is a constellation?"), opts: fr ? ["Un groupe d'étoiles physiquement liées", "Un dessin formé par des étoiles vues depuis la Terre", "Une galaxie", "Un trou noir"] : ["A group of physically linked stars", "A shape formed by stars as seen from Earth", "A galaxy", "A black hole"], ok: 1, why: T("Ses étoiles sont souvent à des distances très différentes — juste alignées en apparence depuis la Terre.", "Its stars are often at very different distances — just aligned as seen from Earth.") },
    { q: T("Quelle est la plus grosse planète du Système solaire ?", "What is the largest planet in the Solar System?"), opts: fr ? ["Saturne", "Jupiter", "Neptune", "la Terre"] : ["Saturn", "Jupiter", "Neptune", "Earth"], ok: 1, why: T("Jupiter : plus de 11 fois le diamètre de la Terre.", "Jupiter: over 11 times Earth's diameter.") },
    { q: T("Comment s'appelle notre galaxie ?", "What is our galaxy called?"), opts: fr ? ["Andromède", "la Voie Lactée", "Triangulum", "le Sagittaire"] : ["Andromeda", "the Milky Way", "Triangulum", "Sagittarius"], ok: 1, why: T("La Voie Lactée, visible comme une bande diffuse par ciel noir.", "The Milky Way, visible as a hazy band under dark skies.") },
    { q: T("Qu'est-ce que la Lune ?", "What is the Moon?"), opts: fr ? ["Une planète", "Une étoile", "Le satellite naturel de la Terre", "Un astéroïde"] : ["A planet", "A star", "Earth's natural satellite", "An asteroid"], ok: 2, why: T("Notre unique satellite naturel, à environ 384 000 km.", "Our only natural satellite, about 384,000 km away.") },
  ];

  const QUIZ_MEDIUM = [
    { q: T("Quel âge a l'Univers ?", "How old is the universe?"), opts: fr ? ["4,6 milliards d'années", "13,8 milliards d'années", "100 000 ans", "1 million d'années"] : ["4.6 billion years", "13.8 billion years", "100,000 years", "1 million years"], ok: 1, why: T("13,8 milliards d'années, mesuré notamment grâce au fond diffus cosmologique.", "13.8 billion years, measured notably from the cosmic microwave background.") },
    { q: T("Quelle est la plus ancienne lumière observable ?", "What is the oldest observable light?"), opts: fr ? ["La lumière du Soleil", "Les premières galaxies", "Le fond diffus cosmologique", "Les quasars"] : ["Sunlight", "The first galaxies", "The cosmic microwave background", "Quasars"], ok: 2, why: T("Émise 380 000 ans après le Big Bang, quand l'Univers est devenu transparent.", "Emitted 380,000 years after the Big Bang, when the universe became transparent.") },
    { q: T("Dans environ 1 milliard d'années, la Terre…", "In about 1 billion years, Earth will…"), opts: fr ? ["explosera", "verra ses océans s'évaporer", "quittera le système solaire", "gèlera"] : ["explode", "see its oceans evaporate", "leave the solar system", "freeze"], ok: 1, why: T("Le Soleil, de plus en plus chaud, stérilisera la Terre — mais elle n'explosera pas.", "The ever-hotter Sun will sterilize Earth — but it won't explode.") },
    { q: T("Quelles planètes seront sûrement englouties par le Soleil géante rouge ?", "Which planets will surely be engulfed by the red giant Sun?"), opts: fr ? ["Mars et Jupiter", "La Terre et la Lune", "Mercure et Vénus", "Aucune"] : ["Mars and Jupiter", "Earth and the Moon", "Mercury and Venus", "None"], ok: 2, why: T("Le Soleil gonflera ~200 fois : Mercure et Vénus n'y survivront pas.", "The Sun will swell ~200×: Mercury and Venus won't survive.") },
    { q: T("Comment finira le Soleil ?", "How will the Sun end?"), opts: fr ? ["En trou noir", "En supernova", "En naine blanche", "Il brûlera pour toujours"] : ["As a black hole", "As a supernova", "As a white dwarf", "It will burn forever"], ok: 2, why: T("Trop léger pour une supernova : il deviendra une naine blanche de la taille de la Terre.", "Too light for a supernova: it will become an Earth-sized white dwarf.") },
    { q: T("Selon l'étude 2025, la probabilité d'une collision avec Andromède d'ici 5 Md d'années est…", "Per the 2025 study, the odds of colliding with Andromeda within 5 billion years are…"), opts: fr ? ["~2 %", "~50 %", "100 % certaine", "déjà en cours"] : ["~2%", "~50%", "100% certain", "already happening"], ok: 0, why: T("Nature Astronomy 2025 : ~2 % en 5 Md d'années, ~50/50 sur 10 Md d'années.", "Nature Astronomy 2025: ~2% within 5 billion years, ~50/50 over 10 billion.") },
    { q: T("D'où vient l'oxygène que vous respirez ?", "Where does the oxygen you breathe come from?"), opts: fr ? ["Du Big Bang directement", "Il a été forgé dans des étoiles", "Des comètes uniquement", "Du Soleil actuel"] : ["Directly from the Big Bang", "It was forged in stars", "Only from comets", "From today's Sun"], ok: 1, why: T("Les éléments lourds (O, C, Fe…) sont fabriqués dans les étoiles puis dispersés par les supernovæ.", "Heavy elements (O, C, Fe…) are made in stars, then scattered by supernovae.") },
    { q: T("Quand la formation de nouvelles étoiles cessera-t-elle ?", "When will new star formation cease?"), opts: fr ? ["Dans ~1 Md d'années", "Dans ~100 000 Md d'années", "Jamais", "Dans 100 ans"] : ["In ~1 billion years", "In ~100 trillion years", "Never", "In 100 years"], ok: 1, why: T("Vers 10¹⁴ ans, le gaz sera épuisé — les dernières naines rouges s'éteindront ensuite.", "Around 10¹⁴ years, the gas runs out — the last red dwarfs then fade.") },
    { q: T("Quel est le scénario de fin d'Univers privilégié aujourd'hui ?", "What is today's favoured end-of-universe scenario?"), opts: fr ? ["Le Big Crunch (effondrement)", "Le Big Freeze (froid et vide)", "Le rebond éternel", "L'explosion finale"] : ["The Big Crunch (collapse)", "The Big Freeze (cold and empty)", "Eternal bounce", "A final explosion"], ok: 1, why: T("L'expansion accélérée par l'énergie noire mène vers un Univers froid, sombre et dilué.", "Dark-energy-driven expansion leads to a cold, dark, diluted universe.") },
    { q: T("La Terre va-t-elle exploser un jour ?", "Will Earth ever explode?"), opts: fr ? ["Oui, dans 1 Md d'années", "Oui, avec le Soleil", "Non — stérilisée, peut-être engloutie, mais pas explosée", "Oui, à cause d'Andromède"] : ["Yes, in 1 billion years", "Yes, with the Sun", "No — sterilized, maybe engulfed, but not exploded", "Yes, because of Andromeda"], ok: 2, why: T("Les planètes n'explosent pas : la Terre sera rendue stérile (~1 Md ans) puis peut-être engloutie (~7,5 Md ans).", "Planets don't explode: Earth will be sterilized (~1 Gyr) then perhaps engulfed (~7.5 Gyr).") },
  ];

  const QUIZ_HARD = [
    { q: T("Combien de galaxies compte l'Univers observable, selon les estimations les plus récentes ?", "How many galaxies does the observable universe hold, per the latest estimates?"), opts: fr ? ["100 milliards", "2 000 milliards", "10 millions", "500 millions"] : ["100 billion", "2 trillion", "10 million", "500 million"], ok: 1, why: T("~2 000 milliards (2 trillions), soit 10× les estimations précédentes (NASA/Hubble).", "~2 trillion, ten times earlier estimates (NASA/Hubble).") },
    { q: T("De quoi est composé l'Univers, du plus abondant au moins abondant ?", "What is the universe made of, from most to least abundant?"), opts: fr ? ["Énergie noire > matière noire > matière ordinaire", "Matière noire > énergie noire > matière ordinaire", "Matière ordinaire > matière noire > énergie noire", "À parts égales"] : ["Dark energy > dark matter > ordinary matter", "Dark matter > dark energy > ordinary matter", "Ordinary matter > dark matter > dark energy", "All equal"], ok: 0, why: T("~68 % énergie noire, 27 % matière noire, et seulement 5 % de matière « normale » (NASA).", "~68% dark energy, 27% dark matter, and just 5% “normal” matter (NASA).") },
    { q: T("Quel est le diamètre approximatif de l'Univers observable ?", "What is the observable universe's approximate diameter?"), opts: fr ? ["13,8 milliards d'années-lumière", "93 milliards d'années-lumière", "4 années-lumière", "Il est infini et mesurable"] : ["13.8 billion light-years", "93 billion light-years", "4 light-years", "It's infinite and measurable"], ok: 1, why: T("≈ 93 Md d'années-lumière de diamètre : l'espace s'est étendu depuis l'émission de la lumière la plus ancienne.", "≈ 93 billion light-years across: space has expanded since the oldest light was emitted.") },
    { q: T("Combien d'exoplanètes sont confirmées à ce jour (2026) ?", "How many exoplanets are confirmed as of today (2026)?"), opts: fr ? ["Une centaine", "Plus de 6 300", "Plus d'un million", "Aucune, on ne fait que les soupçonner"] : ["About a hundred", "Over 6,300", "Over a million", "None, they're only suspected"], ok: 1, why: T("Plus de 6 300 exoplanètes confirmées (NASA Exoplanet Archive, 2026).", "Over 6,300 confirmed exoplanets (NASA Exoplanet Archive, 2026).") },
    { q: T("Selon la théorie de l'inflation, qu'est-ce qui a probablement déclenché le Big Bang chaud ?", "Per inflation theory, what likely triggered the hot Big Bang?"), opts: fr ? ["Une comète géante", "La fin d'une expansion fulgurante de l'espace", "Une supernova primordiale", "La collision de deux univers"] : ["A giant comet", "The end of a runaway expansion of space", "A primordial supernova", "Two universes colliding"], ok: 1, why: T("La fin de l'inflation déverse toute son énergie en matière et lumière : c'est le Big Bang chaud (voir la Frise).", "Inflation's end pours all its energy into matter and light: that's the hot Big Bang (see the Timeline).") },
    { q: T("Qu'est-ce que le « mur de Planck » ?", "What is the “Planck wall”?"), opts: fr ? ["Une frontière physique de l'Univers", "La limite au-delà de laquelle nos lois physiques ne s'appliquent plus", "Un mur de galaxies", "Une théorie déjà réfutée"] : ["A physical boundary of the universe", "The limit beyond which our physical laws break down", "A wall of galaxies", "An already-debunked theory"], ok: 1, why: T("À l'instant zéro, relativité et physique quantique cessent d'être valables — la science s'arrête là, pour l'instant.", "At time zero, relativity and quantum physics stop being valid — honest science stops there, for now.") },
    { q: T("Une naine blanche, une étoile à neutrons et un trou noir sont tous des vestiges de quoi ?", "A white dwarf, a neutron star and a black hole are all remnants of what?"), opts: fr ? ["De planètes détruites", "De la mort d'une étoile", "Du Big Bang directement", "De galaxies entières"] : ["Destroyed planets", "A star's death", "The Big Bang directly", "Entire galaxies"], ok: 1, why: T("Ce sont les 3 destins possibles du cœur d'une étoile après sa mort, selon sa masse de départ.", "These are the 3 possible fates of a star's core after death, depending on its starting mass.") },
    { q: T("Quelle masse minimale (en masses solaires) faut-il à une étoile pour finir en trou noir ?", "What minimum mass (in solar masses) does a star need to end as a black hole?"), opts: fr ? ["Aucune masse minimum n'est nécessaire", "Environ 1 masse solaire", "Environ 20-25 masses solaires", "Exactement la masse du Soleil"] : ["No minimum mass is needed", "About 1 solar mass", "About 20–25 solar masses", "Exactly the Sun's mass"], ok: 2, why: T("En dessous de ~20-25 masses solaires, une étoile finit en naine blanche ou étoile à neutrons — jamais en trou noir.", "Below ~20–25 solar masses, a star ends as a white dwarf or neutron star — never a black hole.") },
  ];
  const POOLS = { easy: QUIZ_EASY, medium: QUIZ_MEDIUM, hard: QUIZ_HARD };
  const DIFF_LABEL = { easy: T("🟢 Facile", "🟢 Easy"), medium: T("🟡 Moyen", "🟡 Medium"), hard: T("🔴 Difficile", "🔴 Hard") };

  const [mode, setMode] = useState("learn");    // learn | quiz | done
  const [diff, setDiff] = useState(null);       // easy | medium | hard | null (sélecteur affiché)
  const [qi, setQi] = useState(0);              // question courante
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);   // réponse choisie (feedback)

  const pool = diff ? POOLS[diff] : [];
  const answer = (i) => {
    if (picked != null) return;
    setPicked(i);
    if (i === pool[qi].ok) setScore((s) => s + 1);
  };
  const next = () => {
    setPicked(null);
    if (qi + 1 < pool.length) setQi(qi + 1);
    else setMode("done");
  };
  const pickDiff = (level) => { setDiff(level); setMode("quiz"); setQi(0); setScore(0); setPicked(null); };
  const restart = () => { setMode("quiz"); setQi(0); setScore(0); setPicked(null); }; // même niveau, nouvelle partie
  const chooseLevel = () => { setDiff(null); setMode("quiz"); };

  const card = (e, i) => React.createElement("div", { key: i, className: "uni-card" },
    React.createElement("div", { className: "uni-icon" }, e.icon),
    React.createElement("div", { className: "uni-body" },
      e.t && React.createElement("div", { className: "uni-when" }, e.t),
      React.createElement("h4", null, e.title),
      React.createElement("p", null, e.txt)));

  const q = pool[qi];
  return React.createElement("div", { className: "universe-wrap" },
    React.createElement("div", { className: "uni-tabs" },
      React.createElement("button", { className: "chip" + (mode === "learn" ? " on" : ""), onClick: () => setMode("learn") }, T("📖 Apprendre", "📖 Learn")),
      React.createElement("button", { className: "chip" + (mode !== "learn" ? " on" : ""), onClick: chooseLevel }, T("🎮 Quiz", "🎮 Quiz"))),

    mode === "learn" && React.createElement(React.Fragment, null,
      React.createElement("h3", { className: "uni-head" }, T("⏪ D'où venons-nous ?", "⏪ Where do we come from?")),
      PAST.map(card),
      React.createElement("h3", { className: "uni-head" }, T("⏩ Que va-t-il se passer ?", "⏩ What happens next?")),
      FUTURE.map(card),
      React.createElement("h3", { className: "uni-head" }, T("🔭 Le saviez-vous ?", "🔭 Did you know?")),
      FACTS.map(card),
      React.createElement("p", { className: "uni-src" }, T("Sources : NASA Science, Nature Astronomy (2025), télescope Hubble, NASA Exoplanet Archive, ESA — vulgarisées. Les échéances lointaines et les grands nombres sont des estimations du consensus scientifique actuel.", "Sources: NASA Science, Nature Astronomy (2025), Hubble telescope, NASA Exoplanet Archive, ESA — popularized. Far-future dates and large numbers are current scientific-consensus estimates."))),

    mode === "quiz" && !diff && React.createElement("div", { className: "quiz-card center" },
      React.createElement("h3", null, T("Choisissez votre niveau", "Choose your level")),
      React.createElement("p", { className: "uni-src" }, T("Diversifié : Système solaire, Big Bang, avenir de l'Univers, chiffres clés…", "Diverse topics: Solar System, Big Bang, the universe's future, key numbers…")),
      React.createElement("div", { className: "diff-row" },
        ["easy", "medium", "hard"].map((lv) => React.createElement("button", {
          key: lv, className: "chip diff-btn diff-" + lv, onClick: () => pickDiff(lv),
        }, DIFF_LABEL[lv] + " · " + POOLS[lv].length))),
    ),

    mode === "quiz" && diff && React.createElement("div", { className: "quiz-card" },
      React.createElement("div", { className: "quiz-progress" }, DIFF_LABEL[diff] + " · " + T("Question ", "Question ") + (qi + 1) + " / " + pool.length + " · " + T("Score", "Score") + " : " + score),
      React.createElement("h3", null, q.q),
      q.opts.map((o, i) => React.createElement("button", {
        key: i,
        className: "quiz-opt" + (picked == null ? "" : i === q.ok ? " good" : i === picked ? " bad" : " off"),
        onClick: () => answer(i),
      }, o)),
      picked != null && React.createElement("div", { className: "quiz-why" },
        React.createElement("p", null, (picked === q.ok ? T("✅ Exact ! ", "✅ Correct! ") : T("❌ Raté. ", "❌ Missed. ")) + q.why),
        React.createElement("button", { className: "chip on", onClick: next }, qi + 1 < pool.length ? T("Question suivante →", "Next question →") : T("Voir mon score", "See my score")))),

    mode === "done" && React.createElement("div", { className: "quiz-card center" },
      React.createElement("div", { className: "quiz-score" }, score + " / " + pool.length),
      React.createElement("div", { className: "uni-src" }, DIFF_LABEL[diff]),
      React.createElement("h3", null,
        score / pool.length >= 0.9 ? T("🏆 Astrophysicien·ne en herbe !", "🏆 Budding astrophysicist!") :
        score / pool.length >= 0.7 ? T("🌟 Très belle culture cosmique !", "🌟 Impressive cosmic knowledge!") :
        score / pool.length >= 0.5 ? T("🌗 Pas mal — relis les cartes et retente !", "🌗 Not bad — reread the cards and retry!") :
        T("🌑 L'Univers garde ses secrets… pour l'instant !", "🌑 The universe keeps its secrets… for now!")),
      React.createElement("button", { className: "chip on", onClick: restart }, T("🔄 Rejouer (même niveau)", "🔄 Play again (same level)")),
      React.createElement("button", { className: "chip", onClick: chooseLevel }, T("🎮 Changer de niveau", "🎮 Change level")),
      React.createElement("button", { className: "chip", onClick: () => setMode("learn") }, T("📖 Revoir les cartes", "📖 Back to the cards")))
  );
}
