-- FK explicite pour la relation Prisma Campaign.creator → User (admin super-app include creator)
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_creator_id_fkey";
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
