import { PrismaClient } from '@prisma/client';
import { chiffrer, dechiffrer } from '../src/lib/crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const p = new PrismaClient();

async function main() {
  console.log('🔧 Mise à jour de la config chiffrée...');

  const row = await p.configuration.findUnique({ where: { id: 'singleton' } });
  if (!row) {
    console.log('❌ Aucune config. Lancez npm run bootstrap.');
    return;
  }

  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    console.log('❌ DATABASE_URL manquant');
    return;
  }

  const config = JSON.parse(dechiffrer(row.donnees));
  config.databaseUrl = envUrl;

  await p.configuration.update({
    where: { id: 'singleton' },
    data: { donnees: chiffrer(JSON.stringify(config)) },
  });

  console.log('✅ Config mise à jour avec le nouveau DATABASE_URL');
}

main()
  .catch((e) => console.error('❌ ERREUR:', e))
  .finally(() => p.$disconnect());