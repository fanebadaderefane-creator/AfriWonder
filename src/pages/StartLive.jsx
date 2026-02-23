import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Video, Sparkles, Swords, ShoppingBag, Lightbulb } from 'lucide-react';
import { api } from '@/api/expressClient';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { value: 'other', label: 'Divertissement', icon: '🎭' },
  { value: 'music', label: 'Musique', icon: '🎵' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'other', label: 'Talk Show', icon: '🎙️' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'other', label: 'Boutique', icon: '🛍️' },
  { value: 'other', label: 'Battle', icon: '⚔️' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'art', label: 'Art', icon: '🎨' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

const TITLE_MAX = 100;

export default function StartLive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [language, setLanguage] = useState('fr');
  const [battleMode, setBattleMode] = useState(false);
  const [shopLive, setShopLive] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch {
        navigate(createPageUrl('Home'));
      }
    };
    load();
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const params = new URLSearchParams({
      title: encodeURIComponent(title.trim()),
      category: category,
      lang: language,
      ...(battleMode && { battle: '1' }),
      ...(shopLive && { shop: '1' }),
    });
    navigate(createPageUrl('LiveStream') + '?' + params.toString());
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0 rounded-xl text-white hover:bg-gray-800"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-blue-400" />
            </span>
            <h1 className="font-bold text-lg">Lancer un Live</h1>
          </div>
        </div>
      </header>

      <main className="p-4 pb-8 max-w-lg mx-auto space-y-6">
        {/* Prêt à diffuser */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600/30 to-indigo-700/30 rounded-2xl p-4 border border-blue-500/20"
        >
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-blue-300" />
            </span>
            <div>
              <h2 className="font-bold text-white">Prêt à diffuser ?</h2>
              <p className="text-sm text-gray-400 mt-0.5">Configurez votre live et commencez</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs">Qualité HD</span>
                <span className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs">
                  Créateur · {user?.full_name || user?.username || 'Vous'}
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre du live */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Titre du live <span className="text-blue-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="Ex: Concert Live, Gaming Session, Talk Show..."
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 rounded-xl"
              maxLength={TITLE_MAX}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/{TITLE_MAX} caractères</p>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          {/* Langue */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Langue</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Options</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-800/80 border border-gray-700 cursor-pointer hover:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Swords className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <span className="font-medium text-white">Mode Battle</span>
                    <p className="text-xs text-gray-400">Affronter un autre créateur</p>
                  </div>
                </div>
                <Switch
                  size="lg"
                  checked={battleMode}
                  onCheckedChange={setBattleMode}
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-600 border-0"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-800/80 border border-gray-700 cursor-pointer hover:bg-gray-800">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <span className="font-medium text-white">Boutique Live</span>
                    <p className="text-xs text-gray-400">Vendre des produits pendant le live</p>
                  </div>
                </div>
                <Switch
                  size="lg"
                  checked={shopLive}
                  onCheckedChange={setShopLive}
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-600 border-0"
                />
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base"
          >
            <Video className="w-5 h-5 mr-2 inline" />
            Commencer le Live
          </Button>
        </form>

        {/* Astuce */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-3 p-3 rounded-xl bg-blue-900/30 border border-blue-500/20"
        >
          <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300">
            Astuce: Assurez-vous d'avoir une bonne connexion Internet avant de démarrer votre live.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
