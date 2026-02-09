import { base44 } from "@base44/sdk";

// Vérifier les permissions utilisateur
export async function checkPermission(request) {
  const { userId, resource, action } = request.query;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users || users.length === 0) {
      return { success: false, hasPermission: false };
    }

    const user = users[0];
    const permissions = getPermissions(user.role);

    const hasPermission = permissions[resource]?.includes(action) || false;

    return {
      success: true,
      hasPermission,
      role: user.role
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user permissions
export async function getUserPermissions(request) {
  const { userId } = request.query;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users || users.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    const user = users[0];
    const permissions = getPermissions(user.role);

    return {
      success: true,
      role: user.role,
      permissions
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update user role
export async function updateUserRole(request) {
  const { userId, newRole, adminId } = request.body;

  try {
    // Vérifier que l'admin a les permissions
    const admins = await base44.asServiceRole.entities.User.filter({ id: adminId });
    if (!admins || admins.length === 0 || admins[0].role !== "admin") {
      return { success: false, error: "Non autorisé" };
    }

    const validRoles = ["user", "creator", "seller", "moderator", "admin"];
    if (!validRoles.includes(newRole)) {
      return { success: false, error: "Rôle invalide" };
    }

    await base44.asServiceRole.entities.User.update(userId, {
      role: newRole
    });

    // Créer un log d'audit
    await base44.asServiceRole.entities.AuditLog.create({
      admin_id: adminId,
      action: "role_change",
      user_id: userId,
      old_value: null,
      new_value: newRole,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: `Rôle changé en ${newRole}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Middleware helper - check permission
export function requirePermission(resource, action) {
  return async (request, response, next) => {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(401).json({ error: "Non authentifié" });
    }

    const result = await checkPermission(null, {
      query: { userId, resource, action }
    });

    if (!result.hasPermission) {
      return response.status(403).json({ error: "Non autorisé" });
    }

    next();
  };
}

// Définir les permissions par rôle
function getPermissions(role) {
  const permissions = {
    user: {
      profile: ["read", "update"],
      videos: ["create", "read", "update", "delete"],
      comments: ["create", "read", "update", "delete"],
      likes: ["create", "delete"],
      follow: ["create", "delete"],
      messages: ["create", "read"],
      wallet: ["read"],
      notifications: ["read", "update"]
    },
    creator: {
      profile: ["read", "update"],
      videos: ["create", "read", "update", "delete", "publish"],
      analytics: ["read"],
      comments: ["create", "read", "update", "delete", "moderate"],
      monetization: ["read", "update"],
      subscriptions: ["read"],
      settings: ["update"]
    },
    seller: {
      profile: ["read", "update"],
      products: ["create", "read", "update", "delete"],
      orders: ["read", "update"],
      inventory: ["read", "update"],
      analytics: ["read"],
      wallet: ["read", "withdraw"],
      settings: ["update"]
    },
    moderator: {
      reports: ["read", "update"],
      users: ["read", "update"],
      content: ["read", "update", "delete"],
      bans: ["create", "read", "update"],
      analytics: ["read"]
    },
    admin: {
      "*": ["*"] // Accès complet
    }
  };

  return permissions[role] || {};
}