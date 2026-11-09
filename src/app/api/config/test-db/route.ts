import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-helpers';
import { PrismaClient } from '@prisma/client';

export const POST = withAdmin(async (req) => {
  const { databaseUrl } = await req.json();
  if (!databaseUrl) {
    return NextResponse.json({ erreur: 'URL requise' }, { status: 400 });
  }

  const testClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    await testClient.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, message: 'Connexion réussie ✅' });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e.message ?? 'Échec de connexion' },
      { status: 400 }
    );
  } finally {
    await testClient.$disconnect();
  }
});