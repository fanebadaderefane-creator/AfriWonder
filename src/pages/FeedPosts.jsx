// Feed des publications (posts) avec sondages — CPO 2.20
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, BarChart3, Globe, Lock, Users, Pin, Calendar, ImagePlus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '@/components/navigation/BottomNav';

const POLL_OPTIONS_MIN = 2;
const POLL_OPTIONS_MAX = 4;

export default function FeedPosts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [votingPollId, setVotingPollId] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);

  React.useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: listData, isLoading } = useQuery({
    queryKey: ['posts-feed', user?.id],
    queryFn: () => api.posts.list({ page: 1, limit: 50 }),
    enabled: !!user?.id,
  });

  const posts = listData?.posts ?? listData?.data?.posts ?? (Array.isArray(listData) ? listData : []);

  const createMutation = useMutation({
    mutationFn: (payload) => api.posts.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts-feed', user?.id] });
      setCreateOpen(false);
      setText('');
      setVisibility('public');
      setScheduledAt('');
      setIsPinned(false);
      setHasPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setImageUrls([]);
      toast.success('Publication créée');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.message || 'Erreur';
      toast.error(msg);
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionIndex }) => api.posts.votePoll(pollId, optionIndex),
    onSuccess: (_data, { pollId }) => {
      setVotingPollId(null);
      queryClient.invalidateQueries({ queryKey: ['posts-feed', user?.id] });
      toast.success('Vote enregistré');
    },
    onError: () => {
      setVotingPollId(null);
      toast.error('Impossible de voter');
    },
  });

  const handleCreate = () => {
    const payload = {
      text: text.trim() || undefined,
      visibility: visibility || 'public',
      is_pinned: isPinned,
    };
    if (imageUrls.length > 0) payload.images = imageUrls;
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      if (!isNaN(d.getTime())) payload.scheduled_at = d.toISOString();
    }
    if (hasPoll && pollQuestion.trim()) {
      const options = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (options.length < POLL_OPTIONS_MIN) {
        toast.error(`Ajoutez au moins ${POLL_OPTIONS_MIN} options au sondage`);
        return;
      }
      payload.poll = {
        question: pollQuestion.trim(),
        options: options.slice(0, POLL_OPTIONS_MAX),
      };
    }
    createMutation.mutate(payload);
  };

  const onImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const max = 10;
    const toUpload = files.slice(0, max - imageUrls.length);
    if (toUpload.length === 0) {
      toast.info(`Maximum ${max} images par publication`);
      return;
    }
    setImageUploading(true);
    try {
      const urls = [];
      for (const file of toUpload) {
        const res = await api.upload.image(file);
        const url = res?.file_url ?? res?.url;
        if (url) urls.push(url);
      }
      setImageUrls((prev) => [...prev, ...urls].slice(0, max));
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Erreur lors de l\'upload');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    if (pollOptions.length >= POLL_OPTIONS_MAX) return;
    setPollOptions((prev) => [...prev, '']);
  };

  const setPollOption = (index, value) => {
    setPollOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">Publications</h1>
        <Button
          variant="default"
          size="icon"
          className="rounded-xl bg-blue-600 hover:bg-blue-700"
          onClick={() => setCreateOpen(true)}
          aria-label="Nouvelle publication"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-3 py-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Aucune publication pour le moment.</p>
            <Button
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={() => setCreateOpen(true)}
            >
              Créer une publication
            </Button>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onVote={(pollId, optionIndex) => {
                setVotingPollId(pollId);
                voteMutation.mutate({ pollId, optionIndex });
              }}
              isVoting={votingPollId !== null}
            />
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle publication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="Quoi de neuf ?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] rounded-xl resize-none"
              maxLength={2000}
            />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Images (carrousel)</p>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-sm">
                  <ImagePlus className="w-4 h-4" />
                  {imageUploading ? 'Upload…' : 'Ajouter des photos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onImageSelect}
                    disabled={imageUploading || imageUrls.length >= 10}
                  />
                </label>
                {imageUrls.length > 0 && (
                  <span className="text-xs text-gray-500">{imageUrls.length} / 10</span>
                )}
              </div>
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                        aria-label="Retirer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Visibilité</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'public', label: 'Public', icon: Globe },
                  { value: 'close_friends', label: 'Proches uniquement', icon: Users },
                  { value: 'private', label: 'Privé', icon: Lock },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm ${visibility === opt.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    <opt.icon className="w-4 h-4" /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="rounded" />
              <Pin className="w-4 h-4" />
              <span className="text-sm text-gray-700">Épingler ce post</span>
            </label>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                <Calendar className="w-4 h-4" />
                Programmer la publication (optionnel)
              </label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-xl"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPoll}
                onChange={(e) => setHasPoll(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Ajouter un sondage</span>
            </label>
            {hasPoll && (
              <div className="space-y-3 rounded-xl border border-gray-200 p-3 bg-gray-50">
                <Input
                  placeholder="Question du sondage"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="rounded-lg"
                />
                {pollOptions.map((opt, i) => (
                  <Input
                    key={i}
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => setPollOption(i, e.target.value)}
                    className="rounded-lg"
                  />
                ))}
                {pollOptions.length < POLL_OPTIONS_MAX && (
                  <Button type="button" variant="outline" size="sm" onClick={addPollOption} className="rounded-lg">
                    + Option
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || (!text.trim() && imageUrls.length === 0 && !(hasPoll && pollQuestion.trim()))}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? 'Publication…' : 'Publier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function PostCard({ post, currentUserId, onVote, isVoting }) {
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const user = post.user || post.creator || {};
  const poll = post.poll;
  const rawResults = post.poll_results || {};
  const myVote = post.my_poll_vote;
  const options = Array.isArray(poll?.options) ? poll.options : [];
  const ended = poll?.ends_at ? new Date(poll.ends_at) < new Date() : false;
  const carouselImages = Array.isArray(post.images) && post.images.length > 0
    ? post.images.map((img) => (typeof img === 'string' ? img : img?.image_url)).filter(Boolean)
    : [];
  const displayImageUrl = carouselImages.length > 0 ? carouselImages[carouselIndex] : post.image_url;

  const getCount = (idx) => {
    if (rawResults.options && Array.isArray(rawResults.options)) {
      const o = rawResults.options.find((x) => x.index === idx);
      return o ? Number(o.count) || 0 : 0;
    }
    return Number(rawResults[idx]) || 0;
  };
  const totalVotes = rawResults.total_votes ?? options.reduce((acc, _, i) => acc + getCount(i), 0);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="p-4 flex items-center gap-3">
        <Avatar className="h-10 w-10 rounded-full">
          <AvatarImage src={user.profile_image} />
          <AvatarFallback className="bg-blue-100 text-blue-700">
            {(user.full_name || user.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user.full_name || user.username || 'Utilisateur'}</p>
          {post.created_at && (
            <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}</p>
          )}
        </div>
      </div>
      {post.text && <div className="px-4 pb-3 text-gray-800 whitespace-pre-wrap break-words">{post.text}</div>}
      {(displayImageUrl || carouselImages.length > 0) && (
        <div className="w-full relative">
          <img src={displayImageUrl || carouselImages[0]} alt="" className="w-full max-h-[400px] object-cover" />
          {carouselImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCarouselIndex((i) => (i === 0 ? carouselImages.length - 1 : i - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
                aria-label="Image précédente"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCarouselIndex((i) => (i === carouselImages.length - 1 ? 0 : i + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
                aria-label="Image suivante"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {carouselImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === carouselIndex ? 'bg-white' : 'bg-white/50'}`}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {poll && (
        <div className="px-4 pb-4">
          <p className="font-medium text-gray-900 mb-2">{poll.question}</p>
          <div className="space-y-2">
            {options.map((label, idx) => {
              const count = getCount(idx);
              const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
              const isMyVote = myVote === idx;
              const canVote = currentUserId && !ended && myVote == null && !isVoting;

              return (
                <div key={idx} className="relative rounded-xl border border-gray-200 overflow-hidden">
                  {ended || myVote != null ? (
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-100 rounded-xl transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  ) : null}
                  <div className="relative flex items-center justify-between gap-2 px-3 py-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{label || `Option ${idx + 1}`}</span>
                    {(ended || myVote != null) && (
                      <span className="text-xs text-gray-600 flex-shrink-0">
                        {count} vote{count !== 1 ? 's' : ''} {pct > 0 ? `(${pct.toFixed(0)}%)` : ''}
                      </span>
                    )}
                    {canVote && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg flex-shrink-0"
                        onClick={() => onVote(poll.id, idx)}
                        disabled={isVoting}
                      >
                        Voter
                      </Button>
                    )}
                    {isMyVote && <span className="text-xs text-blue-600 font-medium flex-shrink-0">• Votre vote</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {ended && totalVotes > 0 && (
            <p className="text-xs text-gray-500 mt-2">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} au total</p>
          )}
        </div>
      )}
    </article>
  );
}
