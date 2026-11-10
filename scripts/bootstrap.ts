import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { chiffrer } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bootstrap de la configuration...\n');

  const databaseUrl = process.env.BOOTSTRAP_DATABASE_URL;
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@ecole.tn';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin123!';

  if (!databaseUrl) throw new Error('BOOTSTRAP_DATABASE_URL requis');
  if (!process.env.CONFIG_ENCRYPTION_KEY) throw new Error('CONFIG_ENCRYPTION_KEY requis');

  const jwtSecret = randomBytes(32).toString('base64');

  const config = {
    databaseUrl,
    jwtSecret,
    appName: 'ÉcoleApp',
    anneeScolaireCourante: '2025-2026',
    configPassword: process.env.BOOTSTRAP_CONFIG_PASSWORD ?? 'SahnounBenHaouala18011978',
  };

  await prisma.configuration.upsert({
    where: { id: 'singleton' },
    update: { donnees: chiffrer(JSON.stringify(config)) },
    create: { id: 'singleton', donnees: chiffrer(JSON.stringify(config)) },
  });

  console.log('✅ Configuration chiffrée écrite en base');

  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      motDePasse: hash,
      nom: 'Admin',
      prenom: 'Super',
      role: 'ADMIN',
    },
  });

  console.log(`✅ Admin créé : ${adminEmail} / ${adminPassword}`);
  console.log('\n⚠️  Changez ce mot de passe après la 1ère connexion !\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
