import {
  lazy,
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from 'react';
import { useNavigate } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import SafeImage from '@/components/ui/SafeImage';
import { POST_TYPE_EMOJI, type CategoryKey } from '@/design/categories';
import type { FeedComment, FeedPost as FeedPostType } from '@/lib/types/contract';

/** Comment image upload is rare, so ImageUploader stays off the guest feed critical path (T-803). */
const ImageUploader = lazy(() => import('@/components/ui/ImageUploader'));

interface FeedPostProps {
  post: FeedPostType;
  session: Session | null;
  onReact?: (args: { postId: number; reactionType: string }) => void;
  onComment?: (args: {
    postId: number;
    content: string;
    parent_id: number | null;
    image_url: string | null;
  }) => void;
  isCommentSubmitting?: boolean;
}

function getPostType(post: FeedPostType): string {
  return (post.post_type as string | undefined) || post.type || 'regular';
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('fr-FR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
}

function getReactionCount(post: FeedPostType, type: string): number {
  if (type === 'like') return (post.likes as number | undefined) || 0;
  const reactions = post.metadata?.reactions as Record<string, number> | undefined;
  return reactions?.[type] || 0;
}

function isStatusActive(metadata: FeedPostType['metadata'], step: string): boolean {
  const status = (metadata?.status as string | undefined) || 'submitted';
  if (step === 'submitted') return true;
  if (step === 'in_progress') return ['in_progress', 'fixed'].includes(status);
  if (step === 'fixed') return status === 'fixed';
  return false;
}

/**
 * Chaque type de publication porte son émoji et sa couleur : une alerte, une
 * entraide et un signalement ne doivent pas se ressembler. L'émoji vient de
 * POST_TYPE_EMOJI, la teinte des couleurs de contenu du design system.
 */
const TYPE_META: Record<string, { label: string; tone: CategoryKey }> = {
  alerte: { label: 'Alerte', tone: 'event' },
  signalement: { label: 'Signalement', tone: 'petition' },
  entraide: { label: 'Entraide', tone: 'asso' },
  perdu_trouve: { label: 'Perdu / trouvé', tone: 'project' },
  village_square: { label: 'Place du Village', tone: 'consult' },
  association_post: { label: 'Association', tone: 'asso' },
  association_event: { label: 'Événement associatif', tone: 'event' },
  regular: { label: 'Message', tone: 'news' },
};

/**
 * Les réactions sont des émojis : c'est ce qui les rend engageantes et
 * immédiatement lisibles. Les clés envoyées au serveur, elles, ne bougent pas.
 */
const REACTIONS: { type: string; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: "J'aime" },
  { type: 'pray', emoji: '❤️', label: 'Merci' },
  { type: 'eyes', emoji: '👀', label: 'Je regarde' },
  { type: 'hands', emoji: '🙌', label: 'Bravo' },
];

/** Types dont la photo est portée par la publication elle-même. */
const IMAGE_POST_TYPES = [
  'regular',
  'alerte',
  'entraide',
  'village_square',
  'perdu_trouve',
  'signalement',
];

const STEPS = [
  { step: 'submitted', emoji: '📝', label: 'Signalé' },
  { step: 'in_progress', emoji: '🔧', label: 'En cours' },
  { step: 'fixed', emoji: '✅', label: 'Résolu' },
] as const;

type ThreadedComment = FeedComment & { replies: FeedComment[] };

function buildThreadedComments(comments: FeedComment[]): ThreadedComment[] {
  const map: Record<number, ThreadedComment> = {};
  const roots: ThreadedComment[] = [];
  comments.forEach((c) => {
    map[c.id] = { ...c, replies: [] };
  });
  comments.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  const sort = (a: FeedComment, b: FeedComment) =>
    new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  roots.sort(sort);
  Object.values(map).forEach((c) => c.replies.sort(sort));
  return roots;
}

/** Champ de commentaire qui grandit avec la réponse qu'on rédige. */
function AutoGrowTextarea({
  className,
  value,
  textareaRef,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = textareaRef ?? localRef;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value, ref]);

  return (
    <textarea
      ref={ref}
      value={value}
      className={['k-input resize-none overflow-hidden', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

function FeedPostComponent({
  post,
  session,
  onReact,
  onComment,
  isCommentSubmitting = false,
}: FeedPostProps) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [showCommentUploader, setShowCommentUploader] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<FeedComment | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const postType = getPostType(post);
  const metadata = useMemo(() => post.metadata ?? {}, [post.metadata]);
  const typeMeta = TYPE_META[postType] ?? TYPE_META.regular;
  const typeEmoji = POST_TYPE_EMOJI[postType] ?? POST_TYPE_EMOJI.regular;

  const actorName = useMemo(() => {
    if (['association_post', 'association_event'].includes(postType)) {
      return (metadata.association_name as string | undefined) || post.author || 'Association locale';
    }
    return post.author || 'Utilisateur';
  }, [metadata.association_name, post.author, postType]);

  const actorAvatar = useMemo(() => {
    if (['association_post', 'association_event'].includes(postType)) {
      return (metadata.association_logo_url as string | undefined) || post.avatar || null;
    }
    return post.avatar || null;
  }, [metadata.association_logo_url, post.avatar, postType]);

  const associationTitle = useMemo(() => {
    if (postType === 'association_post') {
      return (metadata.association_post_title as string | undefined) || '';
    }
    if (postType === 'association_event') {
      return (metadata.association_event_title as string | undefined) || '';
    }
    return '';
  }, [metadata, postType]);

  const associationSlug = (metadata.association_slug as string | undefined) || null;
  const associationEventId = metadata.association_event_id as number | string | undefined;

  const urgency = metadata.urgency as string | undefined;
  const urgencyLabel = urgency === 'red' ? 'Danger' : urgency === 'orange' ? 'Vigilance' : 'Info';
  const urgencyEmoji = urgency === 'red' ? '🔴' : urgency === 'orange' ? '🟠' : '🟡';
  const urgencyTone = urgency === 'red' ? 'danger' : urgency === 'orange' ? 'warning' : 'neutral';

  const threadedComments = useMemo(
    () => buildThreadedComments(post.comments ?? []),
    [post.comments],
  );

  const openAssociation = () => {
    if (!associationSlug) return;
    navigate(`/associations/${associationSlug}`);
  };

  const openAssociationEvent = () => {
    if (!associationEventId) return;
    navigate(`/associations/events/${associationEventId}`);
  };

  const react = (type: string) => {
    onReact?.({ postId: post.id as number, reactionType: type });
  };

  const openReplyFocus = () => {
    setShowComments(true);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const replyTo = (comment: FeedComment) => {
    setReplyingTo(comment);
    openReplyFocus();
  };

  const submitComment = () => {
    if (!newComment.trim() || !onComment) return;

    let parentId: number | null = null;
    if (replyingTo) {
      parentId = replyingTo.parent_id ?? replyingTo.id;
    }

    onComment({
      postId: post.id as number,
      content: newComment,
      parent_id: parentId,
      image_url: newCommentImage,
    });

    setNewComment('');
    setNewCommentImage(null);
    setReplyingTo(null);
    setShowCommentUploader(false);
  };

  const location = metadata.location as { lat: number; lng: number } | undefined;
  const commentCount = (post.comments ?? []).length;

  const imageUrl =
    IMAGE_POST_TYPES.includes(postType) && metadata.image_url ? String(metadata.image_url) : null;
  const imageLabel =
    postType === 'perdu_trouve'
      ? "Agrandir la photo de l'objet"
      : postType === 'signalement'
        ? 'Agrandir la photo du signalement'
        : 'Agrandir la photo de la publication';

  return (
    <article className="k-card flex flex-col gap-4 p-4 sm:p-5">
      <header className="flex items-start gap-3">
        {/* La pastille colorée du type se pose sur l'avatar : on reconnaît la
            nature de la publication avant même de lire la première ligne. */}
        <span className="relative shrink-0">
          <Avatar src={actorAvatar || 'https://i.pravatar.cc/150'} name={actorName} size={44} />
          <Chip
            tone={typeMeta.tone}
            size={26}
            className="absolute -bottom-1 -right-1 border-2 border-surface"
          >
            {typeEmoji}
          </Chip>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="k-callout k-ink truncate font-semibold">{actorName}</span>

            <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>

            {postType === 'entraide' ? (
              <Badge
                tone={metadata.entraideType === 'offer' ? 'success' : 'warm'}
                emoji={metadata.entraideType === 'offer' ? '🎁' : '🙋'}
              >
                {metadata.entraideType === 'offer' ? 'Offre' : 'Demande'}
              </Badge>
            ) : null}

            {postType === 'alerte' ? (
              <Badge tone={urgencyTone} emoji={urgencyEmoji}>
                Alerte {urgencyLabel}
              </Badge>
            ) : null}
          </div>

          <p className="k-footnote k-ink-tertiary mt-0.5">
            {formatDate(post.created_at as string | undefined)}
          </p>
        </div>
      </header>

      {associationTitle ? (
        <div>
          <h3 className="k-title-3">{associationTitle}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {associationSlug ? (
              <Button size="sm" variant="secondary" onClick={openAssociation}>
                Voir l&apos;association
              </Button>
            ) : null}
            {postType === 'association_event' && associationEventId ? (
              <Button size="sm" variant="tinted" onClick={openAssociationEvent}>
                Voir l&apos;événement
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="k-body k-ink k-measure whitespace-pre-line">{post.content}</p>

      {location ? (
        <div className="flex items-center gap-3 rounded-lg bg-cat-quartier-soft p-3">
          <Chip tone="quartier" size={34}>
            📍
          </Chip>
          <div className="min-w-0 flex-1">
            {metadata.automatic_address ? (
              <p className="k-footnote k-ink font-semibold">{String(metadata.automatic_address)}</p>
            ) : null}
            {metadata.manual_precision ? (
              <p className="k-footnote k-ink-secondary">{String(metadata.manual_precision)}</p>
            ) : null}
            {!metadata.automatic_address && !metadata.manual_precision ? (
              <p className="k-footnote k-ink-secondary">Localisation partagée</p>
            ) : null}
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`}
            target="_blank"
            rel="noreferrer"
            className="k-footnote text-cat-quartier-ink inline-flex shrink-0 items-center gap-1 font-semibold"
          >
            Voir
            <Icon name="externalLink" size={13} />
          </a>
        </div>
      ) : null}

      {postType === 'entraide' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="asso" emoji="🏷️">
            {(metadata.category as string | undefined) || 'Service'}
          </Badge>
          {metadata.availability ? (
            <Badge emoji="🕒">{String(metadata.availability)}</Badge>
          ) : null}
          {metadata.isVolunteer ? (
            <Badge tone="success" emoji="💚">
              Bénévole
            </Badge>
          ) : null}
        </div>
      ) : null}

      {postType === 'perdu_trouve' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={metadata.status === 'found' ? 'success' : 'danger'}
            emoji={metadata.status === 'found' ? '🎯' : '❓'}
          >
            {metadata.status === 'found' ? 'Trouvé' : 'Perdu'}
          </Badge>
          {metadata.itemType ? (
            <span className="k-subhead k-ink font-semibold">{String(metadata.itemType)}</span>
          ) : null}
          <span className="k-footnote k-ink-tertiary ml-auto">
            {formatDateShort(metadata.date as string | undefined)}
          </span>
        </div>
      ) : null}

      {postType === 'signalement' ? (
        <ol className="flex gap-2" aria-label="Avancement du signalement">
          {STEPS.map(({ step, emoji, label }) => {
            const active = isStatusActive(metadata, step);
            return (
              <li key={step} className="flex-1">
                <span
                  className={`block h-1.5 rounded-full ${
                    active
                      ? step === 'fixed'
                        ? 'bg-success'
                        : 'bg-cat-petition'
                      : 'bg-canvas-sunken'
                  }`}
                />
                <span
                  className={`k-caption mt-1.5 flex items-center gap-1 ${
                    active ? 'k-ink font-semibold' : 'k-ink-tertiary'
                  }`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {/* La photo porte la publication : elle est grande, elle s'agrandit au
          clic, et son repli reprend la couleur du type de contenu. */}
      {imageUrl ? (
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={imageLabel}
          className="k-press-subtle group block overflow-hidden rounded-lg"
        >
          <Media
            src={imageUrl}
            category={typeMeta.tone}
            emoji={typeEmoji}
            ratio="16 / 10"
            rounded="var(--k-radius-lg)"
          />
        </a>
      ) : null}

      {postType === 'entraide' ? (
        <Button variant="warm" block leading={<span aria-hidden="true">🤝</span>} onClick={openReplyFocus}>
          Proposer mon aide
        </Button>
      ) : null}

      {postType === 'perdu_trouve' ? (
        <Button variant="tinted" block leading={<span aria-hidden="true">💡</span>} onClick={openReplyFocus}>
          J&apos;ai une info
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((reaction) => {
          const count = getReactionCount(post, reaction.type);
          return (
            <button
              key={reaction.type}
              type="button"
              onClick={() => react(reaction.type)}
              aria-label={`${reaction.label} (${count})`}
              className={`k-press k-footnote inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full px-3 font-semibold transition-colors ${
                count > 0
                  ? 'bg-accent-soft text-accent-ink'
                  : 'k-ink-secondary bg-surface-secondary hover:bg-surface'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {reaction.emoji}
              </span>
              <span className="tabular-nums">{count}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          aria-label={`Commentaires (${commentCount})`}
          className="k-press k-footnote k-ink-secondary ml-auto inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full bg-surface-secondary px-3 font-semibold hover:bg-surface hover:text-accent-ink"
        >
          <Icon name="chatLines" size={16} />
          <span className="tabular-nums">{commentCount}</span>
        </button>
      </div>

      {showComments ? (
        <div className="k-animate-fade-in k-hairline-top flex flex-col gap-4 pt-4">
          {threadedComments.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {threadedComments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <Avatar
                    src={`https://i.pravatar.cc/150?u=${comment.user_id ?? comment.id}`}
                    name={comment.author}
                    size={34}
                  />
                  <div className="min-w-0 flex-1">
                    {/* La bulle donne au commentaire le grain d'un fil social
                        plutôt que celui d'une ligne de tableau. */}
                    <div className="k-card k-card--flat rounded-lg px-3.5 py-2.5">
                      <p className="k-subhead k-ink font-semibold">{comment.author}</p>
                      <p className="k-subhead k-ink-secondary whitespace-pre-line">
                        {comment.content}
                      </p>

                      {comment.image_url ? (
                        <SafeImage
                          src={comment.image_url}
                          className="mt-2 max-h-56 w-full rounded-md object-cover"
                          alt="Image du commentaire"
                        />
                      ) : null}
                    </div>

                    <div className="mt-1 flex items-center gap-3 pl-1">
                      <button
                        type="button"
                        onClick={() => replyTo(comment)}
                        className="k-caption text-accent-ink font-semibold"
                      >
                        Répondre
                      </button>
                      <span className="k-caption k-ink-tertiary">
                        {formatDateShort(comment.created_at)}
                      </span>
                    </div>

                    {comment.replies.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-2">
                        {comment.replies.map((reply) => (
                          <li key={reply.id} className="flex gap-2">
                            <Avatar
                              src={`https://i.pravatar.cc/150?u=${reply.user_id ?? reply.id}`}
                              name={reply.author}
                              size={26}
                            />
                            <div className="k-card k-card--flat min-w-0 flex-1 rounded-lg px-3 py-2">
                              <p className="k-caption k-ink font-semibold">{reply.author}</p>
                              <p className="k-caption k-ink-secondary whitespace-pre-line">
                                {reply.content}
                              </p>
                              {reply.image_url ? (
                                <SafeImage
                                  src={reply.image_url}
                                  className="mt-2 max-h-40 w-full rounded-md object-cover"
                                  alt="Image de la réponse"
                                />
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="k-footnote k-ink-tertiary">
              Pas encore de commentaire. Lancez la discussion !
            </p>
          )}

          {session ? (
            <div className="flex flex-col gap-2">
              {replyingTo ? (
                <div className="k-footnote text-accent-ink flex items-center justify-between gap-2 rounded-full bg-accent-soft px-3 py-1.5">
                  <span className="truncate">Réponse à {replyingTo.author}</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    aria-label="Annuler la réponse"
                    className="k-press shrink-0"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ) : null}

              <AutoGrowTextarea
                textareaRef={commentInputRef}
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                rows={1}
                placeholder="Votre commentaire..."
                aria-label="Votre commentaire"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-expanded={showCommentUploader}
                  onClick={() => setShowCommentUploader((v) => !v)}
                  leading={<Icon name="image" size={16} />}
                >
                  Joindre une image
                </Button>

                {newCommentImage ? (
                  <span className="k-caption text-success inline-flex items-center gap-1.5">
                    <Icon name="checkCircle" size={14} />
                    Image jointe
                    <button
                      type="button"
                      onClick={() => setNewCommentImage(null)}
                      aria-label="Retirer l'image jointe"
                      className="k-press text-danger"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </span>
                ) : null}

                <Button
                  className="ml-auto"
                  size="sm"
                  variant="primary"
                  onClick={submitComment}
                  disabled={!newComment.trim()}
                  loading={isCommentSubmitting}
                >
                  Envoyer
                </Button>
              </div>

              {showCommentUploader ? (
                <Suspense fallback={null}>
                  <ImageUploader
                    bucketName="post_images"
                    onUploadSuccess={(url) => setNewCommentImage(url)}
                  />
                </Suspense>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

const FeedPost = memo(FeedPostComponent);
export default FeedPost;
