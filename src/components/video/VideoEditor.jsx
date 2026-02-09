import React, { useState, useRef, useEffect, useCallback } from 'react';

import { motion } from 'framer-motion';

import { Scissors, Sparkles, Music2, Type, Sticker, X, Plus, Loader2, Palette, Settings2 } from 'lucide-react';

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { api } from '@/api/expressClient';

import { toast } from "sonner";

import { VIDEO_EFFECTS, TRANSITIONS, TEXT_FONTS, getFilterStyle } from './VideoEffects';

const STICKERS = ['😂', '🔥', '❤️', '👍', '🎉', '🎵', '✨', '🌟', '💯', '🚀'];

// Pour compatibilité

const FILTERS = VIDEO_EFFECTS;

export default function VideoEditor({ videoRef, previewUrl, onVideoDataChange, initialData = {} }) {

  const [activeTab, setActiveTab] = useState(null);

  const [filter, setFilter] = useState(initialData.filter || 'Normal');

  const [startTime, setStartTime] = useState(initialData.start_time || 0);

  const [endTime, setEndTime] = useState(initialData.end_time || 0);

  const [duration, setDuration] = useState(0);

  const [musicLibrary, setMusicLibrary] = useState([]);

  const [selectedMusic, setSelectedMusic] = useState(initialData.music_id ? { id: initialData.music_id, title: initialData.music_title } : null);

  const [textOverlay, setTextOverlay] = useState({ 

    text: initialData.text_overlay || '', 

    x: initialData.text_x || 50, 

    y: initialData.text_y || 50,

    color: '#ffffff',

    fontSize: 24,

    font: 'font-black',

    shadow: true,

    border: false

  });

  const [stickers, setStickers] = useState(initialData.stickers || []);

  const [loading, setLoading] = useState(false);

  const [dragging, setDragging] = useState(null);

  const [showTextOptions, setShowTextOptions] = useState(false);

  const [previewCut, setPreviewCut] = useState(null);

  const [selectedTransition, setSelectedTransition] = useState('none');

  const audioRef = useRef(null);

  const musicInputRef = useRef(null);

  const containerRef = useRef(null);

  // Envoyer toutes les données actuelles au parent dès le montage et à chaque changement

  useEffect(() => {

    onVideoDataChange({

      filter,

      start_time: startTime,

      end_time: endTime,

      text_overlay: textOverlay.text,

      text_x: textOverlay.x,

      text_y: textOverlay.y,

      stickers,

      music_title: selectedMusic?.title || '',

      music_id: selectedMusic?.id || ''

    });

  }, [filter, startTime, endTime, textOverlay, stickers, selectedMusic]);

  useEffect(() => {

    if (videoRef?.current) {

      videoRef.current.onloadedmetadata = () => {

        setDuration(videoRef.current.duration);

        setEndTime(videoRef.current.duration);

      };

    }

  }, [videoRef]);

  // Charger la libraire de musiques

  useEffect(() => {

    const loadMusicLibrary = async () => {

      try {

        const music = await api.entities.Music.filter({ is_public: true }, '-usage_count', 20);

        setMusicLibrary(music);

      } catch (e) {

        console.log('Erreur chargement musique');

      }

    };

    loadMusicLibrary();

  }, []);

  const handleMusicUpload = useCallback(async (e) => {

    const file = e.target.files?.[0];

    if (!file) return;

    try {

      setLoading(true);

      const uploadResult = await api.upload.image(file);
      
      const user = await api.auth.me();

      const musicRecord = {

        title: file.name.replace(/\.[^/.]+$/, ''),

        artist: user.full_name || 'Utilisateur',

        music_url: uploadResult.file_url,

        duration: 0,

        uploader_id: user.id,

        uploader_name: user.full_name,

        is_public: true

      };

      const created = await api.entities.Music.create(musicRecord);

      setSelectedMusic(created);

      setMusicLibrary(prev => [created, ...prev]);

      toast.success('Musique ajoutée!');

    } catch (error) {

      toast.error('Erreur upload musique');

    } finally {

      setLoading(false);

    }

  }, [musicLibrary, onVideoDataChange]);

  const applyFilter = useCallback((filterName) => {

    setFilter(filterName);

  }, []);

  const addSticker = (emoji) => {

    const newSticker = {

      id: Date.now(),

      emoji,

      x: 50 + Math.random() * 20,

      y: 30 + Math.random() * 20

    };

    const newStickers = [...stickers, newSticker];

    setStickers(newStickers);

  };

  const handleDragStart = (e, type, index) => {

    setDragging({ type, index });

  };

  const handleDragMove = useCallback((e) => {

    if (!dragging || !containerRef.current) return;

    e.preventDefault();

    

    const rect = containerRef.current.getBoundingClientRect();

    const clientX = e.clientX || e.touches?.[0]?.clientX;

    const clientY = e.clientY || e.touches?.[0]?.clientY;

    

    if (!clientX || !clientY) return;

    

    const x = ((clientX - rect.left) / rect.width) * 100;

    const y = ((clientY - rect.top) / rect.height) * 100;

    if (dragging.type === 'text') {

      const newTextOverlay = { 

        ...textOverlay, 

        x: Math.max(5, Math.min(95, x)), 

        y: Math.max(5, Math.min(95, y)) 

      };

      setTextOverlay(newTextOverlay);

    } else if (dragging.type === 'sticker') {

      const newStickers = [...stickers];

      newStickers[dragging.index] = {

        ...newStickers[dragging.index],

        x: Math.max(5, Math.min(95, x)),

        y: Math.max(5, Math.min(95, y))

      };

      setStickers(newStickers);

    }

  }, [dragging, textOverlay, stickers]);

  const handleDragEnd = useCallback(() => {

    if (dragging) {

      setDragging(null);

    }

  }, [dragging]);

  const removeSticker = (index) => {

    const newStickers = stickers.filter((_, i) => i !== index);

    setStickers(newStickers);

  };

  return (

    <div className="space-y-4">

      {/* Preview Container with Overlays */}

      <div 

        ref={containerRef}

        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden touch-none"

        onMouseMove={handleDragMove}

        onMouseUp={handleDragEnd}

        onMouseLeave={handleDragEnd}

        onTouchMove={handleDragMove}

        onTouchEnd={handleDragEnd}

        onTouchCancel={handleDragEnd}

      >

        {/* Video Preview */}

        {previewUrl && (

          <video

            src={previewUrl}

            className="absolute inset-0 w-full h-full object-cover pointer-events-none"

            style={{

              filter: filter === 'Normal' ? 'none' :

                      filter === 'Noir & Blanc' ? 'grayscale(100%)' :

                      filter === 'Sépia' ? 'sepia(100%)' :

                      filter === 'Vibrant' ? 'saturate(200%)' :

                      filter === 'Foncé' ? 'brightness(0.75)' :

                      filter === 'Lumineux' ? 'brightness(1.25)' : 'none'

            }}

            autoPlay

            loop

            muted

          />

        )}

        {/* Text Overlay */}

        {textOverlay.text && (

          <div

            className="absolute cursor-move select-none"

            style={{ left: `${textOverlay.x}%`, top: `${textOverlay.y}%`, transform: 'translate(-50%, -50%)' }}

            onMouseDown={(e) => {

              e.preventDefault();

              handleDragStart(e, 'text', 0);

            }}

            onTouchStart={(e) => {

              e.preventDefault();

              handleDragStart(e, 'text', 0);

            }}

          >

            <p className={`text-center px-4 pointer-events-none ${textOverlay.font}`}

               style={{ 

                  color: textOverlay.color,

                  fontSize: `${textOverlay.fontSize}px`,

                  textShadow: textOverlay.shadow 

                    ? '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'

                    : 'none',

                  WebkitTextStroke: textOverlay.border ? '1px rgba(0,0,0,0.5)' : 'none'

                }}>

              {textOverlay.text}

            </p>

          </div>

        )}

        {/* Stickers */}

        {stickers.map((sticker, index) => (

          <div

            key={sticker.id}

            className="absolute cursor-move select-none group"

            style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: 'translate(-50%, -50%)' }}

            onMouseDown={(e) => {

              e.preventDefault();

              handleDragStart(e, 'sticker', index);

            }}

            onTouchStart={(e) => {

              e.preventDefault();

              handleDragStart(e, 'sticker', index);

            }}

          >

            <span className="text-5xl filter drop-shadow-lg pointer-events-none">{sticker.emoji}</span>

            <button

              onClick={(e) => {

                e.stopPropagation();

                removeSticker(index);

              }}

              className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"

            >

              ×

            </button>

          </div>

        ))}

      </div>

      {/* Tabs */}

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">

        {[

          { id: 'cut', icon: Scissors, label: 'Couper' },

          { id: 'filter', icon: Sparkles, label: 'Effets' },

          { id: 'music', icon: Music2, label: 'Musique' },

          { id: 'text', icon: Type, label: 'Texte' },

          { id: 'stickers', icon: Sticker, label: 'Stickers' }

        ].map(tab => {

          const Icon = tab.icon;

          return (

            <button

              key={tab.id}

              onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}

              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${

                activeTab === tab.id

                  ? 'bg-orange-500 text-white'

                  : 'bg-white/10 text-white/60 hover:text-white'

              }`}

            >

              <Icon className="w-4 h-4 flex-shrink-0" />

              <span className="text-sm font-medium">{tab.label}</span>

            </button>

          );

        })}

      </div>

      {/* Content */}

      {activeTab === 'cut' && (

        <div className="bg-white/5 p-4 rounded-lg space-y-3">

          <p className="text-sm text-white/70">Découper et configurer transitions</p>

          <div className="space-y-3">

            <div>

              <label className="text-xs text-white/50">Début (s)</label>

              <input

                type="range"

                min="0"

                max={duration}

                step="0.1"

                value={startTime}

                onChange={(e) => {

                  const value = Number(e.target.value);

                  setStartTime(value);

                  if (videoRef?.current) {

                    videoRef.current.currentTime = value;

                  }

                }}

                className="w-full"

              />

              <span className="text-xs text-white/70">{startTime.toFixed(1)}s</span>

            </div>

            <div>

              <label className="text-xs text-white/50">Fin (s)</label>

              <input

                type="range"

                min={startTime}

                max={duration}

                step="0.1"

                value={endTime}

                onChange={(e) => {

                  const value = Number(e.target.value);

                  setEndTime(value);

                  if (videoRef?.current) {

                    videoRef.current.currentTime = value;

                  }

                }}

                className="w-full"

              />

              <span className="text-xs text-white/70">{endTime.toFixed(1)}s</span>

            </div>

            <div>

              <label className="text-xs text-white/50">Transition</label>

              <div className="grid grid-cols-2 gap-2 mt-1">

                {TRANSITIONS.map(t => (

                  <button

                    key={t.value}

                    onClick={() => setSelectedTransition(t.value)}

                    className={`p-2 rounded text-xs transition-all ${

                      selectedTransition === t.value

                        ? 'bg-orange-500 text-white'

                        : 'bg-white/10 text-white/60'

                    }`}

                  >

                    {t.name}

                  </button>

                ))}

              </div>

            </div>

            <div className="flex items-center justify-between bg-orange-500/20 border border-orange-500 rounded-lg p-3">

              <span className="text-xs text-white">Durée:</span>

              <span className="text-sm font-bold text-orange-400">{(endTime - startTime).toFixed(1)}s</span>

            </div>

            <div className="flex gap-2">

              <Button

                onClick={() => {

                  if (videoRef?.current) {

                    videoRef.current.currentTime = startTime;

                    videoRef.current.play();

                    const checkTime = setInterval(() => {

                      if (videoRef?.current && videoRef.current.currentTime >= endTime) {

                        videoRef.current.pause();

                        videoRef.current.currentTime = startTime;

                        clearInterval(checkTime);

                      }

                    }, 100);

                    setPreviewCut(true);

                  }

                }}

                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"

                size="sm"

              >

                Prévisualiser

              </Button>

              <Button

                onClick={() => {

                  toast.success('✂️ Coupe appliquée');

                  setPreviewCut(false);

                }}

                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"

                size="sm"

              >

                Appliquer

              </Button>

            </div>

          </div>

        </div>

      )}

      {activeTab === 'filter' && (

        <div className="bg-white/5 p-4 rounded-lg space-y-3">

          <p className="text-sm text-white/70">Sélectionner un effet</p>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">

            {VIDEO_EFFECTS.map(f => (

              <motion.button

                key={f.name}

                whileTap={{ scale: 0.95 }}

                onClick={() => applyFilter(f.name)}

                className={`p-3 rounded-lg text-xs transition-all font-medium ${

                  filter === f.name

                    ? 'bg-orange-500 text-white ring-2 ring-orange-300'

                    : 'bg-white/10 text-white/70 hover:bg-white/20'

                }`}

              >

                {f.name === 'Glitch' && '⚡'}

                {f.name === 'Vintage' && '📷'}

                {f.name === 'Dessin Animé' && '🎨'}

                {f.name === 'Cinéma' && '🎬'}

                {f.name === 'Rétro' && '🕰️'}

                {f.name === 'Chromatic' && '🌈'}

                {!['Glitch', 'Vintage', 'Dessin Animé', 'Cinéma', 'Rétro', 'Chromatic'].includes(f.name) && '✨'}

                {' '}{f.name}

              </motion.button>

            ))}

          </div>

        </div>

      )}

      {activeTab === 'music' && (

        <div className="bg-white/5 p-4 rounded-lg space-y-3">

          <div className="flex gap-2">

            <Input

              ref={musicInputRef}

              type="file"

              accept="audio/*"

              onChange={handleMusicUpload}

              disabled={loading}

              className="hidden"

            />

            <Button

              onClick={() => musicInputRef.current?.click()}

              disabled={loading}

              size="sm"

              className="flex-1"

              variant="outline"

            >

              {loading ? (

                <>

                  <Loader2 className="w-4 h-4 animate-spin mr-2" />

                  Upload...

                </>

              ) : (

                <>

                  <Plus className="w-4 h-4 mr-2" />

                  Ajouter musique

                </>

              )}

            </Button>

          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">

            {musicLibrary.map(music => (

              <button

                key={music.id}

                onClick={() => {

                  setSelectedMusic(music);

                }}

                className={`w-full text-left p-2 rounded-lg text-sm transition-all ${

                  selectedMusic?.id === music.id

                    ? 'bg-orange-500/30 border border-orange-500'

                    : 'bg-white/5 hover:bg-white/10'

                }`}

              >

                <p className="text-white font-medium truncate">{music.title}</p>

                <p className="text-white/50 text-xs">{music.artist}</p>

              </button>

            ))}

          </div>

        </div>

      )}

      {activeTab === 'text' && (

        <div className="bg-white/5 p-4 rounded-lg space-y-3">

          <Input

            placeholder="Ajouter du texte..."

            value={textOverlay.text}

            onChange={(e) => setTextOverlay({ ...textOverlay, text: e.target.value })}

            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"

          />

          {textOverlay.text && (

            <>

              {/* Taille du texte */}

              <div>

                <label className="text-xs text-white/50">Taille ({textOverlay.fontSize}px)</label>

                <input

                  type="range"

                  min="12"

                  max="60"

                  value={textOverlay.fontSize}

                  onChange={(e) => setTextOverlay({ ...textOverlay, fontSize: Number(e.target.value) })}

                  className="w-full"

                />

              </div>

              {/* Couleur */}

              <div>

                <label className="text-xs text-white/50">Couleur</label>

                <div className="flex gap-2 mt-1">

                  {['#ffffff', '#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#9d4edd'].map(col => (

                    <button

                      key={col}

                      onClick={() => setTextOverlay({ ...textOverlay, color: col })}

                      className={`w-8 h-8 rounded border-2 transition-all ${

                        textOverlay.color === col ? 'border-white scale-110' : 'border-white/30'

                      }`}

                      style={{ backgroundColor: col }}

                    />

                  ))}

                  <input

                    type="color"

                    value={textOverlay.color}

                    onChange={(e) => setTextOverlay({ ...textOverlay, color: e.target.value })}

                    className="w-8 h-8 rounded cursor-pointer"

                  />

                </div>

              </div>

              {/* Police */}

              <div>

                <label className="text-xs text-white/50">Police</label>

                <div className="grid grid-cols-2 gap-2 mt-1">

                  {TEXT_FONTS.map(font => (

                    <button

                      key={font.value}

                      onClick={() => setTextOverlay({ ...textOverlay, font: font.value })}

                      className={`p-2 rounded text-xs transition-all ${

                        textOverlay.font === font.value

                          ? 'bg-orange-500 text-white'

                          : 'bg-white/10 text-white/60'

                      }`}

                    >

                      {font.name}

                    </button>

                  ))}

                </div>

              </div>

              {/* Options */}

              <div className="flex gap-2">

                <button

                  onClick={() => setTextOverlay({ ...textOverlay, shadow: !textOverlay.shadow })}

                  className={`flex-1 p-2 rounded text-xs transition-all ${

                    textOverlay.shadow ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60'

                  }`}

                >

                  {textOverlay.shadow ? '✓' : ''} Ombre

                </button>

                <button

                  onClick={() => setTextOverlay({ ...textOverlay, border: !textOverlay.border })}

                  className={`flex-1 p-2 rounded text-xs transition-all ${

                    textOverlay.border ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60'

                  }`}

                >

                  {textOverlay.border ? '✓' : ''} Bordure

                </button>

              </div>

              <div className="text-xs text-white/70 bg-orange-500/20 border border-orange-500 rounded-lg p-3">

                💡 Faites glisser le texte dans l'aperçu pour le positionner

              </div>

            </>

          )}

        </div>

      )}

      {activeTab === 'stickers' && (

        <div className="bg-white/5 p-4 rounded-lg space-y-3">

          <div className="grid grid-cols-5 gap-3">

            {STICKERS.map((emoji, index) => (

              <button

                key={`sticker-${index}`}

                onClick={() => addSticker(emoji)}

                className="text-3xl p-3 rounded-lg bg-white/10 hover:bg-orange-500/30 transition-all active:scale-95 border border-white/20"

              >

                {emoji}

              </button>

            ))}

          </div>

          {stickers.length > 0 && (

            <div className="text-xs text-white/70 bg-orange-500/20 border border-orange-500 rounded-lg p-3">

              💡 {stickers.length} sticker(s) ajouté(s). Faites-les glisser dans l'aperçu pour les repositionner

            </div>

          )}

        </div>

      )}

    </div>

  );

}
