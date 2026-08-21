import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAbsolutePath } from '@/lib/storage';
import * as archiverModule from 'archiver';
const archiver = (archiverModule as any).default || archiverModule;
import fs from 'fs';
import { PassThrough } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse('Neautorizat.', { status: 401 });
  }

  try {
    const day = await prisma.day.findUnique({
      where: { id: params.dayId },
      include: {
        event: true,
        mediaAssets: true,
      },
    });

    if (!day) {
      return new NextResponse('Ziua nu a fost găsită.', { status: 404 });
    }

    if (day.mediaAssets.length === 0) {
      return new NextResponse('Nu există fișiere de descărcat în această zi.', { status: 400 });
    }

    const zipFileName = `${day.event.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${day.label ? day.label.replace(/[^a-zA-Z0-9_-]/g, '_') : day.id}.zip`;

    const archive = archiver('zip', { zlib: { level: 5 } });
    const passThrough = new PassThrough();

    archive.pipe(passThrough);

    // Append media files to archive
    for (const asset of day.mediaAssets) {
      try {
        const fullPath = getAbsolutePath(asset.filePath);
        if (fs.existsSync(fullPath)) {
          archive.file(fullPath, { name: asset.originalName || asset.fileName });
        }
      } catch (e) {
        console.error(`Skipping missing file ${asset.filePath}`, e);
      }
    }

    archive.finalize();

    // Convert PassThrough Node stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on('data', (chunk: any) => controller.enqueue(chunk));
        passThrough.on('end', () => controller.close());
        passThrough.on('error', (err) => controller.error(err));
      },
      cancel() {
        passThrough.destroy();
        archive.abort();
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating ZIP archive:', error);
    return new NextResponse('Eroare la generarea arhivei ZIP.', { status: 500 });
  }
}
