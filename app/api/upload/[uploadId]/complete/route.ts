import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MediaType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUploader } from '@/lib/uploadAuth';
import { generateThumbnail, getAbsolutePath } from '@/lib/storage';
import { classifyMedia, dataPath, readMeta, receivedChunks, removeSession } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/** Verifies every chunk arrived, moves the file into place and creates the media record. */
export async function POST(_req: NextRequest, { params }: { params: { uploadId: string } }) {
  const auth = await requireUploader();
  if ('error' in auth) return auth.error;

  const meta = await readMeta(params.uploadId).catch(() => null);
  if (!meta || meta.userId !== auth.userId) {
    return NextResponse.json({ error: 'Sesiunea de upload nu există.' }, { status: 404 });
  }

  const got = await receivedChunks(meta.uploadId);
  if (got.length !== meta.totalChunks) {
    const have = new Set(got);
    const missing: number[] = [];
    for (let i = 0; i < meta.totalChunks && missing.length < 500; i++) if (!have.has(i)) missing.push(i);
    return NextResponse.json({ error: 'Lipsesc bucăți din fișier.', missing }, { status: 409 });
  }

  const tmpFile = dataPath(meta.uploadId);
  const stat = await fs.promises.stat(tmpFile);
  if (stat.size !== meta.size) {
    return NextResponse.json({ error: 'Dimensiunea fișierului nu corespunde.' }, { status: 409 });
  }

  const day = await prisma.day.findUnique({ where: { id: meta.dayId } });
  if (!day) {
    await removeSession(meta.uploadId);
    return NextResponse.json({ error: 'Ziua a fost ștearsă între timp.' }, { status: 404 });
  }

  const kind = classifyMedia(meta.originalName, meta.mimeType);
  const type = kind === 'PHOTO' ? MediaType.PHOTO : MediaType.VIDEO;

  const ext = path.extname(meta.originalName).toLowerCase();
  const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  const subPath = path.join(day.eventId, day.id, fileName).replace(/\\/g, '/');
  const finalPath = getAbsolutePath(subPath);

  try {
    await fs.promises.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.promises.rename(tmpFile, finalPath);

    let thumbnailPath: string | null = null;
    if (type === MediaType.PHOTO) {
      thumbnailPath = await generateThumbnail(finalPath, meta.mimeType || 'image/jpeg', subPath);
    }

    const tagConnects = await Promise.all(
      meta.tags.map(async (name) => {
        const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
        return { id: tag.id };
      })
    );

    const asset = await prisma.mediaAsset.create({
      data: {
        dayId: day.id,
        type,
        fileName,
        filePath: subPath,
        thumbnailPath,
        uploadedById: auth.userId,
        fileSize: meta.size,
        originalName: meta.originalName,
        tags: { connect: tagConnects },
      },
      select: { id: true, dayId: true, originalName: true, type: true },
    });

    await removeSession(meta.uploadId);
    return NextResponse.json({ ok: true, asset });
  } catch (error: any) {
    console.error('Upload complete error:', error);
    // Put the data back so a retry of "complete" can still succeed
    if (!fs.existsSync(tmpFile) && fs.existsSync(finalPath)) {
      await fs.promises.rename(finalPath, tmpFile).catch(() => {});
    }
    return NextResponse.json({ error: 'Fișierul a ajuns, dar nu a putut fi salvat. Reîncearcă.' }, { status: 500 });
  }
}
