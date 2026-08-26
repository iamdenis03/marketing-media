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
    return NextResponse.json({ error: 'Doar administratorii pot șterge sezoane.' }, { status: 403 });
  }

  try {
    const seasonId = params.id;
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        events: {
          include: {
            days: {
              include: {
                mediaAssets: true,
              },
            },
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Sezonul nu a fost găsit.' }, { status: 404 });
    }

    // Delete disk files for all media assets inside this season
    for (const evt of season.events) {
      for (const day of evt.days) {
        for (const asset of day.mediaAssets) {
          await deleteFile(asset.filePath);
          if (asset.thumbnailPath) {
            await deleteFile(asset.thumbnailPath);
          }
        }
      }
    }

    // Delete season from database (Cascades to Events, Days, MediaAssets)
    await prisma.season.delete({
      where: { id: seasonId },
    });

    return NextResponse.json({ message: 'Sezonul a fost șters cu succes.' });
  } catch (error: any) {
    console.error('Error deleting season:', error);
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
  if (role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Doar administratorii pot modifica sezoane.' }, { status: 403 });
  }

  try {
    const seasonId = params.id;
    const body = await req.json();
    const { name, startDate, endDate } = body;

    const dataToUpdate: any = {};
    if (name && name.trim()) dataToUpdate.name = name.trim();
    if (startDate) dataToUpdate.startDate = new Date(startDate);
    if (endDate) dataToUpdate.endDate = new Date(endDate);

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Niciun câmp de modificat.' }, { status: 400 });
    }

    const updatedSeason = await prisma.season.update({
      where: { id: seasonId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedSeason);
  } catch (error: any) {
    console.error('Error updating season:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

