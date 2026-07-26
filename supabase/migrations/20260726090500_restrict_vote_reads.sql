-- ============================================================================
-- 06 · Fermeture de la lecture publique des opinions politiques  ⚠️ SENSIBLE
-- ============================================================================
-- Contexte — c'est la correction la plus importante du point de vue RGPD.
--
--   `consultation_votes` portait une policy SELECT « Enable read access for all
--   users » avec USING true, ouverte au role `public` : N'IMPORTE QUEL VISITEUR,
--   sans compte, pouvait telecharger la liste complete des votes avec
--   l'identifiant de chaque votant.
--
--   `petition_supports` : lecture ouverte a tout utilisateur connecte.
--
--   Ce sont des opinions politiques nominatives, rattachees a un quartier de
--   residence : une « categorie particuliere de donnees » au sens de l'article 9
--   du RGPD. Leur exposition en lecture libre n'est pas un risque theorique de
--   conformite, c'est une violation de donnees caracterisee.
--
-- ⚠️  CONSEQUENCE A TESTER IMPERATIVEMENT
--   Restreindre la lecture des lignes casse tout affichage de resultats qui
--   compte cote navigateur. Les fonctions de statistiques etaient declarees
--   SECURITY INVOKER : elles s'executent avec les droits de l'appelant, donc
--   la RLS s'y applique et elles renverraient desormais zero.
--   La seconde moitie de cette migration les fait passer en SECURITY DEFINER :
--   elles comptent sans exposer les lignes individuelles.
-- ============================================================================

-- ── 1. Restreindre la lecture des lignes de vote ────────────────────────────
drop policy if exists "Enable read access for all users" on public.consultation_votes;

create policy "consultation_votes_select_own"
  on public.consultation_votes
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "Allow users to read support records" on public.petition_supports;

create policy "petition_supports_select_own"
  on public.petition_supports
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- ── 2. Les fonctions d'agregation doivent continuer a fonctionner ───────────
-- Passage en SECURITY DEFINER + search_path fige, par nom plutot que par
-- signature complete : robuste si une signature differe legerement.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'get_consultation_details',
        'get_resultats_sondage',
        'get_all_sondages_by_quartier',
        'get_engagement_par_quartier',
        'get_interactions_semaine',
        'get_sondage_chaud_semaine',
        'get_signatures_by_quartier',
        'get_global_stats',
        'get_initiative_top_semaine',
        'get_quartier_actif_semaine',
        'get_cartographie_thematique',
        'get_evolution_thematique',
        'get_top_thematiques'
      )
  loop
    execute format('alter function %s security definer', r.sig);
    execute format('alter function %s set search_path = public', r.sig);
    raise notice 'Agregation passee en SECURITY DEFINER : %', r.sig;
  end loop;
end $$;

-- ============================================================================
-- ⚠️  A TESTER ECRAN PAR ECRAN APRES CETTE MIGRATION
-- ============================================================================
--   Ouvrir chaque vue affichant des resultats : consultations, sondages,
--   tableau de bord admin, graphiques par quartier, page d'accueil.
--
--   Si un chiffre tombe a zero, deux causes possibles :
--     a) une fonction d'agregation a ete oubliee dans la liste ci-dessus ;
--     b) l'ecran compte les lignes cote navigateur au lieu d'appeler une
--        fonction — il faut alors ajouter une fonction d'agregation dediee,
--        SECURITY DEFINER, qui ne renvoie que des totaux.
-- ============================================================================
