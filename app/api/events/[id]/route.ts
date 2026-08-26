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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const role = (session.user as any).role as Role;
  if (role !== Role.ADMIN && role !== Role.EDITOR) {
    return NextResponse.json({ error: 'Fără drepturi de modificare eveniment.' }, { status: 403 });
  }

  try {
    const eventId = params.id;
    const body = await req.json();
    const { name, location, startDate, endDate, targetSeasonId, seasonId } = body;

    const dataToUpdate: any = {};
    if (name && name.trim()) dataToUpdate.name = name.trim();
    if (location && location.trim()) dataToUpdate.location = location.trim();
    if (startDate) dataToUpdate.startDate = new Date(startDate);
    if (endDate) dataToUpdate.endDate = new Date(endDate);
    if (targetSeasonId || seasonId) dataToUpdate.seasonId = targetSeasonId || seasonId;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Niciun câmp de modificat.' }, { status: 400 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedEvent);
  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

