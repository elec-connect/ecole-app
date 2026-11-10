import { prisma } from './prisma';
import { chiffrer, dechiffrer } from './crypto';

export type AppConfig = {
  databaseUrl: string;
  jwtSecret: string;
  appName?: string;
  anneeScolaireCourante?: string;
  logoUrl?: string;
  cronSecret?: string;
  configPassword?: string;
};

let cache: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (cache) return cache;

  const row = await prisma.configuration.findUnique({ where: { id: 'singleton' } });
  if (!row) {
    throw new Error('Configuration non initialisée. Lancez : npm run bootstrap');
  }

  const json = dechiffrer(row.donnees);
  cache = JSON.parse(json) as AppConfig;
  return cache;
}

export async function setConfig(config: AppConfig, updatedById?: string): Promise<void> {
  const json = JSON.stringify(config);
  const chiffre = chiffrer(json);

  await prisma.configuration.upsert({
    where: { id: 'singleton' },
    update: { donnees: chiffre, updatedById },
    create: { id: 'singleton', donnees: chiffre, updatedById },
  });

  cache = null;
}

export function invaliderCacheConfig() {
  cache = null;
}