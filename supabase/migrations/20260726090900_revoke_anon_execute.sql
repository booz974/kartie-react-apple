-- ============================================================================
-- 10 · Retirer au role anonyme l'execution des fonctions privilegiees
-- ============================================================================
-- Contexte
--   18 fonctions SECURITY DEFINER etaient appelables par le role `anon` via
--   /rest/v1/rpc/ (lint Supabase `anon_security_definer_function_executable`),
--   dont handle_new_user, les fonctions de synchronisation du fil, et
--   upsert_feed_post_mirror.
--
-- ⚠️  PIEGE MAJEUR — ne pas revoquer en bloc
--   Les fonctions utilisees A L'INTERIEUR des policies RLS sont evaluees avec
--   les droits de l'appelant. Leur retirer EXECUTE casse INSTANTANEMENT toutes
--   les requetes de l'application, avec une erreur de permission difficile a
--   diagnostiquer.
--
--   La liste d'exclusion ci-dessous est donc indispensable. Elle recense les
--   fonctions referencees dans au moins une policy du schema public :
--     is_platform_admin      -> associations, moderation_logs, et toutes les
--                               policies posees par ces migrations
--     is_association_member  -> associations, association_posts,
--                               association_events
--     is_association_owner   -> association_members
--     is_circle_member       -> circle_members
--     is_circle_public       -> circle_members
--     get_my_role            -> actualites, events, quartiers, zones,
--                               consultations, feed_posts, feed_comments,
--                               petitions
--     get_user_role          -> ala_une_content
--
--   Si tu ajoutes une fonction dans une policy plus tard, ajoute-la ici AVANT
--   de rejouer ce bloc.
--
-- Le role `authenticated` conserve ses droits : seule l'exposition anonyme est
-- fermee. Les revocations ciblees pour `authenticated` sont dans la migration
-- 04 (increment_ala_une_vote, handle_ala_une_vote).
-- ============================================================================

do $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and p.prokind = 'f'
      and p.prosecdef                       -- uniquement les SECURITY DEFINER
      and p.proname not in (
        -- ⚠️ utilisees DANS les policies : ne jamais revoquer
        'is_platform_admin',
        'is_association_member',
        'is_association_owner',
        'is_circle_member',
        'is_circle_public',
        'get_my_role',
        'get_user_role'
      )
  loop
    execute format('revoke execute on function %s from anon', r.sig);
    n := n + 1;
  end loop;

  raise notice 'EXECUTE revoque au role anon sur % fonction(s).', n;
end $$;

-- ── Verification ────────────────────────────────────────────────────────────
-- Apres application, relancer un parcours complet en navigation anonyme :
-- page d'accueil, liste des quartiers, fil, consultations, associations.
-- Toute erreur « permission denied for function ... » signale une fonction a
-- reintegrer dans la liste d'exclusion ci-dessus.
