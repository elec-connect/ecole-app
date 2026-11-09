import { NextRequest, NextResponse } from 'next/server';
import { getSession, PayloadToken } from './auth';

export type Handler = (
  req: NextRequest,
  session: PayloadToken,
  ctx: any // ⚠️ Temporaire pour contourner le typage strict de Next.js 15
) => Promise<NextResponse> | NextResponse;

export function withRoles(roles: string[], handler: Handler) {
  return async (
    req: NextRequest,
    ctx: any = { params: Promise.resolve({}) }
  ): Promise<NextResponse> => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ erreur: 'Non connecté' }, { status: 401 });
    }
    if (!roles.includes(session.role)) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 });
    }

    try {
      return await handler(req, session, ctx);
    } catch (e: any) {
      console.error('[API ERROR]', e);
      if (e?.code === 'P2002') {
        return NextResponse.json({ erreur: 'Doublon détecté' }, { status: 409 });
      }
      if (e?.code === 'P2025') {
        return NextResponse.json({ erreur: 'Ressource introuvable' }, { status: 404 });
      }
      return NextResponse.json(
        { erreur: e?.message ?? 'Erreur serveur' },
        { status: 500 }
      );
    }
  };
}

export const withAdmin = (handler: Handler) => withRoles(['ADMIN'], handler);
export const withProf = (handler: Handler) => withRoles(['PROFESSEUR'], handler);
export const withAuth = (handler: Handler) =>
  withRoles(['ADMIN', 'PROFESSEUR', 'ETUDIANT', 'PARENT'], handler);
