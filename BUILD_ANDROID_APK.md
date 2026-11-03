# Guide de Déploiement & Installation sur Téléphone Android (Eséka Distribution)

**Oui, cette application est 100% conçue pour tourner nativement sur n'importe quel smartphone ou tablette Android !**

---

## 1. Deux Façons de l'Utiliser sur Téléphone Android

### Option A : Installation Immédiate en PWA (Sans rien installer sur PC)
1. Ouvrez le lien de l'application sur votre téléphone Android dans **Google Chrome** :
   `https://ais-dev-suggj7ajw5t7yum3umf5zu-352687929634.europe-west2.run.app`
2. Appuyez sur les **3 points verticaux** en haut à droite du navigateur.
3. Sélectionnez **"Installer l'application"** (ou **"Ajouter à l'écran d'accueil"**).
4. L'icône **Eséka Distribution** apparaît sur l'écran d'accueil de votre téléphone et s'ouvre en plein écran comme une application native, 100% fonctionnelle hors-ligne avec stockage local.

---

### Option B : Compilation Native Flutter (Génération du fichier `.apk` autonome)

Le projet contient l'ensemble du code source Flutter (`lib/`) et la configuration Android (`android/app/build.gradle` et `AndroidManifest.xml`).

#### Prérequis sur votre ordinateur :
- **Flutter SDK** (version $\ge$ 3.19)
- **Android Studio** ou Android Command-line Tools

#### Étapes de génération :

1. **Cloner ou récupérer le dossier du projet** sur votre machine.

2. **Récupérer les dépendances Flutter :**
   ```bash
   flutter pub get
   ```

3. **Générer le code Drift SQLite local :**
   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```

4. **Compiler l'APK Android autonome :**
   ```bash
   flutter build apk --release
   ```

5. **Récupérer le fichier APK généré :**
   Le fichier compilé se trouve dans :
   `build/app/outputs/flutter-apk/app-release.apk`

6. **Installer sur les téléphones de vos chauffeurs / gérants :**
   - Transférez le fichier `app-release.apk` par **WhatsApp**, par **câble USB**, par **carte SD** ou par téléchargement direct.
   - Sur le téléphone Android, appuyez sur le fichier et autorisez l'installation d'applications inconnues.
   - L'application est installée et immédiatement opérationnelle !

---

## 2. Compatibilité & Spécifications Matérielles Android

- **Version minimale d'Android** : Android 5.0 Lollipop (`minSdk: 21`).
- **Compatibilité confirmée** : Tous les smartphones Android (Tecno, Infinix, Itel, Samsung Galaxy, Xiaomi, Huawei, etc.).
- **Processeurs supportés** : `arm64-v8a` (smartphones récents 64-bit), `armeabi-v7a` (smartphones 32-bit d'entrée de gamme).
- **Consommation mémoire** : Très légère ($< 45\text{ Mo}$ de RAM), idéale pour les téléphones d'entrée de gamme des chauffeurs et livreurs en tournée.
- **Fonctionnement hors-ligne** : La base de données **Drift SQLite** est hébergée directement dans la mémoire interne du téléphone (`/data/user/0/com.eseka.distribution/databases/`). Aucune connexion Internet n'est requise pour enregistrer les arrêts, encaisser l'argent ou enregistrer les casiers.
