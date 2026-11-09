import { PrismaClient } from '@prisma/client';
import { getConfig } from './config';

let client: PrismaClient | null = null;
let currentUrl: string | null = null;

export async function getPrismaDynamic(): Promise<PrismaClient> {
  const config = await getConfig();

  if (!client || currentUrl !== config.databaseUrl) {
    if (client) await client.$disconnect();
    client = new PrismaClient({
      datasources: { db: { url: config.databaseUrl } },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    });
    currentUrl = config.databaseUrl;
  }

  return client;
}
