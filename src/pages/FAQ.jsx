import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { upsertJsonLdScript, removeJsonLdScript } from "@/lib/seoUtils";

const FAQS = [
  { q: "Qu’est-ce qu’AfriWonder ?", a: "AfriWonder est une super-app africaine : vidéo sociale, marketplace, services, wallet et contenus adaptés aux connexions variables." },
  { q: "Comment créer un compte ?", a: "Téléchargez l’app ou ouvrez le site, puis suivez l’inscription avec email ou téléphone. Vous pourrez compléter votre profil ensuite." },
  { q: "Comment vendre sur la marketplace ?", a: "Depuis votre profil, devenez vendeur, ajoutez vos produits avec photos et prix, et gérez commandes et messages acheteurs." },
  { q: "Quels moyens de paiement sont disponibles ?", a: "Selon les modules activés : Orange Money, Wave, MTN, Moov, carte ou portefeuille intégré. Les options affichées dépendent du vendeur et du pays." },
  { q: "Comment contacter le support ?", a: "Utilisez la page Aide ou les canaux indiqués dans l’app (email support). Les créateurs et vendeurs peuvent aussi être contactés via messagerie." },
  { q: "Les comptes et données sont-ils protégés ?", a: "Consultez notre Politique de confidentialité : données minimisées, sécurisation des accès et options de compte dans les paramètres." },
  { q: "Puis-je utiliser AfriWonder sans connexion ?", a: "Certaines pages (actus, découverte) sont consultables ; le fil personnalisé, le wallet et la messagerie nécessitent un compte." },
];

const FAQ_JSONLD_ID = 'afriwonder-faq-jsonld';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    upsertJsonLdScript(FAQ_JSONLD_ID, {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    });
    return () => removeJsonLdScript(FAQ_JSONLD_ID);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground">Questions fréquentes</h1>
        <p className="text-muted-foreground mt-2">Réponses rapides sur AfriWonder</p>
      </div>

      <h2 className="sr-only">Liste des questions</h2>
      <div className="space-y-3" role="list">
        {FAQS.map((faq, i) => {
          const panelId = `faq-panel-${i}`;
          const btnId = `faq-trigger-${i}`;
          const expanded = openIndex === i;
          return (
            <div key={i} className="bg-white rounded-xl border border-border/50 overflow-hidden" role="listitem">
              <button
                type="button"
                id={btnId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenIndex(expanded ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium pr-4 text-foreground">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
