-- ============================================================================
-- 09 · Figer le search_path des fonctions
-- ============================================================================
-- Contexte
--   24 fonctions du schema public avaient un `search_path` modifiable
--   (lint Supabase `function_search_path_mutable`), dont des fonctions
--   sensibles : get_my_role, admin_soft_delete, handle_new_user,
--   increment_ala_une_vote, is_circle_member, is_circle_public.
--
-- Pourquoi c'est un probleme
--   Une fonction SECURITY DEFINER s'execute avec les privileges de son
--   proprietaire. Si son search_path n'est pas fige, un appelant peut creer un
--   objet homonyme dans un schema qu'il controle et le placer en tete de
--   resolution : la fonction privilegiee execute alors le code de l'attaquant.
--   C'est la voie d'elevation de privileges classique en PostgreSQL.
--
-- Ce bloc est idempotent : il ne touche que les fonctions qui n'ont pas deja
-- le reglage. Il peut etre rejoue sans effet.
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
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) c
        where c like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public', r.sig);
    n := n + 1;
  end loop;

  raise notice 'search_path fige sur % fonction(s).', n;
end $$;

-- ── Verification ────────────────────────────────────────────────────────────
--   select p.proname
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.prokind = 'f'
--     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c
--                     where c like 'search_path=%');
-- Attendu : 0 ligne.
