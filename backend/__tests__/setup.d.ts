/**
 * Setup global pour les tests Jest
 * Configure la base de données de test et exécute les migrations
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
declare const prisma: PrismaClient<{
    adapter: PrismaPg;
    log: never[];
}, never, import("@prisma/client/runtime/client").DefaultArgs>;
export { prisma };
//# sourceMappingURL=setup.d.ts.map