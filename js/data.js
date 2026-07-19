/* Novaé — shared data layer (plain global script) */
(function () {
  // RA in degrees (0–360), Dec in degrees (-90..90)
  const star = (name, ra, dec, mag, spec) => ({ name, ra, dec, mag, spec });

  // Small embedded set used as OFFLINE FALLBACK if the full catalogue can't load.
  const constellations = [
    { name: "Orion", stars: [
        star("Bételgeuse", 88.79, 7.41, 0.42, "M"), star("Rigel", 78.63, -8.2, 0.18, "B"),
        star("Bellatrix", 81.28, 6.35, 1.64, "B"), star("Mintaka", 83.0, -0.3, 2.23, "O"),
        star("Alnilam", 84.05, -1.2, 1.69, "B"), star("Alnitak", 85.19, -1.94, 1.77, "O"),
        star("Saiph", 86.94, -9.67, 2.07, "B")],
      lines: [[0, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 3], [1, 6], [6, 5]] },
    { name: "Grande Ourse", stars: [
        star("Dubhe", 165.93, 61.75, 1.79, "K"), star("Merak", 165.46, 56.38, 2.37, "A"),
        star("Phecda", 178.46, 53.69, 2.44, "A"), star("Megrez", 183.86, 57.03, 3.31, "A"),
        star("Alioth", 193.51, 55.96, 1.77, "A"), star("Mizar", 200.98, 54.93, 2.04, "A"),
        star("Alkaïd", 206.89, 49.31, 1.86, "B")],
      lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
    { name: "Cassiopée", stars: [
        star("Caph", 2.29, 59.15, 2.27, "F"), star("Schedar", 10.13, 56.54, 2.24, "K"),
        star("Gamma Cas", 14.18, 60.72, 2.47, "B"), star("Ruchbah", 21.45, 60.24, 2.68, "A"),
        star("Segin", 28.6, 63.67, 3.35, "B")],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { name: "Cygne", stars: [
        star("Deneb", 310.36, 45.28, 1.25, "A"), star("Sadr", 305.56, 40.26, 2.23, "F"),
        star("Gienah", 305.25, 33.97, 2.46, "K"), star("Delta Cygni", 296.24, 45.13, 2.87, "B"),
        star("Albireo", 292.68, 27.96, 3.18, "K")],
      lines: [[0, 1], [1, 4], [3, 1], [1, 2]] },
    { name: "Scorpion", stars: [
        star("Antarès", 247.35, -26.43, 0.96, "M"), star("Shaula", 263.4, -37.1, 1.62, "B"),
        star("Sargas", 264.33, -42.99, 1.86, "F")],
      lines: [[0, 1], [1, 2]] },
    { name: "Croix du Sud", stars: [
        star("Acrux", 186.65, -63.1, 0.77, "B"), star("Mimosa", 191.93, -59.69, 1.25, "B"),
        star("Gacrux", 187.79, -57.11, 1.63, "M"), star("Delta Crucis", 183.79, -58.75, 2.79, "B")],
      lines: [[0, 2], [1, 3]] },
  ];

  const brightStars = [
    star("Sirius", 101.29, -16.72, -1.46, "A"), star("Canopus", 95.99, -52.7, -0.74, "F"),
    star("Arcturus", 213.92, 19.18, -0.05, "K"), star("Véga", 279.23, 38.78, 0.03, "A"),
    star("Capella", 79.17, 45.99, 0.08, "G"), star("Procyon", 114.83, 5.22, 0.34, "F"),
    star("Aldébaran", 68.98, 16.51, 0.85, "K"), star("Spica", 201.3, -11.16, 0.98, "B"),
    star("Pollux", 116.33, 28.03, 1.14, "K"), star("Castor", 113.65, 31.89, 1.58, "A"),
    star("Régulus", 152.09, 11.97, 1.36, "B"), star("Adhara", 104.66, -28.97, 1.5, "B"),
    star("Elnath", 81.57, 28.61, 1.65, "B"), star("Denebola", 177.26, 14.57, 2.11, "A"),
  ];

  // ✕ violet — étoiles qui ont explosé en supernova (historiques + vestiges)
  const supernovae = [
    { name: "SN 1054 — Nébuleuse du Crabe", ra: 83.63, dec: 22.01, type: "Type II", year: 1054, remnant: "Nébuleuse + pulsar", constellation: "Taureau", note: "Effondrement de cœur d'une supergéante. Pulsar tournant 30×/s." },
    { name: "SN 1987A", ra: 83.87, dec: -69.27, type: "Type Ib/c", year: 1987, remnant: "Coquille en expansion", constellation: "Grand Nuage de Magellan", note: "Supernova la plus proche depuis 1604. Neutrinos détectés sur Terre." },
    { name: "SN 1572 — Tycho", ra: 6.36, dec: 64.14, type: "Type Ia", year: 1572, remnant: "Vestige en coquille", constellation: "Cassiopée", note: "Naine blanche en accrétion. Observée par Tycho Brahe." },
    { name: "SN 1604 — Kepler", ra: 262.67, dec: -21.49, type: "Type Ia", year: 1604, remnant: "Vestige", constellation: "Ophiuchus", note: "Dernière supernova observée à l'œil nu dans la Voie Lactée." },
    { name: "SN 1006", ra: 225.59, dec: -41.94, type: "Type Ia", year: 1006, remnant: "Vestige radio/X", constellation: "Loup", note: "L'événement stellaire le plus brillant de l'histoire (mag ≈ −7,5)." },
    { name: "Cassiopée A", ra: 350.85, dec: 58.81, type: "Type IIb", year: 1680, remnant: "Vestige + étoile à neutrons", constellation: "Cassiopée", note: "Vestige le plus brillant en ondes radio. Explosion vers 1680." },
    { name: "SN 185", ra: 220.0, dec: -62.5, type: "Type Ia ?", year: 185, remnant: "RCW 86", constellation: "Centaure", note: "Première supernova consignée (astronomes chinois)." },
    { name: "Véla (vestige)", ra: 128.5, dec: -45.17, type: "Type II", year: -9000, remnant: "Pulsar de Véla", constellation: "Voiles", note: "Explosion il y a ~11 000 ans. Pulsar très étudié." },
  ];

  // ✸ rouge — hypernovæ / candidates (effondrement extrême, sursauts gamma)
  const hypernovae = [
    { name: "Eta Carinae", ra: 161.26, dec: -59.68, type: "Hypernova (candidate)", remnant: "Nébuleuse de l'Homoncule", constellation: "Carène", note: "Hypergéante variable lumineuse, ~100 M☉. Grande éruption en 1843. Future hypernova / sursaut gamma." },
    { name: "WR 104", ra: 272.07, dec: -23.73, type: "Wolf-Rayet (candidate GRB)", remnant: "—", constellation: "Sagittaire", note: "Système Wolf-Rayet en spirale. Candidate à un sursaut gamma." },
    { name: "WR 102", ra: 278.39, dec: -22.0, type: "Wolf-Rayet", remnant: "—", constellation: "Sagittaire", note: "Une des étoiles les plus chaudes connues (~210 000 K)." },
    { name: "SN 1998bw / GRB 980425", ra: 293.0, dec: -52.83, type: "Hypernova (Ic-BL)", remnant: "Galaxie ESO 184-G82", constellation: "Télescope", note: "Première hypernova reliée à un sursaut gamma observé." },
  ];

  const unstableStars = [
    { name: "Bételgeuse", ra: 88.79, dec: 7.41, mag: 0.42, spec: "M", constellation: "Orion", note: "Supergéante rouge en fin de vie. Supernova probable dans ~100 000 ans." },
    { name: "Antarès", ra: 247.35, dec: -26.43, mag: 0.96, spec: "M", constellation: "Scorpion", note: "Supergéante rouge ~700× le rayon du Soleil. Candidate supernova II." },
    { name: "Rigel", ra: 78.63, dec: -8.2, mag: 0.18, spec: "B", constellation: "Orion", note: "Supergéante bleue. Finira en supernova de type II." },
    { name: "Spica", ra: 201.3, dec: -11.16, mag: 0.98, spec: "B", constellation: "Vierge", note: "Binaire massive, future supernova." },
  ];

  // Planets — a = semi-major axis (AU), period (yr), phase0 (rad, arbitraire)
  // moons: dist en rayons-planète (gros plan), period en jours, r relatif
  const planets = [
    { name: "Mercure", a: 0.39, period: 0.241, color: "#8c857c", diam: 4879, phase0: 0.4, render: "mercury", tilt: 0.03, rings: false, dayLen: 58.6, moons: [], fact: "Aucune atmosphère. Surface criblée de cratères." },
    { name: "Vénus", a: 0.72, period: 0.615, color: "#d8b372", diam: 12104, phase0: 2.1, render: "venus", tilt: 177, rings: false, dayLen: 243, moons: [], fact: "Atmosphère épaisse de CO₂. Effet de serre à 465 °C." },
    { name: "Terre", a: 1.0, period: 1.0, color: "#2f6fb0", diam: 12742, phase0: 4.9, render: "earth", tilt: 23.4, rings: false, dayLen: 1, moons: [
        { name: "Lune", r: 0.27, dist: 2.6, period: 27.3, color: "#c9c6c0" }], fact: "Seule planète connue abritant la vie." },
    { name: "Mars", a: 1.52, period: 1.881, color: "#b5532a", diam: 6779, phase0: 1.2, render: "mars", tilt: 25.2, rings: false, dayLen: 1.03, moons: [
        { name: "Phobos", r: 0.07, dist: 1.7, period: 0.319, color: "#9a8b7a" },
        { name: "Déimos", r: 0.05, dist: 2.4, period: 1.263, color: "#8a7d6e" }], fact: "Olympus Mons : plus haut volcan du système solaire." },
    { name: "Jupiter", a: 5.2, period: 11.86, color: "#cda96f", diam: 139820, phase0: 3.3, render: "jupiter", tilt: 3.1, rings: false, dayLen: 0.41, moons: [
        { name: "Io", r: 0.10, dist: 1.7, period: 1.769, color: "#e8d98a" },
        { name: "Europe", r: 0.09, dist: 2.1, period: 3.551, color: "#dcd2b8" },
        { name: "Ganymède", r: 0.14, dist: 2.6, period: 7.155, color: "#9c8f7d" },
        { name: "Callisto", r: 0.13, dist: 3.1, period: 16.69, color: "#6e6155" }], fact: "95 lunes connues. Grande Tache Rouge : tempête de 350 ans." },
    { name: "Saturne", a: 9.58, period: 29.45, color: "#d8c389", diam: 116460, phase0: 0.8, render: "saturn", tilt: 26.7, rings: true, dayLen: 0.44, moons: [
        { name: "Titan", r: 0.14, dist: 2.9, period: 15.95, color: "#d9a441" },
        { name: "Rhéa", r: 0.07, dist: 2.3, period: 4.52, color: "#bdb6a8" },
        { name: "Encelade", r: 0.05, dist: 2.0, period: 1.37, color: "#eef3f6" }], fact: "Anneaux de glace de 280 000 km. 146 lunes." },
    { name: "Uranus", a: 19.2, period: 84.0, color: "#a8d8e8", diam: 50724, phase0: 5.5, render: "uranus", tilt: 97.8, rings: false, dayLen: 0.72, moons: [
        { name: "Titania", r: 0.08, dist: 2.1, period: 8.71, color: "#b9c4c9" },
        { name: "Obéron", r: 0.08, dist: 2.6, period: 13.46, color: "#a99f97" }], fact: "Incliné à 98° : il roule sur son orbite." },
    { name: "Neptune", a: 30.1, period: 164.8, color: "#2a5cc8", diam: 49244, phase0: 2.7, render: "neptune", tilt: 28.3, rings: false, dayLen: 0.67, moons: [
        { name: "Triton", r: 0.12, dist: 2.3, period: 5.88, color: "#cdd6da" }], fact: "Vents les plus rapides : 2 100 km/h." },
    { name: "Pluton", a: 39.5, period: 248.0, color: "#b9a48c", diam: 2377, phase0: 1.9, render: "pluto", tilt: 122, rings: false, dwarf: true, dayLen: 6.39, moons: [
        { name: "Charon", r: 0.5, dist: 2.4, period: 6.39, color: "#9a8f86" }], fact: "Planète naine depuis 2006. Cœur de glace : Tombaugh Regio." },
  ];

  const bortle = [
    { level: 1, label: "Ciel noir parfait", stars: "> 10 000", color: "#05060a", desc: "Voie Lactée projette des ombres. Lumière zodiacale visible." },
    { level: 2, label: "Ciel rural typique", stars: "7 000–10 000", color: "#0a0e1a", desc: "M33 visible à l'œil nu. Halos lumineux à l'horizon seulement." },
    { level: 3, label: "Ciel rural", stars: "4 000–7 000", color: "#101830", desc: "Voie Lactée riche en structure. Quelques lueurs à l'horizon." },
    { level: 4, label: "Périphérie rurale", stars: "2 500–4 000", color: "#1a2440", desc: "Voie Lactée visible mais affaiblie au-dessus de l'horizon." },
    { level: 5, label: "Banlieue", stars: "1 500–2 500", color: "#243352", desc: "Voie Lactée pâle ou absente près de l'horizon." },
    { level: 6, label: "Banlieue lumineuse", stars: "800–1 500", color: "#374a6b", desc: "Voie Lactée invisible. Ciel grisâtre dans les zones peuplées." },
    { level: 7, label: "Transition ville", stars: "500–800", color: "#4d6285", desc: "Ciel orangé. Seuls les amas les plus brillants visibles." },
    { level: 8, label: "Ciel urbain", stars: "200–500", color: "#6a7ea0", desc: "Ciel gris-orange. Constellations principales effacées." },
    { level: 9, label: "Centre-ville", stars: "< 200", color: "#8b9bb8", desc: "Seuls la Lune, les planètes et quelques étoiles très brillantes." },
  ];

  const sites = [
    { name: "Parc national des Cévennes", bortle: 2, dist: 92 },
    { name: "Plateau du Vercors", bortle: 3, dist: 64 },
    { name: "Forêt domaniale (réserve nuit)", bortle: 3, dist: 48 },
    { name: "Col de l'observatoire", bortle: 4, dist: 31 },
    { name: "Lac d'altitude", bortle: 4, dist: 120 },
  ];

  const events = [
    { date: "2026-06-21", type: "Solstice", icon: "☀️", title: "Solstice d'été", desc: "Nuit la plus courte de l'année dans l'hémisphère nord.",
      where: "Visible partout — c'est un moment, pas un phénomène localisé. Profitez du crépuscule tardif.",
      more: "En détail : au solstice, le pôle Nord est incliné au maximum vers le Soleil — jour le plus long de l'année dans l'hémisphère nord. Le Soleil culmine au plus haut de l'année à midi solaire. Idéal pour repérer le point exact du coucher de Soleil le plus au nord-ouest de l'année." },
    { date: "2026-07-29", type: "Pluie de météores", icon: "☄️", title: "Delta Aquarides", desc: "ZHR ≈ 25. Radiant dans le Verseau. Mieux avant l'aube.",
      where: "Où voir : partout, idéalement sous un ciel Bortle ≤ 4, entre 2 h et l'aube. Regardez vers le sud-est, allongé, sans télescope — les yeux suffisent.",
      more: "En détail : cette pluie vient des poussières de la comète 96P/Machholz. Les météores sont plutôt lents et discrets — comptez 15 à 25 par heure sous un bon ciel. Meilleure fenêtre : 2 h–4 h 30 du matin, Lune couchée. Installez-vous sur un transat, laissez vos yeux s'habituer 20 minutes au noir (pas de téléphone !), et balayez la moitié sud-est du ciel sans fixer un point précis." },
    { date: "2026-08-12", type: "Éclipse", icon: "🌑", title: "Éclipse solaire totale", desc: "Totalité visible depuis l'Islande et l'Espagne. Chemin de 294 km.",
      where: "Où voir : la totalité traverse l'Islande puis le nord de l'Espagne (Saragosse, Valence vers 20 h 30). Depuis la France : éclipse partielle ~90 % — lunettes spéciales OBLIGATOIRES.",
      more: "En détail : c'est la première éclipse totale visible d'Europe continentale depuis 1999 ! La totalité (Soleil entièrement caché, couronne visible) dure ~1 min 40 en Espagne, en fin de journée près de l'horizon — cherchez un point de vue dégagé vers l'ouest. En France, ~90 % du Soleil sera masqué : la lumière deviendra étrange, mais NE regardez JAMAIS sans lunettes certifiées ISO 12312-2 (les lunettes de soleil ne protègent PAS). Réservez tôt si vous voyagez : c'est l'événement astronomique de la décennie en Europe." },
    { date: "2026-08-12", type: "Pluie de météores", icon: "☄️", title: "Perséides — maximum", desc: "ZHR ≈ 100. Radiant dans Persée. La pluie majeure de l'été.",
      where: "Où voir : campagne sans lampadaires (Bortle ≤ 4), après 23 h. Regardez vers le nord-est, dos à la Lune. Comptez 20 min d'adaptation des yeux au noir.",
      more: "En détail : LA pluie de l'année ! Débris de la comète Swift-Tuttle, météores rapides (59 km/s) laissant souvent des traînées persistantes. Jusqu'à 100/heure au zénith sous ciel noir. Stratégie : soirée du 12 au 13 août, allongé pieds vers le nord-est, champ de vision large. Les plus brillants (bolides) traversent tout le ciel — pas besoin de matériel, vos yeux sont l'instrument parfait." },
    { date: "2026-09-18", type: "Conjonction", icon: "🪐", title: "Saturne à l'opposition", desc: "Saturne au plus proche et brillante toute la nuit. Anneaux idéaux.",
      where: "Où voir : visible de partout, même en ville. Plein sud vers minuit. Les anneaux se révèlent dès une petite lunette (×50).",
      more: "En détail : à l'opposition, Saturne est pile à l'opposé du Soleil — au plus proche de la Terre (~1,3 milliard de km) et visible TOUTE la nuit. À l'œil nu : un point doré brillant qui ne scintille pas. Aux jumelles 10× : forme ovale. Dans une lunette dès 50× : les anneaux, magiques. Cherchez aussi Titan, sa plus grosse lune, petit point à côté." },
    { date: "2026-10-08", type: "Aurore", icon: "🌌", title: "Activité aurorale (Kp 6)", desc: "Tempête géomagnétique prévue. Aurores possibles aux latitudes moyennes.",
      where: "Où voir : horizon NORD bien dégagé, loin des villes. En France, chances surtout au nord de la Loire ; photos au smartphone (pose 3-10 s) plus sensibles que l'œil.",
      more: "En détail : une tempête géomagnétique Kp 6 pousse l'ovale auroral vers le sud. En France, l'aurore apparaît comme une lueur rouge/rose au ras de l'horizon nord — l'œil la voit à peine, mais un smartphone en mode nuit (pose 3-10 s, posé sur un support) la révèle spectaculairement. Surveillez l'indice Kp en temps réel le soir même : les meilleures fenêtres durent 30 min à 2 h. Patience et horizon dégagé obligatoires." },
    { date: "2026-12-14", type: "Pluie de météores", icon: "☄️", title: "Géminides — maximum", desc: "ZHR ≈ 120. La meilleure pluie de l'année. Météores lents et brillants.",
      where: "Où voir : partout sous ciel sombre, dès 21 h (radiant haut vers minuit). Regardez vers l'est-sud-est. Habillez-vous très chaudement !",
      more: "En détail : la pluie la plus généreuse de l'année (jusqu'à 120/h) et la plus accessible : active dès 21 h, pas besoin d'attendre l'aube. Météores lents et brillants, souvent colorés (jaune, vert, bleu) — issus de l'astéroïde 3200 Phaéton, un cas rare. Le froid de décembre est l'ennemi n°1 : duvet, bonnet, boisson chaude, et pauses toutes les 30 min. Les enfants peuvent en profiter dès la tombée de la nuit." },
  ];

  const stats = {
    stars: "> 1 milliard (Gaia DR3)", planets: "8 + Lune + Pluton", supernovae: "100+",
    languages: "50+", cultures: "12 traditions", deepSky: "13 000+ (NGC/IC)",
  };

  const specColor = (spec) => ({
    O: "#9bb0ff", B: "#aabfff", A: "#cad7ff", F: "#f8f7ff",
    G: "#fff4ea", K: "#ffd2a1", M: "#ffb38a", LBV: "#fff0c0",
  }[spec] || "#ffffff");

  // B–V colour index → approximate RGB
  function bv2rgb(bv) {
    if (isNaN(bv)) bv = 0.65;
    const stops = [
      [-0.35, [155, 176, 255]], [0.0, [170, 191, 255]], [0.3, [202, 215, 255]],
      [0.58, [248, 247, 255]], [0.81, [255, 244, 234]], [1.4, [255, 210, 161]], [2.0, [255, 160, 110]],
    ];
    bv = Math.max(stops[0][0], Math.min(stops[stops.length - 1][0], bv));
    for (let i = 1; i < stops.length; i++) {
      if (bv <= stops[i][0]) {
        const t = (bv - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        const a = stops[i - 1][1], b = stops[i][1];
        return "rgb(" + a.map((v, j) => Math.round(v + (b[j] - v) * t)).join(",") + ")";
      }
    }
    return "rgb(255,255,255)";
  }

  const raNorm = (lon) => (lon < 0 ? lon + 360 : lon);

  // ---- real catalogue loader (88 constellations + ~9000 stars), with offline fallback ----
  async function loadCatalog() {
    if (window.NV.cat) return window.NV.cat;
    const base = "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/";
    const [sR, lR, nR] = await Promise.all([
      fetch(base + "stars.6.json"), fetch(base + "constellations.lines.json"), fetch(base + "constellations.json"),
    ]);
    const [sJ, lJ, nJ] = await Promise.all([sR.json(), lR.json(), nR.json()]);

    const stars = sJ.features.map((f) => ({
      ra: raNorm(f.geometry.coordinates[0]),
      dec: f.geometry.coordinates[1],
      mag: f.properties.mag,
      color: bv2rgb(parseFloat(f.properties.bv)),
    }));

    const lines = [];
    lJ.features.forEach((f) => {
      (f.geometry.coordinates || []).forEach((seg) => lines.push(seg.map((pt) => [raNorm(pt[0]), pt[1]])));
    });

    const frById = {};
    nJ.features.forEach((f) => { frById[f.id] = f.properties.fr || f.properties.name || f.id; });
    const consts = [];
    const names = lJ.features.map((f) => {
      const segs = (f.geometry.coordinates || []).map((seg) => seg.map((p) => [raNorm(p[0]), p[1]]));
      const pts = []; segs.forEach((seg) => seg.forEach((p) => pts.push(p)));
      if (!pts.length) return null;
      let sx = 0, sy = 0; pts.forEach((p) => { sx += p[0]; sy += p[1]; });
      const ra = sx / pts.length, dec = sy / pts.length, name = frById[f.id] || f.id, rank = +(f.properties.rank || 3);
      consts.push({ name, segs, ra, dec, rank });
      return { ra, dec, name, rank };
    }).filter(Boolean);

    window.NV.cat = { stars, lines, names, consts };
    return window.NV.cat;
  }

  // ---- simplified planet positions on the sky (circular coplanar orbits) ----
  const DEG = Math.PI / 180, EPS = 23.4393 * DEG;
  const helioLon = (p, days) => p.phase0 + (days / 365.25 / p.period) * 2 * Math.PI;
  function eclToEq(lon) {
    const ra = Math.atan2(Math.sin(lon) * Math.cos(EPS), Math.cos(lon));
    const dec = Math.asin(Math.sin(EPS) * Math.sin(lon));
    return { ra: ((ra / DEG) % 360 + 360) % 360, dec: dec / DEG };
  }
  function planetEquatorial(p, days) {
    const earth = planets[2];
    const Le = helioLon(earth, days);
    const xe = earth.a * Math.cos(Le), ye = earth.a * Math.sin(Le);
    if (p.name === "Terre") return null;
    const L = helioLon(p, days);
    const lon = Math.atan2(p.a * Math.sin(L) - ye, p.a * Math.cos(L) - xe);
    return eclToEq(lon);
  }
  function sunEquatorial(days) {
    return eclToEq(helioLon(planets[2], days) + Math.PI);
  }

  // fallback geometry (offline)
  const fbStars = [];
  constellations.forEach((c) => c.stars.forEach((s) => fbStars.push({ ra: s.ra, dec: s.dec, mag: s.mag, color: specColor(s.spec) })));
  brightStars.forEach((s) => fbStars.push({ ra: s.ra, dec: s.dec, mag: s.mag, color: specColor(s.spec) }));
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 1400; i++) fbStars.push({ ra: rnd() * 360, dec: rnd() * 180 - 90, mag: 4 + rnd() * 2.5, color: "rgb(220,228,255)" });
  const fbLines = [];
  constellations.forEach((c) => c.lines.forEach(([a, b]) => fbLines.push([[c.stars[a].ra, c.stars[a].dec], [c.stars[b].ra, c.stars[b].dec]])));
  const fbNames = constellations.map((c) => {
    const ra = c.stars.reduce((a, s) => a + s.ra, 0) / c.stars.length;
    const dec = c.stars.reduce((a, s) => a + s.dec, 0) / c.stars.length;
    return { ra, dec, name: c.name, rank: 1 };
  });
  const fbConsts = constellations.map((c) => {
    const segs = c.lines.map(([a, b]) => [[c.stars[a].ra, c.stars[a].dec], [c.stars[b].ra, c.stars[b].dec]]);
    const ra = c.stars.reduce((a, s) => a + s.ra, 0) / c.stars.length;
    const dec = c.stars.reduce((a, s) => a + s.dec, 0) / c.stars.length;
    return { name: c.name, segs, ra, dec, rank: 1 };
  });

  window.NV = {
    constellations, brightStars, supernovae, hypernovae, unstableStars,
    planets, bortle, sites, events, stats, specColor, bv2rgb,
    loadCatalog, planetEquatorial, sunEquatorial,
    fallback: { stars: fbStars, lines: fbLines, names: fbNames, consts: fbConsts },
    cat: null,
  };
})();
