# Migrations Supabase

Ces migrations corrigent les failles relevées lors de l'audit de
pré-commercialisation du 26 juillet 2026.

**Aucune n'a été appliquée à la base.** Elles sont écrites pour être relues,
puis exécutées manuellement, dans l'ordre.

## Pourquoi ce dossier existe

Jusqu'ici, la couche qui porte toute la sécurité de Kartie — politiques d'accès,
fonctions, triggers — n'existait **nulle part dans le code source**. Elle n'était
ni relue, ni testée, ni réversible. C'est précisément ce qui a permis à quatre
politiques « toujours vraies », ajoutées pour débloquer le développement, de
survivre jusqu'à la veille du lancement.

Le vrai correctif durable n'est pas le SQL ci-dessous : c'est le fait qu'il soit
désormais versionné. Toute modification future des règles d'accès doit passer par
un fichier de ce dossier, relu comme du code.

## État de la base au moment de l'audit

| Constat | Gravité |
|---|---|
| Tout inscrit pouvait se promouvoir administrateur | Critique |
| Tout visiteur anonyme pouvait réécrire n'importe quelle pétition | Critique |
| La base de connaissances de l'IA était ouverte en écriture à tous | Critique |
| `user_ala_une_votes` n'avait aucune protection par ligne | Critique |
| Les votes et signatures étaient lisibles publiquement (art. 9 RGPD) | Critique |
| Les 3 espaces de stockage : publics, sans limite de taille ni de type | Élevée |
| 24 fonctions au `search_path` modifiable | Élevée |
| 18 fonctions privilégiées appelables anonymement | Élevée |

Points déjà solides, conservés tels quels : 27 tables sur 28 protégées, les trois
contraintes d'unicité anti-double-vote, `admin_soft_delete` qui vérifie
réellement le rôle, `moderation_logs` réservée aux admins, et l'ensemble des
politiques du module associations.

## Ordre d'application

Les fichiers sont horodatés dans l'ordre d'exécution. Ne pas les réordonner :
la migration 04 dépend de la 03, la 13 dépend de la 12.

| # | Fichier | Effet |
|---|---|---|
| 01 | `harden_profiles_role` | Gèle `profiles.role` — fin de l'auto-promotion admin |
| 02 | `drop_always_true_policies` | Supprime les 4 politiques ouvertes à tous |
| 03 | `enable_rls_ala_une_votes` | Protège la seule table sans RLS |
| 04 | `atomic_ala_une_vote` | Vote unique, atomique, non usurpable ⚠️ |
| 05 | `atomic_petition_support` | Compteur de soutiens infalsifiable ⚠️ |
| 06 | `restrict_vote_reads` | Ferme la lecture publique des opinions ⚠️ |
| 07 | `tighten_write_policies` | Reprend les droits sur `realisations`, `consultations` |
| 08 | `freeze_association_moderation` | Gèle `is_verified` et `status` |
| 09 | `function_search_path` | Fige le `search_path` des fonctions |
| 10 | `revoke_anon_execute` | Ferme l'exposition anonyme des fonctions |
| 11 | `harden_storage` | Limites, propriété et listage du stockage ⚠️ |
| 12 | `chat_rate_limit` | Quota d'appels à l'assistant IA |
| 13 | `gdpr_export_and_erasure` | Droits RGPD art. 17 et 20 |

⚠️ = demande un correctif de code applicatif ou un test manuel. Détail en tête
de chaque fichier.

## Comment appliquer

**Avant tout : faire une sauvegarde de la base** depuis le tableau de bord
Supabase, et travailler hors des heures d'usage.

### Option A — SQL Editor (le plus simple, depuis un mobile aussi)

Copier le contenu de chaque fichier, **un par un, dans l'ordre**, dans
`SQL Editor` sur supabase.com. Vérifier le résultat entre chaque.

### Option B — CLI Supabase

```bash
supabase link --project-ref gebtbhcijfjqptubrwvf
supabase db push
```

⚠️ La base existe déjà et n'a jamais été gérée par le CLI. Vérifier ce que
`supabase db push` compte exécuter (`supabase db diff` d'abord) : selon l'état
de la table `supabase_migrations.schema_migrations`, il peut vouloir rejouer ou
au contraire ignorer ces fichiers. En cas de doute, l'option A reste plus sûre
pour cette première passe.

## Correctifs de code à faire en parallèle

Trois migrations cassent l'application si le code n'est pas mis à jour :

- **04** — `src/api/alaUne.ts` : `castAlaUneVote` doit se réduire à un seul
  appel `rpc('cast_ala_une_vote', …)`. Supprimer l'appel à
  `increment_ala_une_vote`, l'insertion manuelle et la vérification d'unicité
  écrite en JavaScript.
- **05** — `src/api/democracy.ts` : supprimer `supportPetitionDirect`.
  `supportPetition` fonctionne enfin, la RPC qu'elle appelle existe désormais.
- **06** — tester tous les écrans de résultats. Un chiffre à zéro signale une
  fonction d'agrégation oubliée ou un comptage fait côté navigateur.
- **11** — vérifier qu'aucun écran n'appelle `storage.from(...).list()`.

## Après application

Exécuter `supabase/VERIFICATION.sql` : neuf contrôles, chacun avec son résultat
attendu. Puis relancer **Advisors → Security** dans le tableau de bord — le
niveau erreur doit avoir disparu, et les avertissements « RLS Policy Always
True » et « Function Search Path Mutable » doivent être à zéro.

## Ce qui n'est pas couvert ici

Ces migrations traitent la base de données. Restent à faire, hors de ce dossier :

- **Edge function `chat-rag`** : CORS en liste blanche, refus des appels signés
  par la clé anon, vérification du rôle admin sur les quatre actions
  d'administration, branchement du quota. Détail en fin de la migration 12.
- **Edge function `delete-account`** : suppression du compte d'authentification.
  Détail en fin de la migration 13.
- **Réglages du tableau de bord** : protection contre les mots de passe
  compromis, longueur minimale, MFA, CAPTCHA, limites de connexion, plafond de
  dépense.
- **Application** : en-têtes de sécurité Netlify, `npm audit fix`, DOMPurify sur
  `QuartierInfos`, helper d'URL http/https, retrait de pravatar.cc,
  réinitialisation de mot de passe, attribution OpenStreetMap, CI, supervision
  des erreurs.
- **Conformité** : pages légales, consentement explicite article 9, registre des
  traitements, AIPD, et l'examen de la licence Hippocratic 2.1 de `react-leaflet`.
