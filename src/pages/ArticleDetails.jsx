import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, Heart, Eye, Loader2, Send, Share2, Reply
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';
import { createPageUrl } from '@/utils';

export default function ArticleDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const idOrSlug = searchParams.get('id') || searchParams.get('slug') || '';
  const stateArticle = location.state?.article;
  const isMock = !!stateArticle?._mock;

  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: payload, isLoading } = useQuery({
    queryKey: ['article', idOrSlug],
    queryFn: () => api.news.getByIdOrSlug(idOrSlug),
    enabled: !!idOrSlug && !isMock,
  });

  const article = isMock ? stateArticle : payload?.article;
  const likeStatus = isMock ? { liked: false } : (payload?.likeStatus ?? { liked: false });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['article-comments', article?.id],
    queryFn: () => api.news.getComments(article.id, 1, 50),
    enabled: !!article?.id && !isMock,
  });

  const { data: hasPremiumAccess = false } = useQuery({
    queryKey: ['news-premium-access'],
    queryFn: () => api.news.hasPremiumAccess(),
    enabled: !!user?.id && !!article?.is_premium && !isMock,
  });

  const likeMutation = useMutation({
    mutationFn: () => (isMock ? Promise.resolve({ liked: true }) : api.news.toggleLike(article.id)),
    onSuccess: (data) => {
      if (isMock) {
        toast.success('Exemple — like enregistré sur les vrais articles');
        return;
      }
      queryClient.setQueryData(['article', idOrSlug], (prev) => ({
        ...prev,
        article: prev?.article
          ? { ...prev.article, likes_count: prev.article.likes_count + (data.liked ? 1 : -1) }
          : prev?.article,
        likeStatus: { liked: data.liked },
      }));
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  const shareMutation = useMutation({
    mutationFn: () => (isMock ? Promise.resolve() : api.news.share(article.id)),
    onSuccess: () => {
      if (!isMock) queryClient.invalidateQueries({ queryKey: ['article', idOrSlug] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      isMock ? Promise.resolve({ id: 'mock' }) : api.news.addComment(article.id, newComment.trim(), replyToId),
    onSuccess: () => {
      if (isMock) {
        toast.info('Exemple — les commentaires s\'affichent sur les vrais articles');
        setNewComment('');
        setReplyToId(null);
        return;
      }
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['article', idOrSlug] });
      setNewComment('');
      setReplyToId(null);
      toast.success('Commentaire ajouté');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  const handleShare = (channel) => {
    shareMutation.mutate();
    const url = window.location.href;
    const title = article?.title || '';
    const text = article?.excerpt || article?.subtitle || title;
    if (channel === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Lien copié');
      return;
    }
    const encoded = encodeURIComponent(url);
    const textEnc = encodeURIComponent(text);
    const titleEnc = encodeURIComponent(title);
    if (channel === 'whatsapp') window.open(`https://wa.me/?text=${titleEnc}%20${encoded}`, '_blank');
    if (channel === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, '_blank');
    if (channel === 'twitter') window.open(`https://twitter.com/intent/tweet?url=${encoded}&text=${textEnc}`, '_blank');
  };

  // SEO: titre, description, Open Graph, Twitter cards
  useEffect(() => {
    if (!article) return;
    const title = article.seo_title || article.title || 'Article';
    const description = article.seo_description || article.excerpt || article.subtitle || '';
    const url = window.location.href;
    const image = article.featured_image || '';

    document.title = title;

    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const [name, key] = selector.replace('meta[', '').replace(']', '').split('"');
        if (name === 'property') el.setAttribute('property', key); else el.setAttribute('name', key);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    const metas = [
      ['meta[name="description"]', 'content', description],
      ['meta[property="og:title"]', 'content', title],
      ['meta[property="og:description"]', 'content', description],
      ['meta[property="og:url"]', 'content', url],
      ['meta[property="og:type"]', 'content', 'article'],
      ['meta[name="twitter:card"]', 'content', 'summary_large_image'],
      ['meta[name="twitter:title"]', 'content', title],
      ['meta[name="twitter:description"]', 'content', description],
    ];
    metas.forEach(([sel, attr, val]) => {
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement('meta');
        const match = sel.match(/name="([^"]+)"|property="([^"]+)"/);
        if (match) el.setAttribute(match[1] ? 'name' : 'property', match[1] || match[2]);
        document.head.appendChild(el);
      }
      if (val) el.setAttribute('content', val);
    });
    if (image) {
      let ogImg = document.querySelector('meta[property="og:image"]');
      if (!ogImg) { ogImg = document.createElement('meta'); ogImg.setAttribute('property', 'og:image'); document.head.appendChild(ogImg); }
      ogImg.setAttribute('content', image);
      let twImg = document.querySelector('meta[name="twitter:image"]');
      if (!twImg) { twImg = document.createElement('meta'); twImg.setAttribute('name', 'twitter:image'); document.head.appendChild(twImg); }
      twImg.setAttribute('content', image);
    }
  }, [article]);

  if (isLoading && !isMock) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 px-4">
        <p>Article introuvable</p>
        <Button
          onClick={() => navigate(createPageUrl('News'))}
          className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0"
        >
          Retour aux actualités
        </Button>
      </div>
    );
  }

  const isPremiumLocked = !isMock && article.is_premium && !hasPremiumAccess;
  const displayContent = isPremiumLocked
    ? (article.excerpt || article.subtitle || article.content?.slice(0, 300) + '…')
    : (article.content || (isMock && (article.excerpt || article.subtitle))
      || 'Contenu de l\'article. Les vrais articles afficheront ici le texte complet.');

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header — AfriWonder */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-40 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} aria-label="Retour" className="text-slate-700 hover:text-blue-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate text-slate-900">Article</h1>
      </div>

      {/* Featured Image */}
      {(article.featured_image || article.cover_image) && (
        <img
          src={article.featured_image || article.cover_image}
          alt={article.title}
          className="w-full h-64 object-cover"
          loading="eager"
        />
      )}

      <div className="p-4 bg-white border-b border-slate-100">
        {/* Badges — AfriWonder */}
        <div className="flex flex-wrap gap-2 mb-2">
          {article.is_breaking && (
            <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs font-bold">URGENT</span>
          )}
          {article.is_verified && (
            <span className="px-2 py-0.5 rounded bg-slate-700 text-white text-xs">✓ Vérifié</span>
          )}
          {article.is_sponsored && (
            <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs">Sponsorisé</span>
          )}
          {article.is_premium && (
            <span className="px-2 py-0.5 rounded bg-purple-500 text-white text-xs">Premium</span>
          )}
          {article.category && (
            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-blue-100 to-indigo-50 text-blue-800 text-xs font-medium">{article.category}</span>
          )}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">{article.title}</h2>
        {(article.subtitle || article.excerpt) && (
          <p className="text-slate-600 mb-4">{article.subtitle || article.excerpt}</p>
        )}

        {/* Author & date */}
        <div className="flex items-center gap-3 py-4 border-b border-slate-100">
          <img
            src={article.author?.profile_image || article.author_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
            alt={article.author_name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-medium text-sm text-slate-900">{article.author?.full_name || article.author_name}</p>
            <p className="text-xs text-slate-500">
              {new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
              {article.reading_time && ` · ${article.reading_time} min`}
            </p>
          </div>
        </div>

        {/* Stats + actions — AfriWonder */}
        <div className="flex flex-wrap items-center gap-4 py-3 text-sm text-slate-600 border-b border-slate-100">
          <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{(article.views || 0).toLocaleString()} vues</span>
          <button
            className="flex items-center gap-1 hover:text-blue-600"
            onClick={() => (user || isMock) && likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <Heart className={`w-4 h-4 ${likeStatus.liked ? 'fill-blue-500 text-blue-500' : ''}`} />
            {article.likes_count ?? 0} j&apos;aime
          </button>
          <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />{article.comments_count ?? 0} commentaires</span>
          <span className="flex items-center gap-1"><Share2 className="w-4 h-4" />{article.shares_count ?? 0} partages</span>
        </div>

        {/* Share buttons — AfriWonder gradient */}
        <div className="flex flex-wrap gap-2 py-3">
          <Button variant="outline" size="sm" onClick={() => handleShare('copy')} className="border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
            Copier le lien
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare('whatsapp')} className="border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare('facebook')} className="border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
            Facebook
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare('twitter')} className="border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
            X
          </Button>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none py-4">
          {typeof displayContent === 'string' && displayContent.includes('<') ? (
            <div dangerouslySetInnerHTML={{ __html: displayContent }} />
          ) : (
            <p className="whitespace-pre-wrap text-slate-700">{displayContent}</p>
          )}
          {isPremiumLocked && (
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <p className="font-medium text-blue-800">Article réservé aux abonnés Premium</p>
              <p className="text-sm text-slate-600 mt-1">Débloquez l&apos;accès pour lire la suite.</p>
              <Button className="mt-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0" onClick={() => navigate(createPageUrl('Subscription') || '#')}>
                S&apos;abonner
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="p-4 bg-white border-t border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4">Commentaires ({article.comments_count ?? 0})</h3>

        {(user || isMock) ? (
          <div className="mb-4 pb-4 border-b border-slate-100">
            {replyToId && (
              <p className="text-xs text-slate-500 mb-1">Réponse à un commentaire</p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder={replyToId ? 'Votre réponse...' : 'Ajouter un commentaire...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-xl border-slate-200"
              />
              <Button
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0"
                onClick={() => commentMutation.mutate()}
                disabled={commentMutation.isPending || !newComment.trim()}
                size="icon"
              >
                {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {replyToId && (
              <Button variant="ghost" size="sm" className="mt-1 text-slate-600" onClick={() => setReplyToId(null)}>
                Annuler la réponse
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-4">Connectez-vous pour commenter.</p>
        )}

        <div className="space-y-4">
          {comments.length === 0 && isMock && (
            <p className="text-sm text-slate-500 py-4">Exemple — les commentaires s&apos;affichent ici pour les vrais articles.</p>
          )}
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={comment.parent_id ? 'pl-6 border-l-2 border-blue-200' : ''}
            >
              <div className="flex gap-2">
                <img
                  src={comment.user?.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs text-slate-900">{comment.user?.full_name}</p>
                  <p className="text-sm text-slate-700">{comment.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    {user && !comment.parent_id && (
                      <button
                        className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-0.5"
                        onClick={() => setReplyToId(comment.id)}
                      >
                        <Reply className="w-3 h-3" /> Répondre
                      </button>
                    )}
                  </div>
                  {comment.replies?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2 pl-2">
                          <img
                            src={reply.user?.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                          />
                          <div>
                            <p className="font-medium text-xs text-slate-900">{reply.user?.full_name}</p>
                            <p className="text-sm text-slate-700">{reply.content}</p>
                            <span className="text-xs text-slate-500">
                              {new Date(reply.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
