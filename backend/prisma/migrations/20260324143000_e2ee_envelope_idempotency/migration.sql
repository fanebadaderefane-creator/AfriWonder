-- E2E envelope idempotency key (sender-device-clientMessageId-recipient tuple)
CREATE UNIQUE INDEX "uniq_e2ee_envelope_idempotency"
ON "EncryptedMessageEnvelope"(
  "sender_user_id",
  "sender_device_id",
  "client_message_id",
  "recipient_user_id",
  "recipient_device_id"
);
