import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Search, MessageCircle, Mail, Phone, ChevronDown, CreditCard, Shield, Video, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

const faqCategories = [
  { id: 'account', icon: Shield, label: 'Compte & Sécurité' },
  { id: 'payment', icon: CreditCard, label: 'Paiements & Wallet' },
  { id: 'content', icon: Video, label: 'Contenus & Vidéos' },
  { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
];

const faqs = [
  { q: 'Comment créer un compte ?', a: 'Téléchargez l\'app et inscrivez-vous avec votre numéro de téléphone ou email.' },
  { q: 'Comment recharger mon wallet ?', a: 'Allez dans Wallet > Recharger et choisissez votre méthode de paiement (Orange Money, Wave, etc.).' },
  { q: 'Comment publier une vidéo ?', a: 'Appuyez sur le bouton + en bas de l\'écran, sélectionnez votre vidéo et ajoutez des effets.' },
  { q: 'Comment vendre sur le marketplace ?', a: 'Créez votre boutique depuis votre profil, puis ajoutez vos produits avec photos et prix.' },
];

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqs, setOpenFaqs] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleFaq = (index) => {
    setOpenFaqs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleCategoryClick = (categoryId) => {
    // Filtrer les FAQs par catégorie ou faire défiler vers la section FAQ
    const faqSection = document.querySelector('[data-faq-section]');
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleEmailClick = () => {
    window.location.href = 'mailto:support@afriwonder.app';
  };

  const handlePhoneClick = () => {
    window.location.href = 'tel:+221771234567';
  };

  const handleChatClick = () => {
    toast.info('Le chat en direct sera bientôt disponible. Contactez-nous par email : support@afriwonder.app', {
      duration: 5000,
      action: {
        label: 'Envoyer un email',
        onClick: () => window.location.href = 'mailto:support@afriwonder.app',
      },
    });
  };

  // Filtrer les FAQs selon la recherche
  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50/30 pb-20">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-2 border-blue-500/20 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" aria-label="Retour"><ArrowLeft className="w-6 h-6" /></Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Aide & Support</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <Input 
              placeholder="Rechercher une question..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10 rounded-xl bg-blue-50/50 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20" 
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {faqCategories.map((cat, index) => (
            <motion.div 
              key={cat.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="p-4 text-center cursor-pointer hover:shadow-md hover:border-blue-200 border-blue-100 transition-all active:scale-95"
                onClick={() => handleCategoryClick(cat.id)}
              >
                <cat.icon className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm font-medium text-gray-800">{cat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="p-4 border-blue-100 shadow-sm" data-faq-section>
          <h3 className="font-semibold mb-3 text-blue-600">Questions fréquentes</h3>
          {filteredFaqs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucune question trouvée pour "{searchQuery}"</p>
          ) : (
            <div className="space-y-2">
              {filteredFaqs.map((faq, index) => (
                <Collapsible 
                  key={index}
                  open={openFaqs[index]}
                  onOpenChange={() => toggleFaq(index)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-blue-50/50 rounded-lg hover:bg-blue-100/80 transition-colors cursor-pointer border border-transparent hover:border-blue-200">
                    <span className="text-sm font-medium text-left text-gray-800">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${openFaqs[index] ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 py-2 text-sm text-gray-600">
                    {faq.a}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 border-blue-100 shadow-sm">
          <h3 className="font-semibold mb-3 text-blue-600">Nous contacter</h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-gray-800"
              onClick={() => navigate(createPageUrl('Support'))}
            >
              <MessageCircle className="w-5 h-5 mr-3 text-blue-600" />
              Mes tickets support
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-gray-800"
              onClick={handleChatClick}
            >
              <MessageCircle className="w-5 h-5 mr-3 text-blue-600" />
              Chat en direct
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-gray-800"
              onClick={handleEmailClick}
            >
              <Mail className="w-5 h-5 mr-3 text-blue-600" />
              support@afriwonder.app
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-gray-800"
              onClick={handlePhoneClick}
            >
              <Phone className="w-5 h-5 mr-3 text-blue-600" />
              +221 77 123 45 67
            </Button>
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}