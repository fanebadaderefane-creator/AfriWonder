import { base44 } from "@base44/sdk";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Google OAuth callback
export async function handleGoogleOAuthCallback(request) {
  const { code, redirectUrl } = request.body;

  try {
    // Échanger le code pour un token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUrl
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error("Impossible d'obtenir le token");
    }

    // Récupérer les infos utilisateur
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userData = await userResponse.json();

    // Chercher ou créer l'utilisateur
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      google_id: userData.id
    });

    let user;
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      // Vérifier si l'email existe
      const emailUsers = await base44.asServiceRole.entities.User.filter({
        email: userData.email
      });

      if (emailUsers && emailUsers.length > 0) {
        user = emailUsers[0];
        // Lier le compte Google
        await base44.asServiceRole.entities.User.update(user.id, {
          google_id: userData.id
        });
      } else {
        // Créer un nouvel utilisateur
        user = await base44.asServiceRole.entities.User.create({
          email: userData.email,
          full_name: userData.name,
          google_id: userData.id,
          avatar_url: userData.picture,
          email_verified: true,
          role: "user"
        });
      }
    }

    // Créer une session
    const sessionToken = await base44.auth.createSession(user.id);

    return {
      success: true,
      user,
      sessionToken,
      message: "Connecté avec Google"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Facebook OAuth callback
export async function handleFacebookOAuthCallback(request) {
  const { code, redirectUrl } = request.body;

  try {
    // Échanger le code pour un token
    const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        code,
        redirect_uri: redirectUrl
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error("Impossible d'obtenir le token");
    }

    // Récupérer les infos utilisateur
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
    );

    const userData = await userResponse.json();

    // Chercher ou créer l'utilisateur
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      facebook_id: userData.id
    });

    let user;
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      const emailUsers = await base44.asServiceRole.entities.User.filter({
        email: userData.email
      });

      if (emailUsers && emailUsers.length > 0) {
        user = emailUsers[0];
        await base44.asServiceRole.entities.User.update(user.id, {
          facebook_id: userData.id
        });
      } else {
        user = await base44.asServiceRole.entities.User.create({
          email: userData.email,
          full_name: userData.name,
          facebook_id: userData.id,
          avatar_url: userData.picture?.data?.url,
          email_verified: true,
          role: "user"
        });
      }
    }

    const sessionToken = await base44.auth.createSession(user.id);

    return {
      success: true,
      user,
      sessionToken,
      message: "Connecté avec Facebook"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Apple OAuth callback
export async function handleAppleOAuthCallback(request) {
  const { code, redirectUrl } = request.body;

  try {
    // Échanger le code pour un token
    const tokenResponse = await fetch("https://appleid.apple.com/auth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        client_secret: process.env.APPLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUrl
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.id_token) {
      throw new Error("Impossible d'obtenir le token");
    }

    // Décoder le JWT (simplifié - utiliser 'jsonwebtoken' en production)
    const userData = JSON.parse(Buffer.from(tokenData.id_token.split(".")[1], "base64").toString());

    const existingUsers = await base44.asServiceRole.entities.User.filter({
      apple_id: userData.sub
    });

    let user;
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      user = await base44.asServiceRole.entities.User.create({
        email: userData.email,
        full_name: userData.name || "Apple User",
        apple_id: userData.sub,
        email_verified: true,
        role: "user"
      });
    }

    const sessionToken = await base44.auth.createSession(user.id);

    return {
      success: true,
      user,
      sessionToken,
      message: "Connecté avec Apple"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}