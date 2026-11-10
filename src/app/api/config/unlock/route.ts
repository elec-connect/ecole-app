import { NextResponse } from 'next/server';
import { getSession, creerTokenConfig } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 });
  }

  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ erreur: 'Mot de passe requis' }, { status: 400 });
  }

  const config = await getConfig();
  const configPassword = config.configPassword ?? 'SahnounBenHaouala18011978';  // fallback

  if (password !== configPassword) {
    return NextResponse.json({ erreur: 'Mot de passe incorrect' }, { status: 401 });
  }

  const token = await creerTokenConfig();

  const res = NextResponse.json({ ok: true });
  res.cookies.set('config_access', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,  // 1 heure
    path: '/',
  });

  return res;
}