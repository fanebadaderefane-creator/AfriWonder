import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { ArrowRight, Play, Globe, Zap, Users, Smartphone, TrendingUp, Lock, Heart, ChevronDown, Check } from 'lucide-react';
import { api } from '@/api/expressClient';
import { useAuth } from '@/lib/AuthContext';
import AfriWonderLogo from '@/components/common/AfriWonderLogo';
import { toast } from 'sonner';

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login, register, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: ''
  });
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // Gérer les tokens OAuth depuis l'URL (priorité absolue)
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    if (token && refresh) {
      console.log('✅ Tokens OAuth reçus, stockage dans localStorage...');
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      console.log('✅ Tokens stockés. Vérification:', {
        hasAccessToken: !!localStorage.getItem('access_token'),
        hasRefreshToken: !!localStorage.getItem('refresh_token'),
        tokenLength: token.length
      });
      // Déclencher un événement pour notifier AuthContext
      window.dispatchEvent(new Event('tokenSet'));
      // Afficher un message de bienvenue
      toast.success('🎉 Connexion réussie ! Bienvenue sur AfriWonder', {
        duration: 3000,
      });
      // Nettoyer l'URL immédiatement
      window.history.replaceState({}, '', '/Landing');
      // Rediriger vers AfriWonder (/) après avoir stocké les tokens
      setTimeout(() => {
        // Vérifier que le token est bien dans localStorage avant de rediriger
        const storedToken = localStorage.getItem('access_token');
        if (storedToken) {
          console.log('✅ Token vérifié, redirection vers AfriWonder (/)');
          // Rediriger vers / (AfriWonder) et non vers Google/Facebook
          navigate('/', { replace: true });
        } else {
          console.error('❌ Token non trouvé dans localStorage après stockage!');
          // Fallback: recharger la page si navigate ne fonctionne pas
          window.location.href = '/';
        }
      }, 300); // Délai pour laisser le temps à AuthContext de vérifier l'authentification
      return; // Ne pas continuer si on traite un callback OAuth
    }
    
    // Gérer les erreurs OAuth
    const error = searchParams.get('error');
    if (error) {
      const reason = searchParams.get('reason') || 'Erreur inconnue';
      let errorMessage = 'Erreur de connexion';
      
      if (error === 'oauth_config_missing') {
        errorMessage = 'Configuration OAuth manquante. Veuillez contacter le support.';
      } else if (error === 'oauth_email_required') {
        errorMessage = 'Email requis pour la connexion. Veuillez autoriser l\'accès à votre email.';
      } else if (error === 'oauth_failed') {
        errorMessage = reason === 'access_denied' 
          ? 'Connexion annulée. Veuillez réessayer.' 
          : `Erreur de connexion: ${reason}`;
      }
      
      setError(errorMessage);
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/Landing');
    }
    
    // Ne rediriger vers / que si on est sur Landing et authentifié
    // Ne pas rediriger si on est sur une autre page publique
    if (isAuthenticated && location.pathname === '/Landing') {
      navigate('/');
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(loginData.email, loginData.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!acceptedTerms) {
      setError('Vous devez accepter les conditions d\'utilisation pour continuer');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(registerData);
      logout();
      setShowRegister(false);
      setLoginData((prev) => ({ ...prev, email: registerData.email, password: '' }));
      toast.success('Compte créé. Connectez-vous avec votre email et mot de passe.');
    } catch (err) {
      setError(err.message || 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Pour la connexion OAuth, on accepte automatiquement les conditions
    // Rediriger vers l'endpoint Google OAuth du backend
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`;
  };

  const handleFacebookLogin = () => {
    // Pour la connexion OAuth, on accepte automatiquement les conditions
    // Rediriger vers l'endpoint Facebook OAuth du backend
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/facebook`;
  };

  const features = [
    {
      icon: Play,
      title: 'Super-app Vidéo',
      description: 'Créez, regardez et partagez des vidéos courtes captivantes'
    },
    {
      icon: Users,
      title: 'Communauté Connectée',
      description: 'Connectez-vous avec créateurs, commerçants et votre communauté'
    },
    {
      icon: Zap,
      title: 'Optimisé pour Tous',
      description: 'Fonctionne parfaitement même avec les connexions lentes'
    },
    {
      icon: Globe,
      title: 'Multilingue',
      description: 'Disponible dans toutes les langues locales africaines'
    },
    {
      icon: Smartphone,
      title: 'Paiements Mobiles',
      description: 'Orange Money, MTN Money et autres intégrés'
    },
    {
      icon: TrendingUp,
      title: 'Monétisation',
      description: 'Gagnez de l\'argent avec votre contenu et vos ventes'
    }
  ];

  const benefits = [
    {
      icon: Heart,
      title: 'Créateurs',
      items: ['Monétisez votre contenu', 'Live streaming', 'Communautés privées']
    },
    {
      icon: Smartphone,
      title: 'Commerçants',
      items: ['Marketplace intégré', 'Paiements sécurisés', 'Livraison partout']
    },
    {
      icon: Users,
      title: 'Communauté',
      items: ['Divertissement sans fin', 'Shopping social', 'Connexion locale']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden" style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-transparent backdrop-blur-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AfriWonderLogo size="sm" />
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              AfriWonder
            </span>
          </div>
          <Button 
            onClick={() => setShowRegister(false)}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            Se connecter
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-20 px-4 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-4xl"
          style={{ 
            background: 'transparent', 
            backgroundColor: 'transparent',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none'
          }}
        >
          {/* Logo Animation */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-8 flex flex-col items-center"
            style={{ 
              background: 'transparent',
              backgroundColor: 'transparent',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none'
            }}
          >
            <div 
              className="mb-4" 
              style={{ 
                background: 'transparent',
                backgroundColor: 'transparent',
                boxShadow: 'none',
                filter: 'none',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                padding: 0,
                margin: 0
              }}
            >
              <AfriWonderLogo size="3xl" />
            </div>
            <h1 className="text-6xl sm:text-7xl font-black mb-6 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
              AfriWonder
            </h1>
          </motion.div>

          {/* Description */}
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            La première <span className="text-orange-400 font-bold">Super-app vidéo africaine</span> connectant créateurs, commerçants et communauté, optimisée pour les faibles débits, disponible dans toutes les langues locales avec paiements mobiles intégrés.
          </p>

          {/* CTA principal : S'inscrire — Se connecter reste uniquement dans le header */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowRegister(true);
                setError('');
                setAcceptedTerms(false);
              }}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-lg hover:shadow-2xl transition-all flex items-center justify-center gap-2"
            >
              S'inscrire <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Login/Register Form */}
          {showRegister ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 mt-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Créer un compte</h2>
              {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>}
              
              {/* Social Login Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </button>
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  className="w-full px-4 py-3 bg-[#1877F2] text-white rounded-lg font-semibold hover:bg-[#166FE5] transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continuer avec Facebook
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800/50 text-gray-400">OU</span>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nom complet"
                  value={registerData.full_name}
                  onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                
                {/* Checkbox for terms acceptance */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-orange-500 bg-gray-900 border-gray-600 rounded focus:ring-orange-500"
                    required
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-gray-300">
                    J'accepte les{' '}
                    <Link to="/TermsOfService" className="text-orange-500 hover:underline">
                      conditions de service
                    </Link>
                    {' '}et la{' '}
                    <Link to="/PrivacyPolicy" className="text-orange-500 hover:underline">
                      politique de confidentialité
                    </Link>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Inscription...' : 'S\'inscrire'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="w-full text-gray-400 hover:text-white text-sm"
                >
                  Déjà un compte ? Se connecter
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 mt-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Se connecter</h2>
              {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>}
              
              {/* Social Login Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    handleGoogleLogin();
                  }}
                  className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    handleFacebookLogin();
                  }}
                  className="w-full px-4 py-3 bg-[#1877F2] text-white rounded-lg font-semibold hover:bg-[#166FE5] transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continuer avec Facebook
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800/50 text-gray-400">OU</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="w-full text-gray-400 hover:text-white text-sm"
                >
                  Pas encore de compte ? S'inscrire
                </button>
              </form>
            </motion.div>
          )}

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-gray-400"
          >
            <ChevronDown className="w-8 h-8 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-5xl font-black text-center mb-16 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"
          >
            Tout ce dont tu as besoin en une app
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-8 hover:border-orange-500/50 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For Everyone Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-5xl font-black text-center mb-16 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"
          >
            Pour tous les Africains
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: idx === 0 ? -20 : idx === 2 ? 20 : 0 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl p-8"
                >
                  <Icon className="w-10 h-10 text-orange-400 mb-4" />
                  <h3 className="text-2xl font-bold mb-4">{benefit.title}</h3>
                  <ul className="space-y-3">
                    {benefit.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-300">
                        <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: '50M+', label: 'Utilisateurs' },
              { number: '1B+', label: 'Vidéos vues' },
              { number: '100K+', label: 'Créateurs' },
              { number: '24/7', label: 'Support' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-4xl font-black bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-3xl p-12 text-center"
          >
            <Lock className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-3xl font-bold mb-4">Sécurisé et de Confiance</h3>
            <p className="text-gray-400 mb-6">
              Vos données sont chiffrées, vos paiements sont sécurisés, et votre vie privée est protégée.
            </p>
            <div className="flex justify-center gap-6 flex-wrap">
              <div className="text-sm text-gray-400">✓ Chiffrement 256-bit</div>
              <div className="text-sm text-gray-400">✓ Certifications RGPD</div>
              <div className="text-sm text-gray-400">✓ Audit de sécurité externe</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-5xl font-black mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Prêt à découvrir AfriWonder ?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Rejoins des millions d'Africains qui transforment leur vie avec AfriWonder.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setShowRegister(true);
              setError('');
              setAcceptedTerms(false);
            }}
            className="px-12 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-xl hover:shadow-2xl transition-all"
          >
            Commencer Gratuitement
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 text-center text-gray-400">
        <div className="max-w-7xl mx-auto">
          <p className="mb-4">© 2026 AfriWonder. Fabriqué en Afrique 🌍</p>
          <div className="flex justify-center gap-6 flex-wrap">
            <Link 
              to="/PrivacyPolicy"
              onClick={() => window.scrollTo(0, 0)}
              className="hover:text-white transition-colors cursor-pointer underline"
            >
              Confidentialité
            </Link>
            <Link 
              to="/DataProtection"
              onClick={() => window.scrollTo(0, 0)}
              className="hover:text-white transition-colors cursor-pointer underline"
            >
              Sécurité
            </Link>
            <Link 
              to="/Help"
              onClick={() => window.scrollTo(0, 0)}
              className="hover:text-white transition-colors cursor-pointer underline"
            >
              Support
            </Link>
            <Link 
              to="/About"
              onClick={() => window.scrollTo(0, 0)}
              className="hover:text-white transition-colors cursor-pointer underline"
            >
              À propos
            </Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

