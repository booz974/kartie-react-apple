-- ============================================================================
-- 03 · Protection par ligne sur user_ala_une_votes
-- ============================================================================
-- Contexte
--   `user_ala_une_votes` etait la SEULE des 28 tables du schema public sans RLS
--   activee. L'analyseur Supabase la signalait en niveau ERREUR
--   (lint `rls_disabled_in_public`) : la table etait entierement exposee aux
--   roles anon et authenticated, en lecture comme en ecriture.
--
--   La contrainte UNIQUE (user_id, ala_une_content_id) existait bien, mais elle
--   ne servait a rien : il suffisait de supprimer sa propre ligne pour revoter
--   autant de fois que voulu.
--
-- Choix de conception
--   Un vote est definitif. On autorise donc la lecture de SES votes et
--   l'insertion, mais volontairement AUCUNE policy UPDATE ni DELETE : c'est ce
--   qui rend enfin operante la contrainte d'unicite deja presente.
-- ============================================================================

alter table public.user_ala_une_votes enable row level security;

create policy "ala_une_votes_select_own"
  on public.user_ala_une_votes
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "ala_une_votes_insert_own"
  on public.user_ala_une_votes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Volontairement absentes : policies UPDATE et DELETE.
-- Un vote enregistre ne peut plus etre retire ni rejoue.

-- ── Verification ────────────────────────────────────────────────────────────
--   select tablename from pg_tables
--   where schemaname = 'public' and not rowsecurity;
-- Attendu : 0 ligne.
