# TwitchPlanner

Application de planification de streams pour les streamers Twitch. Créez et gérez vos plannings de stream hebdomadaires avec intégration IGDB pour rechercher les jeux.

## Prérequis

- **Node.js** v18+ 
- **npm** v10+
- **MySQL** 8.0+
- **Angular CLI** v21+ (installé globalement)

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/FireWxt/StreamPlanner.git
cd TwitchPlanner
```

### 2. Configurer la base de données MySQL

Exécutez le script SQL pour créer la base de données et les tables :

```bash
mysql -u root -p < bdd.sql
```

Ou copiez-collez le contenu de `bdd.sql` dans MySQL Workbench / phpMyAdmin.



### 3. Installer les dépendances du backend

```bash
cd backend
npm install
```

### 4. Installer les dépendances du frontend

```bash
cd ../Frontend
npm install
```

## Lancement

### Démarrer le backend

```bash
cd backend
node index.js
```

Le serveur API démarre sur `http://localhost:3000`

### Démarrer le frontend

Dans un autre terminal :

```bash
cd Frontend
npm start
```

L'application Angular démarre sur `http://localhost:4200`

## Structure du projet

```
TwitchPlanner/
├── backend/                 # API Express.js
│   ├── api/                 # Routes API
│   │   ├── auth.js          # Authentification (login/register)
│   │   ├── planning.js      # CRUD plannings & événements
│   │   ├── profile.js       # Profil utilisateur
│   │   └── igdbApi.js       # Recherche jeux IGDB
│   ├── dataBase/
│   │   └── db.js            # Connexion MySQL
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── nonce.js
│   │   └── token.js
│   ├── utils/
│   │   └── sanitize.js      # Protection XSS
│   └── index.js             # Point d'entrée serveur
│
├── Frontend/                # Application Angular 21
│   └── src/
│       └── app/
│           ├── component/
│           │   ├── auth/     # Login & Register
│           │   └── planning/ # Vue planning principale
│           └── services/     # Services HTTP
│
└── bdd.sql                  # Script création BDD
```

## Fonctionnalités

- **Authentification** : Inscription et connexion sécurisées
- **Plannings hebdomadaires** : Créez des plannings du lundi au dimanche
- **Événements de stream** : Ajoutez, modifiez et supprimez des créneaux
- **Recherche IGDB** : Trouvez les jeux avec leurs couvertures
- **Téléchargement** : Exportez votre planning en image PNG
- **Protection XSS** : Sanitization des entrées utilisateur

## Technologies

**Backend :**
- Express.js 5
- MySQL 8
- bcrypt (hash passwords)
- IGDB API (via Twitch OAuth)

**Frontend :**
- Angular 21
- TypeScript
- SCSS
- html2canvas

## Licence

ISC
