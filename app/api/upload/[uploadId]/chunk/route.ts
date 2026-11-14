import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { requireUploader } from '@/lib/uploadAuth';
import { dataPath, expectedChunkLength, markChunk, readMeta } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/**
 * Receives one chunk as a raw body and streams it straight to its offset in the file.
 * PUT /api/upload/{uploadId}/chunk?index=N   (Content-Type: application/octet-stream)
 */
export async function PUT(req: NextRequest, { params }: { params: { uploadId: string } }) {
  const auth = await requireUploader();
  if ('error' in auth) return auth.error;

  const meta = await readMeta(params.uploadId).catch(() => null);
  if (!meta || meta.userId !== auth.userId) {
    return NextResponse.json({ error: 'Sesiunea de upload nu există (poate a fost anulată).' }, { status: 404 });
  }

  const index = Number(req.nextUrl.searchParams.get('index'));
  if (!Number.isInteger(index) || index < 0 || index >= meta.totalChunks) {
    return NextResponse.json({ error: 'Index bucată invalid.' }, { status: 400 });
  }
  if (!req.body) {
    return NextResponse.json({ error: 'Bucată goală.' }, { status: 400 });
  }

  const expected = expectedChunkLength(meta, index);
  let received = 0;

  const counter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length;
      if (received > expected) {
        cb(new Error('Bucata este mai mare decât era așteptat.'));
        return;
      }
      cb(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(req.body as any),
      counter,
      fs.createWriteStream(dataPath(meta.uploadId), {
        flags: 'r+',
        start: index * meta.chunkSize,
        highWaterMark: 1024 * 1024,
      })
    );
  } catch (error: any) {
    // Client aborted or connection dropped – 408 tells the client to retry this chunk
    return NextResponse.json({ error: error?.message || 'Transfer întrerupt.' }, { status: 408 });
  }

  if (received !== expected) {
    return NextResponse.json({ error: `Bucată incompletă (${received}/${expected} bytes).` }, { status: 408 });
  }

  await markChunk(meta.uploadId, index);
  return NextResponse.json({ ok: true, index });
}
