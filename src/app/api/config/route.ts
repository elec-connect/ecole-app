import { NextResponse } from 'next/server';
import { getConfig, setConfig, AppConfig, invaliderCacheConfig } from '@/lib/config';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async () => {
  const config = await getConfig();
  return NextResponse.json({
    databaseUrl: masquerUrl(config.databaseUrl),
    jwtSecret: '********',
    appName: config.appName,
    anneeScolaireCourante: config.anneeScolaireCourante,
    logoUrl: config.logoUrl ?? '',
  });
});

export const PUT = withAdmin(async (req, session) => {
  const body = await req.json();
  const current = await getConfig();

  const updated: AppConfig = {
    ...current,
    ...Object.fromEntries(
      Object.entries(body).filter(
        ([, v]) => v !== '' && v !== undefined && v !== '********'
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
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return '****';
  }
}