# Novaé — Publier sur l'App Store & Google Play (Capacitor)

Le projet est déjà **emballé avec Capacitor** : la même app web (`www/`) devient une
app **Android** (`android/`) et **iOS** (`ios/`). **Aucune réécriture** : tu modifies
`www/`, tu re-synchronises, tu recompiles.

- **appId** : `com.novae.astronomy`
- **appName** : `Novaé`
- **Node requis** : 20.9.0 (installé dans `~/.local/…`, déjà dans le PATH)

## Flux de travail (à chaque modif de l'app)
```bash
# 1) modifier l'app dans www/
# 2) copier les changements vers les projets natifs
npm run sync
# 3) ouvrir le projet natif
npm run android   # ouvre Android Studio
npm run ios       # ouvre Xcode
```

---

## 🤖 Android (faisable sur ce Mac)
1. Installer **Android Studio** (inclut le SDK) + un **JDK 17**.
2. Générer les icônes natives (optionnel, sources dans `assets/`) :
   ```bash
   npm install -D @capacitor/assets
   npx @capacitor/assets generate --android --iconBackgroundColor '#0a1024'
   npm run sync
   ```
3. `npm run android` → Android Studio s'ouvre.
4. **Build > Generate Signed Bundle / APK** → créer une clé de signature → produire un **.aab**.
5. **Google Play Console** (compte développeur **25 $ une fois**) → créer l'app → téléverser le `.aab` → remplir la fiche → publier.

## 🍎 iOS (le code est prêt ; il manque l'outillage)
> ⚠️ Ton macOS est **12 (Monterey)**. Pour **soumettre** à l'App Store il faut **Xcode 15+**, qui exige **macOS 13+ (Ventura)**. Deux options :

**Option A — mettre à jour macOS (Ventura/Sonoma), puis :**
```bash
sudo gem install cocoapods         # si CocoaPods absent
cd ios/App && pod install && cd ../..
npx @capacitor/assets generate --ios   # icônes (optionnel)
npm run ios                        # ouvre Xcode
```
Puis dans Xcode : choisir l'équipe (compte **Apple Developer 99 $/an**) → **Product > Archive** → **Distribute App** → App Store Connect.

**Option B — build cloud (sans Xcode local) :**
Utiliser **Codemagic** ou **Ionic Appflow** : ils compilent l'iOS à partir de ce dépôt
et l'envoient à App Store Connect. Idéal si tu restes sur Monterey.

---

## Bon à savoir
- L'app charge React, le moteur astro, le catalogue d'étoiles et les textures depuis
  des **CDN** → **connexion requise** au 1er lancement. Pour une app 100 % autonome
  (hors-ligne), on « vendorise » ces fichiers dans `www/` plus tard (sans réécriture).
- Capteurs : GPS + gyroscope fonctionnent dans la WebView Capacitor. Pour des perfs
  natives optimales on pourra ajouter des plugins (`@capacitor/geolocation`, `@capacitor/motion`).
- Mettre à jour l'app après publication = modifier `www/`, `npm run sync`, recompiler,
  incrémenter la version, re-soumettre.

## Structure
```
www/                 ← l'app (source unique)
android/             ← projet Android Studio (généré)
ios/                 ← projet Xcode (généré)
assets/icon.png      ← source icône 1024 (pour @capacitor/assets)
assets/splash.png    ← source splash 2732
capacitor.config.json
package.json         ← scripts: serve, sync, android, ios
```
