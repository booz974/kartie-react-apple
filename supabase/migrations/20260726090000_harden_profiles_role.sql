-- ============================================================================
-- 01 · Gel de la colonne `role` — fin de l'auto-promotion administrateur
-- ============================================================================
-- Contexte
--   La policy UPDATE de `profiles` autorise un utilisateur a modifier sa propre
--   ligne sans restreindre les colonnes, et aucun trigger ne protegeait `role`.
--   Un compte ordinaire pouvait donc executer :
--       update profiles set role = 'admin' where id = auth.uid();
--   et prendre le controle de la plateforme entiere : toutes les autres policies
--   admin (quartiers, events, actualites, consultations, zones, feed_posts,
--   ala_une_content, petitions, moderation_logs, system_config) s'appuient sur
--   cette colonne via get_my_role() / is_platform_admin().
--
-- Pourquoi un trigger et pas un WITH CHECK
--   Une clause WITH CHECK ne peut pas comparer OLD et NEW : elle ne voit que la
--   ligne resultante. Seul un trigger BEFORE UPDATE peut detecter la tentative
--   de changement de role.
--
-- Comportement choisi
--   La valeur est restauree silencieusement plutot que de lever une exception.
--   Echouer bruyamment renseignerait un attaquant sur l'existence du garde-fou.
-- ============================================================================

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not public.is_platform_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

comment on function public.prevent_role_escalation() is
  'Empeche un utilisateur non-admin de modifier sa propre colonne role. Voir migration 20260726090000.';

drop trigger if exists trg_profiles_prevent_role_escalation on public.profiles;

create trigger trg_profiles_prevent_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_role_escalation();

-- ── Verification ────────────────────────────────────────────────────────────
-- Avec un compte NON admin :
--   update public.profiles set role = 'admin' where id = auth.uid();
--   select role from public.profiles where id = auth.uid();
-- Attendu : la requete reussit, mais le role reste inchange.
