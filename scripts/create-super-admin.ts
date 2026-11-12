import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Sahnoun18011978!', 10);
  
  const superAdmin = await p.user.upsert({
    where: { email: 'superadmin@ecole.tn' },
    update: { role: 'SUPER_ADMIN', actif: true },
    create: {
      email: 'superadmin@ecole.tn',
      motDePasse: hash,
      nom: 'Haouala',
      prenom: 'Sahnoun',
      role: 'SUPER_ADMIN',
      actif: true,
    },
  });

  console.log('✅ Super Admin créé :');
  console.log('   Email    : superadmin@ecole.tn');
  console.log('   Password : Sahnoun18011978!');
  console.log('   Role     :', superAdmin.role);
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());