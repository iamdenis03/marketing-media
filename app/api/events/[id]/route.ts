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
  if (role !== Role.ADMIN && role !== Role.EDITOR) {
    return NextResponse.json({ error: 'Fără drepturi de ștergere eveniment.' }, { status: 403 });
  }

  try {
    const eventId = params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        days: {
          include: {
            mediaAssets: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evenimentul nu a fost găsit.' }, { status: 404 });
    }

    // Delete disk files for all media assets inside this event
    for (const day of event.days) {
      for (const asset of day.mediaAssets) {
        await deleteFile(asset.filePath);
        if (asset.thumbnailPath) {
          await deleteFile(asset.thumbnailPath);
        }
      }
    }

    // Delete event from database (Cascades to Days, MediaAssets)
    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ message: 'Evenimentul a fost șters cu succes.' });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
