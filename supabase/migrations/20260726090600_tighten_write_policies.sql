-- ============================================================================
-- 07 · Reprise des droits d'ecriture trop larges
-- ============================================================================
-- Deux tables accordaient a tout compte connecte des droits reserves aux
-- administrateurs. Illustration du §5.2 des publications de reference :
-- etre authentifie n'est pas etre autorise.
-- ============================================================================

-- ── realisations ────────────────────────────────────────────────────────────
-- Insertion, modification ET suppression etaient ouvertes a tout utilisateur
-- connecte : n'importe quel inscrit pouvait effacer toutes les realisations
-- municipales.
drop policy if exists "Permettre l'insertion aux utilisateurs authentifiés"    on public.realisations;
drop policy if exists "Permettre la mise à jour aux utilisateurs authentifiés" on public.realisations;
drop policy if exists "Permettre la suppression aux utilisateurs authentifiés" on public.realisations;

-- La policy SELECT publique existante n'est pas touchee : les policies
-- permissives s'additionnent, la lecture publique reste donc ouverte.
create policy "realisations_admin_write"
  on public.realisations
  for all
  to authenticated
  using      (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ── consultations ───────────────────────────────────────────────────────────
-- La policy « Authenticated users can vote on consultations » portait sur
-- cmd = UPDATE avec USING (auth.role() = 'authenticated') : malgre son nom, elle
-- accordait un droit de modification COMPLETE de la table. Le titre et la
-- question d'une consultation pouvaient etre reecrits par n'importe quel
-- inscrit. Les votes, eux, vivent dans consultation_votes : cette policy
-- n'etait pas necessaire au vote.
drop policy if exists "Authenticated users can vote on consultations" on public.consultations;

-- Policies d'insertion residuelles et contradictoires :
--   « Insertion sondages » : WITH CHECK (auth.role() = 'admin') — condition
--     impossible, auth.role() ne vaut jamais 'admin' (seulement 'anon' ou
--     'authenticated'). Morte.
--   « No direct insert » : WITH CHECK false — permissive, n'apporte rien.
-- La policy admin « ALL » existante suffit ; la creation legitime passe par
-- create_consultation_transaction(), SECURITY DEFINER, qui contourne la RLS.
drop policy if exists "Insertion sondages" on public.consultations;
drop policy if exists "No direct insert"   on public.consultations;

-- ── Verification ────────────────────────────────────────────────────────────
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('realisations', 'consultations')
--   order by tablename, cmd;
