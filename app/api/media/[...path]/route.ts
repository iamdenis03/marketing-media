import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAbsolutePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import { nodeStreamToWeb } from '@/lib/webStream';
import mime from 'mime-types';

export const dynamic = 'force-dynamic';

/**
 * Serves a media file from disk.
 * - Supports HTTP Range requests: videos can seek instantly and interrupted downloads resume.
 * - Streams with backpressure (never loads a whole file in memory).
 * - ?download=1 forces "Save as" with the original file name (?name=...).
 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Neautorizat. Vă rugăm să vă autentificați.', { status: 401 });
  }

  try {
    const subPath = params.path.join('/');
    if (subPath.startsWith('.uploads')) {
      return new NextResponse('Fișierul nu a fost găsit.', { status: 404 });
    }
    const absolutePath = getAbsolutePath(subPath);

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absolutePath);
    } catch {
      return new NextResponse('Fișierul nu a fost găsit pe disc.', { status: 404 });
    }
    if (!stat.isFile()) {
      return new NextResponse('Fișierul nu a fost găsit pe disc.', { status: 404 });
    }

    const size = stat.size;
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';
    const etag = `"${size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=31536000, immutable',
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
    };

    const sp = req.nextUrl.searchParams;
    if (sp.get('download') === '1') {
      const name = (sp.get('name') || path.basename(absolutePath)).replace(/[\r\n"]/g, '');
      const ascii = name.replace(/[^\x20-\x7e]/g, '_');
      headers['Content-Disposition'] = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
    }

    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    // Range: bytes=start-end
    const range = req.headers.get('range');
    const ifRange = req.headers.get('if-range');
    const rangeValid = range && (!ifRange || ifRange === etag);
    if (rangeValid) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range!.trim());
      if (m && (m[1] !== '' || m[2] !== '')) {
        let start: number;
        let end: number;
        if (m[1] === '') {
          // suffix range: last N bytes
          start = Math.max(0, size - Number(m[2]));
          end = size - 1;
        } else {
          start = Number(m[1]);
          end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
        }
        if (start > end || start >= size) {
          return new NextResponse(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
        }
        const stream = fs.createReadStream(absolutePath, { start, end, highWaterMark: 1024 * 1024 });
        return new NextResponse(nodeStreamToWeb(stream), {
          status: 206,
          headers: {
            ...headers,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': String(end - start + 1),
          },
        });
      }
    }

    const stream = fs.createReadStream(absolutePath, { highWaterMark: 1024 * 1024 });
    return new NextResponse(nodeStreamToWeb(stream), {
      headers: { ...headers, 'Content-Length': String(size) },
    });
  } catch (error: any) {
    console.error('Error serving media file:', error);
    return new NextResponse('Eroare la livrarea fișierului.', { status: 500 });
  }
}
