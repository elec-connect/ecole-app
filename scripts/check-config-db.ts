import { PrismaClient } from '@prisma/client';
import { dechiffrer } from '../src/lib/crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const p = new PrismaClient();

async function main() {
  const row = await p.configuration.findUnique({ where: { id: 'singleton' } });
  if (!row) { console.log('❌ Pas de config'); return; }

  const config = JSON.parse(dechiffrer(row.donnees));

  const envPwd = process.env.DATABASE_URL?.match(/neondb_owner:([^@]+)@/)?.[1] || 'NON TROUVÉ';
  const dbPwd = config.databaseUrl?.match(/neondb_owner:([^@]+)@/)?.[1] || 'NON TROUVÉ';

  console.log('');
  console.log('=== COMPARAISON ===');
  console.log('Mot de passe .env  :', envPwd.substring(0, 10) + '...' + envPwd.substring(envPwd.length - 4));
  console.log('Mot de passe en DB :', dbPwd.substring(0, 10) + '...' + dbPwd.substring(dbPwd.length - 4));
  console.log('');
  console.log(envPwd === dbPwd ? '✅ IDENTIQUES' : '❌ DIFFÉRENTS');
  console.log('');
}

main().finally(() => p.$disconnect());