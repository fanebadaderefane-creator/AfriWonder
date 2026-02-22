import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS = [
  { q: "Comment fonctionne ServicesMali ?", a: "ServicesMali est une marketplace qui connecte les clients avec des prestataires de services qualifiés au Mali. Vous pouvez rechercher, contacter et engager des professionnels pour vos besoins." },
  { q: "Comment devenir prestataire ?", a: "Inscrivez-vous, puis cliquez sur \"Devenir Prestataire\" dans votre profil. Remplissez votre profil professionnel, choisissez un abonnement et soumettez-le pour vérification." },
  { q: "Quels sont les abonnements disponibles ?", a: "Nous proposons 3 packs : Basic (5 000 FCFA/mois), Pro (15 000 FCFA/mois) avec meilleure visibilité, et Premium (30 000 FCFA/mois) avec mise en avant prioritaire." },
  { q: "Comment payer l'abonnement ?", a: "Les paiements se font via Orange Money, Moov Money ou carte bancaire. Contactez notre équipe pour plus de détails sur les modalités de paiement." },
  { q: "Comment contacter un prestataire ?", a: "Sur la page du prestataire, utilisez le bouton \"Envoyer un message\" pour démarrer une conversation directe, ou \"Faire une demande\" pour envoyer une demande détaillée." },
  { q: "Les prestataires sont-ils vérifiés ?", a: "Oui, chaque profil de prestataire est vérifié par notre équipe avant d'être publié sur la plateforme, garantissant la qualité des services proposés." },
  { q: "Comment laisser un avis ?", a: "Rendez-vous sur le profil du prestataire et utilisez la section \"Avis\" pour noter et commenter votre expérience." },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Questions Fréquentes</h1>
        <p className="text-muted-foreground mt-2">Trouvez des réponses à vos questions</p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-white rounded-xl border border-border/50 overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium pr-4">{faq.q}</span>
              <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
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
        ))}
      </div>
    </div>
  );
}
