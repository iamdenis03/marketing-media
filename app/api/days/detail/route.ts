import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dayId = searchParams.get('dayId');

  if (!dayId) {
    return NextResponse.json({ error: 'Lipsește dayId.' }, { status: 400 });
  }

  try {
    const day = await prisma.day.findUnique({
      where: { id: dayId },
      include: {
        event: {
          include: {
            season: true,
          },
        },
        mediaAssets: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            tags: true,
            uploadedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!day) {
      return NextResponse.json({ error: 'Ziua nu a fost găsită.' }, { status: 404 });
    }

    return NextResponse.json(day);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
