-- ============================================================================
-- Controles post-migration — a executer dans le SQL Editor de Supabase
-- ============================================================================
-- Toutes les requetes sont en LECTURE SEULE. Chacune indique le resultat
-- attendu. Une seule ligne inattendue = une migration a rejouer ou un cas non
-- couvert.
-- ============================================================================

-- 1 · Plus aucune table sans protection par ligne
--     Attendu : 0 ligne
select tablename as table_sans_rls
from pg_tables
where schemaname = 'public'
  and not rowsecurity;

-- 2 · Plus aucune policy « toujours vraie » en ecriture
--     Attendu : 0 ligne
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and cmd <> 'SELECT'
  and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true');

-- 3 · Plus aucune fonction au search_path modifiable
--     Attendu : 0 ligne
select p.proname as fonction_search_path_mutable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c
    where c like 'search_path=%'
  );

-- 4 · Les trois triggers de protection sont en place
--     Attendu : 3 lignes
--       associations -> trg_associations_freeze_moderation
--       petitions    -> trg_petitions_freeze_counter
--       profiles     -> trg_profiles_prevent_role_escalation
select event_object_table as sur_table, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and (trigger_name like '%freeze%' or trigger_name like '%prevent%')
group by event_object_table, trigger_name
order by event_object_table;

-- 5 · Les espaces de stockage sont bornes
--     Attendu : file_size_limit et allowed_mime_types renseignes sur les 3
select id, public, file_size_limit, allowed_mime_types
from storage.buckets;

-- 6 · Les fonctions d'agregation sont bien SECURITY DEFINER
--     Attendu : 13 lignes, toutes en 'definer'
select p.proname,
       case when p.prosecdef then 'definer' else '⚠️ invoker' end as mode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'get\_%'
order by p.prosecdef, p.proname;

-- 7 · Les nouvelles fonctions existent bien
--     Attendu : 6 lignes
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'cast_ala_une_vote', 'support_petition', 'consume_chat_quota',
    'purge_chat_rate_limit', 'export_my_data', 'erase_my_account'
  )
order by p.proname;

-- 8 · Etat general des policies d'ecriture, pour relecture a l'oeil
select tablename, cmd, policyname,
       coalesce(qual, '-')       as using_expr,
       coalesce(with_check, '-') as check_expr
from pg_policies
where schemaname = 'public'
  and cmd <> 'SELECT'
order by tablename, cmd, policyname;

-- ============================================================================
-- Test manuel complementaire — l'auto-promotion admin
-- ============================================================================
-- Avec un compte NON administrateur, depuis l'application :
--   update public.profiles set role = 'admin' where id = auth.uid();
--   select role from public.profiles where id = auth.uid();
-- Attendu : la requete reussit, le role reste 'user'. Se reconnecter : l'onglet
-- d'administration ne doit pas apparaitre.
-- ============================================================================
