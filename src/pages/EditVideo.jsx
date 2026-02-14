import React, { useState, useEffect } from 'react';

import { api } from '@/api/expressClient';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Trash2, Save, Loader2 } from 'lucide-react';

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";

import { toast } from "sonner";

import { createPageUrl } from "@/utils";



const categories = [

  'divertissement', 'musique', 'danse', 'cuisine', 'mode', 

  'business', 'education', 'sport', 'actualites', 'humour', 'lifestyle', 'tech'

];



const languages = [

  { code: 'francais', name: 'Français' },

  { code: 'wolof', name: 'Wolof' },

  { code: 'bambara', name: 'Bambara' },

  { code: 'hausa', name: 'Hausa' },

  { code: 'lingala', name: 'Lingala' },

  { code: 'swahili', name: 'Swahili' },

  { code: 'anglais', name: 'English' },

];



const visibilityOptions = [

  { value: 'public', label: 'Public' },

  { value: 'abonnes', label: 'Abonnés' },

  { value: 'prive', label: 'Privé' },

];



// Fonction pour extraire les hashtags de la description

const extractHashtags = (description) => {

  if (!description) return [];

  // Extraire les hashtags du format #tag1 #tag2

  const hashtagMatches = description.match(/#[\w]+/g);

  if (!hashtagMatches) return [];

  // Retourner les tags sans le #

  return hashtagMatches.map(tag => tag.substring(1));

};



// Fonction pour extraire la description sans les hashtags

const extractDescription = (description) => {

  if (!description) return '';

  // Retirer les hashtags et le texte de musique de la description

  return description

    .replace(/\n\n#[\w\s#]+/g, '') // Retirer les hashtags

    .replace(/\n\n🎵 Musique:.*/g, '') // Retirer le texte de musique

    .trim();

};



export default function EditVideo() {

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [videoId, setVideoId] = useState(null);

  const [videoData, setVideoData] = useState(null);

  const [hashtagInput, setHashtagInput] = useState('');

  const [user, setUser] = useState(null);

  const [isUnauthorized, setIsUnauthorized] = useState(false);



  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    const id = params.get('id');

    setVideoId(id);

    

    // Get current user

    api.auth.me().then(u => setUser(u)).catch(() => navigate(createPageUrl('Home')));

  }, [navigate]);



  const { data: video, isLoading } = useQuery({

    queryKey: ['video', videoId],

    queryFn: () => api.videos.getById(videoId),

    enabled: !!videoId,

    onSuccess: (data) => {

      // Check if user is the creator (utiliser creator_id au lieu de created_by)

      if (user && data.creator_id !== user.id) {

        setIsUnauthorized(true);

        return;

      }

      

      if (data) {

        // Extraire les hashtags de la description

        const hashtags = extractHashtags(data.description);

        // Extraire la description sans les hashtags

        const cleanDescription = extractDescription(data.description);

        

        setVideoData({

          title: data.title || '',

          description: cleanDescription,

          category: data.category || '',

          language: data.language || 'francais',

          visibility: data.visibility || 'public',

          hashtags: hashtags,

          music_title: data.music_title || ''

        });

      }

    }

  });



  const updateMutation = useMutation({

    mutationFn: async () => {

      // Préparer la description avec les hashtags (comme dans Create.jsx)

      const hashtagsText = videoData.hashtags?.length > 0 

        ? '\n\n#' + videoData.hashtags.join(' #') 

        : '';

      

      const fullDescription = [

        videoData.description || '',

        hashtagsText

      ].filter(Boolean).join('');

      

      // Préparer les données à envoyer (hashtags et music_title pour affichage correct)

      const updateData = {

        title: videoData.title,

        description: fullDescription,

        category: videoData.category,

        visibility: videoData.visibility,

        hashtags: videoData.hashtags?.length > 0 ? videoData.hashtags : [],

        ...(videoData.music_title && { music_title: videoData.music_title }),

        // Ajouter language si l'API le supporte

        ...(videoData.language && { language: videoData.language })

      };

      

      await api.videos.update(videoId, updateData);

    },

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['profile-videos'] });

      queryClient.invalidateQueries({ queryKey: ['video', videoId] });

      toast.success('Vidéo mise à jour ! ✅');

      setTimeout(() => navigate(-1), 500);

    },

    onError: (error) => {

      console.error('Update error:', error);

      toast.error('Erreur lors de la mise à jour');

    }

  });



  const deleteMutation = useMutation({

    mutationFn: async () => {

      await api.videos.delete(videoId);

    },

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['profile-videos'] });

      toast.success('Vidéo supprimée');

      setTimeout(() => navigate(-1), 500);

    },

    onError: (error) => {

      console.error('Delete error:', error);

      toast.error('Erreur lors de la suppression');

    }

  });



  const handleAddHashtag = () => {

    if (hashtagInput.trim() && videoData.hashtags.length < 10) {

      const tag = hashtagInput.trim().replace(/^#/, '');

      if (!videoData.hashtags.includes(tag)) {

        setVideoData(prev => ({

          ...prev,

          hashtags: [...prev.hashtags, tag]

        }));

      }

      setHashtagInput('');

    }

  };



  const handleRemoveHashtag = (tag) => {

    setVideoData(prev => ({

      ...prev,

      hashtags: prev.hashtags.filter(t => t !== tag)

    }));

  };



  if (isUnauthorized) {

    return (

      <div className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center">

          <p className="text-red-500 font-semibold">Accès refusé</p>

          <p className="text-gray-500 mt-2">Vous ne pouvez modifier que vos propres vidéos</p>

          <Button onClick={() => navigate(-1)} className="mt-4">Retour</Button>

        </div>

      </div>

    );

  }



  if (isLoading || !user) {

    return (

      <div className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center">

          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-500">Chargement...</p>

        </div>

      </div>

    );

  }



  if (!videoData) {

    return (

      <div className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center">

          <p className="text-gray-500">Vidéo non trouvée</p>

          <Button onClick={() => navigate(-1)} className="mt-4">Retour</Button>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-white">

      {/* Header */}

      <div className="sticky top-0 bg-white border-b z-10 px-4 py-3">

        <div className="flex items-center justify-between">

          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>

            <ArrowLeft className="w-6 h-6" />

          </Button>

          <h1 className="text-lg font-bold">Modifier la vidéo</h1>

          <div className="w-10" />

        </div>

      </div>



      <div className="p-4 space-y-6">

        {/* Video Preview */}

        {video?.video_url && (

          <div className="rounded-xl overflow-hidden bg-gray-100">

            <video src={video.video_url} className="w-full h-48 object-cover" controls />

          </div>

        )}



        {/* Title */}

        <div>

          <Label className="text-gray-600 text-sm">Titre</Label>

          <Input

            placeholder="Donnez un titre à votre vidéo"

            value={videoData.title}

            onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}

            className="mt-1 rounded-xl"

          />

        </div>



        {/* Description */}

        <div>

          <Label className="text-gray-600 text-sm">Description</Label>

          <Textarea

            placeholder="Décrivez votre vidéo..."

            value={videoData.description}

            onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}

            className="mt-1 rounded-xl h-24 resize-none"

          />

        </div>



        {/* Hashtags */}

        <div>

          <Label className="text-gray-600 text-sm">Hashtags</Label>

          <div className="flex gap-2 mt-1">

            <Input

              placeholder="Ajouter un hashtag"

              value={hashtagInput}

              onChange={(e) => setHashtagInput(e.target.value)}

              onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}

              className="rounded-xl"

            />

            <Button onClick={handleAddHashtag} variant="outline" className="rounded-xl">

              +

            </Button>

          </div>

          {videoData.hashtags.length > 0 && (

            <div className="flex flex-wrap gap-2 mt-2">

              {videoData.hashtags.map((tag) => (

                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-sm">

                  #{tag}

                  <button onClick={() => handleRemoveHashtag(tag)}>×</button>

                </span>

              ))}

            </div>

          )}

        </div>



        {/* Category */}

        <div>

          <Label className="text-gray-600 text-sm">Catégorie</Label>

          <Select value={videoData.category} onValueChange={(v) => setVideoData(prev => ({ ...prev, category: v }))}>

            <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>

            <SelectContent>

              {categories.map((cat) => (<SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>))}

            </SelectContent>

          </Select>

        </div>



        {/* Language */}

        <div>

          <Label className="text-gray-600 text-sm">Langue</Label>

          <Select value={videoData.language} onValueChange={(v) => setVideoData(prev => ({ ...prev, language: v }))}>

            <SelectTrigger className="mt-1 rounded-xl">

              <SelectValue placeholder="Sélectionner une langue" />

            </SelectTrigger>

            <SelectContent>

              {languages.map((lang) => (

                <SelectItem key={lang.code} value={lang.code}>

                  {lang.name}

                </SelectItem>

              ))}

            </SelectContent>

          </Select>

        </div>



        {/* Visibility */}

        <div>

          <Label className="text-gray-600 text-sm">Visibilité</Label>

          <div className="space-y-2 mt-2">

            {visibilityOptions.map((opt) => (

              <button

                key={opt.value}

                onClick={() => setVideoData(prev => ({ ...prev, visibility: opt.value }))}

                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${

                  videoData.visibility === opt.value ? 'border-orange-500 bg-orange-50' : 'border-gray-100'

                }`}

              >

                <div className={`w-4 h-4 rounded-full border-2 ${videoData.visibility === opt.value ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`} />

                <span className={videoData.visibility === opt.value ? 'text-orange-600 font-medium' : 'text-gray-600'}>

                  {opt.label}

                </span>

              </button>

            ))}

          </div>

        </div>



        {/* Action Buttons */}

        <div className="flex gap-3 pb-6">

          <Button

            onClick={() => deleteMutation.mutate()}

            variant="destructive"

            className="flex-1 rounded-xl"

            disabled={updateMutation.isPending || deleteMutation.isPending}

          >

            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}

            Supprimer

          </Button>

          <Button

            onClick={() => updateMutation.mutate()}

            className="flex-1 bg-orange-500 hover:bg-orange-600 rounded-xl"

            disabled={updateMutation.isPending || deleteMutation.isPending}

          >

            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}

            Enregistrer

          </Button>

        </div>

      </div>

    </div>

  );

}
