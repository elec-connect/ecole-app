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

// ============================================================
// CONFIG ACCESS — Protection supplémentaire de /admin/configuration
// ============================================================

export async function creerTokenConfig(): Promise<string> {
  const { jwtSecret } = await getConfig();
  const secret = new TextEncoder().encode(jwtSecret + ':config');
  return await new SignJWT({ type: 'config_access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')  // Valide 1 heure
    .sign(secret);
}

export async function verifierTokenConfig(token: string): Promise<boolean> {
  try {
    const { jwtSecret } = await getConfig();
    const secret = new TextEncoder().encode(jwtSecret + ':config');
    const { payload } = await jwtVerify(token, secret);
    return payload.type === 'config_access';
  } catch {
    return false;
  }
}

export async function aAccesConfig(): Promise<boolean> {
  const store = await cookies();
  const token = store.get('config_access')?.value;
  if (!token) return false;
  return verifierTokenConfig(token);
}