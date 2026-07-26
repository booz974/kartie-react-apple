-- ============================================================================
-- 05 · Soutien de petition : atomique, idempotent, compteur infalsifiable
-- ============================================================================
-- Deux problemes traites ensemble.
--
-- 1. La fonction `support_petition` que le code applicatif appelle
--    (src/api/democracy.ts, via supabase.rpc) N'EXISTE PAS dans la base : elle
--    n'apparait pas dans la liste des fonctions du schema public. C'est
--    vraisemblablement pourquoi le chemin de repli `supportPetitionDirect` a
--    ete ecrit.
--
-- 2. `supportPetitionDirect` fait un lire-modifier-ecrire NON ATOMIQUE, avec la
--    valeur du compteur calculee dans le NAVIGATEUR :
--        update petitions set supports = <valeur fournie par le client>
--    Combine a l'ancienne policy « Allow public update access » (USING true),
--    n'importe qui pouvait inscrire le nombre de soutiens de son choix, sans
--    meme etre connecte.
--
-- Correction
--   Le compteur devient une valeur DERIVEE, recalculee a partir des soutiens
--   reellement enregistres. Effet secondaire utile : d'eventuelles valeurs deja
--   gonflees se corrigent d'elles-memes au premier soutien suivant.
-- ============================================================================

-- ── Le compteur n'est modifiable que depuis la fonction officielle ───────────
-- Le garde s'appuie sur un reglage a portee TRANSACTION (3e argument = true),
-- pose juste avant l'UPDATE par support_petition(). Toute autre ecriture — y
-- compris par le proprietaire de la petition ou un admin via l'API REST — voit
-- sa modification du compteur annulee.
create or replace function public.freeze_petition_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.supports is distinct from old.supports
     and coalesce(current_setting('app.counter_update', true), '') <> 'on' then
    new.supports := old.supports;
  end if;
  return new;
end;
$$;

comment on function public.freeze_petition_counter() is
  'Rend petitions.supports non modifiable hors de support_petition(). Voir migration 20260726090400.';

drop trigger if exists trg_petitions_freeze_counter on public.petitions;

create trigger trg_petitions_freeze_counter
  before update on public.petitions
  for each row
  execute function public.freeze_petition_counter();

-- ── La fonction officielle ──────────────────────────────────────────────────
create or replace function public.support_petition(p_petition_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  -- Idempotent : un second appel ne cree pas de doublon et ne fait pas echouer
  -- l'utilisateur. S'appuie sur la contrainte UNIQUE (user_id, petition_id)
  -- deja presente sur petition_supports.
  insert into public.petition_supports (petition_id, user_id)
  values (p_petition_id, auth.uid())
  on conflict (user_id, petition_id) do nothing;

  -- Le compteur est recalcule, jamais incremente : pas de condition de course.
  select count(*) into v_count
  from public.petition_supports
  where petition_id = p_petition_id;

  perform set_config('app.counter_update', 'on', true);  -- portee : transaction
  update public.petitions set supports = v_count where id = p_petition_id;

  return v_count;
end;
$$;

comment on function public.support_petition(bigint) is
  'Enregistre le soutien de l''utilisateur courant et recalcule le compteur. Idempotent.';

revoke execute on function public.support_petition(bigint) from anon;
grant  execute on function public.support_petition(bigint) to   authenticated;

-- ============================================================================
-- ⚠️  CORRECTIF DE CODE OBLIGATOIRE
-- ============================================================================
--   SUPPRIMER `supportPetitionDirect` de src/api/democracy.ts.
--   La fonction est exportee, dangereuse, et devient de toute facon inoperante
--   (le trigger annule sa modification du compteur, et la nouvelle policy
--   UPDATE de la migration 02 lui refuse l'acces).
--
--   `supportPetition` peut rester tel quel : la RPC qu'elle appelle existe
--   desormais reellement.
-- ============================================================================
