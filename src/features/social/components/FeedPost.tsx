import { lazy, memo, Suspense, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import SafeImage from '@/components/ui/SafeImage';
import type { FeedComment, FeedPost as FeedPostType } from '@/lib/types/contract';

/** Comment image upload is rare — keep ImageUploader off the guest feed critical path (T-803). */
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

function FeedPostComponent({
  post,
  session,
  onReact,
  onComment,
  isCommentSubmitting = false,
}: FeedPostProps) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<FeedComment | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const postType = getPostType(post);
  const metadata = useMemo(() => post.metadata ?? {}, [post.metadata]);

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

  const getCardClasses = () => {
    switch (postType) {
      case 'alerte':
        return 'bg-red-50/30 border border-red-100';
      case 'signalement':
        return 'bg-white border border-gray-200';
      case 'entraide':
        return 'bg-amber-50/30 border border-amber-100';
      case 'perdu_trouve':
        return 'bg-blue-50/30 border border-blue-100';
      case 'association_post':
        return 'bg-emerald-50/40 border border-emerald-100';
      case 'association_event':
        return 'bg-blue-50/40 border border-blue-100';
      default:
        return 'bg-white border border-gray-100';
    }
  };

  const getBorderClass = () => {
    switch (postType) {
      case 'alerte':
        return 'bg-red-500';
      case 'signalement':
        return 'bg-gray-600';
      case 'entraide':
        return 'bg-amber-500';
      case 'perdu_trouve':
        return 'bg-blue-500';
      case 'village_square':
        return 'bg-emerald-500';
      case 'association_post':
        return 'bg-emerald-600';
      case 'association_event':
        return 'bg-blue-600';
      default:
        return 'bg-transparent';
    }
  };

  const getTypeIcon = () => {
    switch (postType) {
      case 'alerte':
        return '⚠️';
      case 'signalement':
        return '📸';
      case 'entraide':
        return '🤝';
      case 'perdu_trouve':
        return '🔍';
      case 'village_square':
        return '🏟️';
      case 'association_post':
        return '🤝';
      case 'association_event':
        return '📅';
      default:
        return '💬';
    }
  };

  const urgency = metadata.urgency as string | undefined;
  const getUrgencyClass = () => {
    if (urgency === 'red') return 'bg-red-600 text-white shadow-red-200 shadow-lg';
    if (urgency === 'orange') return 'bg-orange-500 text-white';
    return 'bg-yellow-400 text-yellow-900';
  };

  const getUrgencyLabel = () => {
    if (urgency === 'red') return 'DANGER';
    if (urgency === 'orange') return 'VIGILANCE';
    return 'INFO';
  };

  const threadedComments = useMemo(
    () => buildThreadedComments(post.comments ?? []),
    [post.comments],
  );

  const viewImage = (url: string) => {
    window.open(url, '_blank');
  };

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
  };

  const location = metadata.location as { lat: number; lng: number } | undefined;

  return (
    <div
      className={`card-container relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${getCardClasses()}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBorderClass()}`} />

      <div className="p-4 pl-6 flex items-start gap-3">
        <SafeImage
          src={actorAvatar || 'https://i.pravatar.cc/150'}
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
          alt="Avatar"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 truncate">{actorName}</span>
            {postType === 'entraide' && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                  metadata.entraideType === 'offer'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {metadata.entraideType === 'offer' ? '🎁 Offre' : '🙏 Demande'}
              </span>
            )}
            {postType === 'alerte' && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide animate-pulse ${getUrgencyClass()}`}
              >
                ⚠️ ALERTE {getUrgencyLabel()}
              </span>
            )}
            {postType === 'association_post' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                Association
              </span>
            )}
            {postType === 'association_event' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
                Événement associatif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{formatDate(post.created_at as string | undefined)}</p>
        </div>
        <div className="text-2xl opacity-80" title={postType}>
          {getTypeIcon()}
        </div>
      </div>

      <div className="px-6 pb-2">
        {associationTitle ? (
          <div className="mb-3">
            <p className="text-lg font-bold text-slate-900">{associationTitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {associationSlug ? (
                <button
                  type="button"
                  onClick={openAssociation}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Voir l&apos;association
                </button>
              ) : null}
              {postType === 'association_event' && associationEventId ? (
                <button
                  type="button"
                  onClick={openAssociationEvent}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  Voir l&apos;événement
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="text-slate-800 mb-3 whitespace-pre-line leading-relaxed">{post.content}</p>

        {location ? (
          <div className="mb-3">
            <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="min-w-[40px] h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                🗺️
              </div>
              <div>
                {metadata.automatic_address ? (
                  <p className="text-xs font-bold text-slate-700">📍 {String(metadata.automatic_address)}</p>
                ) : null}
                {metadata.manual_precision ? (
                  <p className="text-xs text-slate-600 italic">👉 {String(metadata.manual_precision)}</p>
                ) : null}
                {!metadata.automatic_address && !metadata.manual_precision ? (
                  <p className="text-xs text-slate-500">Localisation partagée</p>
                ) : null}
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Voir
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                </svg>
              </a>
            </div>
          </div>
        ) : null}

        {postType === 'entraide' ? (
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 mb-3 text-sm">
            <div className="flex flex-wrap gap-3 text-amber-900">
              <span className="flex items-center gap-1 font-semibold">
                🏷️ {(metadata.category as string | undefined) || 'Service'}
              </span>
              {metadata.availability ? (
                <span className="flex items-center gap-1">📅 {String(metadata.availability)}</span>
              ) : null}
              {metadata.isVolunteer ? (
                <span className="flex items-center gap-1 font-bold text-green-600">💚 Bénévole</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {postType === 'perdu_trouve' ? (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-3 py-1 rounded-full font-bold text-xs uppercase ${
                  metadata.status === 'found' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {metadata.status === 'found' ? 'Trouvé' : 'Perdu'}
              </span>
              <span className="font-bold text-slate-700">{String(metadata.itemType ?? '')}</span>
              <span className="text-slate-500 text-sm ml-auto">
                🗓️ {formatDateShort(metadata.date as string | undefined)}
              </span>
            </div>
            {metadata.image_url ? (
              <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100 mb-2 relative group">
                <SafeImage
                  src={String(metadata.image_url)}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                  onClick={() => viewImage(String(metadata.image_url))}
                  alt="Objet perdu/trouvé"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white font-bold tracking-wider pointer-events-none">
                  {metadata.status === 'found' ? 'TROUVÉ' : 'PERDU'}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {postType === 'signalement' ? (
          <div className="mb-3">
            <div className="bg-gray-100 rounded-full h-2 mb-2 overflow-hidden flex">
              <div className="bg-blue-500 h-full w-1/3" />
              <div
                className={`h-full w-1/3 transition-colors ${isStatusActive(metadata, 'in_progress') ? 'bg-blue-500' : 'bg-gray-200'}`}
              />
              <div
                className={`h-full w-1/3 transition-colors ${isStatusActive(metadata, 'fixed') ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">
              <span className="text-blue-600">Signalé</span>
              <span className={isStatusActive(metadata, 'in_progress') ? 'text-blue-600' : ''}>En cours</span>
              <span className={isStatusActive(metadata, 'fixed') ? 'text-green-600' : ''}>Résolu</span>
            </div>
            {metadata.image_url ? (
              <div className="rounded-lg overflow-hidden h-40 w-full mb-2">
                <SafeImage
                  src={String(metadata.image_url)}
                  className="w-full h-full object-cover"
                  alt="Signalement"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {['regular', 'alerte', 'entraide', 'village_square'].includes(postType) && metadata.image_url ? (
          <div className="mb-3 rounded-xl overflow-hidden border border-slate-100">
            <SafeImage
              src={String(metadata.image_url)}
              className="w-full max-h-80 object-cover cursor-pointer"
              onClick={() => viewImage(String(metadata.image_url))}
              alt="Post image"
            />
          </div>
        ) : null}
      </div>

      <div className="bg-gray-50/50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 relative group-reactions">
          <button
            type="button"
            onClick={() => react('like')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white transition-colors text-slate-600 hover:text-blue-600 font-medium text-sm"
          >
            <span>👍</span>
            <span>{getReactionCount(post, 'like')}</span>
          </button>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:group-reactions:opacity-100 transition-opacity duration-300">
            <button type="button" onClick={() => react('pray')} className="hover:scale-125 transition-transform p-1">
              🙏 <span className="text-xs text-gray-400 ml-0.5">{getReactionCount(post, 'pray')}</span>
            </button>
            <button type="button" onClick={() => react('eyes')} className="hover:scale-125 transition-transform p-1">
              👀 <span className="text-xs text-gray-400 ml-0.5">{getReactionCount(post, 'eyes')}</span>
            </button>
            <button type="button" onClick={() => react('hands')} className="hover:scale-125 transition-transform p-1">
              🙌 <span className="text-xs text-gray-400 ml-0.5">{getReactionCount(post, 'hands')}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{(post.comments ?? []).length}</span>
        </button>
      </div>

      {postType === 'entraide' ? (
        <div className="px-6 pb-4">
          <button
            type="button"
            onClick={openReplyFocus}
            className="w-full py-2 bg-amber-100 text-amber-900 font-bold rounded-xl hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
          >
            🤝 Proposer mon aide
          </button>
        </div>
      ) : null}

      {postType === 'perdu_trouve' ? (
        <div className="px-6 pb-4">
          <button
            type="button"
            onClick={openReplyFocus}
            className="w-full py-2 bg-blue-100 text-blue-900 font-bold rounded-xl hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
          >
            💬 J&apos;ai une info !
          </button>
        </div>
      ) : null}

      {showComments ? (
        <div className="bg-gray-50 border-t border-gray-100 p-4 animate-fade-in">
          <div className="space-y-4 mb-4">
            {threadedComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <SafeImage
                  src={`https://i.pravatar.cc/150?u=${comment.user_id ?? comment.id}`}
                  className="w-8 h-8 rounded-full bg-gray-200"
                  alt="Author"
                />
                <div className="flex-1">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border border-gray-100">
                    <span className="font-bold text-slate-900 block mb-1">{comment.author}</span>
                    <p className="text-slate-700">{comment.content}</p>
                    {comment.image_url ? (
                      <SafeImage
                        src={comment.image_url}
                        className="mt-2 rounded-lg max-h-40 object-cover"
                        alt="Comment image"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2">
                    <button
                      type="button"
                      onClick={() => replyTo(comment)}
                      className="text-xs font-semibold text-slate-500 hover:text-blue-600"
                    >
                      Répondre
                    </button>
                    <span className="text-xs text-gray-400">{formatDateShort(comment.created_at)}</span>
                  </div>
                  {comment.replies.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <SafeImage
                            src={`https://i.pravatar.cc/150?u=${reply.user_id ?? reply.id}`}
                            className="w-6 h-6 rounded-full bg-gray-200"
                            alt="Author"
                          />
                          <div className="bg-white p-2 rounded-xl rounded-tl-none shadow-sm text-xs border border-gray-100 flex-1">
                            <span className="font-bold text-slate-900 block">{reply.author}</span>
                            <p className="text-slate-700">{reply.content}</p>
                            {reply.image_url ? (
                              <SafeImage
                                src={reply.image_url}
                                className="mt-2 rounded-lg max-h-32 object-cover"
                                alt="Reply image"
                              />
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {session ? (
            <div className="flex flex-col gap-2 bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
              {replyingTo ? (
                <div className="flex justify-between items-center text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                  <span>Réponse à {replyingTo.author}</span>
                  <button type="button" onClick={() => setReplyingTo(null)}>
                    ✕
                  </button>
                </div>
              ) : null}

              <textarea
                ref={commentInputRef}
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                rows={1}
                placeholder="Votre commentaire..."
                className="w-full resize-none bg-transparent border-none focus:ring-0 text-sm py-1 outline-none"
              />

              <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                <div className="relative">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="Joindre une image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <div className="absolute top-0 left-0 w-8 h-8 opacity-0 overflow-hidden">
                    <Suspense fallback={null}>
                      <ImageUploader
                        bucketName="post_images"
                        onUploadSuccess={(url) => setNewCommentImage(url)}
                      />
                    </Suspense>
                  </div>
                </div>

                {newCommentImage ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    🖼️ Image jointe{' '}
                    <button type="button" onClick={() => setNewCommentImage(null)} className="text-red-500 font-bold">
                      x
                    </button>
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!newComment.trim() || isCommentSubmitting}
                  className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isCommentSubmitting ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const FeedPost = memo(FeedPostComponent);
export default FeedPost;
