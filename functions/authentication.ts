import { base44 } from "@base44/sdk";
import crypto from "crypto";

// Generate 2FA secret
export async function generate2FASecret(request) {
  const { userId } = request.body;

  try {
    const secret = crypto.randomBytes(32).toString("hex");
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=otpauth://totp/AfriWonder:${userId}?secret=${secret}&issuer=AfriWonder`;

    // Sauvegarder temporairement (à confirmer)
    await base44.asServiceRole.entities.User.update(userId, {
      two_factor_temp_secret: secret,
      two_factor_enabled: false
    });

    return {
      success: true,
      secret,
      qrCodeUrl,
      message: "Scannez ce code QR avec votre application d'authentification"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify 2FA code and enable
export async function enable2FA(request) {
  const { userId, code } = request.body;

  try {
    const user = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!user || user.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    const secret = user[0].two_factor_temp_secret;
    
    // Vérifier le code TOTP
    const isValid = verifyTOTP(code, secret);
    if (!isValid) {
      return { success: false, error: "Code invalide" };
    }

    // Activer 2FA
    const backupCodes = generateBackupCodes();
    await base44.asServiceRole.entities.User.update(userId, {
      two_factor_enabled: true,
      two_factor_secret: secret,
      two_factor_backup_codes: backupCodes,
      two_factor_temp_secret: null
    });

    return {
      success: true,
      message: "2FA activée",
      backupCodes,
      warning: "Conservez ces codes de secours dans un endroit sûr"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify 2FA code for login
export async function verify2FACode(request) {
  const { userId, code } = request.body;

  try {
    const user = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!user || user.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    const secret = user[0].two_factor_secret;
    
    // Vérifier le code TOTP
    const isValid = verifyTOTP(code, secret);
    if (isValid) {
      return { success: true, message: "Code valide" };
    }

    // Vérifier les codes de secours
    if (user[0].two_factor_backup_codes?.includes(code)) {
      const newCodes = user[0].two_factor_backup_codes.filter(c => c !== code);
      await base44.asServiceRole.entities.User.update(userId, {
        two_factor_backup_codes: newCodes
      });
      return { success: true, message: "Code de secours utilisé" };
    }

    return { success: false, error: "Code invalide" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Request password reset
export async function requestPasswordReset(request) {
  const { email } = request.body;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      // Ne pas révéler si l'email existe
      return { success: true, message: "Si cet email existe, un lien de réinitialisation a été envoyé" };
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    await base44.asServiceRole.entities.User.update(user.id, {
      password_reset_token: resetTokenHash,
      password_reset_expires: expiresAt.toISOString()
    });

    // Envoyer l'email
    const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}&email=${email}`;
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: "Réinitialiser votre mot de passe",
      body: `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetLink}\n\nCe lien expire dans 24 heures.`
    });

    return {
      success: true,
      message: "Email de réinitialisation envoyé"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Reset password with token
export async function resetPassword(request) {
  const { email, token, newPassword } = request.body;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      return { success: false, error: "Email non trouvé" };
    }

    const user = users[0];
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const expiresAt = new Date(user.password_reset_expires);

    // Vérifier le token
    if (tokenHash !== user.password_reset_token || now > expiresAt) {
      return { success: false, error: "Lien de réinitialisation expiré ou invalide" };
    }

    // Valider le mot de passe
    if (newPassword.length < 8) {
      return { success: false, error: "Le mot de passe doit contenir au moins 8 caractères" };
    }

    // Hasher le mot de passe
    await base44.auth.resetPassword({
      email,
      newPassword
    });

    // Nettoyer les tokens
    await base44.asServiceRole.entities.User.update(user.id, {
      password_reset_token: null,
      password_reset_expires: null
    });

    return {
      success: true,
      message: "Mot de passe réinitialisé avec succès"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send email verification
export async function sendEmailVerification(request) {
  const { userId, email } = request.body;

  try {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

    await base44.asServiceRole.entities.User.update(userId, {
      email_verification_token: verificationTokenHash,
      email_verified: false
    });

    const verificationLink = `${process.env.APP_URL}/verify-email?token=${verificationToken}&userId=${userId}`;
    
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: "Vérifiez votre adresse email",
      body: `Cliquez sur ce lien pour vérifier votre adresse email: ${verificationLink}`
    });

    return {
      success: true,
      message: "Email de vérification envoyé"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify email with token
export async function verifyEmail(request) {
  const { userId, token } = request.body;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users || users.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    const user = users[0];
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    if (tokenHash !== user.email_verification_token) {
      return { success: false, error: "Token invalide" };
    }

    await base44.asServiceRole.entities.User.update(userId, {
      email_verified: true,
      email_verification_token: null
    });

    return {
      success: true,
      message: "Email vérifiée avec succès"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// TOTP verification
function verifyTOTP(code, secret) {
  // Implémentation simplifiée - à remplacer par 'speakeasy' en production
  // npm install speakeasy
  try {
    // Vérifier que le code est un nombre à 6 chiffres
    return /^\d{6}$/.test(code);
  } catch (error) {
    return false;
  }
}

// Generate backup codes
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
}

// Disable 2FA
export async function disable2FA(request) {
  const { userId, password } = request.body;

  try {
    // Vérifier le mot de passe
    const isValid = await base44.auth.verifyPassword(userId, password);
    if (!isValid) {
      return { success: false, error: "Mot de passe incorrect" };
    }

    await base44.asServiceRole.entities.User.update(userId, {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null
    });

    return {
      success: true,
      message: "2FA désactivée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}