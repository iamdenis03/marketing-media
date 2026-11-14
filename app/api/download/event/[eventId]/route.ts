import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAbsolutePath } from '@/lib/storage';
import { ZipArchive } from 'archiver';
import fs from 'fs';
import { PassThrough, Readable } from 'stream';

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

    // Photos/videos are already compressed: storing is much faster and the ZIP ends up the same size
    const archive = new (ZipArchive as any)({ store: true });
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

    // Stop zipping if the browser cancels the download
    let finished = false;
    passThrough.on('end', () => (finished = true));
    passThrough.on('close', () => {
      if (!finished) archive.abort();
    });
    const webStream = Readable.toWeb(passThrough) as any;

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
