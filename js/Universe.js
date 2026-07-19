/* Novaé — Histoire de l'Univers : passé, futur (données NASA / Nature Astronomy 2025) + quiz.
   Remplace la Galerie. Contenu pédagogique sourcé, en français. */
function UniversePanel() {
  const { useState } = React;

  // ---- Chronologie : du Big Bang à la fin de l'Univers (consensus scientifique) ----
  const PAST = [
    { t: "il y a 13,8 Md d'années", icon: "💥", title: "Le Big Bang", txt: "L'Univers naît d'un état extrêmement dense et chaud, puis s'étend et se refroidit. Ce n'est pas une explosion DANS l'espace : c'est l'espace lui-même qui grandit." },
    { t: "380 000 ans après", icon: "🌅", title: "Première lumière", txt: "L'Univers devient transparent : cette lumière fossile, le fond diffus cosmologique, est encore observable aujourd'hui — c'est la plus vieille image du cosmos." },
    { t: "≈ 200 millions d'années", icon: "✨", title: "Premières étoiles", txt: "Des géantes bleues 100 fois plus massives que le Soleil s'allument et forgent les premiers éléments lourds : carbone, oxygène, fer…" },
    { t: "≈ 13,6 Md d'années", icon: "🌌", title: "Naissance de la Voie Lactée", txt: "Notre galaxie s'assemble par fusion de petites galaxies. Elle compte aujourd'hui 200 à 400 milliards d'étoiles." },
    { t: "il y a 4,6 Md d'années", icon: "☀️", title: "Naissance du Soleil et de la Terre", txt: "Un nuage de gaz s'effondre : le Soleil s'allume, les planètes se forment dans le disque de poussière qui l'entoure. L'oxygène de votre sang a été forgé dans des étoiles mortes bien avant." },
    { t: "il y a ≈ 3,8 Md d'années", icon: "🦠", title: "La vie apparaît sur Terre", txt: "Les premières cellules apparaissent dans les océans. Les humains modernes, eux, n'existent que depuis ~300 000 ans — un battement de cils cosmique." },
  ];
  const FUTURE = [
    { t: "dans ≈ 1 Md d'années", icon: "🌡", title: "La Terre devient inhabitable", txt: "Le Soleil chauffe de ~10 % par milliard d'années : les océans s'évaporeront et la Terre deviendra stérile. Non, la Terre n'explosera pas — elle sera d'abord stérilisée par la chaleur (consensus NASA)." },
    { t: "dans 5 à 10 Md d'années", icon: "🌀", title: "Rencontre avec Andromède ?", txt: "On a longtemps annoncé une collision certaine avec la galaxie d'Andromède dans ~4,5 Md d'années. Une étude de 2025 (Nature Astronomy) a rebattu les cartes : seulement ~2 % de chances dans les 5 prochains milliards d'années, et environ 50/50 sur 10 milliards d'années. Si fusion il y a, ce serait plutôt dans 7-8 Md d'années — et les étoiles ne se percuteraient quasiment pas, l'espace entre elles est immense." },
    { t: "dans ≈ 5-6 Md d'années", icon: "🔴", title: "Le Soleil géante rouge", txt: "À court d'hydrogène, le Soleil gonflera jusqu'à ~200 fois sa taille : Mercure et Vénus seront englouties. Pour la Terre, c'est incertain — des travaux récents suggèrent qu'elle pourrait s'éloigner juste assez pour survivre… calcinée. Le Soleil finira en naine blanche, un cadavre stellaire de la taille de la Terre." },
    { t: "dans ≈ 100 000 Md d'années", icon: "🌑", title: "La fin des étoiles", txt: "Le gaz pour former de nouvelles étoiles s'épuise. Les dernières naines rouges s'éteignent lentement : l'Univers entre dans l'ère de la dégénérescence — plus aucune étoile ne brille." },
    { t: "dans ≈ 10¹⁰⁰ ans", icon: "🕳", title: "L'ère des trous noirs, puis le noir", txt: "Ne resteront que des trous noirs, qui s'évaporeront très lentement (rayonnement de Hawking). Le scénario privilégié est le « Big Freeze » : l'expansion, accélérée par l'énergie noire, dilue tout — l'Univers finit froid, sombre et vide. La bonne nouvelle : il nous reste un temps inimaginablement long pour regarder les étoiles." },
  ];

  // ---- Quiz d'apprentissage (réponses dans les cartes ci-dessus) ----
  const QUIZ = [
    { q: "Quel âge a l'Univers ?", opts: ["4,6 milliards d'années", "13,8 milliards d'années", "100 000 ans", "1 million d'années"], ok: 1, why: "13,8 milliards d'années, mesuré notamment grâce au fond diffus cosmologique." },
    { q: "Quelle est la plus ancienne lumière observable ?", opts: ["La lumière du Soleil", "Les premières galaxies", "Le fond diffus cosmologique", "Les quasars"], ok: 2, why: "Émise 380 000 ans après le Big Bang, quand l'Univers est devenu transparent." },
    { q: "Dans environ 1 milliard d'années, la Terre…", opts: ["explosera", "verra ses océans s'évaporer", "quittera le système solaire", "gèlera"], ok: 1, why: "Le Soleil, de plus en plus chaud, stérilisera la Terre — mais elle n'explosera pas." },
    { q: "Quelles planètes seront sûrement englouties par le Soleil géante rouge ?", opts: ["Mars et Jupiter", "La Terre et la Lune", "Mercure et Vénus", "Aucune"], ok: 2, why: "Le Soleil gonflera ~200 fois : Mercure et Vénus n'y survivront pas. Pour la Terre, c'est incertain." },
    { q: "Comment finira le Soleil ?", opts: ["En trou noir", "En supernova", "En naine blanche", "Il brûlera pour toujours"], ok: 2, why: "Trop léger pour une supernova : il deviendra une naine blanche de la taille de la Terre." },
    { q: "Selon l'étude 2025, la probabilité d'une collision avec Andromède d'ici 5 Md d'années est…", opts: ["~2 %", "~50 %", "100 % certaine", "déjà en cours"], ok: 0, why: "Nature Astronomy 2025 : ~2 % en 5 Md d'années, ~50/50 sur 10 Md d'années." },
    { q: "D'où vient l'oxygène que vous respirez ?", opts: ["Du Big Bang directement", "Il a été forgé dans des étoiles", "Des comètes uniquement", "Du Soleil actuel"], ok: 1, why: "Les éléments lourds (O, C, Fe…) sont fabriqués dans les étoiles puis dispersés par les supernovæ." },
    { q: "Quand la formation de nouvelles étoiles cessera-t-elle ?", opts: ["Dans ~1 Md d'années", "Dans ~100 000 Md d'années", "Jamais", "Dans 100 ans"], ok: 1, why: "Vers 10¹⁴ ans, le gaz sera épuisé — les dernières naines rouges s'éteindront ensuite." },
    { q: "Quel est le scénario de fin d'Univers privilégié aujourd'hui ?", opts: ["Le Big Crunch (effondrement)", "Le Big Freeze (froid et vide)", "Le rebond éternel", "L'explosion finale"], ok: 1, why: "L'expansion accélérée par l'énergie noire mène vers un Univers froid, sombre et dilué." },
    { q: "La Terre va-t-elle exploser un jour ?", opts: ["Oui, dans 1 Md d'années", "Oui, avec le Soleil", "Non — stérilisée, peut-être engloutie, mais pas explosée", "Oui, à cause d'Andromède"], ok: 2, why: "Les planètes n'explosent pas : la Terre sera rendue stérile (~1 Md ans) puis peut-être engloutie (~7,5 Md ans)." },
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
      React.createElement("button", { className: "chip" + (mode === "learn" ? " on" : ""), onClick: () => setMode("learn") }, "📖 Apprendre"),
      React.createElement("button", { className: "chip" + (mode !== "learn" ? " on" : ""), onClick: restart }, "🎮 Quiz (10 questions)")),

    mode === "learn" && React.createElement(React.Fragment, null,
      React.createElement("h3", { className: "uni-head" }, "⏪ D'où venons-nous ?"),
      PAST.map(card),
      React.createElement("h3", { className: "uni-head" }, "⏩ Que va-t-il se passer ?"),
      FUTURE.map(card),
      React.createElement("p", { className: "uni-src" }, "Sources : NASA Science, Nature Astronomy (2025), ESA — vulgarisées. Les échéances lointaines sont des estimations du consensus scientifique actuel.")),

    mode === "quiz" && React.createElement("div", { className: "quiz-card" },
      React.createElement("div", { className: "quiz-progress" }, "Question " + (qi + 1) + " / " + QUIZ.length + " · Score : " + score),
      React.createElement("h3", null, q.q),
      q.opts.map((o, i) => React.createElement("button", {
        key: i,
        className: "quiz-opt" + (picked == null ? "" : i === q.ok ? " good" : i === picked ? " bad" : " off"),
        onClick: () => answer(i),
      }, o)),
      picked != null && React.createElement("div", { className: "quiz-why" },
        React.createElement("p", null, (picked === q.ok ? "✅ Exact ! " : "❌ Raté. ") + q.why),
        React.createElement("button", { className: "chip on", onClick: next }, qi + 1 < QUIZ.length ? "Question suivante →" : "Voir mon score"))),

    mode === "done" && React.createElement("div", { className: "quiz-card center" },
      React.createElement("div", { className: "quiz-score" }, score + " / " + QUIZ.length),
      React.createElement("h3", null,
        score >= 9 ? "🏆 Astrophysicien·ne en herbe !" :
        score >= 7 ? "🌟 Très belle culture cosmique !" :
        score >= 5 ? "🌗 Pas mal — relis les cartes et retente !" :
        "🌑 L'Univers garde ses secrets… pour l'instant !"),
      React.createElement("button", { className: "chip on", onClick: restart }, "🔄 Rejouer"),
      React.createElement("button", { className: "chip", onClick: () => setMode("learn") }, "📖 Revoir les cartes"))
  );
}
