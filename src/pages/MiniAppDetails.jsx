import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Star, Download, Shield, Check, X, ShieldCheck, MapPin, Bell, Wallet, Camera, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import BottomNav from '@/components/navigation/BottomNav';
import { MOCK_MINI_APPS } from '@/data/miniAppsMock';
import { api } from '@/api/expressClient';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const PERMISSION_ICONS = {
  location: MapPin,
  wallet: Wallet,
  camera: Camera,
  notifications: Bell,
  storage: Database,
};

const PERMISSION_LABELS = {
  location: 'Géolocalisation',
  wallet: 'Portefeuille',
  camera: 'Caméra',
  notifications: 'Notifications',
  storage: 'Stockage',
};

export default function MiniAppDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('id');
  const [isInstalled, setIsInstalled] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: apiApp, isLoading } = useQuery({
    queryKey: ['mini-app', appId],
    queryFn: () => api.miniApps.get(appId),
    enabled: !!appId,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['mini-app-reviews', appId],
    queryFn: () => api.miniApps.getReviews(appId, 1, 10),
    enabled: !!appId && !!apiApp,
  });

  const { data: myReview } = useQuery({
    queryKey: ['mini-app-my-review', appId],
    queryFn: () => api.miniApps.getMyReview(appId),
    enabled: !!appId && !!apiApp,
  });

  const submitReviewMutation = useMutation({
    mutationFn: () => api.miniApps.submitReview(appId, reviewRating, reviewComment || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-app', appId] });
      queryClient.invalidateQueries({ queryKey: ['mini-app-reviews', appId] });
      queryClient.invalidateQueries({ queryKey: ['mini-app-my-review', appId] });
      setReviewComment('');
    },
  });

  useEffect(() => {
    if (myReview) {
      setReviewRating(myReview.rating ?? 5);
      setReviewComment(myReview.comment ?? '');
    }
  }, [myReview?.id, myReview?.rating, myReview?.comment]);

  const appFromApi = apiApp
    ? {
        id: apiApp.id,
        name: apiApp.name,
        description: apiApp.description,
        icon: apiApp.icon_url || '📱',
        rating: apiApp.rating ?? 0,
        reviews_count: apiApp.reviews_count ?? 0,
        installs: apiApp.installs_count ?? apiApp._count?.installs ?? 0,
        developer: { name: apiApp.developer?.username || 'Dev', verified: false },
        permissions: apiApp.permissions || [],
        screenshots: apiApp.screenshots || [],
        version: apiApp.version || '1.0.0',
        category: apiApp.category || 'general',
        price: apiApp.price || 'Gratuit',
        updated_at: apiApp.updated_at,
      }
    : null;

  const app = appFromApi || MOCK_MINI_APPS.find(a => a.id === appId);

  if (isLoading && appId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Mini-app introuvable</p>
          <Link to={createPageUrl('MiniAppsStore')}>
            <Button className="mt-4">Retour au Store</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleInstall = () => {
    setIsInstalled(true);
    // Ici on pourrait appeler l'API pour installer la mini-app
  };

  const handleUninstall = () => {
    setIsInstalled(false);
    // Ici on pourrait appeler l'API pour désinstaller la mini-app
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">{app.name}</h1>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
            {app.icon.startsWith('http') ? (
              <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">{app.icon}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{app.name}</h2>
            <p className="text-blue-100 text-sm">{app.developer.name}</p>
            {app.developer.verified && (
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs">Développeur vérifié</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-white" />
            <span className="font-bold">{app.rating}</span>
            <span className="text-blue-100">({app.reviews_count} avis)</span>
          </div>
          <span className="text-blue-100">•</span>
          <span>{app.installs.toLocaleString()} installations</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Install Button */}
        <div>
          {isInstalled ? (
            <Button
              onClick={handleUninstall}
              className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              <X className="w-4 h-4 mr-2" />
              Désinstaller
            </Button>
          ) : (
            <Button
              onClick={handleInstall}
              className="w-full bg-[#2563EB] hover:bg-[#1E3A8A] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Installer
            </Button>
          )}
        </div>

        {/* Description */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">Description</h3>
            <p className="text-sm text-gray-700">{app.description}</p>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-[#2563EB]" />
              <h3 className="font-bold">Permissions requises</h3>
            </div>
            <div className="space-y-2">
              {app.permissions.map(perm => {
                const Icon = PERMISSION_ICONS[perm];
                return (
                  <div key={perm} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    {Icon && <Icon className="w-5 h-5 text-[#2563EB]" />}
                    <span className="text-sm text-gray-700">{PERMISSION_LABELS[perm] || perm}</span>
                    <Check className="w-4 h-4 text-green-500 ml-auto" />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Ces permissions sont nécessaires pour le bon fonctionnement de l'application. 
              Toutes les données sont sécurisées et ne sont pas partagées avec des tiers.
            </p>
          </CardContent>
        </Card>

        {/* Screenshots */}
        {app.screenshots && app.screenshots.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">Captures d'écran</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {app.screenshots.map((screenshot, index) => (
                  <div key={index} className="flex-shrink-0 w-48 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version</span>
                <span className="font-medium">{app.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Développeur</span>
                <span className="font-medium">{app.developer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Catégorie</span>
                <Badge className="bg-[#2563EB] text-white border-0">{app.category}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prix</span>
                <span className="font-medium text-green-600">{app.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dernière mise à jour</span>
                <span className="font-medium">
                  {new Date(app.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avis (CPO 8.25) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Avis ({app.reviews_count ?? 0})</h3>
            {apiApp && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Votre avis</p>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-0.5"
                      aria-label={`${star} étoile(s)`}
                    >
                      <Star className={cn('w-6 h-6', star <= reviewRating ? 'fill-[#2563EB] text-[#2563EB]' : 'text-gray-300')} />
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Commentaire (optionnel)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="mb-2"
                />
                <Button
                  size="sm"
                  className="w-full bg-[#2563EB] hover:bg-[#1E3A8A]"
                  onClick={() => submitReviewMutation.mutate()}
                  disabled={submitReviewMutation.isPending}
                >
                  {submitReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (myReview ? 'Modifier mon avis' : 'Publier mon avis')}
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {(reviewsData?.reviews ?? []).length === 0 && !apiApp && (
                <>
                  {[
                    { user: 'Amadou D.', rating: 5, comment: 'Très pratique !', date: 'Il y a 2 jours' },
                    { user: 'Fatou S.', rating: 4, comment: 'Bon service.', date: 'Il y a 1 semaine' },
                  ].map((review, index) => (
                    <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{review.user}</span>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn('w-3 h-3', i < review.rating ? 'fill-[#2563EB] text-[#2563EB]' : 'text-gray-300')} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                  ))}
                </>
              )}
              {(reviewsData?.reviews ?? []).map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{review.user?.username || 'Utilisateur'}</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn('w-3 h-3', i < (review.rating || 0) ? 'fill-[#2563EB] text-[#2563EB]' : 'text-gray-300')} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-gray-600 mb-1">{review.comment}</p>}
                  <span className="text-xs text-gray-400">{review.created_at ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: fr }) : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
