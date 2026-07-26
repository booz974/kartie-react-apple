-- ============================================================================
-- 08 · Gel des champs de moderation des associations
-- ============================================================================
-- Contexte
--   La policy UPDATE de `associations` autorise tout membre de l'association a
--   ecrire, sans restreindre les colonnes. Les champs de moderation
--   `is_verified` et `status` etaient donc modifiables par n'importe quel
--   membre : une association pouvait s'auto-certifier et se publier.
--
--   Cote interface, `updateAssociation` (src/api/associations.ts) accepte ces
--   champs et le masquage `allowModerationFields` de AssociationDashboardView
--   ne les cache qu'a l'affichage — un controle purement cosmetique, contourne
--   en appelant l'API directement.
--
-- Choix de conception
--   Meme approche que pour profiles.role (migration 01) : les colonnes
--   reprennent silencieusement leur valeur precedente si l'appelant n'est pas
--   administrateur de la plateforme. Les membres conservent le droit de
--   modifier tout le reste de leur fiche.
-- ============================================================================

create or replace function public.freeze_association_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    new.is_verified := old.is_verified;
    new.status      := old.status;
  end if;
  return new;
end;
$$;

comment on function public.freeze_association_moderation() is
  'Reserve is_verified et status aux admins plateforme. Voir migration 20260726090700.';

drop trigger if exists trg_associations_freeze_moderation on public.associations;

create trigger trg_associations_freeze_moderation
  before update on public.associations
  for each row
  execute function public.freeze_association_moderation();

-- Note : la creation d'association passe par create_association_transaction(),
-- SECURITY DEFINER, qui contourne la RLS et les triggers de policy mais PAS ce
-- trigger. Si cette fonction doit pouvoir positionner `status` a la creation,
-- verifier qu'elle procede bien par INSERT (non concerne) et non par UPDATE.
