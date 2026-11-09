import { NextResponse } from 'next/server';
import { getConfig, setConfig, invaliderCacheConfig } from '@/lib/config';
import { withAdmin } from '@/lib/api-helpers';

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo (large)
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];

export const POST = withAdmin(async (req, session) => {
  try {
    const formData = await req.formData();
    const file = formData.get('logo') as File | null;

    console.log('[LOGO] Fichier reçu:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
    });

    if (!file) {
      return NextResponse.json({ erreur: 'Aucun fichier reçu' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ erreur: 'Fichier vide' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      const sizeMo = (file.size / 1024 / 1024).toFixed(2);
      return NextResponse.json(
        { erreur: `Fichier trop volumineux (${sizeMo} Mo). Max 10 Mo.` },
        { status: 400 }
      );
    }

    // Détecter le type : via extension (plus fiable que file.type)
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { erreur: `Extension non supportée (.${ext}). Utilisez JPG, PNG, WEBP, SVG ou GIF.` },
        { status: 400 }
      );
    }

    // Mapper l'extension vers le type MIME
    const extToMime: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      gif: 'image/gif',
    };
    const mimeType = extToMime[ext];

    console.log('[LOGO] Extension:', ext, '| MIME:', mimeType);

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('[LOGO] Data URL length:', dataUrl.length, 'caractères');

    const current = await getConfig();
    const updated = { ...current, logoUrl: dataUrl };
    await setConfig(updated, session.id);
    invaliderCacheConfig();

    return NextResponse.json({ ok: true, logoUrl: dataUrl });
  } catch (e: any) {
    console.error('[LOGO] Erreur:', e);
    return NextResponse.json(
      { erreur: e.message ?? 'Erreur inconnue' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdmin(async (_req, session) => {
  const current = await getConfig();
  const updated = { ...current, logoUrl: undefined };
  await setConfig(updated, session.id);
  invaliderCacheConfig();
  return NextResponse.json({ ok: true });
});