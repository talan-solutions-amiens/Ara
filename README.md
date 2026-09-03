# Ara

Ara est une plateforme web basée sur le référentiel général d'amélioration de l'accessibilité (RGAA) qui permet aux auditeurs et auditrices de :

- réaliser leurs audits d'accessibilité numérique en ligne,
- générer automatiquement les rapports de ces audits ainsi que les déclarations d'accessibilité.

> [!WARNING]
> Ara n’audite pas automatiquement votre site.

## Organisation du code

Ce projet est organisé en _monorepo_ (voir [Monorepo - Wikipedia](https://en.wikipedia.org/wiki/Monorepo)).\
Les espaces de travail (_workspaces_) sont :

- `confiture-rest-api` (_backend_) ([Documentation du backend](./confiture-rest-api/README.md))
- `confiture-web-app` (_frontend_) ([Documentation du frontend](./confiture-web-app/README.md))

## Prérequis

- Environnement d'exécution JavaScript (_JavaScript runtime environment_) :\
  [Node.js](https://nodejs.org) version `22.14.0`
- Gestionnaire de paquets (_Package manager_) :\
  [Yarn 4 (Modern)](https://yarnpkg.com/) version `4.9.2`
- Conteneurisation :\
  [Docker](https://www.docker.com)

> [!TIP]
> Avec [DDEV](https://ddev.com), aucun de ces prérequis n’est nécessaire sur la machine hôte :
> voir [Développement avec DDEV](#développement-avec-ddev).

## Développement avec DDEV

[DDEV](https://ddev.com) (version 1.24 ou supérieure) fournit un environnement complet et
reproductible : Node.js, Yarn, PostgreSQL et un **client mail local**
([Mailpit](https://mailpit.axllent.org/)), sans rien installer d’autre que DDEV et Docker.
C’est une alternative aux sections [Installation](#installation) et
[Développement](#développement) ci-dessous.

```sh
ddev start
```

Cette unique commande installe les dépendances, génère les fichiers RGAA et les types de l’API,
puis joue les migrations Prisma. Les serveurs backend et frontend sont lancés automatiquement.

### Adresses

| Service                          | Adresse                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| Application                      | <https://ara.ddev.site>                                                |
| Documentation de l’API (Swagger) | <https://ara.ddev.site/swagger>                                        |
| Boîte mail locale (Mailpit)      | `ddev mailpit` ou <https://ara.ddev.site:8026>                         |
| Magasin d’objets (Garage)        | `ddev garage status` — service interne, jamais joint par le navigateur |

Tous les e-mails envoyés par l’application (vérification de compte, réinitialisation de mot de
passe, changement d’adresse e-mail) sont interceptés par Mailpit : **aucun compte Ethereal n’est
nécessaire**, et aucun e-mail ne part vers l’extérieur.

### Commandes utiles

| Commande                      | Effet                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `ddev logs -f`                | Suit les logs du backend et du frontend                                            |
| `ddev dev`                    | Relance les 2 serveurs au premier plan (logs plus lisibles, `Ctrl+C` pour arrêter) |
| `ddev dev-restart`            | Repasse les 2 serveurs en tâche de fond                                            |
| `ddev dev-stop`               | Arrête les 2 serveurs                                                              |
| `ddev migrate`                | Joue les migrations Prisma (`prisma migrate dev`)                                  |
| `ddev prisma studio`          | Ouvre Prisma Studio                                                                |
| `ddev psql`                   | Ouvre un shell PostgreSQL                                                          |
| `ddev garage bucket info ara` | Inspecte le magasin d’objets (taille, nombre d’objets)                             |
| `ddev exec yarn …`            | Exécute une commande Yarn dans le conteneur                                        |
| `ddev stop` / `ddev delete`   | Arrête / supprime l’environnement                                                  |

Les tests Cypress se lancent depuis la machine hôte (`yarn tests:run`) : le port `3000` est exposé
et les endpoints de debug utilisés par les tests sont activés.

> [!IMPORTANT]
> Une fois DDEV utilisé, ne plus lancer `yarn install` sur la machine hôte : `node_modules` est
> partagé avec le conteneur et certaines dépendances contiennent des binaires natifs (`bcrypt`,
> `sharp`, moteurs Prisma). Utiliser `ddev exec yarn install` à la place.

> [!NOTE]
> **Limite connue.** Seules les variables `GRIST_*` sont renseignées avec des valeurs factices dans
> `.ddev/config.yaml` : le **formulaire de retour d’expérience** ne fonctionne donc pas en local.
> Pour l’activer, renseigner les vraies valeurs dans `confiture-rest-api/.env` : ce fichier reste
> pris en compte et ne rentre pas en conflit avec la configuration DDEV.

## Installation

Une seule commande pour :

- installer toutes les dépendances : backend + frontend
- générer les fichiers requis du RGAA (critères et tests et méthodologies)
- générer les types de l’API

```sh
yarn install
```

> [!IMPORTANT]
> Il faut aussi suivre [les étapes d’installation du backend](./confiture-rest-api/README.md#installation-du-backend).

## Développement

Une seule commande pour lancer les 2 serveurs backend et frontend en local en parallèle :

```sh
yarn dev
```

- le serveur backend (NodeJS)
- le [serveur frontend sur le port 3000](http://localhost:3000) (ou 3001, 3002, si port occupé)

> [!NOTE]
> Les logs du backend et du frontend sont alors affichés dans la même session shell.

> [!TIP]
> Appuyer sur la touche **"o"** (_open_) pour ouvrir Ara en local dans un navigateur.

## ESLint, l’utilitaire de _lint_ et de formatage du code

**ESLint** est utilisé à la fois pour l’analyse statique du code et le formatage stylistique (indentation, etc.).
Pour les fichiers non pris en charge par ESLint (CSS, HTML, Markdown, etc), ESLint utilise **Prettier** en tant qu’outil de formatage externe.
Nous utilisons [la configuration ESLint d’Anthony Fu](https://github.com/antfu/eslint-config) comme base.
Voir aussi la configuration de ce projet : [eslint.config.mjs](https://github.com/DISIC/Ara/blob/main/eslint.config.mjs)

Une vue de l’ensemble des règles de _lint_ est disponible en exécutant à la racine du projet :

```sh
yarn dlx @eslint/config-inspector
```

On peut _linter_ l’ensemble du projet en exécutant, à la racine du projet :

```sh
yarn lint
```

On peut _linter_ et corriger les erreurs corrigeables automatiquement avec :

```sh
yarn lint --fix
```

## Stylelint, le linter pour les styles

**Stylelint** est utilisé pour linter le code CSS présent dans les fichiers `.css` et `.vue` du projet frontend.

On peut _linter_ l’ensemble du projet en exécutant, à la racine du projet :

```sh
yarn lint:styles
```

On peut _linter_ et corriger les erreurs corrigeables automatiquement avec :

```sh
yarn lint:styles --fix
```

## Éditeur de code VSCodium / VS Code

Sont disponibles sur ce projet :

- un paramètrage par défaut qui améliore l’expérience de développement :
  - _lint_ et formatage automatique à la sauvegarde des fichiers ;
  - on ne tient pas compte des règles stylistiques dans l'IDE, mais on continue à les corriger automatiquement.
- des tâches pour _linter_ l’ensemble du projet (voir [Integrate with External Tools via Tasks](https://code.visualstudio.com/docs/debugtest/tasks)) :
  - "Lint entire project"
  - "Lint + fix entire project"
  - "TypeScript: show all errors" pour les erreurs TypeScript non relevées par ESLint

## Déploiement

- La branche principale `main` correspond à l’environnement de production.
- Les branches de pull request (PR) correspondent à l’environnement de développement.

### Environnement de développement

Le frontend est automatiquement déployé sur Scalingo :

- La branche principale `main` est déployée sur [https://ara-dev.osc-secnum-fr1.scalingo.io/](https://ara-dev.osc-secnum-fr1.scalingo.io/).
- Les branches des PR sont déployées sur [https://ara-dev-prXXXX.osc-secnum-fr1.scalingo.io/](https://ara-dev-prXXXX.osc-secnum-fr1.scalingo.io/) (où XXX l’identifiant de la PR).

Chaque déploiement a sa propre base de données.

### Environnement de production

L’application est automatiquement déployée en production avec Scalingo. Les
migrations de base de donnée sont lancées automatiquement si besoin.
