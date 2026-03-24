-- Curseur de lecture par membre (badges non-lus groupes)
ALTER TABLE "ConversationGroupMember" ADD COLUMN IF NOT EXISTS "last_read_at" TIMESTAMP(3);

-- Ne pas inonder les boîtes : considérer l’historique comme lu jusqu’au dernier message existant par groupe
UPDATE "ConversationGroupMember" AS m
SET "last_read_at" = sub.mx
FROM (
  SELECT "group_id", MAX("created_at") AS mx
  FROM "GroupMessage"
  WHERE "is_deleted" = false
  GROUP BY "group_id"
) AS sub
WHERE m."group_id" = sub."group_id"
  AND m."last_read_at" IS NULL;

UPDATE "ConversationGroupMember"
SET "last_read_at" = "joined_at"
WHERE "last_read_at" IS NULL;
