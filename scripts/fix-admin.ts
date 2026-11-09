import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  console.log('🔧 Réinitialisation admin...\n');

  const admins = await p.user.findMany({ where: { role: 'ADMIN' } });
  console.log('Admins trouvés:', admins.length);
  admins.forEach((a) => console.log('  -', a.email));

  if (admins.length > 0) {
    await p.user.deleteMany({ where: { role: 'ADMIN' } });
    console.log('✅ Anciens admins supprimés\n');
  }

  const hash = await bcrypt.hash('Admin123!', 10);
  const admin = await p.user.create({
    data: {
      email: 'admin@ecole.tn',
      motDePasse: hash,
      nom: 'Admin',
      prenom: 'Super',
      role: 'ADMIN',
      actif: true,
    },
  });

  console.log('✅ Nouvel admin créé:');
  console.log('   Email        :', admin.email);
  console.log('   Mot de passe : Admin123!');
  console.log('   ID           :', admin.id);
}

main()
  .catch((e) => console.error('❌ ERREUR:', e))
  .finally(() => p.$disconnect());