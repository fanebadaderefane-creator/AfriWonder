declare module 'web-push' {
  interface WebPushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: WebPushSubscription, payload: string | Buffer): Promise<unknown>;
  };
  export default webpush;
}
