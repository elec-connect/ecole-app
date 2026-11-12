import { NextRequest, NextResponse } from 'next/server';
import { getSession, PayloadToken } from './auth';

export type Handler = (
  req: NextRequest,
  session: PayloadToken,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

export function withRoles(roles: string[], handler: Handler) {
  // ⭐ On caste la fonction retournée pour satisfaire Next.js 15
  return (async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> } = { params: Promise.resolve({}) }
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
  }) as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;
}

// ============================================================
// Helpers standards
// ============================================================

export const withAdmin = (handler: Handler) => withRoles(['SUPER_ADMIN', 'ADMIN'], handler);

export const withProf = (handler: Handler) => withRoles(['PROFESSEUR'], handler);

export const withAuth = (handler: Handler) =>
  withRoles(['SUPER_ADMIN', 'ADMIN', 'PROFESSEUR', 'ETUDIANT', 'PARENT'], handler);

// ============================================================
// ⭐ Helpers pour SUPER_ADMIN
// ============================================================

export const withSuperAdmin = (handler: Handler) =>
  withRoles(['SUPER_ADMIN'], handler);

export const withAdminOrSuper = (handler: Handler) =>
  withRoles(['SUPER_ADMIN', 'ADMIN'], handler);