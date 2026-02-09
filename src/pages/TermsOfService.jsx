import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from 'lucide-react';
import BottomNav from '../components/navigation/BottomNav';

export default function TermsOfService() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 pb-20">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-2 border-orange-500/20 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-orange-100 text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Conditions de service</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Conditions de service – AfriWonder</h2>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">1. Objet</h3>
            <p className="text-gray-700">
              AfriWonder est une application mobile permettant aux utilisateurs de se connecter,
              communiquer et accéder à des services numériques.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">2. Acceptation des conditions</h3>
            <p className="text-gray-700">
              En utilisant l'application AfriWonder, l'utilisateur accepte pleinement les présentes
              conditions de service.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">3. Accès au service</h3>
            <p className="text-gray-700">
              L'accès à l'application peut nécessiter la création d'un compte via e-mail ou via
              des services d'authentification tiers (Google, Facebook).
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">4. Responsabilités de l'utilisateur</h3>
            <p className="text-gray-700">
              L'utilisateur s'engage à fournir des informations exactes et à ne pas utiliser
              l'application à des fins illégales ou frauduleuses.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">5. Protection des données</h3>
            <p className="text-gray-700">
              Les données personnelles sont traitées conformément à notre Politique de confidentialité.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">6. Suspension ou résiliation</h3>
            <p className="text-gray-700">
              AfriWonder se réserve le droit de suspendre ou supprimer un compte en cas de violation
              des présentes conditions.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">7. Limitation de responsabilité</h3>
            <p className="text-gray-700">
              AfriWonder ne pourra être tenu responsable des dommages directs ou indirects liés
              à l'utilisation de l'application.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">8. Modifications</h3>
            <p className="text-gray-700">
              Les présentes conditions peuvent être modifiées à tout moment. L'utilisateur sera
              informé en cas de changement majeur.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-600">9. Contact</h3>
            <p className="text-gray-700 mb-2">Pour toute question, veuillez nous contacter à :</p>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-5 h-5 text-orange-500" />
              <a href="mailto:fanebadaderefane@gmail.com" className="text-orange-600 font-medium hover:text-red-500 hover:underline">
                fanebadaderefane@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

