# ✦ NOVAÉ — Documentation des fonctionnalités

**Application d'astronomie en réalité augmentée · Version 2.0 · Juin 2026**
*Édition enrichie — suivi temps réel, satellites, planètes photoréalistes, frise cosmique*

> **À propos de ce document.** Il fusionne la vision produit complète de Novaé v2.0
> avec l'**état réel du prototype** (application web React, dossier `novae/`).
> Chaque fonctionnalité porte deux indications : sa **disponibilité** prévue
> (Gratuit / Premium) et son **état dans le prototype actuel**.

**Légende état prototype**
- ✅ **Implémenté** — fonctionne dans le prototype web actuel
- 🟡 **Partiel** — présent mais simplifié ou incomplet
- 📋 **Prévu** — spécifié, pas encore codé

---

## Table des matières
1. Présentation générale
2. Fonctionnalités
   - 2.1 Ciel en direct — suivi par mouvement du téléphone
   - 2.2 Carte du ciel interactive et fidèle
   - 2.3 Planètes photoréalistes en rotation
   - 2.4 Satellites & ISS en orbite (temps réel)
   - 2.5 Identification des étoiles & constellations (AR)
   - 2.6 Ciel profond : nébuleuses, galaxies & trous noirs
   - 2.7 Frise temporelle réversible — du présent au Big Bang
   - 2.8 Filtre Supernovæ, hypernovæ & étoiles instables
   - 2.9 Carte de pollution lumineuse
   - 2.10 Notifications & actualités spatiales
   - 2.11 Bibliothèque personnelle & captures
   - 2.12 Multilingue, mode nuit & accessibilité
3. Problèmes corrigés & fiabilité
4. Avantages concurrentiels
5. Pourquoi les étoiles vieillissent et explosent (pédagogie)
6. Spécifications techniques
7. Lancer le prototype
8. Structure du projet
9. État d'implémentation & limites
10. Roadmap

---

## 1. Présentation générale

Novaé est une application d'astronomie conçue pour offrir l'expérience d'observation
du ciel la plus réaliste et immersive possible. Inspirée des données Gaia, NASA, ESA,
Hubble et James Webb, elle combine précision scientifique et esthétique spatiale —
du curieux débutant à l'astronome amateur expérimenté.

**Nouveautés v2.0 :** le ciel suit les mouvements du téléphone en temps réel
(boussole + gyroscope), les planètes adoptent un rendu **photoréaliste** sur lequel
on zoome et qui tourne en direct, les satellites et l'ISS sont visibles en orbite,
une frise temporelle réversible remonte jusqu'au Big Bang, les trous noirs sont
représentés, un flux d'actualités relaie l'actualité spatiale, et une section
pédagogique explique pourquoi les étoiles explosent en supernova.

| Chiffre clé | Valeur (produit cible) | Prototype actuel |
|---|---|---|
| Étoiles cataloguées | > 1 milliard (Gaia DR3) | ~5 000 (Hipparcos mag ≤ 6) ✅ |
| Planètes suivies | 8 + Lune + Pluton | 8 + Pluton + Soleil + lunes ✅ |
| Satellites artificiels | 8 000+ (TLE / NORAD) | ISS · Hubble · Tiangong en direct ✅ |
| Supernovæ / hypernovæ | 100+ | 8 / 4 sélection ✅ |
| Trous noirs notables | 20+ | 5 (Sgr A*, M87*, Cygnus X-1…) ✅ |
| Profondeur temporelle | Présent → 13,8 Md d'années | Heure réglable + sim. solaire 🟡 |
| Constellations | 88 (IAU) | 88 (noms FR) ✅ |
| Objets du ciel profond | 13 000+ (NGC/IC) | 107 Messier ✅ |
| Langues | 50+ | FR (noms d'astres FR) 🟡 |

---

## 2. Fonctionnalités

### 2.1 Ciel en direct — suivi par mouvement du téléphone
**Disponibilité : Gratuit · Nouveau v2.0 — État : ✅ Implémenté**

Levez votre téléphone vers le ciel : la carte s'aligne sur la direction visée.
Quand vous tournez, vous balayez la voûte céleste dans le même sens (fenêtre AR).

**Sous-fonctionnalités**
- Direction calculée par **matrice de rotation complète** (où pointe le dos du téléphone) : l'azimut reste juste **quelle que soit l'inclinaison** — un seul calibrage suffit, plus besoin de recalibrer en bougeant. ✅
- Hauteur **basée sur la gravité** : lever le téléphone = regarder plus haut (plus d'inversion). ✅
- **Roulis** : incliner le téléphone fait pivoter le ciel avec lui. ✅
- **Suivi fluide 60 fps** : positions mises en cache (recalcul 1×/s) + canvas non réalloué à chaque image. ✅
- **Calibrage manuel** : glisser pour aligner sur un astre connu + bouton « Recalibrer ». ✅
- **Réticule central « pointez pour identifier »** : l'objet visé s'affiche, touchez pour sa fiche. ✅
- Capteur unique (absolu prioritaire) pour éviter les tremblements relatif/absolu. ✅
- Correction automatique de déclinaison magnétique (modèle WMM). 📋

| Paramètre | Valeur |
|---|---|
| Calcul | Matrice de rotation (alpha·beta·gamma) → direction dos appareil |
| Capteurs | Magnétomètre · gyroscope · accéléromètre (API DeviceOrientation) |
| Suivi | Boucle 60 fps, positions cachées (1×/s) |
| Calibrage | Manuel (glisser) + recalibrer |
| Pré-requis mobile | **HTTPS** obligatoire (serveur fourni) |

---

### 2.2 Carte du ciel interactive et fidèle
**Disponibilité : Gratuit — État : ✅ Implémenté**

Navigation sur une voûte céleste au rendu fidèle, en **projection stéréographique** :
le ciel est rond comme une sphère, sans déformation ovale aux bords.

**Sous-fonctionnalités**
- Catalogue réel chargé à l'exécution : ~5 000 étoiles (positions RA/Dec). ✅
- Couleurs d'étoiles fidèles à l'indice **B–V** (bleu O/B → rouge M). ✅
- Voie Lactée calculée sur le vrai plan galactique. ✅
- 88 constellations IAU, tracés et **noms en français**, activables. ✅
- Limite de magnitude dynamique selon le zoom. ✅
- Repli hors-ligne automatique (ciel réduit intégré). ✅
- Position calculée pour le lieu/heure exacts (horizon local). 📋
- Réfraction atmosphérique près de l'horizon, scintillation. 📋

| Paramètre | Valeur (cible) | Prototype |
|---|---|---|
| Catalogues | Hipparcos · Tycho-2 · Gaia DR3 | d3-celestial (Hipparcos mag ≤ 6) |
| Précision | < 0,1 arcseconde | positions catalogue réelles |
| Projection | — | Stéréographique (round, fluide) |

---

### 2.3 Planètes photoréalistes en rotation, vues de près
**Disponibilité : Gratuit · Enrichi v2.0 — État : ✅ Implémenté**

Les planètes ne sont plus des points : touchez-en une pour vous en approcher et la
voir tourner, avec de **vraies textures photographiques**.

**Sous-fonctionnalités**
- Clic sur une planète → vue rapprochée plein cadre, fiche détaillée. ✅
- **Textures réelles** (cartes équirectangulaires) plaquées par mapping sphérique. ✅
- Rotation de la surface en direct (Grande Tache Rouge, continents, calottes). ✅
- Saturne : anneaux avec divisions et inclinaison. ✅
- **Lunes en orbite** : Lune, Phobos/Déimos, galiléennes, Titan/Encelade, Triton, Charon. ✅
- Vue du système solaire de dessus, orbites animées, vitesse réglable. ✅
- Halo atmosphérique + ombrage solaire (terminateur). ✅
- Rétrogradations expliquées ; textures jusqu'à 8K. 📋

| Paramètre | Valeur (cible) | Prototype |
|---|---|---|
| Positions | VSOP87 haute précision | Orbites circulaires simplifiées |
| Corps | 8 planètes + Lune + Pluton + lunes | idem (lunes principales) |
| Textures | NASA/JPL jusqu'à 8K | threex.planets 1k–2k réelles |
| Rotation | Période & axe réels | durée du jour réelle (simplifiée) |

---

### 2.4 Satellites & ISS en orbite, en temps réel
**Disponibilité : Premium · Nouveau v2.0 — État : 📋 Prévu**

Voir les objets artificiels qui croisent au-dessus de vous. 8 000+ satellites suivis
via les éléments orbitaux publics (TLE/NORAD), propagés en direct.

**Sous-fonctionnalités (prévues)**
- ISS, Hubble, Starlink, satellites météo/GPS en direct.
- Trace au sol et trajectoire prévue ; alerte de passage visible.
- Superposition AR du point lumineux qui traverse le ciel.
- Filtres par catégorie ; fiche (altitude, vitesse, opérateur, lancement).

| Paramètre | Valeur |
|---|---|
| Source orbitale | TLE / NORAD (propagation SGP4) |
| Objets | 8 000+ (MAJ quotidienne) |
| Position ISS | NASA Horizons API · temps réel |
| Connexion | Réseau requis |

---

### 2.5 Identification des étoiles & constellations (AR)
**Disponibilité : Premium — État : 🟡 Partiel**

Pointez l'appareil vers le ciel pour identifier chaque objet.

**Sous-fonctionnalités**
- Clic sur une étoile → fiche (magnitude, type spectral, RA/Dec). ✅
- Mode mouvement (gyroscope/boussole) pour explorer. ✅
- Fiche complète (distance, température K), AR caméra. 📋
- Noms traditionnels dans 12 cultures, mythologie illustrée. 📋
- Lever/coucher, élongation, visibilité pour votre position. 📋

| Paramètre | Valeur |
|---|---|
| Étoiles identifiables | ~5 000 (prototype) / > 1 milliard (cible) |
| Constellations | 88 IAU ✅ |
| Cultures | 1 (FR) / 12 (cible) |

---

### 2.6 Ciel profond : nébuleuses, galaxies & trous noirs
**Disponibilité : Premium · Enrichi v2.0 — État : 📋 Prévu**

Explorer Messier, NGC et IC avec des visualisations Hubble/JWST. La v2.0 ajoute
une catégorie dédiée aux trous noirs.

**Sous-fonctionnalités (prévues)**
- Messier (110) et NGC/IC (13 000+).
- Nébuleuses en couleurs d'émission (Hα, OIII, SII) ; galaxies par morphologie.
- Trous noirs : disque d'accrétion, lentille gravitationnelle, anneau de photons.
- Sgr A* (centre galactique) et M87* (1ʳᵉ image, 2019) localisables.
- Trous noirs stellaires liés à un vestige de supernova (ex. Cygnus X-1).

| Paramètre | Valeur |
|---|---|
| Catalogue Messier / NGC-IC | 110 / 13 000+ |
| Trous noirs notables | 20+ (Sgr A*, M87*, Cygnus X-1…) |
| Filtres spectraux | Hα · OIII · SII · IR |

---

### 2.7 Frise temporelle réversible — du présent au Big Bang
**Disponibilité : Premium · Enrichi v2.0 — État : 🟡 Partiel**

Le curseur de temps fonctionne dans les deux sens : avancez pour voir le ciel futur,
reculez pour remonter le fil de l'Univers.

> **Note scientifique.** On ne peut pas « filmer » le Big Bang : pendant ses 380 000
> premières années l'Univers était opaque. La première lumière est le fond diffus
> cosmologique. Novaé présente donc l'histoire de l'Univers comme une **chronologie
> commentée**, pas comme une scène observable directement.

**Prototype**
- Simulation temporelle du **système solaire** (date + vitesse réglable, orbites). ✅
- Frise cosmique jusqu'au Big Bang (chronologie illustrée). 📋
- Précession des équinoxes, comparaison de deux dates/lieux, export calendrier. 📋

| Temps après le Big Bang | Étape | Ce que montre Novaé |
|---|---|---|
| 13,8 Md d'années | Univers actuel | Le ciel observé |
| ~9 Md d'années | Naissance du Soleil | Formation du Système solaire |
| ~1 Md d'années | Premières galaxies | Galaxies primitives (JWST) |
| ~100–400 M d'années | Premières étoiles | Population III |
| 380 000 ans | Première lumière | Fond diffus cosmologique |
| 3 min | Noyaux légers | Hydrogène & hélium |
| < 1 s | Soupe de particules | Schéma (non observable) |
| t = 0 | Big Bang | Origine de la chronologie |

---

### 2.8 Filtre Supernovæ, hypernovæ & étoiles instables
**Disponibilité : Premium · Exclusif Novaé — État : ✅ Implémenté**

Visualisez les étoiles qui ont explosé et surveillez celles au bord de l'explosion.
**Unique sur le marché.** (La section 5 explique le mécanisme.)

**Sous-fonctionnalités**
- ✕ violet sur les supernovæ historiques. ✅
- ✸ rouge sur les **hypernovæ / candidates** (Eta Carinae, WR 104…). ✅
- ⚠ orange sur les étoiles instables (Bételgeuse, Antarès, Rigel). ✅
- Fiche : type (Ia, II, Ib/c), année, vestige, constellation. ✅
- Animation de l'explosion ; mode « ciel du passé » ; alerte SN galactique. 📋

| Supernova historique | Type | Année | Vestige |
|---|---|---|---|
| SN 1054 — Crabe (Taureau) | II | 1054 | Nébuleuse + pulsar |
| SN 1006 (Loup) | Ia | 1006 | Vestige radio/X |
| SN 1572 — Tycho (Cassiopée) | Ia | 1572 | Reste en expansion |
| SN 1604 — Kepler (Ophiuchus) | Ia | 1604 | Reste de supernova |
| SN 1987A (Grand Nuage de Magellan) | Ib/c | 1987 | Étoile à neutrons probable |
| Cassiopée A | IIb | ~1680 | Vestige + étoile à neutrons |

| Paramètre | Valeur (cible) | Prototype |
|---|---|---|
| Supernovæ | 100+ | 8 emblématiques ✅ |
| Hypernovæ | — | 4 candidates ✅ |
| Étoiles instables | 28 | 4 ✅ |

---

### 2.9 Carte de pollution lumineuse
**Disponibilité : Gratuit (basique) · Premium (avancée) — État : ✅ Implémenté**

Indicateur Bortle avec aperçu du ciel attendu.

**Sous-fonctionnalités**
- Échelle de Bortle 1 → 9, nombre d'étoiles visibles estimé. ✅
- Aperçu visuel en direct (étoiles + Voie Lactée + halo au sol). ✅
- Suggestions de sites d'observation à proximité. ✅
- Carte mondiale satellite NOAA/VIIRS, météo temps réel, gêne lunaire. 📋

| Niveau | Description | Étoiles visibles |
|---|---|---|
| 1 | Ciel noir parfait | > 10 000 |
| 2–3 | Ciel rural | 4 000–10 000 |
| 4–5 | Périphérie rurale | 1 500–4 000 |
| 6–7 | Banlieue | 500–1 500 |
| 8–9 | Centre-ville | < 500 |

---

### 2.10 Notifications & actualités spatiales
**Disponibilité : Premium · Nouveau v2.0 — État : 🟡 Partiel**

**Sous-fonctionnalités**
- Liste d'**événements** (éclipses, pluies de météores, conjonctions, aurores) avec compte à rebours J−n et filtres par type. ✅
- Fil d'actualité agrégé (NASA/ESA/observatoires) en temps réel. 📋
- Passages ISS/satellites depuis votre position ; aurores selon indice Kp. 📋
- Rappels J−7/J−1/J−0, intégration calendrier, rapport mensuel. 📋

| Paramètre | Valeur |
|---|---|
| Sources (cible) | NASA · ESA · NOAA SWPC · observatoires |
| Préavis | 30 jours |
| Calcul passages | Local via GPS |

---

### 2.11 Bibliothèque personnelle & captures
**Disponibilité : Gratuit — État : 📋 Prévu**

Journal d'observation : capture en un bouton, métadonnées auto (date, GPS, objets,
Bortle, phase lunaire), albums automatiques, export 4K, statistiques, synchronisation
iOS · Android · Web.

---

### 2.12 Multilingue, mode nuit & accessibilité
**Disponibilité : Gratuit — État : 🟡 Partiel**

- **Mode nuit rouge** intégral pour préserver la vision nocturne. ✅
- Noms de constellations en français (depuis le catalogue). ✅
- Calques activables (constellations, étiquettes, planètes, Voie Lactée). ✅
- 50+ langues, RTL (arabe/hébreu/persan), narrations audio (12 cultures). 📋
- Mode daltonien, texte 80–160 %, VoiceOver/TalkBack, WCAG 2.1 AA. 📋

---

## 3. Problèmes corrigés & fiabilité

| Problème (apps du marché / prototype) | Réponse de Novaé | État |
|---|---|---|
| Déformation « ovale » du ciel | Projection stéréographique sphérique | ✅ |
| Le ciel ne suit pas le téléphone / écran qui « glisse » | Suivi 60 fps lissé + positions en cache | ✅ |
| Sens inversé en mouvement (lever = descendre) | Hauteur basée sur la gravité | ✅ |
| Il faut recalibrer dès qu'on bouge/incline | Azimut par matrice de rotation (dos appareil) → stable à toute inclinaison | ✅ |
| Boussole qui tremble / tourne toute seule | Un seul capteur utilisé (absolu prioritaire) | ✅ |
| Calibrage boussole décalé | Réglage manuel par glissement + « Recalibrer » | ✅ |
| Saccades (canvas réalloué 60×/s) | Canvas redimensionné seulement si la taille change | ✅ |
| Compte à rebours des événements figé | Vraie date du jour + libellé « Passé » | ✅ |
| Étiquettes impossibles à désactiver | Tous les calques avec interrupteur clair | ✅ |
| Hémisphère sud bâclé | Nord et sud traités à égalité | ✅ |
| Publicités intrusives | Aucune publicité, même en base | ✅ |
| Re-rendu à chaque frame (perf) | Horloge écrite hors React ; redessin à la demande | ✅ |
| Planètes externes coupées | Échelle radiale recalculée pour tout afficher | ✅ |
| Lune/planètes au mauvais endroit | VSOP87 + précession/nutation, tests éphémérides | 🟡 (simplifié) |
| Mauvaise langue après réinstallation | Préférence indépendante de la locale | 📋 |
| Pas de synchronisation multi-appareils | Réglages/biblio synchronisés | 📋 |

---

## 4. Avantages concurrentiels

Comparatif direct (✓ présent · ✗ absent) :

| Fonctionnalité | Stellarium | Star Walk 2 | SkySafari | Novaé |
|---|---|---|---|---|
| Filtre supernovæ & instables | ✗ | ✗ | ✗ | ✓ **Exclusif** |
| Satellites & ISS temps réel | Partiel | ✗ | Partiel | ✓ 8 000+ (prévu) |
| Suivi par mouvement | Partiel | ✓ | ✓ | ✓ Stabilisé |
| Planètes photoréalistes en rotation | Basique | Stylisé | ✓ | ✓ NASA/JPL |
| Frise réversible jusqu'au Big Bang | ✗ | Limitée | ✗ | ✓ 13,8 Md a. (prévu) |
| Trous noirs représentés | ✗ | ✗ | Basique | ✓ (prévu) |
| Hémisphère sud complet | Partiel | ✗ | ✓ | ✓ |
| Pollution lumineuse intégrée | ✗ | ✗ | Panneau | ✓ Intégrée |
| Sans publicités (base) | ✓ | ✗ | ✓ | ✓ |
| iOS & Android (web) | ✓ | ✓ | ✓ | ✓ |

---

## 5. Pourquoi les étoiles vieillissent et explosent

*Contenu pédagogique associé au filtre Supernovæ. Résumé en langage clair du
consensus scientifique sur la mort des étoiles massives.*

### 5.1 Une étoile, un équilibre
Une étoile vit en équilibre entre la **gravité** (qui comprime) et la **pression de
la fusion nucléaire** (qui pousse vers l'extérieur). Tant que le cœur fusionne
l'hydrogène en hélium, l'étoile reste stable — et brille.

### 5.2 De l'hydrogène au fer
Les étoiles massives (≥ 8 masses solaires) brûlent vite et chaud. À l'épuisement
d'un combustible, le cœur se contracte, chauffe et fusionne l'élément suivant :
hélium → carbone → néon → oxygène → silicium. Chaque phase est plus brève (le
silicium ne dure que quelques jours). L'étoile prend une structure « en pelure
d'oignon ». **La fusion s'arrête au fer** : au-delà, fusionner consomme de l'énergie
au lieu d'en libérer. Le cœur n'a plus de carburant.

### 5.3 L'effondrement, en moins d'une seconde
Le cœur de fer n'est plus retenu que par la pression de dégénérescence des électrons.
Au-delà de la **limite de Chandrasekhar (~1,4 M☉)**, elle cède. Capture d'électrons
et photodissociation accélèrent la chute : le cœur passe de quelques milliers de km à
une dizaine de km en une fraction de seconde.

### 5.4 Le rebond et l'explosion
À la densité d'un noyau atomique, la pression des neutrons stoppe la chute : le cœur
rebondit et lance une onde de choc. L'énergie colossale, évacuée en **neutrinos**, en
réabsorbe une fraction qui relance l'onde (aidée par la convection). Les couches
externes sont disloquées : **c'est la supernova**, capable de briller plus que toute
sa galaxie. Les neutrinos de SN 1987A (1987) ont confirmé ce scénario.

### 5.5 Ce qu'il reste
Au centre : une **étoile à neutrons** (~8–25 M☉, parfois un pulsar) ou un **trou
noir** (étoiles plus massives). Les éléments forgés et dispersés enrichissent le gaz
interstellaire d'où naissent étoiles, planètes — et la vie. *L'oxygène que nous
respirons, le fer de notre sang viennent d'étoiles disparues* : c'est ce que le mode
« ciel du passé » veut faire ressentir.

### 5.6 Le cas des supernovæ de type Ia
Une **naine blanche** accumule de la matière jusqu'à la limite de Chandrasekhar, puis
est détruite par une explosion thermonucléaire — sans étoile à neutrons. Leur
luminosité régulière en fait des « chandelles standard » pour mesurer les distances.

**Sources :** Burrows & Thompson ; Janka et al. ; Heger, Woosley & Weaver (2002) ;
Ott ; Baade & Zwicky (1934) ; Colgate & White (1966) ; neutrinos de SN 1987A ;
première image d'un trou noir (M87*, EHT, 2019).

---

## 6. Spécifications techniques

### 6.1 Sources de données

| Source | Usage | Dans le prototype |
|---|---|---|
| Gaia DR3 | Catalogue principal (1,8 Md étoiles) | — (cible) |
| Hipparcos / Tycho-2 | Étoiles brillantes (offline) | via d3-celestial (~5 000) ✅ |
| d3-celestial (GeoJSON) | Étoiles + 88 constellations FR | ✅ chargé via jsDelivr |
| threex.planets | Textures planètes équirectangulaires | ✅ chargé via jsDelivr |
| VSOP87 | Éphémérides planétaires | 🟡 version simplifiée |
| SOFA | Transformations de coordonnées | 📋 |
| Hubble / JWST | Images nébuleuses & galaxies | 📋 |
| TLE / NORAD (SGP4) | Orbites satellites | 📋 |
| NASA Horizons API | Position ISS temps réel | 📋 |
| NOAA / VIIRS | Pollution lumineuse satellite | 📋 (Bortle simulé ✅) |
| NOAA SWPC | Activité solaire / indice Kp | 📋 |

### 6.2 Précision des calculs (cible)

| Calcul | Méthode | Précision |
|---|---|---|
| Positions stellaires | Gaia DR3 + mouvement propre | < 0,1 arcseconde |
| Éphémérides planétaires | VSOP87 | < 1 arcsec sur 2000 ans |
| Précession / nutation | IAU 2006/2000B | milliarcseconde |
| Satellites | SGP4 (TLE) | quelques km |
| Réfraction | Modèle Bennett (1982) | < 0,1 arcminute |

### 6.3 Stack du prototype

| Élément | Détail |
|---|---|
| Framework | React 18 (UMD via CDN), `React.createElement` (sans build) |
| Rendu | Canvas 2D ; projection stéréographique (ciel) |
| Mouvement | API DeviceOrientation |
| Serveurs locaux | Ruby WEBrick — HTTP (8000) et HTTPS (8443) |

### 6.4 Plateformes & hors-ligne

| Plateforme | Minimum | Hors-ligne |
|---|---|---|
| Web | Chrome 108+ · Safari 16+ · Firefox 110+ | Ciel réduit intégré ✅ |
| iOS (cible) | iOS 16 — iPhone 11+ | carte + capteurs |
| Android (cible) | Android 11 (API 30) | carte + capteurs |

Réseau requis (prototype) : 1ᵉʳ chargement (React, catalogue, textures).

---

## 7. Lancer le prototype

**Sur le Mac :** ouvrir `index.html`, ou double-cliquer `start.command`
→ http://localhost:8000

**Sur téléphone (mode mouvement) :** double-cliquer `start-https.command`, puis
ouvrir `https://<ip-du-mac>:8443` (même Wi-Fi, accepter le certificat auto-signé).

---

## 8. Structure du projet

```
index.html            point d'entrée + scripts CDN
styles.css            thème spatial + mode nuit
js/data.js            catalogue, planètes, supernovæ/hypernovæ, Bortle, événements, math
js/planetRender.js    rendu des planètes (procédural + textures réelles)
js/SkyMap.js          carte du ciel (projection, zoom, mouvement, filtres)
js/PlanetTracker.js   onglet planètes (orbites, lunes, gros plan animé)
js/LightPollution.js  échelle de Bortle
js/Events.js          événements & alertes
js/App.js             coquille (onglets, en-tête, mode nuit)
js/main.js            montage React
serve_https.rb        serveur HTTPS (mode mouvement mobile)
```

---

## 9. État d'implémentation & limites

**Implémenté ✅ :** carte du ciel sphérique, catalogue réel (~5 000 étoiles, 88
constellations FR), zoom fluide (molette/pincement/clic), mode mouvement,
planètes texturées + lunes + gros plan animé, filtre supernovæ/hypernovæ/instables,
pollution lumineuse (Bortle), événements, mode nuit.

**Limites honnêtes :**
- Textures planètes **1k–2k** (montée 4K possible) ; repli procédural au chargement.
- Positions planétaires en **orbites circulaires simplifiées** (mouvement crédible, non identique au ciel réel du jour).
- Carte du ciel sans rotation lieu/heure (pas d'horizon local pour l'instant).
- Mode mouvement = correspondance orientation→ciel **approximative** (pas de calcul azimut/altitude GPS+heure complet).
- Supernovæ/hypernovæ : sélection emblématique, pas un catalogue exhaustif.

**Non implémenté 📋 :** satellites/ISS, ciel profond & trous noirs, frise cosmique
jusqu'au Big Bang, fil d'actualités temps réel, bibliothèque personnelle, multilingue
complet & accessibilité avancée.

---

## 10. Roadmap

**v2.0 — Édition immersive (état actuel du prototype)**
- ✅ Ciel sphérique + catalogue réel + zoom fluide
- ✅ Planètes photoréalistes cliquables + lunes
- ✅ Filtre supernovæ / hypernovæ / étoiles instables
- ✅ Mode mouvement (capteurs) + mode nuit + pollution lumineuse
- 🟡 Suivi mouvement (fusion/calibration à compléter)

**v2.5 — Profondeur**
- Satellites & ISS temps réel (TLE/SGP4), superposition AR
- Frise cosmique jusqu'au Big Bang ; trous noirs (Sgr A*, M87*)
- Catalogue NGC/IC + données JWST ; textures 4K ; horizon local (lieu/heure)

**v3.0 — Communauté**
- Fil d'actualités & notifications temps réel ; bibliothèque personnelle synchronisée
- Multilingue 50+ & accessibilité WCAG ; narrations audio
- Sessions d'observation partagées ; tableau de bord web

---

*NOVAÉ — Documentation des fonctionnalités · Version 2.0 · Juin 2026*
