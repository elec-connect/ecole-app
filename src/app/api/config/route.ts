import { NextResponse } from 'next/server';
import { getConfig, setConfig, AppConfig, invaliderCacheConfig } from '@/lib/config';
import { withAdmin } from '@/lib/api-helpers';

// Valeur sentinelle unique utilisée partout pour "champ masqué / non modifié".
// Doit être identique à celle utilisée dans masquerUrl() et dans le filtre du PUT.
const MASK = '********';

export const GET = withAdmin(async () => {
  const config = await getConfig();
  return NextResponse.json({
    databaseUrl: masquerUrl(config.databaseUrl),
    jwtSecret: config.jwtSecret ? MASK : '',
    appName: config.appName,
    anneeScolaireCourante: config.anneeScolaireCourante,
    logoUrl: config.logoUrl ?? '',
    cronSecret: config.cronSecret ? MASK : '',
    configPassword: config.configPassword ? MASK : '',
    resendApiKey: config.resendApiKey ? MASK : '',
    emailFrom: config.emailFrom ?? '',
  });
});

export const PUT = withAdmin(async (req, session) => {
  const body = await req.json();
  const current = await getConfig();

  const updated: AppConfig = {
    ...current,
    ...Object.fromEntries(
      Object.entries(body).filter(
        ([, v]) => v !== '' && v !== undefined && v !== MASK
      )
    ),
  };

  await setConfig(updated, session.id);
  invaliderCacheConfig();
  return NextResponse.json({ ok: true });
});

function masquerUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = MASK;
    return u.toString();
  } catch {
    return MASK;
  }
}