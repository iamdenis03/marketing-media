import { NextRequest, NextResponse } from 'next/server';
import { requireUploader } from '@/lib/uploadAuth';
import { readMeta, removeSession } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/** Cancels an upload and frees the space it reserved. */
export async function DELETE(_req: NextRequest, { params }: { params: { uploadId: string } }) {
  const auth = await requireUploader();
  if ('error' in auth) return auth.error;

  const meta = await readMeta(params.uploadId).catch(() => null);
  if (!meta) return NextResponse.json({ ok: true });
  if (meta.userId !== auth.userId) {
    return NextResponse.json({ error: 'Nu poți anula upload-ul altcuiva.' }, { status: 403 });
  }
  await removeSession(meta.uploadId);
  return NextResponse.json({ ok: true });
}
