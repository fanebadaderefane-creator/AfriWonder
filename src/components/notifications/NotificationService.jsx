class NotificationService {
  static async notifyNewOrder(_sellerId, _orderId, _productName, _buyerName) {
    // TODO: Implement in backend
  }

  static async notifyOrderStatus(_buyerId, _orderId, _status, _productName) {
    // TODO: Implement in backend
  }

  static async notifyEscrowRelease(_sellerId, _orderId, _amount) {
    // TODO: Implement in backend
  }

  static async notifyNewRating(_sellerId, _rating, _review, _buyerName) {
    // TODO: Implement in backend
  }

  static async notifyVideoComment(_userId, _videoId, _creatorId, _comment) {
    // TODO: Implement in backend
  }

  static async notifyCommentReply(_commentAuthorId, _videoId, _replyAuthorName, _reply) {
    // TODO: Implement in backend
  }

  static extractMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }

  static async getUserIdsFromMentions(_usernames) {
    // TODO: Implement user search
    return [];
  }

  static async notifyMention(_fromUserId, _mentionedUserId, _content, _contextType, _contextId) {
    // TODO: Implement in backend
  }

  static async notifyVideoLike(_userId, _videoId, _creatorId) {
    // TODO: Implement in backend
  }

  static async notifyNewFollower(_followerId, _followingId) {
    // TODO: Implement in backend
  }

  static async notifyTipReceived(_senderId, _receiverId, _amount, _videoId) {
    // TODO: Implement in backend
  }

  static async notifyPromotion(_userId, _title, _message, _productId = null) {
    // TODO: Implement in backend
  }

  static async notifyFlashSale(_userId, _productName, _discount) {
    // TODO: Implement in backend
  }

  static async notifyDispute(_userId, _orderId, _message) {
    // TODO: Implement in backend
  }
}

export default NotificationService;
