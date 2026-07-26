-- ============================================================================
-- 12 · Quota d'appels a l'assistant IA — protection contre l'abus de couts
-- ============================================================================
-- Contexte
--   L'edge function chat-rag est declaree avec verify_jwt = true, mais cette
--   protection est INOPERANTE : la cle anon est elle-meme un jeton JWT valide
--   signe par le projet. Le repli `token || supabaseAnonKey` de
--   publicChatHeaders (src/api/chatRag.ts) produit donc un appel qui passe la
--   verification. L'assistant — et donc l'API Gemini facturee — est
--   declenchable par n'importe quel visiteur, en boucle, sans compte.
--
--   Aucune limitation de debit n'existe, ni par utilisateur ni par IP. Le seul
--   plafond est le delai d'attente de 45 secondes par appel.
--
--   C'est le scenario « facture Supabase passee de 20 a 200 dollars en une
--   journee » cite au §13 des publications de reference.
--
-- Cette migration pose la partie base de donnees. La partie edge function est
-- decrite en fin de fichier.
-- ============================================================================

create table if not exists public.chat_rate_limit (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  window_start timestamptz not null default date_trunc('hour', now()),
  hits         integer     not null default 0,
  primary key (user_id, window_start)
);

comment on table public.chat_rate_limit is
  'Compteur horaire d''appels a l''assistant IA, par utilisateur. Purge : voir purge_chat_rate_limit().';

alter table public.chat_rate_limit enable row level security;

-- Volontairement AUCUNE policy : la table n'est accessible qu'a la cle de
-- service, c'est-a-dire a l'edge function. Un utilisateur ne doit pouvoir ni
-- lire ni remettre a zero son propre compteur.

create or replace function public.consume_chat_quota(
  p_user_id uuid,
  p_max     integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.chat_rate_limit (user_id, window_start, hits)
  values (p_user_id, date_trunc('hour', now()), 1)
  on conflict (user_id, window_start)
    do update set hits = public.chat_rate_limit.hits + 1
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

comment on function public.consume_chat_quota(uuid, integer) is
  'Incremente et evalue le quota horaire d''un utilisateur. Renvoie false si le plafond est depasse.';

revoke execute on function public.consume_chat_quota(uuid, integer) from anon, authenticated;

-- ── Purge des fenetres expirees ─────────────────────────────────────────────
-- A appeler periodiquement (pg_cron si disponible, ou depuis l'edge function).
-- Duree de conservation : 7 jours, strictement necessaire a l'anti-abus.
create or replace function public.purge_chat_rate_limit()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.chat_rate_limit
  where window_start < now() - interval '7 days';
$$;

revoke execute on function public.purge_chat_rate_limit() from anon, authenticated;

-- ============================================================================
-- Partie edge function — a appliquer dans supabase/functions/chat-rag/index.ts
-- ============================================================================
--   1. CORS : remplacer 'Access-Control-Allow-Origin': '*' par une liste
--      blanche (domaine de production + localhost si necessaire).
--
--   2. Identifier l'appelant REEL : refuser un jeton egal a SUPABASE_ANON_KEY,
--      puis valider le jeton via auth.getUser().
--
--   3. Verifier le role admin sur les actions 'sync', 'upload-doc',
--      'list-docs' et 'delete-doc' — aucune ne le fait aujourd'hui, alors que
--      la fonction s'execute avec SUPABASE_SERVICE_ROLE_KEY et contourne donc
--      toute la RLS.
--
--   4. Avant l'appel a Gemini :
--        const { data: allowed } = await supabase.rpc('consume_chat_quota',
--                                                     { p_user_id: user.id })
--        if (!allowed) return 429
--
--   5. Neutraliser les messages d'erreur qui exposent l'infrastructure
--      (« Verifiez la facturation sur Google AI Studio », « Cle API Gemini
--      invalide », renvoi vers les journaux Supabase).
-- ============================================================================
