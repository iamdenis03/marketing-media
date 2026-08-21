import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAbsolutePath, getFileStream } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new NextResponse('Neautorizat. Vă rugăm să vă autentificați.', { status: 401 });
  }

  try {
    const subPath = params.path.join('/');
    const absolutePath = getAbsolutePath(subPath);

    if (!fs.existsSync(absolutePath)) {
      return new NextResponse('Fișierul nu a fost găsit pe disc.', { status: 404 });
    }

    const stat = await fs.promises.stat(absolutePath);
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';

    const nodeStream = getFileStream(subPath);

    // Convert Node.js ReadStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: any) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving media file:', error);
    return new NextResponse('Eroare la livrarea fișierului.', { status: 500 });
  }
}
