/* Novaé — Histoire de l'Univers : passé, futur (données NASA / Nature Astronomy 2025) + quiz.
   Remplace la Galerie. Contenu pédagogique sourcé, en français. */
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

  // ---- Quiz d'apprentissage (réponses dans les cartes ci-dessus) ----
  const QUIZ = [
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

  const [mode, setMode] = useState("learn");    // learn | quiz | done
  const [qi, setQi] = useState(0);              // question courante
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);   // réponse choisie (feedback)

  const answer = (i) => {
    if (picked != null) return;
    setPicked(i);
    if (i === QUIZ[qi].ok) setScore((s) => s + 1);
  };
  const next = () => {
    setPicked(null);
    if (qi + 1 < QUIZ.length) setQi(qi + 1);
    else setMode("done");
  };
  const restart = () => { setMode("quiz"); setQi(0); setScore(0); setPicked(null); };

  const card = (e, i) => React.createElement("div", { key: i, className: "uni-card" },
    React.createElement("div", { className: "uni-icon" }, e.icon),
    React.createElement("div", { className: "uni-body" },
      React.createElement("div", { className: "uni-when" }, e.t),
      React.createElement("h4", null, e.title),
      React.createElement("p", null, e.txt)));

  const q = QUIZ[qi];
  return React.createElement("div", { className: "universe-wrap" },
    React.createElement("div", { className: "uni-tabs" },
      React.createElement("button", { className: "chip" + (mode === "learn" ? " on" : ""), onClick: () => setMode("learn") }, T("📖 Apprendre", "📖 Learn")),
      React.createElement("button", { className: "chip" + (mode !== "learn" ? " on" : ""), onClick: restart }, T("🎮 Quiz (10 questions)", "🎮 Quiz (10 questions)"))),

    mode === "learn" && React.createElement(React.Fragment, null,
      React.createElement("h3", { className: "uni-head" }, T("⏪ D'où venons-nous ?", "⏪ Where do we come from?")),
      PAST.map(card),
      React.createElement("h3", { className: "uni-head" }, T("⏩ Que va-t-il se passer ?", "⏩ What happens next?")),
      FUTURE.map(card),
      React.createElement("p", { className: "uni-src" }, T("Sources : NASA Science, Nature Astronomy (2025), ESA — vulgarisées. Les échéances lointaines sont des estimations du consensus scientifique actuel.", "Sources: NASA Science, Nature Astronomy (2025), ESA — popularized. Far-future dates are current scientific-consensus estimates."))),

    mode === "quiz" && React.createElement("div", { className: "quiz-card" },
      React.createElement("div", { className: "quiz-progress" }, T("Question ", "Question ") + (qi + 1) + " / " + QUIZ.length + " · " + T("Score", "Score") + " : " + score),
      React.createElement("h3", null, q.q),
      q.opts.map((o, i) => React.createElement("button", {
        key: i,
        className: "quiz-opt" + (picked == null ? "" : i === q.ok ? " good" : i === picked ? " bad" : " off"),
        onClick: () => answer(i),
      }, o)),
      picked != null && React.createElement("div", { className: "quiz-why" },
        React.createElement("p", null, (picked === q.ok ? T("✅ Exact ! ", "✅ Correct! ") : T("❌ Raté. ", "❌ Missed. ")) + q.why),
        React.createElement("button", { className: "chip on", onClick: next }, qi + 1 < QUIZ.length ? T("Question suivante →", "Next question →") : T("Voir mon score", "See my score")))),

    mode === "done" && React.createElement("div", { className: "quiz-card center" },
      React.createElement("div", { className: "quiz-score" }, score + " / " + QUIZ.length),
      React.createElement("h3", null,
        score >= 9 ? T("🏆 Astrophysicien·ne en herbe !", "🏆 Budding astrophysicist!") :
        score >= 7 ? T("🌟 Très belle culture cosmique !", "🌟 Impressive cosmic knowledge!") :
        score >= 5 ? T("🌗 Pas mal — relis les cartes et retente !", "🌗 Not bad — reread the cards and retry!") :
        T("🌑 L'Univers garde ses secrets… pour l'instant !", "🌑 The universe keeps its secrets… for now!")),
      React.createElement("button", { className: "chip on", onClick: restart }, T("🔄 Rejouer", "🔄 Play again")),
      React.createElement("button", { className: "chip", onClick: () => setMode("learn") }, T("📖 Revoir les cartes", "📖 Back to the cards")))
  );
}
