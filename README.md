# Novaé — prototype web

Prototype d'application d'astronomie basé sur la documentation des fonctionnalités Novaé.
Construit en **React** (chargé via CDN, sans bundler ni installation).

## Lancer

**Le plus simple :** double-cliquez sur `index.html` (s'ouvre dans le navigateur).
Une connexion internet est requise au 1er chargement pour récupérer React depuis le CDN.

**Avec un serveur local** (recommandé, évite toute restriction `file://`) :

```bash
# double-clic
open start.command
# ou en ligne de commande
ruby -run -e httpd . -p 8000   # puis http://localhost:8000
```

## Fonctionnalités implémentées

| Onglet | Contenu |
|--------|---------|
| 🌌 **Ciel** | Carte du ciel sur canvas : glisser/zoomer, 6 constellations + étoiles brillantes, Voie Lactée, grille équatoriale, étiquettes, fiche au clic. **Filtre Supernovæ** (✕ violet) et étoiles instables (⚠ orange). |
| 🪐 **Planètes** | Système solaire vu de dessus, orbites animées, vitesse de simulation ×1 → ×31 M, date simulée, fiche planète au clic. |
| 💡 **Pollution** | Échelle de Bortle 1–9 avec aperçu du ciel en direct (nombre d'étoiles visibles, Voie Lactée), conditions idéales, sites suggérés. |
| 🔔 **Événements** | Éclipses, pluies de météores, conjonctions, aurores… avec compte à rebours (J−n) et filtres par type. |

Bonus : **mode nuit rouge**, bandeau de statistiques, navigation mobile, responsive.

## Structure

```
index.html        # point d'entrée + chargement React/CDN
styles.css        # thème spatial sombre + mode nuit
js/data.js        # catalogue étoiles/planètes/supernovæ/Bortle/événements
js/SkyMap.js      # carte du ciel (canvas)
js/PlanetTracker.js
js/LightPollution.js
js/Events.js
js/App.js         # coquille : onglets, en-tête, mode nuit
js/main.js        # montage React
```

Les composants utilisent `React.createElement` (pas de JSX) afin de fonctionner
sans étape de compilation. Les données sont illustratives / simplifiées.
