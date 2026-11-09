import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getConfig } from './config';

export type PayloadToken = { id: string; role: string; email: string };

export async function creerToken(payload: PayloadToken): Promise<string> {
  const { jwtSecret } = await getConfig();
  const secret = new TextEncoder().encode(jwtSecret);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifierToken(token: string): Promise<PayloadToken | null> {
  try {
    const { jwtSecret } = await getConfig();
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload as PayloadToken;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<PayloadToken | null> {
  const store = await cookies();
  const token = store.get('session')?.value;
  if (!token) return null;
  return verifierToken(token);
}
