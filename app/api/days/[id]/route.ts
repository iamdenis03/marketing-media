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
    return NextResponse.json({ error: 'Fără drepturi de ștergere zi.' }, { status: 403 });
  }

  try {
    const dayId = params.id;
    const day = await prisma.day.findUnique({
      where: { id: dayId },
      include: {
        mediaAssets: true,
      },
    });

    if (!day) {
      return NextResponse.json({ error: 'Ziua nu a fost găsită.' }, { status: 404 });
    }

    // Delete disk files for all media assets inside this day
    for (const asset of day.mediaAssets) {
      await deleteFile(asset.filePath);
      if (asset.thumbnailPath) {
        await deleteFile(asset.thumbnailPath);
      }
    }

    // Delete day from database (Cascades to MediaAssets)
    await prisma.day.delete({
      where: { id: dayId },
    });

    return NextResponse.json({ message: 'Ziua a fost ștearsă cu succes.' });
  } catch (error: any) {
    console.error('Error deleting day:', error);
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
    return NextResponse.json({ error: 'Fără drepturi de modificare zi.' }, { status: 403 });
  }

  try {
    const dayId = params.id;
    const body = await req.json();
    const { label, date } = body;

    const dataToUpdate: any = {};
    if (label !== undefined) dataToUpdate.label = label ? label.trim() : null;
    if (date) dataToUpdate.date = new Date(date);

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Niciun câmp de modificat.' }, { status: 400 });
    }

    const updatedDay = await prisma.day.update({
      where: { id: dayId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedDay);
  } catch (error: any) {
    console.error('Error updating day:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

