import { NextRequest, NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { creerToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { email, motDePasse } = await req.json();

  if (!email || !motDePasse) {
    return NextResponse.json({ erreur: 'Champs requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !user.actif || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
    return NextResponse.json({ erreur: 'Identifiants invalides' }, { status: 401 });
  }

  const token = await creerToken({ id: user.id, role: user.role, email: user.email });

  const res = NextResponse.json({
    ok: true,
    role: user.role,
    nom: `${user.prenom} ${user.nom}`,
  });

  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return res;
}