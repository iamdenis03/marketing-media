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
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse('Neautorizat.', { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      include: {
        days: {
          include: {
            mediaAssets: true,
          },
        },
      },
    });

    if (!event) {
      return new NextResponse('Evenimentul nu a fost găsit.', { status: 404 });
    }

    const totalAssets = event.days.reduce((acc, d) => acc + d.mediaAssets.length, 0);

    if (totalAssets === 0) {
      return new NextResponse('Nu există fișiere de descărcat pentru acest eveniment.', { status: 400 });
    }

    const zipFileName = `${event.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_FULL.zip`;

    const archive = archiver('zip', { zlib: { level: 5 } });
    const passThrough = new PassThrough();

    archive.pipe(passThrough);

    // Append media files grouped by day folder inside zip
    for (const day of event.days) {
      const dayFolder = day.label
        ? day.label.replace(/[^a-zA-Z0-9_-]/g, '_')
        : `Ziua_${day.date.toISOString().split('T')[0]}`;

      for (const asset of day.mediaAssets) {
        try {
          const fullPath = getAbsolutePath(asset.filePath);
          if (fs.existsSync(fullPath)) {
            const relativeZipPath = `${dayFolder}/${asset.originalName || asset.fileName}`;
            archive.file(fullPath, { name: relativeZipPath });
          }
        } catch (e) {
          console.error(`Skipping missing file ${asset.filePath}`, e);
        }
      }
    }

    archive.finalize();

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
    console.error('Error generating Event ZIP archive:', error);
    return new NextResponse('Eroare la generarea arhivei ZIP pentru eveniment.', { status: 500 });
  }
}
