-- ============================================================================
-- 04 · Un seul chemin de vote « A la Une », atomique et non usurpable
-- ============================================================================
-- Contexte
--   Trois fonctions coexistaient pour la meme action :
--
--   * increment_ala_une_vote(integer, integer)
--       SECURITY DEFINER, appelable par le role `anon` via /rest/v1/rpc/,
--       n'effectue AUCUNE verification d'identite ni d'unicite. Un appel en
--       boucle gonflait un sondage a volonte.
--
--   * handle_ala_une_vote(bigint, bigint, uuid)
--       Fait le travail correctement et de facon atomique, MAIS accepte
--       l'identifiant du votant EN PARAMETRE : on pouvait voter au nom d'autrui.
--
--   * Le code applicatif (src/api/alaUne.ts) empruntait le mauvais chemin :
--       lecture du vote existant en JS -> increment du compteur -> insertion de
--       la trace. Si la derniere etape echouait, le compteur avait deja ete
--       gonfle (TOCTOU).
--
-- Correction
--   On enveloppe la bonne fonction dans une signature qui ne peut pas mentir,
--   et on ferme les deux autres portes.
-- ============================================================================

create or replace function public.cast_ala_une_vote(content_id bigint, option_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  -- L'identifiant du votant vient du jeton, jamais de l'appelant.
  return public.handle_ala_une_vote(content_id, option_id, auth.uid());
end;
$$;

comment on function public.cast_ala_une_vote(bigint, bigint) is
  'Unique point d''entree pour voter sur un contenu "A la Une". Derive le votant de auth.uid().';

-- Fermeture des deux chemins contournables.
-- Les fonctions restent en place (handle_ala_une_vote est appelee par le
-- wrapper ci-dessus, qui est SECURITY DEFINER et n'est donc pas soumis a ces
-- revocations), mais elles ne sont plus joignables depuis l'API REST.
revoke execute on function public.increment_ala_une_vote(integer, integer)  from anon, authenticated;
revoke execute on function public.handle_ala_une_vote(bigint, bigint, uuid) from anon, authenticated;

grant execute on function public.cast_ala_une_vote(bigint, bigint) to authenticated;

-- ============================================================================
-- ⚠️  CORRECTIF DE CODE OBLIGATOIRE — sans lui, le vote cesse de fonctionner
-- ============================================================================
--   Dans src/api/alaUne.ts, `castAlaUneVote` doit se reduire a UN SEUL appel :
--
--       await supabase.rpc('cast_ala_une_vote', {
--         content_id: contentId,
--         option_id:  optionId,
--       })
--
--   A supprimer dans la foulee :
--     - l'appel a increment_ala_une_vote      (revoque ci-dessus)
--     - l'insertion manuelle dans user_ala_une_votes
--     - la verification d'unicite ecrite en JavaScript
--
--   La base fait desormais les trois en une transaction.
-- ============================================================================
