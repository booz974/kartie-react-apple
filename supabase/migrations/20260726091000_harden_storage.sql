-- ============================================================================
-- 11 · Verrouillage des espaces de stockage
-- ============================================================================
-- Contexte
--   Les trois buckets (uploads, post_images, quartiers_images) etaient publics,
--   SANS limite de taille et SANS restriction de type : file_size_limit et
--   allowed_mime_types etaient tous deux vides.
--
--   Le controle « 2 Mo, PNG/JPEG/GIF » de validateImageFile (src/api/storage.ts)
--   n'existe donc que dans le navigateur, et se contourne en appelant l'API
--   directement — y compris pour deposer un SVG ou un HTML executable, servi
--   ensuite depuis le domaine de stockage.
--
--   Par ailleurs la policy UPDATE sur `uploads` ne verifiait que le bucket_id,
--   sans controle de proprietaire : tout compte connecte pouvait remplacer
--   n'importe quel fichier deja depose. Combine aux noms previsibles generes
--   par Date.now(), la substitution d'images etait triviale.
-- ============================================================================

-- ── Limites reelles, cote serveur ───────────────────────────────────────────
update storage.buckets
set file_size_limit    = 2097152,  -- 2 Mo, aligne sur le controle navigateur
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id in ('uploads', 'post_images', 'quartiers_images');

-- Note : image/svg+xml est volontairement absent. Un SVG est un document
-- pouvant embarquer du script ; servi depuis le domaine de stockage et ouvert
-- en navigation directe (FeedPost place l'URL d'image dans un lien), il
-- deviendrait un vecteur XSS.

-- ── Fin de l'ecrasement des fichiers d'autrui ───────────────────────────────
drop policy if exists "Allow authenticated update access" on storage.objects;

create policy "uploads_update_own"
  on storage.objects
  for update
  to authenticated
  using      (bucket_id = 'uploads' and owner = auth.uid())
  with check (bucket_id = 'uploads' and owner = auth.uid());

-- ── Fin du listage complet des espaces ──────────────────────────────────────
-- Lint Supabase `public_bucket_allows_listing` (x3). Un bucket public n'a pas
-- besoin de policy SELECT pour que ses URL publiques fonctionnent : ces
-- policies servaient uniquement a lister l'inventaire des fichiers.
--
-- ⚠️  VERIFIER AVANT D'EXECUTER CE BLOC
--   Si un ecran appelle supabase.storage.from(...).list(), il cessera de
--   fonctionner. L'affichage des images par getPublicUrl n'est PAS affecte.
--   Recherche prealable : grep -rn "\.list(" src/api/storage.ts src/
drop policy if exists "Allow authenticated read access" on storage.objects;
drop policy if exists "Public Access"                   on storage.objects;
drop policy if exists "Public Access to Post Images"    on storage.objects;

-- ── Etape suivante recommandee (demande un correctif de code) ───────────────
--   Prefixer les chemins par l'identifiant de l'utilisateur — `${auth.uid()}/…`
--   au lieu de `${Date.now()}.ext` a la racine — puis restreindre INSERT,
--   UPDATE et DELETE a `(storage.foldername(name))[1] = auth.uid()::text`.
--   C'est la seule facon de rendre les chemins non devinables ET de garantir
--   qu'un utilisateur ne touche que ses propres fichiers.
