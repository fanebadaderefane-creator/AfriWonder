import React, { useState, useRef } from 'react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Heart, Send, Coins } from 'lucide-react';

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

  onRefresh

}) {

  const [newComment, setNewComment] = useState('');

  const [replyingTo, setReplyingTo] = useState(null);

  const [editingComment, setEditingComment] = useState(null);

  const [likedComments, setLikedComments] = useState(new Set());
  const [expandedComments, setExpandedComments] = useState(new Set());
  const inputRef = useRef(null);

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
    setReplyingTo(comment);
    const name = comment?.user_name ?? comment?.user?.full_name ?? comment?.user?.username ?? 'Utilisateur';
    setNewComment(`@${name} `);
    inputRef.current?.focus();
  };



  const handleLikeComment = async (comment) => {

    if (!user) {

      toast.error('Connectez-vous pour aimer');

      return;

    }

    

    const isLiked = likedComments.has(comment.id);

    

    // Update local state immediately

    setLikedComments(prev => {

      const next = new Set(prev);

      if (isLiked) {

        next.delete(comment.id);

      } else {

        next.add(comment.id);

      }

      return next;

    });



    // Update comment likes in database

    try {

      await api.entities.Comment.update(comment.id, {

        likes: isLiked ? Math.max(0, (comment.likes || 0) - 1) : (comment.likes || 0) + 1

      });

    } catch (error) {

      // Revert local state on error

      setLikedComments(prev => {

        const next = new Set(prev);

        if (isLiked) {

          next.add(comment.id);

        } else {

          next.delete(comment.id);

        }

        return next;

      });

      toast.error('Erreur lors de la mise à jour');

    }

  };



  const formatTime = (date) => {

    if (!date) return '';

    const now = new Date();

    const diff = (now - new Date(date)) / 1000;

    if (diff < 60) return 'à l\'instant';

    if (diff < 3600) return `${Math.floor(diff / 60)}m`;

    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;

    if (diff < 604800) return `${Math.floor(diff / 86400)}j`;

    return `${Math.floor(diff / 604800)}sem`;

  };

  const getCommentUserId = (c) => c?.user_id ?? c?.user?.id;
  const getCommentUserName = (c) => c?.user_name ?? c?.user?.full_name ?? c?.user?.username ?? '';

  const renderCommentRow = (comment, isReply = false) => {
    const commentUserId = getCommentUserId(comment);
    const isOwn = user?.id === commentUserId;
    const displayName = getCommentUserName(comment);
    const text = comment.content || comment.text || '';
    const isLong = text.length > MAX_COMMENT_LENGTH;
    const isExpanded = expandedComments.has(comment.id);
    const displayText = !isLong ? text : (isExpanded ? text : text.slice(0, MAX_COMMENT_LENGTH) + '...');

    return (
      <div
        key={comment.id}
        className={cn(
          'flex gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-3 shadow-[0_14px_40px_rgba(2,6,23,0.16)] backdrop-blur-xl',
          isReply && 'ml-10 mt-3 border-white/6 bg-white/[0.02]'
        )}
      >
        <Avatar className="h-9 w-9 flex-shrink-0 border border-white/12">
          <AvatarImage src={comment.user_avatar ?? comment.user?.profile_image} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs text-white">
            {displayName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{displayName}</span>
            {comment.is_creator && (
              <span className="rounded-full border border-blue-400/18 bg-blue-400/12 px-2 py-0.5 text-xs font-medium text-blue-200">
                Créateur
              </span>
            )}
            <span className="text-xs text-white/38">
              {formatTime(comment.created_date ?? comment.created_at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/82">{displayText}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => toggleCommentExpand(comment.id)}
              className="mt-1 text-xs font-medium text-blue-300 transition-colors hover:text-blue-200"
            >
              {isExpanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => handleLikeComment(comment)}
              className="flex items-center gap-1 text-white/44 transition hover:text-red-400"
            >
              <Heart
                className={cn(
                  'w-4 h-4 transition-all',
                  likedComments.has(comment.id) ? 'text-red-500 fill-red-500' : ''
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  likedComments.has(comment.id) ? 'text-red-400' : ''
                )}
              >
                {(comment.likes || 0) + (likedComments.has(comment.id) ? 1 : 0)}
              </span>
            </button>
            <button
              onClick={() => handleReply(comment)}
              className="text-xs font-medium text-white/46 transition hover:text-blue-300"
            >
              Répondre
            </button>
          </div>
        </div>
        <CommentActions
          comment={comment}
          isOwnComment={isOwn}
          onDelete={handleDeleteComment}
          onEdit={handleEditComment}
          onReport={() => toast.info('Signalement envoyé')}
        />
      </div>
    );
  };

  return (

    <Sheet open={isOpen} onOpenChange={onClose}>

      <SheetContent side="bottom" className="h-[78vh] rounded-t-[32px] border border-white/10 bg-[#0b111d] px-0 text-white shadow-[0_-24px_80px_rgba(2,6,23,0.42)]">

        <SheetHeader className="border-b border-white/8 px-4 pb-3">

          <SheetTitle className="text-center text-base font-semibold tracking-[-0.03em] text-white">

            {(comments?.length || 0) + (comments?.reduce((acc, c) => acc + (c.replies?.length || 0), 0) || 0)} commentaires

          </SheetTitle>

        </SheetHeader>



        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex h-[calc(78vh-72px)] flex-col"
        >
        {/* Comments List */}

        <div className="max-h-[calc(78vh-154px)] flex-1 space-y-4 overflow-y-auto px-4 py-4">

          <AnimatePresence>
            {comments?.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-0"
              >
                {renderCommentRow(comment, false)}
                {(comment.replies || []).map((reply) => (
                  <div key={reply.id}>{renderCommentRow(reply, true)}</div>
                ))}
              </motion.div>
            ))}
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

          <div className="flex items-center justify-between border-t border-white/8 bg-white/[0.03] px-4 py-2">

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
          className="flex items-center gap-3 border-t border-white/8 bg-[#0b111d] px-4 py-3"
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
