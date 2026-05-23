-- Populate wonder_relations from existing Follow records for backward compatibility
INSERT INTO "WonderRelation" ("id", "follower_id", "creator_id", "status", "created_at", "updated_at")
SELECT 
  gen_random_uuid()::text, 
  "follower_id", 
  "following_id", 
  'active', 
  "created_at", 
  "created_at"
FROM "Follow" f
WHERE NOT EXISTS (
  SELECT 1 FROM "WonderRelation" wr 
  WHERE wr.follower_id = f.follower_id AND wr.creator_id = f.following_id
);
