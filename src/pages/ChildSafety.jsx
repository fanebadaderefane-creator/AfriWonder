import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function ChildSafety() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-emerald-50/30">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-500/20 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-emerald-700">Normes de sécurité des enfants</h1>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <article className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 space-y-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 mt-0.5" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Politique CSAE (exploitation et abus sexuels sur mineurs)
              </h2>
              <p className="text-sm text-gray-600 mt-1">Dernière mise à jour : 07/05/2026</p>
            </div>
          </div>

          <p className="text-gray-700">
            AfriWonder applique une politique de tolerance zero contre l'exploitation sexuelle des enfants et les
            abus sexuels sur mineurs (CSAE). Tout contenu, comportement ou interaction impliquant des mineurs dans un
            contexte sexuel, coercitif ou d'exploitation est strictement interdit.
          </p>

          <section>
            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Nos engagements</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Interdiction totale des contenus CSAE et des tentatives d'approche de mineurs.</li>
              <li>Detection, moderation et suppression rapide des contenus signales.</li>
              <li>Suspension ou suppression definitive des comptes en infraction.</li>
              <li>Signalement aux autorites competentes lorsque la loi l'exige.</li>
              <li>Cooperation avec les organismes de protection de l'enfance et les forces de l'ordre.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Signalement</h3>
            <p className="text-gray-700">
              Les utilisateurs peuvent signaler un contenu ou un compte via la fonction "Signaler" dans l'application.
              Vous pouvez aussi contacter directement notre equipe de securite :
            </p>
            <div className="flex items-center gap-2 mt-2 text-gray-800">
              <Mail className="w-4 h-4 text-emerald-700" />
              <a href="mailto:safety@afriwonder.com" className="text-emerald-700 hover:underline">
                safety@afriwonder.com
              </a>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Application des regles</h3>
            <p className="text-gray-700">
              Toute violation peut entrainer le retrait de contenu, des restrictions temporaires ou un bannissement
              permanent. AfriWonder se reserve le droit de prendre toute mesure necessaire pour proteger les mineurs.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}

