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
        className={cn('flex gap-3', isReply && 'ml-10 mt-3 pl-2 border-l-2 border-orange-100')}
      >
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.user_avatar ?? comment.user?.profile_image} />
          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-xs">
            {displayName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{displayName}</span>
            {comment.is_creator && (
              <span className="bg-orange-500/10 text-orange-500 text-xs px-2 py-0.5 rounded-full font-medium">
                Créateur
              </span>
            )}
            <span className="text-gray-400 text-xs">
              {formatTime(comment.created_date ?? comment.created_at)}
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">{displayText}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => toggleCommentExpand(comment.id)}
              className="text-xs text-orange-500 font-medium mt-0.5 hover:text-orange-600"
            >
              {isExpanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleLikeComment(comment)}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition"
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
                  likedComments.has(comment.id) ? 'text-red-500' : ''
                )}
              >
                {(comment.likes || 0) + (likedComments.has(comment.id) ? 1 : 0)}
              </span>
            </button>
            <button
              onClick={() => handleReply(comment)}
              className="text-xs text-gray-400 hover:text-orange-500 font-medium transition"
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

      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl px-0">

        <SheetHeader className="px-4 pb-3 border-b">

          <SheetTitle className="text-center font-bold">

            {(comments?.length || 0) + (comments?.reduce((acc, c) => acc + (c.replies?.length || 0), 0) || 0)} commentaires

          </SheetTitle>

        </SheetHeader>



        {/* Comments List */}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 max-h-[calc(70vh-140px)]">

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



          {(!comments || comments.length === 0) && (

            <div className="text-center py-12 text-gray-400">

              <p>Soyez le premier à commenter !</p>

            </div>

          )}

        </div>



        {/* Reply/Edit indicator */}

        {(replyingTo || editingComment) && (

          <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">

            <span className="text-sm text-gray-500">

              {editingComment ? (

                <>Modification du commentaire</>

              ) : (

                <>Réponse à <span className="font-semibold">@{getCommentUserName(replyingTo) || 'Utilisateur'}</span></>

              )}

            </span>

            <button 

              onClick={handleCancelEdit}

              className="text-sm text-orange-500 font-medium"

            >

              Annuler

            </button>

          </div>

        )}



        {/* Input */}

        <form onSubmit={handleSubmit} className="px-4 py-3 border-t bg-white flex items-center gap-3">

          <Button

            type="button"

            variant="outline"

            size="icon"

            onClick={onTip}

            className="flex-shrink-0 border-orange-200 text-orange-500 hover:bg-orange-50"

          >

            <Coins className="w-5 h-5" />

          </Button>

          

          <Input

            ref={inputRef}

            value={newComment}

            onChange={(e) => setNewComment(e.target.value)}

            placeholder="Ajouter un commentaire..."

            className="flex-1 border-gray-200 rounded-full bg-gray-50 focus:bg-white"

          />

          

          <Button

            type="submit"

            size="icon"

            disabled={!newComment.trim()}

            className="flex-shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50"

          >

            <Send className="w-5 h-5" />

          </Button>

        </form>

      </SheetContent>

    </Sheet>

  );

}
