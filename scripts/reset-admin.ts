import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin123!', 10);

  const users = await p.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, prenom: true, nom: true },
  });

  if (users.length === 0) {
    console.log('❌ Aucun admin trouvé, création...');
    const created = await p.user.create({
      data: {
        email: 'admin@ecole.tn',
        motDePasse: hash,
        nom: 'Admin',
        prenom: 'Super',
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin créé: admin@ecole.tn / Admin123!');
    return;
  }

  for (const u of users) {
    await p.user.update({
      where: { id: u.id },
      data: { motDePasse: hash, actif: true },
    });
    console.log('✅ Mot de passe réinitialisé pour:', u.email);
  }

  console.log('\n🎉 Admin(s) réinitialisé(s) avec le mot de passe: Admin123!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());