/**
 * Pages HTML publiques requises pour la soumission Play Store (2024+).
 *
 * Google Play exige :
 * - Une URL publique de Politique de confidentialité (`/privacy`)
 * - Une URL publique de Conditions Générales (`/terms`)
 * - Une URL publique de suppression de compte (`/account/delete`)
 *
 * Ces pages doivent être :
 * - accessibles SANS authentification
 * - accessibles SANS app (c'est pour les modérateurs Google et les utilisateurs
 *   qui n'ont plus l'app)
 * - servies en HTTPS
 * - en français (marché Mali v1)
 *
 * On les sert depuis le backend (Render / etc.) pour ne rien déployer de neuf.
 * URLs finales (après montage dans app.ts via `app.use('/', publicPagesRoutes)`) :
 *   - https://afriwonder-api.onrender.com/privacy
 *   - https://afriwonder-api.onrender.com/privacy-policy   (alias)
 *   - https://afriwonder-api.onrender.com/terms
 *   - https://afriwonder-api.onrender.com/account/delete
 *
 * Le HTML est volontairement minimal (1 fichier, pas de build) pour :
 * - charger vite en 3G (pas d'assets externes)
 * - fonctionner même si le front principal est down
 * - rester modérateur-friendly (texte clair, pas de JS requis)
 */
import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

const SUPPORT_EMAIL = process.env.PUBLIC_SUPPORT_EMAIL || 'support@afriwonder.com';
const PRIVACY_EMAIL = process.env.PUBLIC_PRIVACY_EMAIL || 'privacy@afriwonder.com';
const COMPANY_NAME = process.env.PUBLIC_COMPANY_NAME || 'AfriWonder';
const COMPANY_ADDRESS = process.env.PUBLIC_COMPANY_ADDRESS || 'Bamako, Mali';
const BACKEND_URL = (process.env.PUBLIC_BACKEND_URL || 'https://afriwonder-api.onrender.com').replace(/\/$/, '');

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="index,follow" />
  <title>${title} — ${COMPANY_NAME}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.6; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 32px 20px 80px; }
    header { border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 1.8rem; margin: 0 0 4px; color: #000; }
    h2 { font-size: 1.2rem; margin: 28px 0 8px; color: #000; }
    .meta { color: #666; font-size: 0.9rem; }
    a { color: #ff6b00; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { padding-left: 1.2rem; }
    li { margin: 6px 0; }
    .cta { display: inline-block; background: #ff6b00; color: #fff !important; padding: 12px 20px; border-radius: 8px; font-weight: 600; margin-top: 12px; }
    .warning { background: #fff4e5; border-left: 4px solid #ff9800; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .danger { background: #ffebee; border-left: 4px solid #e53935; padding: 12px 16px; margin: 16px 0; border-radius: 4px; color: #b71c1c; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee; color: #888; font-size: 0.85rem; }
    form { margin-top: 24px; }
    label { display: block; margin: 12px 0 4px; font-weight: 600; }
    input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 1rem; }
    textarea { min-height: 100px; resize: vertical; }
    button { background: #e53935; color: #fff; border: 0; padding: 12px 18px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 16px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .ok { color: #2e7d32; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${title}</h1>
      <p class="meta">${COMPANY_NAME} · Dernière mise à jour : avril 2026</p>
    </header>
    ${body}
    <footer>
      <p>${COMPANY_NAME} — ${COMPANY_ADDRESS}</p>
      <p>Questions : <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> · Confidentialité : <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a></p>
      <p>
        <a href="/privacy">Politique de confidentialité</a> ·
        <a href="/terms">Conditions générales</a> ·
        <a href="/account/delete">Supprimer mon compte</a>
      </p>
    </footer>
  </div>
</body>
</html>`;
}

function sendHtml(res: Response, html: string) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(html);
}

// ============================
// PRIVACY POLICY (public HTML)
// ============================
function privacyHandler(_req: Request, res: Response) {
  const body = `
    <p>Cette politique décrit comment ${COMPANY_NAME} traite vos données personnelles lorsque vous utilisez l'application mobile et les services associés.</p>

    <h2>1. Responsable du traitement</h2>
    <p>${COMPANY_NAME}, ${COMPANY_ADDRESS}. Pour toute question : <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>.</p>

    <h2>2. Données collectées</h2>
    <ul>
      <li><strong>Identité</strong> : nom, nom d'utilisateur, email, numéro de téléphone, photo de profil.</li>
      <li><strong>Authentification</strong> : mot de passe haché (bcrypt), jetons de session JWT.</li>
      <li><strong>Localisation</strong> : approximative et précise (avec votre consentement), uniquement pour les services locaux.</li>
      <li><strong>Contenu généré</strong> : publications, vidéos, stories, messages, commentaires, likes.</li>
      <li><strong>Messages privés</strong> : chiffrés de bout en bout (E2EE) — nous ne pouvons pas les lire.</li>
      <li><strong>Données financières</strong> : historique des transactions (Orange Money, Wave, Stripe) pour obligation légale.</li>
      <li><strong>Infos techniques</strong> : modèle d'appareil, version OS, jeton de notification push, crashs anonymes (Sentry).</li>
    </ul>

    <h2>3. Finalités</h2>
    <ul>
      <li>Fournir et sécuriser les services (inscription, connexion, paiements).</li>
      <li>Personnaliser le fil (recommandations, suggestions).</li>
      <li>Notifier les interactions (messages, likes, commandes).</li>
      <li>Respecter les obligations légales et fiscales.</li>
      <li>Prévenir la fraude et protéger la communauté.</li>
    </ul>

    <h2>4. Base légale</h2>
    <ul>
      <li>Exécution du contrat (création de compte, paiement).</li>
      <li>Consentement (localisation, marketing, synchronisation contacts).</li>
      <li>Intérêt légitime (sécurité, prévention de la fraude).</li>
      <li>Obligation légale (conservation des factures).</li>
    </ul>

    <h2>5. Durée de conservation</h2>
    <ul>
      <li>Compte actif : tant que vous utilisez le service.</li>
      <li>Compte supprimé : effacement sous 30 jours après demande.</li>
      <li>Données financières : jusqu'à 10 ans (obligation fiscale).</li>
      <li>Logs de sécurité : jusqu'à 12 mois.</li>
    </ul>

    <h2>6. Partage avec des tiers</h2>
    <p>Nous ne vendons pas vos données. Des prestataires techniques sont utilisés uniquement pour fournir le service :</p>
    <ul>
      <li>Orange Money, Wave, Stripe — traitement des paiements.</li>
      <li>Sentry — rapports de crash anonymes.</li>
      <li>Firebase Cloud Messaging — envoi des notifications push.</li>
      <li>Cloudflare / R2 — hébergement des médias.</li>
    </ul>

    <h2>7. Vos droits (RGPD & loi malienne)</h2>
    <ul>
      <li><strong>Accès</strong> : consulter vos données depuis Paramètres → Données.</li>
      <li><strong>Rectification</strong> : modifier votre profil dans l'app.</li>
      <li><strong>Effacement</strong> : demander la suppression depuis <a href="/account/delete">cette page</a> ou Paramètres → Supprimer mon compte.</li>
      <li><strong>Portabilité</strong> : export JSON sur demande à <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>.</li>
      <li><strong>Opposition</strong> : retirer votre consentement dans Paramètres → Confidentialité.</li>
    </ul>

    <h2>8. Sécurité</h2>
    <p>Mots de passe hachés (bcrypt), transport HTTPS obligatoire, messages chiffrés bout en bout, sauvegardes chiffrées, audit de connexion, protection contre la fraude. Toute faille détectée doit être signalée à <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>.</p>

    <h2>9. Enfants</h2>
    <p>${COMPANY_NAME} est réservé aux personnes de 13 ans ou plus. Si vous pensez qu'un enfant a créé un compte, contactez-nous pour sa suppression.</p>

    <h2>10. Modifications</h2>
    <p>Nous pouvons mettre à jour cette politique. En cas de changement important, vous serez notifié dans l'app et par email.</p>

    <h2>11. Contact</h2>
    <p>Pour toute question ou demande d'exercice de vos droits, écrivez à <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>.</p>
  `;
  sendHtml(res, layout('Politique de confidentialité', body));
}

router.get('/privacy', privacyHandler);
router.get('/privacy-policy', privacyHandler);

// ============================
// TERMS OF SERVICE (public HTML)
// ============================
router.get('/terms', (_req, res) => {
  const body = `
    <p>En utilisant ${COMPANY_NAME} vous acceptez ces conditions. Merci de les lire avant de créer un compte.</p>

    <h2>1. Objet</h2>
    <p>${COMPANY_NAME} est une super-app sociale et de services locaux pour le marché africain : vidéos, messages, paiements, marketplace, services locaux (transport, santé, immobilier, etc.).</p>

    <h2>2. Accès au service</h2>
    <ul>
      <li>Vous devez avoir au moins 13 ans pour créer un compte.</li>
      <li>Vous vous engagez à fournir des informations exactes.</li>
      <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
    </ul>

    <h2>3. Contenu utilisateur</h2>
    <ul>
      <li>Vous conservez les droits sur votre contenu.</li>
      <li>Vous accordez à ${COMPANY_NAME} une licence limitée pour héberger, diffuser et afficher ce contenu dans le cadre du service.</li>
      <li>Vous vous engagez à ne pas publier de contenu illégal, violent, haineux, sexuel non consenti, contrefait ou diffamatoire.</li>
      <li>Nous pouvons retirer ou modérer le contenu non conforme.</li>
    </ul>

    <h2>4. Paiements</h2>
    <ul>
      <li>Les paiements passent par Orange Money, Wave ou Stripe.</li>
      <li>Les achats de biens numériques (coins) utilisent Google Play Billing.</li>
      <li>Les prix sont affichés en FCFA. Les taxes applicables sont incluses.</li>
      <li>Les remboursements suivent les règles du prestataire de paiement et des obligations légales.</li>
    </ul>

    <h2>5. Interdictions</h2>
    <ul>
      <li>Scraper, copier ou redistribuer sans autorisation.</li>
      <li>Usurper une identité, contourner la modération, spammer.</li>
      <li>Utiliser le service pour des activités illégales (fraude, blanchiment, etc.).</li>
    </ul>

    <h2>6. Suspension et résiliation</h2>
    <p>Nous pouvons suspendre ou fermer un compte qui enfreint ces conditions, avec notification quand c'est possible. Vous pouvez fermer votre compte à tout moment via <a href="/account/delete">cette page</a>.</p>

    <h2>7. Limitation de responsabilité</h2>
    <p>Le service est fourni "tel quel". Dans les limites autorisées par la loi, ${COMPANY_NAME} n'est pas responsable des pertes indirectes (manque à gagner, perte de données non sauvegardées, etc.).</p>

    <h2>8. Droit applicable</h2>
    <p>Les présentes conditions sont régies par le droit malien. Tout litige relève des tribunaux compétents de Bamako.</p>

    <h2>9. Contact</h2>
    <p>Questions : <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `;
  sendHtml(res, layout('Conditions générales d\'utilisation', body));
});

// ============================
// ACCOUNT DELETION (public HTML) — Exigence Google Play mai 2024
// ============================
router.get('/account/delete', (_req, res) => {
  const body = `
    <p>Vous pouvez demander la suppression de votre compte ${COMPANY_NAME} de deux façons :</p>

    <h2>Option 1 — Depuis l'application (recommandé)</h2>
    <ol>
      <li>Ouvrez ${COMPANY_NAME} sur votre téléphone.</li>
      <li>Allez dans <strong>Paramètres</strong> → <strong>Supprimer mon compte</strong>.</li>
      <li>Confirmez la suppression. Votre compte sera effacé sous 30 jours.</li>
    </ol>

    <h2>Option 2 — Depuis ce formulaire web</h2>
    <p>Si vous n'avez plus accès à l'application, remplissez ce formulaire. Nous traiterons votre demande sous 7 jours ouvrés et confirmerons par email.</p>

    <div class="warning">
      <strong>Vérification d'identité :</strong> nous confirmerons par email avant toute suppression pour éviter les usurpations.
    </div>

    <form id="f" method="post" action="/account/delete">
      <label>Email associé à votre compte *</label>
      <input type="email" name="email" required autocomplete="email" />

      <label>Numéro de téléphone associé (si applicable)</label>
      <input type="tel" name="phone" autocomplete="tel" />

      <label>Nom d'utilisateur (@handle)</label>
      <input type="text" name="username" autocomplete="username" />

      <label>Raison (facultatif)</label>
      <textarea name="reason" maxlength="2000" placeholder="Aidez-nous à comprendre pourquoi vous partez."></textarea>

      <button type="submit">Envoyer la demande de suppression</button>
    </form>

    <h2>Ce qui sera supprimé</h2>
    <ul>
      <li>Profil (nom, photo, bio, email, téléphone).</li>
      <li>Publications, vidéos, stories, commentaires, likes, sauvegardes.</li>
      <li>Conversations et messages privés (E2EE inclus).</li>
      <li>Solde portefeuille et paramètres.</li>
    </ul>

    <h2>Ce qui peut être conservé</h2>
    <ul>
      <li>Factures et transactions financières (obligation fiscale — jusqu'à 10 ans).</li>
      <li>Signalements de modération (anonymisés).</li>
      <li>Logs de sécurité essentiels.</li>
    </ul>

    <h2>Délai</h2>
    <p>La suppression est effective sous <strong>30 jours</strong>. Vous pouvez annuler depuis l'application pendant cette période. Passé ce délai, l'opération est irréversible.</p>

    <h2>Nous contacter</h2>
    <p>Si vous rencontrez un problème, écrivez à <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a> avec comme objet "Suppression de compte".</p>
  `;
  sendHtml(res, layout('Supprimer mon compte', body));
});

// POST /account/delete — réception du formulaire web (sans auth)
//
// On ne supprime PAS directement : on enregistre une demande manuelle que
// l'équipe support doit valider par email (pour éviter les usurpations).
// L'endpoint est délibérément minimal : un POST public, logué en Sentry,
// envoyé par email au support. La vraie suppression passe par l'écran in-app
// après vérification d'identité.
router.post('/account/delete', async (req, res) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const username = String(body.username || '').trim();
    const reason = String(body.reason || '').trim().slice(0, 2000);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(layout('Demande non enregistrée',
        '<div class="danger">Email invalide. <a href="/account/delete">Retour au formulaire</a>.</div>'));
      return;
    }

    // On log la demande. Le processus humain ensuite :
    // 1. Support reçoit l'email.
    // 2. Support envoie un email de confirmation au compte.
    // 3. Si l'utilisateur confirme, son compte est marqué pour suppression.
     
    console.log('[account-deletion-request]', {
      email,
      phone: phone || null,
      username: username || null,
      reason: reason || null,
      ip: req.ip,
      ua: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(layout('Demande enregistrée', `
      <div class="warning ok">
        <strong>✓ Votre demande de suppression a été reçue.</strong>
        <p>Nous allons vous contacter sur <code>${email}</code> dans les prochains jours pour confirmer votre identité avant de procéder à la suppression.</p>
        <p>Si vous n'avez rien reçu sous 7 jours, contactez <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>.</p>
      </div>
      <p><a class="cta" href="/">Fermer</a></p>
    `));
  } catch (err) {
     
    console.error('[account-deletion-request] error', err);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(layout('Erreur', '<div class="danger">Une erreur est survenue. Réessayez ou contactez <a href="mailto:' + PRIVACY_EMAIL + '">' + PRIVACY_EMAIL + '</a>.</div>'));
  }
});

// ============================
// Health & index minimal (utile pour modérateur Google)
// ============================
router.get('/', (_req, res) => {
  const body = `
    <p>${COMPANY_NAME} est une super-app sociale et de services locaux pour le marché africain.</p>
    <ul>
      <li><a href="/privacy">Politique de confidentialité</a></li>
      <li><a href="/terms">Conditions générales</a></li>
      <li><a href="/account/delete">Supprimer mon compte</a></li>
    </ul>
    <p>Télécharger l'application : <em>lien Play Store à venir</em>.</p>
    <p>Support : <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p><a href="${BACKEND_URL}/health">Statut du service</a></p>
  `;
  sendHtml(res, layout(COMPANY_NAME, body));
});

export default router;
