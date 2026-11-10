import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { calculerBulletin, verifierAccesParent } from '@/lib/bulletin';

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const etudiantId = searchParams.get('etudiantId') ?? session.id;

  if (session.role === 'ETUDIANT' && session.id !== etudiantId) {
    return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
  }

  if (session.role === 'PARENT') {
    const aAcces = await verifierAccesParent(session.id, etudiantId);
    if (!aAcces) {
      return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
    }
  }

  try {
    const data = await calculerBulletin(etudiantId);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ erreur: e.message ?? 'Erreur' }, { status: 500 });
  }
});