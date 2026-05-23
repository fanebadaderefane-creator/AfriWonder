import React, { useState, useRef, useEffect } from 'react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Heart, Send, Coins, ChevronDown, ChevronUp, Pin } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

import { api } from '@/api/expressClient';

import { cn } from "@/lib/utils";

import { toast } from "sonner";

import CommentActions from './CommentActions';



export default function CommentSheet({ 

  isOpen, 

  onClose, 

  videoId, 

  comments = [], 
  isLoading = false,
  isError = false,
  onRetry,

  onTip,

  user,
  onRequireAuth,

  onRefresh,

  /** Créateur de la vidéo — peut épingler des commentaires. */
  videoCreatorId = null,

}) {

  const [newComment, setNewComment] = useState('');

  const [replyingTo, setReplyingTo] = useState(null);

  const [editingComment, setEditingComment] = useState(null);

  const [likedComments, setLikedComments] = useState(new Set());
  const [expandedComments, setExpandedComments] = useState(new Set());
  /** Fils de réponses repliés par défaut (style TikTok). */
  const [collapsedThreads, setCollapsedThreads] = useState(() => new Set());
  const inputRef = useRef(null);

  const threadSignature =
    comments?.map((c) => `${c.id}:${c.replies?.length ?? 0}`).join('|') ?? '';

  useEffect(() => {
    if (!isOpen) return;
    if (!threadSignature) {
      setCollapsedThreads(new Set());
      return;
    }
    const withReplies = (comments || [])
      .filter((c) => (c.replies?.length || 0) > 0)
      .map((c) => c.id);
    setCollapsedThreads(new Set(withReplies));
  }, [isOpen, videoId, threadSignature]);

  const MAX_COMMENT_LENGTH = 120;

  const toggleCommentExpand = (commentId) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (newComment.trim()) {
      if (!user) {
        onRequireAuth?.('commenter');
        return;
      }

      if (editingComment) {

        // Update existing comment

        try {

          await api.entities.Comment.update(editingComment.id, {

            content: newComment

          });

          toast.success('Commentaire modifié');

          setEditingComment(null);

          onRefresh?.();

        } catch (error) {

          toast.error('Erreur lors de la modification');

        }

      } else {

        // Add new comment

        if (videoId) {

          try {

            await api.videos.comment(videoId, newComment, replyingTo?.id || null);

            toast.success('Commentaire ajouté');

            onRefresh?.();

          } catch (error) {

            toast.error('Erreur lors de l\'ajout du commentaire');

          }

        }

      }

      setNewComment('');

      setReplyingTo(null);

    }

  };



  const handleDeleteComment = async (commentId) => {

    if (confirm('Supprimer ce commentaire ?')) {

      try {

        await api.entities.Comment.delete(commentId);

        toast.success('Commentaire supprimé');

        onRefresh?.();

      } catch (error) {

        toast.error('Erreur lors de la suppression');

      }

    }

  };



  const handleEditComment = (comment) => {

    setEditingComment(comment);

    setNewComment(comment.content || comment.text);

    inputRef.current?.focus();

  };



  const handleCancelEdit = () => {

    setEditingComment(null);

    setNewComment('');

    setReplyingTo(null);

  };



  const handleReply = (comment) => {
    if (!user) {
      onRequireAuth?.('commenter');
      return;
    }
    setReplyingTo(comment);
    const name = comment?.user_name ?? comment?.user?.full_name ?? comment?.user?.username ?? 'Utilisateur';
    setNewComment(`@${name} `);
    inputRef.current?.focus();
  };



  const handleLikeComment = async (comment) => {
    if (!user) {
      onRequireAuth?.('réagir');
      return;
    }
    try {
      const res = await api.commentSocial.react(comment.id, 'like');
      setLikedComments((prev) => {
        const next = new Set(prev);
        if (res?.my_reaction === 'like') next.add(comment.id);
        else next.delete(comment.id);
        return next;
      });
      onRefresh?.();
    } catch (error) {
      toast.error('Erreur lors de la réaction');
    }
  };

  const handleCommentReaction = async (comment, type) => {
    if (!user) {
      onRequireAuth?.('réagir');
      return;
    }
    try {
      await api.commentSocial.react(comment.id, type);
      onRefresh?.();
    } catch (error) {
      toast.error('Erreur lors de la réaction');
    }
  };

  const handlePinComment = async (comment) => {
    if (!user || String(user.id) !== String(videoCreatorId)) return;
    try {
      await api.entities.Comment.update(comment.id, { is_pinned: !comment.is_pinned });
      toast.success(comment.is_pinned ? 'Commentaire désépinglé' : 'Commentaire épinglé');
      onRefresh?.();
    } catch (error) {
      toast.error('Impossible d’épingler');
    }
  };



  const formatTime = (date) => {
    if (!date) return '';
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'À l’instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`;
    if (diff < 2592000) return `Il y a ${Math.floor(diff / 604800)} sem`;
    return `Il y a ${Math.floor(diff / 2592000)} mois`;
  };

  const toggleThread = (commentId) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const getCommentUserId = (c) => c?.user_id ?? c?.user?.id;
  const getCommentUserName = (c) => c?.user_name ?? c?.user?.full_name ?? c?.user?.username ?? '';

  const renderCommentRow = (comment, isReply = false) => {
    const commentUserId = getCommentUserId(comment);
    const isOwn = user?.id === commentUserId;
    const displayName = getCommentUserName(comment) || 'Utilisateur';
    const text = comment.content || comment.text || '';
    const isLong = text.length > MAX_COMMENT_LENGTH;
    const isExpanded = expandedComments.has(comment.id);
    const displayText = !isLong ? text : isExpanded ? text : `${text.slice(0, MAX_COMMENT_LENGTH)}…`;
    const reactionTotal = Number(comment._count?.reactions ?? 0);
    const liked = likedComments.has(comment.id);

    return (
      <div
        className={cn(
          'flex gap-3 py-4',
          isReply && 'py-3 pl-0'
        )}
      >
        <Avatar
          className={cn(
            'flex-shrink-0 border-0 ring-0',
            isReply ? 'h-9 w-9' : 'h-11 w-11'
          )}
        >
          <AvatarImage src={comment.user_avatar ?? comment.user?.profile_image} />
          <AvatarFallback className="bg-zinc-800 text-sm font-semibold text-white">
            {displayName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[13px] font-semibold leading-tight text-white/65">{displayName}</span>
              {comment.is_creator && (
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                  Créateur
                </span>
              )}
              {comment.is_pinned ? (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200/95">
                  Épinglé
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {user?.id && String(videoCreatorId) === String(user.id) && !isReply ? (
                <button
                  type="button"
                  onClick={() => handlePinComment(comment)}
                  className="rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white/80"
                  aria-label={comment.is_pinned ? 'Désépingler' : 'Épingler'}
                  title={comment.is_pinned ? 'Désépingler' : 'Épingler'}
                >
                  <Pin className={cn('h-4 w-4', comment.is_pinned && 'text-amber-300')} />
                </button>
              ) : null}
              <CommentActions
                comment={comment}
                isOwnComment={isOwn}
                onDelete={handleDeleteComment}
                onEdit={handleEditComment}
                onReport={() => toast.info('Signalement envoyé')}
                className="-mr-1 -mt-1"
              />
            </div>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] font-bold leading-snug tracking-[-0.01em] text-white">
            {displayText}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => toggleCommentExpand(comment.id)}
              className="mt-1 text-[12px] font-semibold text-white/45 hover:text-white/70"
            >
              {isExpanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[12px] text-white/38">{formatTime(comment.created_date ?? comment.created_at)}</span>
              <button
                type="button"
                onClick={() => handleReply(comment)}
                className="text-[12px] font-semibold text-white/38 hover:text-white/55"
              >
                Répondre
              </button>
              {user?.id ? (
                <span className="flex items-center gap-1 text-[12px]">
                  <button
                    type="button"
                    className="rounded px-1 text-base leading-none hover:bg-white/10"
                    aria-label="Rire"
                    onClick={() => handleCommentReaction(comment, 'laugh')}
                  >
                    😂
                  </button>
                  <button
                    type="button"
                    className="rounded px-1 text-base leading-none hover:bg-white/10"
                    aria-label="Feu"
                    onClick={() => handleCommentReaction(comment, 'fire')}
                  >
                    🔥
                  </button>
                  <button
                    type="button"
                    className="rounded px-1 text-base leading-none hover:bg-white/10"
                    aria-label="Wow"
                    onClick={() => handleCommentReaction(comment, 'wow')}
                  >
                    😮
                  </button>
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <button
                type="button"
                onClick={() => handleLikeComment(comment)}
                className="flex items-center gap-1.5 text-[12px] text-white/38 hover:text-white/55"
                aria-label="J’aime"
              >
                <Heart
                  className={cn(
                    'h-[18px] w-[18px] transition-colors',
                    liked ? 'fill-red-500 text-red-500' : 'fill-transparent text-white/45'
                  )}
                  strokeWidth={liked ? 0 : 2}
                />
              </button>
              {reactionTotal > 0 ? (
                <span className="text-[10px] tabular-nums text-white/35">{reactionTotal} réactions</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (

    <Sheet open={isOpen} onOpenChange={onClose}>

      <SheetContent
        side="bottom"
        className={cn(
          'flex h-[82vh] max-h-[640px] flex-col rounded-t-2xl border-0 bg-black p-0 text-white shadow-none',
          '[&>button]:rounded-full [&>button]:border-0 [&>button]:bg-zinc-800 [&>button]:text-zinc-100',
          '[&>button]:hover:bg-zinc-700 [&>button]:focus-visible:ring-zinc-600'
        )}
      >
        <SheetHeader className="space-y-0 px-4 pb-3 pt-2 text-left sm:text-left">
          <SheetTitle className="pr-12 text-left text-[17px] font-bold tracking-[-0.02em] text-white">
            Commentaires
            <span className="ml-2 text-[13px] font-normal text-white/45">
              {(comments?.length || 0) +
                (comments?.reduce((acc, c) => acc + (c.replies?.length || 0), 0) || 0)}
            </span>
          </SheetTitle>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex min-h-0 flex-1 flex-col"
        >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1">

          <AnimatePresence>
            {comments?.map((comment, index) => {
              const replyList = comment.replies || [];
              const n = replyList.length;
              const threadCollapsed = n > 0 && collapsedThreads.has(comment.id);
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  {renderCommentRow(comment, false)}
                  {n > 0 && threadCollapsed && (
                    <div className="-mt-1 pb-4 pl-14">
                      <button
                        type="button"
                        onClick={() => toggleThread(comment.id)}
                        className="inline-flex items-center gap-2 text-left text-[13px] font-semibold text-white/45 hover:text-white/65"
                      >
                        <span className="h-px w-8 shrink-0 bg-white/30" aria-hidden />
                        Afficher {n} réponse{n > 1 ? 's' : ''}
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                  {n > 0 && !threadCollapsed && (
                    <div className="border-l border-white/[0.08] pb-2 pl-3 ml-3 sm:ml-4">
                      {replyList.map((reply) => (
                        <div key={reply.id}>{renderCommentRow(reply, true)}</div>
                      ))}
                      <button
                        type="button"
                        onClick={() => toggleThread(comment.id)}
                        className="mb-1 mt-1 inline-flex items-center gap-2 pl-2 text-[13px] font-semibold text-white/45 hover:text-white/65"
                      >
                        <span className="h-px w-8 shrink-0 bg-white/30" aria-hidden />
                        Masquer les réponses
                        <ChevronUp className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>



          {isLoading && (
            <div className="py-12 text-center text-white/46">
              <p>Chargement des commentaires...</p>
            </div>
          )}

          {!isLoading && isError && (
            <div className="py-12 text-center text-white/46">
              <p>Impossible de charger les commentaires.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => onRetry?.()}
                className="mt-3 rounded-full border-white/12 bg-white/[0.04] text-white/78 hover:bg-white/[0.08] hover:text-white"
              >
                Réessayer
              </Button>
            </div>
          )}

          {!isLoading && !isError && (!comments || comments.length === 0) && (

            <div className="py-12 text-center text-white/46">

              <p>Soyez le premier à commenter !</p>

            </div>

          )}

        </div>



        {/* Reply/Edit indicator */}

        {(replyingTo || editingComment) && (

          <div className="flex items-center justify-between border-t border-white/10 bg-black px-4 py-2">

            <span className="text-sm text-white/58">

              {editingComment ? (

                <>Modification du commentaire</>

              ) : (

                <>Réponse à <span className="font-semibold">@{getCommentUserName(replyingTo) || 'Utilisateur'}</span></>

              )}

            </span>

            <button 

              onClick={handleCancelEdit}

              className="text-sm font-medium text-blue-300"

            >

              Annuler

            </button>

          </div>

        )}



        {/* Input */}

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.04 }}
          className="flex items-center gap-3 border-t border-white/10 bg-black px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        >

          <motion.div whileTap={{ scale: 0.96 }}>
          <Button

            type="button"

            variant="outline"

            size="icon"

            onClick={(e) => { e?.stopPropagation?.(); onTip?.(); }}

            className="flex-shrink-0 rounded-full border-white/12 bg-white/[0.04] text-blue-300 hover:bg-white/[0.08] hover:text-blue-200"

          >

            <Coins className="w-5 h-5" />

          </Button>
          </motion.div>

          

          <Input

            ref={inputRef}

            value={newComment}

            onChange={(e) => setNewComment(e.target.value)}

            placeholder="Ajouter un commentaire..."

            className="h-12 flex-1 rounded-full border-white/10 bg-white/[0.04] text-base text-white placeholder:text-white/30 caret-white focus:bg-white/[0.06] focus:text-white"

          />

          

          <motion.div whileTap={{ scale: 0.96 }}>
          <Button

            type="submit"

            size="icon"

            disabled={!newComment.trim()}

            className="flex-shrink-0 rounded-full bg-white text-slate-950 hover:bg-white/92 disabled:opacity-50"

          >

            <Send className="w-5 h-5" />

          </Button>
          </motion.div>

        </motion.form>
        </motion.div>

      </SheetContent>

    </Sheet>

  );

}
