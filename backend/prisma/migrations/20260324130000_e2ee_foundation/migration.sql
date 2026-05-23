-- E2E foundation: devices, prekeys, encrypted envelopes

CREATE TABLE "UserE2eeDevice" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "identity_key_public" TEXT NOT NULL,
  "signed_prekey_public" TEXT NOT NULL,
  "signed_prekey_signature" TEXT NOT NULL,
  "key_algo" TEXT NOT NULL DEFAULT 'x25519',
  "app_version" TEXT,
  "platform" TEXT,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserE2eeDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserE2eePrekey" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "key_id" INTEGER NOT NULL,
  "public_key" TEXT NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "consumed_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserE2eePrekey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EncryptedMessageEnvelope" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "group_id" TEXT,
  "message_id" TEXT,
  "group_message_id" TEXT,
  "sender_user_id" TEXT NOT NULL,
  "sender_device_id" TEXT NOT NULL,
  "recipient_user_id" TEXT,
  "recipient_device_id" TEXT,
  "ciphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "aad" TEXT,
  "cipher_algo" TEXT NOT NULL DEFAULT 'xchacha20poly1305',
  "message_type" TEXT NOT NULL DEFAULT 'text',
  "client_message_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EncryptedMessageEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserE2eeDevice_user_id_device_id_key" ON "UserE2eeDevice"("user_id", "device_id");
CREATE INDEX "UserE2eeDevice_user_id_idx" ON "UserE2eeDevice"("user_id");
CREATE INDEX "UserE2eeDevice_device_id_idx" ON "UserE2eeDevice"("device_id");
CREATE INDEX "UserE2eeDevice_last_seen_at_idx" ON "UserE2eeDevice"("last_seen_at");

CREATE UNIQUE INDEX "UserE2eePrekey_user_id_device_id_key_id_key" ON "UserE2eePrekey"("user_id", "device_id", "key_id");
CREATE INDEX "UserE2eePrekey_user_id_device_id_idx" ON "UserE2eePrekey"("user_id", "device_id");
CREATE INDEX "UserE2eePrekey_consumed_at_idx" ON "UserE2eePrekey"("consumed_at");

CREATE INDEX "EncryptedMessageEnvelope_conversation_id_created_at_idx" ON "EncryptedMessageEnvelope"("conversation_id", "created_at");
CREATE INDEX "EncryptedMessageEnvelope_group_id_created_at_idx" ON "EncryptedMessageEnvelope"("group_id", "created_at");
CREATE INDEX "EncryptedMessageEnvelope_message_id_idx" ON "EncryptedMessageEnvelope"("message_id");
CREATE INDEX "EncryptedMessageEnvelope_group_message_id_idx" ON "EncryptedMessageEnvelope"("group_message_id");
CREATE INDEX "EncryptedMessageEnvelope_recipient_user_id_recipient_device_id_created_at_idx" ON "EncryptedMessageEnvelope"("recipient_user_id", "recipient_device_id", "created_at");
CREATE INDEX "EncryptedMessageEnvelope_sender_user_id_sender_device_id_created_at_idx" ON "EncryptedMessageEnvelope"("sender_user_id", "sender_device_id", "created_at");

ALTER TABLE "UserE2eeDevice"
  ADD CONSTRAINT "UserE2eeDevice_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserE2eePrekey"
  ADD CONSTRAINT "UserE2eePrekey_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EncryptedMessageEnvelope"
  ADD CONSTRAINT "EncryptedMessageEnvelope_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EncryptedMessageEnvelope"
  ADD CONSTRAINT "EncryptedMessageEnvelope_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "ConversationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EncryptedMessageEnvelope"
  ADD CONSTRAINT "EncryptedMessageEnvelope_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EncryptedMessageEnvelope"
  ADD CONSTRAINT "EncryptedMessageEnvelope_group_message_id_fkey"
  FOREIGN KEY ("group_message_id") REFERENCES "GroupMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
