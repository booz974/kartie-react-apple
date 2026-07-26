-- ============================================================================
-- 13 · Droits RGPD : portabilite (art. 20) et effacement (art. 17)
-- ============================================================================
-- Contexte
--   src/api/auth.ts ne contient que signIn, signUp et signOut. Ni export des
--   donnees, ni suppression de compte n'etaient outilles — deux droits pourtant
--   opposables des le premier utilisateur.
--
--   Enjeu renforce ici : les signatures de petitions et les votes de
--   consultations sont des opinions politiques nominatives, rattachees a un
--   quartier de residence. C'est une categorie particuliere au sens de
--   l'article 9 du RGPD.
-- ============================================================================

-- ── Article 20 · portabilite ────────────────────────────────────────────────
-- Renvoie l'integralite des donnees de l'utilisateur courant, dans un format
-- structure et lisible par machine. A brancher sur un bouton « Telecharger mes
-- donnees » dans le profil.
create or replace function public.export_my_data()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exporte_le', now(),
    'profil',       (select to_jsonb(p)  from public.profiles p where p.id = auth.uid()),
    'publications', (select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
                       from public.feed_posts f          where f.user_id  = auth.uid()),
    'commentaires', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
                       from public.feed_comments c       where c.user_id  = auth.uid()),
    'petitions',    (select coalesce(jsonb_agg(to_jsonb(pt)), '[]'::jsonb)
                       from public.petitions pt          where pt.user_id = auth.uid()),
    'soutiens',     (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
                       from public.petition_supports s   where s.user_id  = auth.uid()),
    'votes',        (select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
                       from public.consultation_votes v  where v.user_id  = auth.uid()),
    'votes_a_la_une', (select coalesce(jsonb_agg(to_jsonb(av)), '[]'::jsonb)
                       from public.user_ala_une_votes av where av.user_id = auth.uid()),
    'associations', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
                       from public.association_members m where m.user_id  = auth.uid()),
    'abonnements',  (select coalesce(jsonb_agg(to_jsonb(af)), '[]'::jsonb)
                       from public.association_follows af where af.user_id = auth.uid())
  );
$$;

comment on function public.export_my_data() is
  'RGPD art. 20 — export complet des donnees de l''utilisateur courant.';

revoke execute on function public.export_my_data() from anon;
grant  execute on function public.export_my_data() to   authenticated;

-- ── Article 17 · effacement ─────────────────────────────────────────────────
-- Efface les donnees applicatives de l'utilisateur courant.
--
-- Choix : SUPPRESSION plutot qu'anonymisation des contenus. L'anonymisation
-- (mise a null de user_id) supposerait que la colonne soit nullable sur
-- feed_posts et feed_comments, ce qui n'est pas verifie. La suppression est le
-- comportement le plus conforme a la demande d'effacement, et le plus sur.
--
-- Les compteurs de petitions concernes sont recalcules en fin de fonction.
create or replace function public.erase_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_petitions bigint[];
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  -- Petitions dont le compteur devra etre recalcule apres retrait des soutiens
  select coalesce(array_agg(distinct petition_id), '{}')
    into v_petitions
    from public.petition_supports
   where user_id = v_uid;

  -- Participation democratique
  delete from public.consultation_votes  where user_id = v_uid;
  delete from public.petition_supports   where user_id = v_uid;
  delete from public.user_ala_une_votes  where user_id = v_uid;

  -- Contributions
  delete from public.feed_comments       where user_id = v_uid;
  delete from public.feed_likes          where user_id = v_uid;
  delete from public.feed_post_reactions where user_id = v_uid;
  delete from public.feed_posts          where user_id = v_uid;

  -- Vie associative
  delete from public.association_follows where user_id = v_uid;
  delete from public.association_members where user_id = v_uid;

  -- Cercles de quartier
  delete from public.circle_members      where user_id = v_uid;

  -- Quota IA
  delete from public.chat_rate_limit     where user_id = v_uid;

  -- Profil
  delete from public.profiles where id = v_uid;

  -- Recalcul des compteurs impactes (le trigger de gel est contourne
  -- volontairement, comme dans support_petition)
  if array_length(v_petitions, 1) is not null then
    perform set_config('app.counter_update', 'on', true);
    update public.petitions p
       set supports = (select count(*) from public.petition_supports s
                        where s.petition_id = p.id)
     where p.id = any(v_petitions);
  end if;
end;
$$;

comment on function public.erase_my_account() is
  'RGPD art. 17 — efface les donnees applicatives de l''utilisateur courant. Ne supprime PAS le compte auth : voir edge function delete-account.';

revoke execute on function public.erase_my_account() from anon;
grant  execute on function public.erase_my_account() to   authenticated;

-- ============================================================================
-- ⚠️  DEUX POINTS A TRAITER AVANT MISE EN SERVICE
-- ============================================================================
--
-- 1. SUPPRESSION DU COMPTE D'AUTHENTIFICATION
--    Cette fonction n'efface QUE les donnees applicatives. La suppression de
--    la ligne dans auth.users exige la cle de service et doit donc passer par
--    une edge function :
--
--      // supabase/functions/delete-account/index.ts
--      const user = await requireUser(req)          // valide le jeton, refuse la cle anon
--      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
--        global: { headers: { Authorization: `Bearer ${jwt}` } },
--      })
--      await userClient.rpc('erase_my_account')     // auth.uid() doit etre renseigne
--      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
--      await admin.auth.admin.deleteUser(user.id)
--
--    Important : appeler erase_my_account() avec le client PORTEUR DU JETON
--    UTILISATEUR, pas avec le client de service — sinon auth.uid() vaut null
--    et la fonction leve une exception.
--
-- 2. ASSOCIATIONS DONT L'UTILISATEUR EST SEUL PROPRIETAIRE
--    Le retrait de association_members peut orpheliner une association. Avant
--    mise en service, ajouter en tete de erase_my_account() un garde-fou du
--    type : si l'utilisateur est seul membre avec le role proprietaire d'au
--    moins une association, lever une exception invitant a transferer la
--    propriete d'abord.
--    La valeur exacte du role proprietaire dans association_members n'a pas ete
--    verifiee lors de l'audit : la controler avant d'ecrire ce garde-fou.
-- ============================================================================
