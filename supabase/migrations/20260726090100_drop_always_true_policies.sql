-- ============================================================================
-- 02 · Suppression des quatre policies « toujours vraies »
-- ============================================================================
-- Rappel de mecanique PostgreSQL
--   Les policies permissives s'ADDITIONNENT (OR). Une seule policy dont la
--   condition vaut `true` annule donc toutes les regles strictes posees a cote.
--   C'est ce qui s'est produit sur ces quatre tables : des policies larges
--   ajoutees « pour debloquer » pendant le developpement, jamais retirees.
--
-- Signale aussi par l'analyseur Supabase : lint `rls_policy_always_true`.
-- ============================================================================

-- ── petitions ───────────────────────────────────────────────────────────────
-- « Allow public update access » : USING true, ouverte au role `public`.
-- N'importe quel VISITEUR, sans compte, pouvait reecrire le titre, le texte et
-- le compteur de soutiens de toutes les petitions.
drop policy if exists "Allow public update access" on public.petitions;

create policy "petitions_update_owner_or_admin"
  on public.petitions
  for update
  to authenticated
  using      (auth.uid() = user_id or public.is_platform_admin())
  with check (auth.uid() = user_id or public.is_platform_admin());

-- ── rag_documents ───────────────────────────────────────────────────────────
-- « Admins can manage rag_documents » : le nom promet un controle, la condition
-- etait `true` pour TOUTES les operations. Combine a l'absence de verification
-- de role dans l'edge function chat-rag, cela permettait a quiconque d'effacer
-- la base de connaissances municipale ou d'y injecter ses propres documents,
-- que l'assistant citait ensuite comme parole officielle de la ville.
drop policy if exists "Admins can manage rag_documents" on public.rag_documents;
drop policy if exists "Anyone can view rag_documents"   on public.rag_documents;

create policy "rag_documents_admin_all"
  on public.rag_documents
  for all
  to authenticated
  using      (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Note : l'edge function chat-rag utilise la cle de service et contourne donc
-- la RLS. C'est voulu, mais raison de plus pour y ajouter la verification de
-- role decrite dans docs/plan-correction (partie 2).

-- ── consultation_options ────────────────────────────────────────────────────
-- Trois policies d'insertion contradictoires cohabitaient, dont une a `true` :
-- c'est la plus laxiste qui gagnait. On repart d'une regle unique.
drop policy if exists "Allow insert for authenticated users" on public.consultation_options;
drop policy if exists "Insertion options"                    on public.consultation_options;
drop policy if exists "No direct insert"                     on public.consultation_options;

create policy "consultation_options_admin_write"
  on public.consultation_options
  for all
  to authenticated
  using      (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ── feed_posts ──────────────────────────────────────────────────────────────
-- « Allow public insert access » : WITH CHECK true => publication anonyme.
drop policy if exists "Allow public insert access"                on public.feed_posts;
drop policy if exists "Authenticated users can create feed posts" on public.feed_posts;

create policy "feed_posts_insert_own"
  on public.feed_posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ── Verification ────────────────────────────────────────────────────────────
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public' and cmd <> 'SELECT'
--     and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true');
-- Attendu : 0 ligne.
