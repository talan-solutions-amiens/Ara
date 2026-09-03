# Customisations Talan

Ce fichier recense **tout ce que ce fork ajoute ou modifie par rapport au
projet parent [DISIC/Ara](https://github.com/DISIC/Ara)**, pour ne pas
perdre le fil à mesure qu'on ajoute des choses et pour savoir à quoi faire
attention lors d'un prochain `git pull` / merge depuis l'upstream.

Le remote `disic` pointe vers `https://github.com/DISIC/Ara.git`. Pour
resynchroniser :

```bash
git fetch disic main
git checkout -b sync/disic-upstream main
git merge disic/main
# vérifier les conflits, builder, tester, puis merger dans main
```

Une entrée par customisation, dans l'ordre chronologique (la plus récente
en premier). Voir le template en bas de fichier.

---

## Déploiement Upsun (infra)

**Date** : mise en place initiale du fork (avant le suivi de ce fichier)

**Pourquoi** : le projet upstream déploie sur Scalingo ; nous déployons sur
Upsun.

**Fichiers propres au fork** :

- `.upsun/config.yaml` — définition des apps `api`/`frontend`, hooks de
  build/déploiement, routes, variables d'environnement
- `Dockerfile.api`, `Dockerfile.app` — **supprimés** lors du merge DISIC du
  2026-09-02 (DISIC les a retirés en migrant vers Scalingo). Sans impact :
  Upsun ne les utilisait pas (type `nodejs:22`, pas de build Docker custom).

**Risque de conflit au prochain pull** : faible. ll s'agit de fichiers
propres au fork (`.upsun/`), absents chez DISIC — un merge ne peut pas
entrer en conflit dessus. Rester vigilant si DISIC modifie sa propre
structure de déploiement de façon à toucher des fichiers partagés
(`package.json`, scripts racine).

---

## Mot de passe par rapport + restriction IP admin

**Date** : 2026-09-02

**Branche** : `feature/report-password-ip-restriction`

**Pourquoi** : le Basic Auth d'Upsun (`http_access`) protégeait tout
l'environnement, mais entrait en conflit avec le header `Authorization`
utilisé par le login applicatif (JWT Bearer) — impossible de rester
connecté avec le Basic Auth actif. Objectif : séparer les deux besoins

- accès admin/édition réservé à l'IP fixe de l'équipe
- accès aux rapports protégé par un mot de passe par rapport, sans
  dépendre du header `Authorization`

**Fonctionnalités ajoutées** :

1. **Mot de passe par rapport** — chaque audit reçoit un mot de passe
   aléatoire lisible (ex: `renard-tulipe-42`) à la création, régénérable
   depuis "Paramètres de l'audit". Protège `/rapport`, la déclaration et
   l'export CSV via un cookie signé (HMAC, scopé au `consultUniqueId`),
   indépendant du header `Authorization`.
2. **Restriction IP admin** — nouveau guard `IpAllowlistGuard` (décorateur
   `@IpRestricted()`) appliqué aux routes `/api/audits*` (création
   incluse), `/api/auth*`, `/api/profile*`. Contrôlé par la variable
   d'env `ADMIN_IP_ALLOWLIST` (liste d'IP séparées par des virgules ;
   vide = pas de restriction, pratique en local/dev).

**Fichiers ajoutés (propres au fork, aucun risque de conflit)** :

- `confiture-rest-api/src/audits/report-password.util.ts`
- `confiture-rest-api/src/audits/report-access.guard.ts`
- `confiture-rest-api/src/audits/dto/requests/unlock-report.dto.ts`
- `confiture-rest-api/src/auth/ip-allowlist.guard.ts`
- `confiture-rest-api/src/auth/ip-restricted.decorator.ts`
- `confiture-web-app/src/components/audit/ReportPasswordManager.vue`
- `confiture-web-app/src/pages/report/ReportPasswordPage.vue`
- `confiture-rest-api/prisma/migrations/20260902180000_add_report_password/`

**Fichiers existants modifiés (risque de conflit si DISIC touche les
mêmes zones)** :

- `confiture-rest-api/prisma/schema.prisma` — ajout du champ
  `Audit.reportPassword`
- `confiture-rest-api/src/audits/audit.service.ts` — génération du mot de
  passe à la création/duplication + méthodes
  `regenerateReportPassword`/`getReportPasswordByConsultId`
- `confiture-rest-api/src/audits/audits.controller.ts` — décorateur
  `@IpRestricted()` + endpoint `PUT /:uniqueId/report-password`
- `confiture-rest-api/src/audits/reports.controller.ts` — guard
  `ReportAccessGuard` + endpoints `lock-status`/`unlock`
- `confiture-rest-api/src/audits/prisma-selects.ts`,
  `dto/entities/audit.dto.ts` — exposition de `reportPassword`
- `confiture-rest-api/src/auth/auth.controller.ts`,
  `create-account.controller.ts`, `password-reset.controller.ts`,
  `update-email.controller.ts`,
  `confiture-rest-api/src/profile/profile.controller.ts` — décorateur
  `@IpRestricted()`
- `confiture-rest-api/src/main.ts` — `trust proxy` + `cookie-parser`
- `confiture-rest-api/src/config-validation-schema.ts` — variable
  `ADMIN_IP_ALLOWLIST`
- `confiture-web-app/src/router.ts` — garde de navigation
  `reportAccessCheck` + route `report-password`
- `confiture-web-app/src/components/audit/AuditSettingsForm.vue`,
  `pages/audit/AuditSettingsPage.vue` — intégration de
  `ReportPasswordManager`
- `confiture-web-app/src/types/types.ts` — champ `reportPassword`
- `.upsun/config.yaml` — documentation de `ADMIN_IP_ALLOWLIST`

**Nouvelle dépendance** : `cookie-parser` (+ `@types/cookie-parser`) dans
`confiture-rest-api`.

**À configurer sur Upsun avant/après déploiement** :

- Variable `ADMIN_IP_ALLOWLIST=188.165.80.220` (IP fixe Talan)
- Une fois validé : désactiver le Basic Auth Upsun (`http_access`), la
  protection est désormais gérée par l'application

**Statut** : testé en local (ddev) de bout en bout, en attente de MR/merge
et de déploiement.

---

## Template pour une nouvelle entrée

```markdown
## Nom de la fonctionnalité

**Date** :
**Branche** :

**Pourquoi** :

## **Fichiers ajoutés (propres au fork)** :

## **Fichiers existants modifiés (risque de conflit)** :

**Nouvelle dépendance** (le cas échéant) :

**Configuration à prévoir** (variables d'env, Upsun...) :

**Statut** :
```
