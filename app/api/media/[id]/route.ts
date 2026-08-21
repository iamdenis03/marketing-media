import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';
import { Role } from '@prisma/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const role = (session.user as any).role as Role;
  if (role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Doar un Administrator poate șterge fișiere media.' }, { status: 403 });
  }

  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: params.id },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Fișierul nu a fost găsit.' }, { status: 404 });
    }

    // Delete file & thumbnail from disk
    await deleteFile(asset.filePath);
    if (asset.thumbnailPath) {
      await deleteFile(asset.thumbnailPath);
    }

    // Delete DB record
    await prisma.mediaAsset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Fișierul a fost șters cu succes.' });
  } catch (error: any) {
    console.error('Error deleting media asset:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
