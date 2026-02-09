import { base44 } from "@base44/sdk";

// WebSocket connection manager
class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.rooms = new Map();
  }

  // Handle new connection
  handleConnection(ws, userId) {
    this.connections.set(userId, ws);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(userId, message, ws);
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      this.handleDisconnect(userId);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  }

  // Route messages
  handleMessage(userId, message, ws) {
    const { type, roomId, data } = message;

    switch (type) {
      case "join_live":
        this.joinLiveRoom(userId, roomId, ws);
        break;
      case "leave_live":
        this.leaveLiveRoom(userId, roomId);
        break;
      case "live_chat":
        this.broadcastLiveChat(roomId, userId, data);
        break;
      case "live_gift":
        this.broadcastLiveGift(roomId, userId, data);
        break;
      case "viewers_update":
        this.updateViewersCount(roomId);
        break;
      case "notification":
        this.sendNotification(userId, data);
        break;
      case "direct_message":
        this.sendDirectMessage(userId, data.recipientId, data);
        break;
      default:
        console.warn("Unknown message type:", type);
    }
  }

  // Join live stream room
  joinLiveRoom(userId, roomId, ws) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(userId);

    // Notifier les autres viewers
    this.broadcastToRoom(roomId, {
      type: "user_joined",
      userId,
      viewerCount: this.rooms.get(roomId).size
    });

    // Envoyer le nombre de viewers au client
    ws.send(JSON.stringify({
      type: "viewers_count",
      count: this.rooms.get(roomId).size
    }));
  }

  // Leave live stream room
  leaveLiveRoom(userId, roomId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(userId);
      
      const viewerCount = this.rooms.get(roomId).size;
      
      // Notifier les autres viewers
      this.broadcastToRoom(roomId, {
        type: "user_left",
        userId,
        viewerCount
      });

      // Supprimer la room si elle est vide
      if (viewerCount === 0) {
        this.rooms.delete(roomId);
      }
    }

    // Supprimer la connexion
    this.connections.delete(userId);
  }

  // Broadcast live chat
  async broadcastLiveChat(roomId, senderId, data) {
    const { message, senderName, senderAvatar } = data;

    // Sauvegarder en base de données
    await base44.asServiceRole.entities.LiveChat.create({
      live_id: roomId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      message,
      message_type: "text"
    });

    // Broadcaster à tous les viewers
    this.broadcastToRoom(roomId, {
      type: "live_chat",
      senderId,
      senderName,
      senderAvatar,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast live gift
  async broadcastLiveGift(roomId, senderId, data) {
    const { giftName, giftIcon, amount, senderName, senderAvatar, creatorId } = data;

    // Créer la transaction du cadeau
    await base44.asServiceRole.entities.LiveGift.create({
      live_id: roomId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      creator_id: creatorId,
      gift_name: giftName,
      gift_icon: giftIcon,
      amount
    });

    // Broadcaster le cadeau
    this.broadcastToRoom(roomId, {
      type: "live_gift",
      senderId,
      senderName,
      senderAvatar,
      giftName,
      giftIcon,
      amount
    });
  }

  // Update viewers count
  updateViewersCount(roomId) {
    const count = this.rooms.get(roomId)?.size || 0;
    this.broadcastToRoom(roomId, {
      type: "viewers_count",
      count
    });
  }

  // Send notification
  sendNotification(userId, data) {
    if (this.connections.has(userId)) {
      this.connections.get(userId).send(JSON.stringify({
        type: "notification",
        ...data
      }));
    }
  }

  // Send direct message
  async sendDirectMessage(senderId, recipientId, data) {
    const { message, senderName, senderAvatar } = data;

    // Sauvegarder le message
    const directMsg = await base44.asServiceRole.entities.DirectMessage.create({
      sender_id: senderId,
      recipient_id: recipientId,
      message,
      is_read: false
    });

    // Envoyer au destinataire s'il est connecté
    if (this.connections.has(recipientId)) {
      this.connections.get(recipientId).send(JSON.stringify({
        type: "direct_message",
        messageId: directMsg.id,
        senderId,
        senderName,
        senderAvatar,
        message,
        timestamp: new Date().toISOString()
      }));
    }

    // Confirmation à l'envoyeur
    if (this.connections.has(senderId)) {
      this.connections.get(senderId).send(JSON.stringify({
        type: "message_sent",
        messageId: directMsg.id
      }));
    }
  }

  // Broadcast to room
  broadcastToRoom(roomId, message) {
    if (this.rooms.has(roomId)) {
      const users = this.rooms.get(roomId);
      users.forEach(userId => {
        if (this.connections.has(userId)) {
          this.connections.get(userId).send(JSON.stringify(message));
        }
      });
    }
  }

  // Disconnect user
  handleDisconnect(userId) {
    // Trouver les rooms où l'utilisateur était
    this.rooms.forEach((users, roomId) => {
      if (users.has(userId)) {
        this.leaveLiveRoom(userId, roomId);
      }
    });

    this.connections.delete(userId);
  }
}

export const wsManager = new WebSocketManager();

// Export pour utilisation
export function handleWebSocketConnection(request) {
  const { userId } = request.query;
  
  // Cette fonction sera appelée par le serveur WebSocket
  return {
    onConnection: (ws) => {
      wsManager.handleConnection(ws, userId);
    }
  };
}