import { PrismaClient } from '@prisma/client';
import { dechiffrer } from '../src/lib/crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const p = new PrismaClient();

async function main() {
  const row = await p.configuration.findUnique({ where: { id: 'singleton' } });
  if (!row) {
    console.log('❌ Aucune config en base');
    return;
  }

  const config = JSON.parse(dechiffrer(row.donnees));
  const envUrl = process.env.DATABASE_URL || '';
  const dbUrl = config.databaseUrl || '';

  console.log('Longueur .env  :', envUrl.length);
  console.log('Longueur DB    :', dbUrl.length);
  console.log('Identiques ?   :', envUrl === dbUrl);

  if (envUrl !== dbUrl) {
    for (let i = 0; i < Math.max(envUrl.length, dbUrl.length); i++) {
      if (envUrl[i] !== dbUrl[i]) {
        console.log('Première différence à l\'index', i, ':', JSON.stringify(envUrl[i]), 'vs', JSON.stringify(dbUrl[i]));
        break;
      }
    }
  }

  // ⭐ NOUVEAU : tester les 2 URLs directement
  console.log('\n=== TEST CONNEXION .env ===');
  try {
    await p.$queryRaw`SELECT 1`;
    console.log('✅ .env fonctionne (via DATABASE_URL)');
  } catch (e: any) {
    console.log('❌ .env échoue :', e.message.substring(0, 100));
  }

  console.log('\n=== TEST CONNEXION config DB ===');
  const p2 = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    await p2.$queryRaw`SELECT 1`;
    console.log('✅ config DB fonctionne');
  } catch (e: any) {
    console.log('❌ config DB échoue :', e.message.substring(0, 100));
  } finally {
    await p2.$disconnect();
  }
}

main()
  .catch((e) => console.error('❌ ERREUR:', e))
  .finally(() => p.$disconnect());