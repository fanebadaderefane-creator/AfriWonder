import { getPersonalizedFeed } from './recommendation.service.js';

const GREETING = "Bonjour ! Je suis l'assistant AfriWonder. Vous pouvez me demander des recommandations de vidéos, des infos sur la plateforme, ou taper 'reco' pour des vidéos personnalisées.";
const HELP = "Commandes : 'reco' = vidéos recommandées, 'aide' = ce message, 'marketplace' = infos marketplace, 'paiement' = infos paiement.";
const FALLBACK = "Je n'ai pas compris. Tapez 'aide' pour les commandes disponibles.";

export const assistantService = {
  async chat(userId: string, message: string): Promise<{ reply: string; data?: unknown }> {
    const m = (message || "").trim().toLowerCase();
    if (!m) return { reply: GREETING };

    if (m === "aide" || m === "help") return { reply: HELP };
    if (m.includes("bonjour") || m.includes("salut") || m === "hi" || m === "hello") return { reply: GREETING };
    if (m === "reco" || m.includes("recommandation") || m.includes("vidéo")) {
      try {
        const recos = await getPersonalizedFeed({ userId, limit: 5 });
        const list = recos?.videos ?? [];
        if (list.length === 0) {
          return { reply: "Aucune recommandation pour le moment. Regardez des vidéos et likez pour personnaliser !", data: [] };
        }
        const titles = list.slice(0, 5).map((v, i) => `${i + 1}. ${v.title || "Vidéo"}`).join("\n");
        return { reply: `Recommandations pour vous :\n${titles}`, data: list };
      } catch {
        return { reply: "Recommandations temporairement indisponibles. Réessayez plus tard." };
      }
    }
    if (m.includes("marketplace") || m.includes("vendre") || m.includes("acheter")) {
      return { reply: "Marketplace : vendez et achetez sur AfriWonder. Allez dans Marketplace pour voir les produits, ou devenez vendeur (BecomeSeller). Paiement par wallet, Orange Money, Wave, Stripe." };
    }
    if (m.includes("paiement") || m.includes("payer") || m.includes("wallet")) {
      return { reply: "Paiement : utilisez Mon Wallet pour recharger, payer en ligne, ou recevoir des dons. Orange Money, Wave, MTN et carte sont acceptés selon votre région." };
    }

    return { reply: FALLBACK };
  },
};
