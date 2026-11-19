import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUploader } from '@/lib/uploadAuth';
import {
  MAX_UPLOAD_SIZE,
  classifyMedia,
  cleanupStaleSessions,
  createSession,
  findSessionByFingerprint,
  getFreeBytes,
  makeFingerprint,
  receivedChunks,
} from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/**
 * Starts (or resumes) a chunked upload.
 * Body: { dayId, name, size, mimeType, lastModified, tags }
 * Returns: { uploadId, chunkSize, totalChunks, received: number[] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUploader();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const dayId = String(body.dayId || '');
    const name = String(body.name || '').slice(0, 255);
    const size = Number(body.size);
    const mimeType = String(body.mimeType || '');
    const lastModified = Number(body.lastModified) || 0;
    const tags: string[] = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 50)
      : [];

    if (!dayId || !name || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'Date lipsă pentru upload.' }, { status: 400 });
    }
    if (size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: `Fișierul depășește limita de ${MAX_UPLOAD_SIZE / 1024 ** 3} GB.` }, { status: 400 });
    }
    if (!classifyMedia(name, mimeType)) {
      return NextResponse.json({ error: 'Format nesuportat (doar poze și video).' }, { status: 400 });
    }

    const day = await prisma.day.findUnique({ where: { id: dayId }, select: { id: true, eventId: true } });
    if (!day) {
      return NextResponse.json({ error: 'Ziua nu mai există.' }, { status: 404 });
    }

    // Duplicate protection: the same file (name + exact size) already exists somewhere in this event
    const alreadyThere = await prisma.mediaAsset.findFirst({
      where: { originalName: name, fileSize: size, day: { eventId: day.eventId } },
      select: { id: true, day: { select: { label: true, date: true } } },
    });
    if (alreadyThere) {
      const where = alreadyThere.day.label || alreadyThere.day.date.toISOString().slice(0, 10);
      return NextResponse.json({ duplicate: true, assetId: alreadyThere.id, existingDay: where });
    }

    await cleanupStaleSessions();

    const fingerprint = makeFingerprint(auth.userId, dayId, name, size, lastModified);
    const existing = await findSessionByFingerprint(fingerprint);
    if (existing) {
      return NextResponse.json({
        uploadId: existing.uploadId,
        chunkSize: existing.chunkSize,
        totalChunks: existing.totalChunks,
        received: await receivedChunks(existing.uploadId),
        resumed: true,
      });
    }

    const free = await getFreeBytes();
    if (free !== null && free < size * 1.05 + 1024 ** 3) {
      return NextResponse.json({ error: 'Nu mai este suficient spațiu pe server pentru acest fișier.' }, { status: 507 });
    }

    const meta = await createSession({
      fingerprint,
      userId: auth.userId,
      dayId,
      originalName: name,
      mimeType,
      size,
      tags,
    });

    return NextResponse.json({
      uploadId: meta.uploadId,
      chunkSize: meta.chunkSize,
      totalChunks: meta.totalChunks,
      received: [],
      resumed: false,
    });
  } catch (error: any) {
    console.error('Upload init error:', error);
    return NextResponse.json({ error: 'Nu s-a putut porni upload-ul.' }, { status: 500 });
  }
}
